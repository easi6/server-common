import passport from 'passport';
import config from 'config';
import jwt from 'jsonwebtoken';
import {ExtractJwt as ExtractJwt, Strategy as JwtStrategy} from 'passport-jwt';
import oauth2orize from 'oauth2orize';
import redis from 'redis';
import Promise from 'bluebird';
import crypto from 'crypto';
import _ from 'lodash';

Promise.promisifyAll(redis.RedisClient.prototype);
const redisClient = redis.createClient(process.env.REDIS_URL || {...config.redis, password: config.redis.pass});

module.exports = (app, logger) => {
  app.use(passport.initialize());
  if (!logger) {
    logger = console;
  }
  /* functors */
  function tokenIssuer({model, idkey, getData, jwtSecret, opts}) {
    return async (entity, done) => {
      const payload = {
        sub: entity[idkey],
        cnt: entity.auth_count,
      };

      opts = _.defaultsDeep(opts, {
        refreshTokenExpire: false, /* don't expire refresh token */
        accessTokenExpire: 60*60*24,
      });

      const accessToken = jwt.sign(payload, jwtSecret, {expiresIn: (opts.accessTokenExpire+'s')});
      const data = getData(entity);

      // renew refresh token
      const namespace = `${model.name}_refresh_token`;
      const refreshToken = (await crypto.randomBytes(16)).toString('hex');
      if (opts.refreshTokenExpire) {
        await redisClient.setexAsync(`${namespace}_${refreshToken}`, opts.refreshTokenExpire, `${entity[idkey]},${entity.auth_count}`);
      } else {
        await redisClient.setAsync(`${namespace}_${refreshToken}`, `${entity[idkey]},${entity.auth_count}`);
      }
      
      logger.log('tokenIssuer generated token', {refreshToken, namespace, accessToken});

      return done(null, accessToken, refreshToken, data);
    };
  }

  function passwordExchanger({model, idkey, getData, jwtSecret, opts}) {
    return oauth2orize.exchange.password(async (client, username, password, done) => {
      let entity;
      try {
        entity = await model.find({where: {[idkey]: username}});
      } catch (error) {
        logger.error('model find error', {message: error.message, stack: error.stack});
        return done(error);
      }

      if (!entity) {
        const error = new Error('Incorrect login');
        error.name = 'IncorrectCredentialsError';
        return done(error);
      }

      try {
        const match = await entity.comparePassword(password);
        if (!match) {
          const error = new Error('Incorrect password');
          error.name = 'IncorrectCredentialsError';
          return done(error);
        }
      } catch (error) {
        logger.error('compare password error', {message: error.message, stack: error.stack});
        return done(error);
      }
      await entity.updateAttributes({auth_count: entity.auth_count + 1});
      const issueToken = tokenIssuer({model, idkey, getData, jwtSecret, opts});
      await issueToken(entity, done.bind(this));
    });
  }

  function refreshTokenExchanger({model, idkey, getData, jwtSecret, opts}) {
    return oauth2orize.exchange.refreshToken(async (client, refreshToken, done) => {
      const namespace = `${model.name}_refresh_token`;
      logger.log('refreshTokenExchanger', {namespace, refreshToken});
      const str = await redisClient.getAsync(`${namespace}_${refreshToken}`);

      if (str === null) {
        const error = new Error('Expired refresh token');
        error.name = 'IncorrectCredentialsError';
        return done(error);
      }

      const [id, auth_count] = str.split(',').map((x) => isNaN(x) ? x : parseInt(x));

      if (!id) {
        const error = new Error('Incorrect login');
        error.name = 'IncorrectCredentialsError';
        return done(error);
      }
      const entity = await model.find({where: {[idkey]: id}});
      if (!entity) {
        const error = new Error('Incorrect login');
        error.name = 'IncorrectCredentialsError';
        return done(error);
      }

      if (entity.auth_count !== auth_count) {
        const error = new Error('Incorrect auth_count');
        return done(error);
      }

      // remove old refresh token
      await redisClient.hdelAsync(namespace, str);

      const issueToken = tokenIssuer({model, idkey, getData, jwtSecret, opts});
      await issueToken(entity, done.bind(this));
    });
  }

  function jwtStrategyFactory({model, idkey, secretOrKey}) {
    return new JwtStrategy({
      secretOrKey,
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('access_token'),
        ExtractJwt.fromBodyField('access_token'),
      ])
    }, async (jwtPayload, done) => {
      const entity = await model.find({where: {[idkey]: jwtPayload.sub}});
      if (!entity) {
        return done(null, false);
      }

      if (entity.auth_count !== jwtPayload.cnt) {
        return done(null, false);
      }

      return done(null, entity);
    });
  }

  return (opts) => {
    const oauth2Server = oauth2orize.createServer();
    const name = opts.strategyName;
    oauth2Server.exchange(passwordExchanger(opts));
    oauth2Server.exchange(refreshTokenExchanger(opts));
    oauth2Server.issueToken = tokenIssuer(opts);
    passport.use(name, jwtStrategyFactory({model: opts.model, idkey: opts.idkey, secretOrKey: opts.jwtSecret}));
    return oauth2Server;
  };
};

