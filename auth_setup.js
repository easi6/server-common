import passport from 'passport';
import config from 'config';
import jwt from 'jsonwebtoken';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import oauth2orize from 'oauth2orize';
import Redis from 'ioredis';
import Promise from 'bluebird';
import crypto from 'crypto';
import _ from 'lodash';
import CrashReportUtil from 'lib/common/sentry_util';
import OAuth2Error from 'oauth2orize/lib/errors/oauth2error';

let redisClient;
if (config.redis_cluster) {
  redisClient = new Redis.Cluster(config.redis_cluster, { scaleReads: "slave", slotsRefreshTimeout: 5000 });
} else if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL);
} else {
  redisClient = new Redis(_.extend({}, config.redis, { password: config.redis.pass }));
}

module.exports = (app, logger) => {
  app.use(passport.initialize());
  if (!logger) {
    logger = console;
  }
  if (!logger.verbose) {
    logger.verbose = logger.log;
  }
  /* functors */
  function tokenIssuer_legacy({ client: originalClient, model, idkey, getData, jwtSecret, opts }) {
    return async (entity, client, done) => {
      if (!done) {
        done = client;
        client = originalClient;
      }

      const multi_auth_count = _.get(opts, 'multi_auth_count', false);
      const payload = {
        sub: entity[idkey],
        cnt: multi_auth_count ? _.get(entity, `auth_count[${_.get(client, 'user.id')}]`, 0) : entity.auth_count,
        ...(multi_auth_count ? { app: _.get(client, 'user.id') } : {}),
      };

      opts = _.defaultsDeep(opts, {
        refreshTokenExpire: false /* don't expire refresh token */,
        accessTokenExpire: 60 * 60 * 24,
      });

      const accessToken = jwt.sign(payload, jwtSecret, {
        expiresIn: opts.accessTokenExpire + 's',
      });
      const data = getData(entity);

      // renew refresh token
      const namespace = `${model.name}_refresh_token`;
      const refreshToken = (await crypto.randomBytes(16)).toString('hex');
      if (opts.refreshTokenExpire) {
        await redisClient.setex(
          `${namespace}_${refreshToken}`,
          opts.refreshTokenExpire,
          `${entity[idkey]},${
            multi_auth_count ? _.get(entity.auth_count, _.get(client, 'user.id'), 0) : entity.auth_count
          }`
        );
      } else {
        await redisClient.set(
          `${namespace}_${refreshToken}`,
          `${entity[idkey]},${
            multi_auth_count ? _.get(entity.auth_count, _.get(client, 'user.id'), 0) : entity.auth_count
          }`
        );
      }

      logger.verbose(`tokenIssuer generated token, client: ${JSON.stringify(client)}`, {
        refreshToken,
        accessToken,
      });

      return done(null, accessToken, refreshToken, data);
    };
  }

  const tokenIssuer_uuid_proxy = uuidGrantAccessToken => ({ client: originalClient, model, idkey, getData }) => {
    return async (entity, client, done) => {
      if (!done) {
        done = client;
        client = originalClient;
      }
      const data = getData(entity);
      uuidGrantAccessToken({ uuid: entity.uuid, appId: client.user.id })
        .then(({ access_token, refresh_token }) => done(null, access_token, refresh_token, data))
        .catch(err => done(err));
    };
  };

  function passwordExchanger({ model, idkey, getData, jwtSecret, tokenIssuer, opts }) {
    return oauth2orize.exchange.password(async (client, username, password, done) => {
      let entity;
      try {
        entity = await model.find({ where: { [idkey]: username } });
      } catch (error) {
        logger.error('model find error', {
          message: error.message,
          stack: error.stack,
        });
        return done(error);
      }

      if (!entity) {
        const error = new Error('Incorrect login');
        error.name = 'IncorrectCredentialsError';
        return done(error);
      }

      // case Driver Admin
      if (!_.isNil(model.fields.blocked)) {
        if (entity.blocked) {
          const error = new Error('Blocked admin');
          error.name = 'BlockedCredentialsError';
          return done(error);
        }
      }

      try {
        const match = await entity.comparePassword(password);

        if (!match) {
          // case Driver Admin
          if (!_.isNil(model.fields.blocked)) {
            const isExistKey = await redisClient.exists(`${model.name}_${username}_auth_fail_count`);

            (isExistKey)? await redisClient.incr(`${model.name}_${username}_auth_fail_count`)
                : await redisClient.set(`${model.name}_${username}_auth_fail_count`, 1);

            let auth_fail_count = await redisClient.get(`${model.name}_${username}_auth_fail_count`);
            if (+auth_fail_count === 5) {
              await entity.update({ blocked: true }, { where: { login: username }})
            }
          }

          const error = new Error('Incorrect password');
          error.name = 'IncorrectCredentialsError';
          return done(error);
        }

        // case Driver Admin
        // Success Login, Remove Key
        if (!_.isNil(model.fields.blocked)) {
          await redisClient.del(`${model.name}_${username}_auth_fail_count`);
        }

      } catch (error) {
        logger.error('compare password error', {
          message: error.message,
          stack: error.stack,
        });
        return done(error);
      }
      if (_.get(opts, 'multi_auth_count', false)) {
        const clientName = _.get(client, 'user.id');
        await entity.updateAttributes({
          auth_count: {
            ...entity.auth_count,
            [clientName]: _.get(entity.auth_count, clientName, 0) + 1,
          },
        });
      } else {
        await entity.updateAttributes({ auth_count: entity.auth_count + 1 });
      }
      const issueToken = tokenIssuer({
        client,
        model,
        idkey,
        getData,
        jwtSecret,
        opts,
      });
      await issueToken(entity, done.bind(this));
    });
  }

  function refreshTokenExchanger({ model, idkey, getData, jwtSecret, externalAccountService, opts }) {
    return oauth2orize.exchange.refreshToken(async (client, refreshToken, done) => {
      if (externalAccountService && refreshToken.length > 32 /* new token format is longer than length of 32 */) {
        return Promise.try(() =>
          externalAccountService
          .refreshTokenGrantAccessToken({
            refreshToken,
            appId: client.user.id,
          })
        ).then(({ access_token, refresh_token }) => {
            return done(null, access_token, refresh_token);
        }).catch(err => {
          const oAuth2Error = new OAuth2Error(
              _.get(err, 'error.error_description', 'auth error'),
              _.get(err, 'error.error', 'invalid_token'),
              _.get(err, 'options.uri', ''),
              _.get(err, 'statusCode', _.get(err, 'http_status', 500)));

          return done(oAuth2Error);
        });
      }

      /* legacy logic */
      const namespace = `${model.name}_refresh_token`;
      const str = await redisClient.get(`${namespace}_${refreshToken}`);

      if (str === null) {
        const error = new Error('Expired refresh token');
        error.name = 'IncorrectCredentialsError';
        return done(error);
      }

      const [id, auth_count] = str.split(',').map(x => (isNaN(x) ? x : parseInt(x)));

      if (!id) {
        const error = new Error('Incorrect login');
        error.name = 'IncorrectCredentialsError';
        return done(error);
      }
      const entity = await model.find({ where: { [idkey]: id } });
      if (!entity) {
        const error = new Error('Incorrect login');
        error.name = 'IncorrectCredentialsError';
        return done(error);
      }

      if (
        _.get(opts, 'multi_auth_count', false)
          ? _.get(entity.auth_count, _.get(client, 'user.id'), 0) !== auth_count
          : entity.auth_count !== auth_count
      ) {
        logger.error(
          `userId: ${id}, refresh: ${refreshToken}, client: ${JSON.stringify(
            client
          )}, entity.auth_count: ${JSON.stringify(entity.auth_count)}, auth_count: ${auth_count}`
        );
        CrashReportUtil.captureException(new Error('error incorrect_auth_count'));
        // const error = new Error('Incorrect auth_count');
        // return done(error);
      }

      // remove old refresh token
      await redisClient.del(`${namespace}_${refreshToken}`);

      if (externalAccountService) {
        const issueToken = tokenIssuer_uuid_proxy(externalAccountService.uuidGrantAccessToken)({
          client,
          model,
          idkey,
          getData,
        });
        await issueToken(entity, done.bind(this));
      } else {
        const issueToken = tokenIssuer_legacy({
          client,
          model,
          idkey,
          getData,
          jwtSecret,
          opts,
        });
        await issueToken(entity, done.bind(this));
      }
    });
  }

  function jwtStrategyFactory({ model, idkey, secretOrKey }) {
    return new JwtStrategy(
      {
        secretOrKey,
        jwtFromRequest: ExtractJwt.fromExtractors([
          ExtractJwt.fromAuthHeaderAsBearerToken(),
          ExtractJwt.fromUrlQueryParameter('access_token'),
          ExtractJwt.fromBodyField('access_token'),
        ]),
      },
      async (jwtPayload, done) => {
        const entity = await model.find({ where: { [idkey]: jwtPayload.sub } });
        if (!entity) {
          return done(null, false);
        }

        if (
          jwtPayload.app
            ? _.get(entity.auth_count, jwtPayload.app, 0) !== jwtPayload.cnt
            : entity.auth_count !== jwtPayload.cnt
        ) {
          return done(null, false);
        }

        return done(null, entity, jwtPayload);
      }
    );
  }

  return opts => {
    const oauth2Server = oauth2orize.createServer();
    const name = opts.strategyName;
    // select token issuer
    let tokenIssuer;
    if (opts.externalAccountService) {
      tokenIssuer = tokenIssuer_uuid_proxy(opts.externalAccountService.uuidGrantAccessToken);
      oauth2Server.issueToken = () => {
        throw new Error('cannot call issueToken when use externalAccountService');
      };
    } else {
      tokenIssuer = tokenIssuer_legacy;
      oauth2Server.issueToken = tokenIssuer(opts);
    }

    oauth2Server.exchange(passwordExchanger({ ...opts, tokenIssuer }));
    oauth2Server.exchange(refreshTokenExchanger(opts));

    passport.use(
      name,
      jwtStrategyFactory({
        model: opts.model,
        idkey: opts.idkey,
        secretOrKey: opts.jwtSecret,
      })
    );
    return oauth2Server;
  };
};