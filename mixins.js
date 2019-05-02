import { DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import _ from 'lodash';

const mixins = {
  authMixin: locales => (identifier, opts = {}) => ({
    [identifier.column]: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      ...identifier.options,
    },
    password_hashed: {
      type: DataTypes.STRING,
      allowNull: false,
      roles: {
        admin: false,
        user: false,
        conn: false,
      },
      ...opts.password_hashed
    },
    auth_count: {
      // used for jwt verification per app
      type: opts.multiple_auth_count ? DataTypes.STRING(255) : DataTypes.INTEGER,
      allowNull: false,
      defaultValue: opts.multiple_auth_count ? '{}' : 0,
      ...(opts.multiple_auth_count
        ? {
            get() {
              return JSON.parse(this.getDataValue('auth_count') || 'null');
            },
            set(v) {
              this.setDataValue('auth_count', JSON.stringify(v || null));
            },
          }
        : {}),
      roles: {
        admin: true,
        user: false,
        conn: false,
      },
    },
    ...(opts.locale
      ? {
          locale: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: opts.defaultLocale ? opts.defaultLocale : 'en',
            validate: {
              isIn: [locales],
            },
          },
        }
      : {}),
    ...(opts.resettable
      ? {
          old_reset_token: {
            type: DataTypes.STRING, // for checking already password is changed with token
            roles: {
              admin: true,
              user: false,
              conn: false,
            },
          },
          reset_token: {
            type: DataTypes.STRING,
            roles: {
              admin: true,
              user: false,
              conn: false,
            },
          },
          reset_token_created_at: {
            type: DataTypes.DATE,
            roles: {
              admin: true,
              user: false,
              conn: false,
            },
          },
        }
      : {}),
  }),

  authMixinMethods: (model, { resettable, noTokenError, oldTokenError }) => {
    model.prototype.comparePassword = async function(password) {
      return await bcrypt.compare(password, this.password_hashed);
    };

    if (resettable) {
      model.prototype._resetPassword = function(newPassword, opts = {}) {
        return this.updateAttributes(
          {
            password: newPassword,
            reset_token: null,
            old_reset_token: this.reset_token,
          },
          opts
        );
      };

      model.prototype.checkAndResetPassword = function(resetToken, newPassword, opts = {}) {
        if (this.reset_token && this.reset_token === resetToken) {
          return this._resetPassword(newPassword, opts);
        }
        if (this.old_reset_token && this.old_reset_token === resetToken) {
          throw oldTokenError;
        }
        throw noTokenError;
      };

      model.prototype.generateResetToken = async function(opts = {}) {
        let resetToken;
        if (
          this.reset_token_created_at &&
          this.reset_token &&
          new Date() - this.reset_token_created_at < 30 * 60 * 1000
        ) {
          // don't generate new token in 30mins
          resetToken = this.reset_token;
        } else {
          resetToken = (await crypto.randomBytes(16)).toString('hex'); // 32 digits hex string
        }
        return this.updateAttributes({ reset_token: resetToken, reset_token_created_at: new Date() }, opts);
      };
    }

    model.hook('beforeUpdate', 'changeAuthCount', instance => {
      if (instance.changed('password_hashed')) {
        if (model.rawAttributes.auth_count.type instanceof DataTypes.INTEGER) {
          instance.auth_count += 1;
        } else {
          instance.auth_count = _.reduce(instance.auth_count, (s, v, k) => ((s[k] = (v || 0) + 1), s), {});
        }
      }
    });
  },

  geoMixin: () => ({
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
      defaultValue: 0.0,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
      defaultValue: 0.0,
    },
    coord_type: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      // COORD_UNKNOWN = -1;
      // COORD_BAIDU = 0;
      // COORD_GOOGLE = 1;
    },
  }),

  i18nMixin: locales => (name, makePure = false, type = DataTypes.STRING) =>
    locales.reduce(
      (acc, locale) => ({
        ...acc,
        [`${name}_${locale}`]: {
          type,
        },
      }),
      makePure ? { [name]: { type, allowNull: false } } : {}
    ),
};

module.exports = mixins;
