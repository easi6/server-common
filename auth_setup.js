import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import bcrypt from 'bcrypt';
import config from 'config';
import jwt from 'jsonwebtoken';
import { Strategy as JwtStrategy } from 'passport-jwt';
import { ExtractJwt as ExtractJwt } from 'passport-jwt';
import oauth2orize from 'oauth2orize';
import redis from 'redis';
import Promise from 'bluebird';
import _ from 'lodash';
import { BasicStrategy } from 'passport-http';
Promise.promisifyAll(redis.RedisClient.prototype);
const redisClient = redis.createClient(process.env.REDIS_URL || {...config.redis, password: config.redis.pass});

module.exports = (app, db) => {
  app.use(passport.initialize());

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
      const refreshToken = myutil.randomToken(16);
      await redisClient.hsetAsync(namespace, refreshToken, `${entity.id},${entity.auth_count}`);
      console.log(`tokenIssuer refreshToken=${refreshToken}, namespace=${namespace}`);

      return done(null, accessToken, refreshToken, data);
    };

  const passwordExchanger = ({model, idkey, getData, jwtSecret}) =>
    oauth2orize.exchange.password(async (client, username, password, done) => {
      let entity;
      try {
        entity = await model.find({where: {[idkey]: username}});
      } catch (error) {
        console.error(error.stack);
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
          error.name = 'IncorrectCredentials Error';
          return done(error);
        }
      } catch (error) {
        console.error(error.stack);
        return done(error);
      }

      const issueToken = tokenIssuer({model, getData, jwtSecret});
      await issueToken(entity, done.bind(this));
    });

  const refreshTokenExchanger = ({model, idkey, getData, jwtSecret}) =>
    oauth2orize.exchange.refreshToken(async (client, refreshToken, done) => {
      const namespace = `${model.name}_refresh_token`;
      console.log(`namespace=${namespace}`);
      console.log(`refresh_token=${refreshToken}`);
      const str = await redisClient.hgetAsync(namespace, refreshToken);
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
        return done(null, false);
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
    const name = opts.strategyName;
    adminOAuthServer.exchange(passwordExchanger(opts));
    adminOAuthServer.exchange(refreshTokenExchanger(opts));
    passport.use(name, jwtStrategyFactory({model: opts.model, secretOrKey: opts.jwtSecret}));
  };
};

