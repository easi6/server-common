import passport from 'passport';
import config from 'config';
import jwt from 'jsonwebtoken';
import {ExtractJwt as ExtractJwt, Strategy as JwtStrategy} from 'passport-jwt';
import oauth2orize from 'oauth2orize';
import redis from 'redis';
import Promise from 'bluebird';
import crypto from 'crypto';

Promise.promisifyAll(redis.RedisClient.prototype);
const redisClient = redis.createClient(process.env.REDIS_URL || {...config.redis, password: config.redis.pass});

module.exports = (app, logger) => {
  app.use(passport.initialize());
  if (!logger) {
    logger = console;
  }
  /* functors */
  const tokenIssuer = ({model, getData, jwtSecret}) =>
    async (entity, done) => {
      const payload = {
        sub: entity.id,
        cnt: entity.auth_count,
      };

      const accessToken = jwt.sign(payload, jwtSecret, {expiresIn: '1800s'});
      const data = getData(entity);

      // renew refresh token
      const namespace = `${model.name}_refresh_token`;
      const refreshToken = (await crypto.randomBytes(16)).toString('hex');
      await redisClient.setexAsync(`${namespace}_${refreshToken}`, 60*60*3, `${entity.id},${entity.auth_count}`);
      logger.log('tokenIssuer generated token', {refreshToken, namespace, accessToken});

      return done(null, accessToken, refreshToken, data);
    };

  const passwordExchanger = ({model, idkey, getData, jwtSecret}) =>
    oauth2orize.exchange.password(async (client, username, password, done) => {
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
      const issueToken = tokenIssuer({model, getData, jwtSecret});
      await issueToken(entity, done.bind(this));
    });

  const refreshTokenExchanger = ({model, idkey, getData, jwtSecret}) =>
    oauth2orize.exchange.refreshToken(async (client, refreshToken, done) => {
      const namespace = `${model.name}_refresh_token`;
      logger.log('refreshTokenExchanger', {namespace, refreshToken});
      const str = await redisClient.getAsync(`${namespace}_${refreshToken}`);

      if (str === null) {
        const error = new Error('Expired refresh token');
        error.name = 'IncorrectCredentialsError';
        return done(error);
      }

      const [id, auth_count] = str.split(',').map((x) => parseInt(x));

      if (!id) {
        const error = new Error('Incorrect login');
        error.name = 'IncorrectCredentialsError';
        return done(error);
      }
      const entity = await model.find({where: {id}});
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

      const issueToken = tokenIssuer({model, getData, jwtSecret});
      await issueToken(entity, done.bind(this));
    });

  const jwtStrategyFactory = ({model, secretOrKey}) =>
    new JwtStrategy({secretOrKey, jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()}, async (jwtPayload, done) => {
      const entity = await model.find({where: {id: jwtPayload.sub}});
      if (!entity) {
        return done(null, false);
      }

      if (entity.auth_count !== jwtPayload.cnt) {
        return done(null, false);
      }

      return done(null, entity);
    });

  return (opts) => {
    const oauth2Server = oauth2orize.createServer();
    const name = opts.strategyName;
    oauth2Server.exchange(passwordExchanger(opts));
    oauth2Server.exchange(refreshTokenExchanger(opts));
    oauth2Server.issueToken = tokenIssuer(opts);
    passport.use(name, jwtStrategyFactory({model: opts.model, secretOrKey: opts.jwtSecret}));
    return oauth2Server;
  };
};

