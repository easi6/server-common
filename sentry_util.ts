import * as Sentry from '@sentry/node';
import * as Integrations from '@sentry/integrations';
import _ from 'lodash';
import util, { inspect } from 'util';
// @ts-ignore
import winston from 'winston';

const isProd = process.env.NODE_ENV === 'production';
const commitHash = process.env.COMMIT_HASH;

export const initialize = (opts = {}) => {
  const initOpts = _.defaults(opts, {
    debug: !isProd,
    enabled: isProd,
    release: commitHash,
    integrations: [new Integrations.ExtraErrorData(), new Integrations.RewriteFrames({ root: global.__rootdir__ })],
  });
  Sentry.init(initOpts);
};

export const captureException = (err: any, locale: string, clientIp?: string, user?: any) => {
  try {
    Sentry.configureScope((scope: any) => {
      scope.setTag('locale', locale);
      scope.setUser({
        ..._.pick(user, ['id', 'email']),
        ip_address: clientIp,
      });
    });
    Sentry.captureException(err);
  } catch (e) {
    console.error(e.stack);
  }
};

// @ts-ignore
export const BreadcrumbTransport = (winston.transports.BreadcrumbTransport = function(options: any) {
  //
  // Name this logger
  //
  this.name = 'sentryBreadcrumbTransport';

  //
  // Set the level from your options
  //
  this.level = options.level || 'info';

  //
  // Configure your storage backing as you see fit
  //
});

//
// Inherit from `winston.Transport` so you can take advantage
// of the base functionality and `.handleExceptions()`.
//
util.inherits(BreadcrumbTransport, winston.Transport);

BreadcrumbTransport.prototype.log = (
  level: Sentry.Severity,
  msg: string,
  meta: any,
  callback: (arg1: any, arg2: boolean) => void
) => {
  Sentry.addBreadcrumb({
    level,
    message: msg,
    data: inspect(meta),
  });
  //
  // Store this message and metadata, maybe use some custom logic
  // then callback indicating success.
  //
  callback(null, true);
};

export const CrashReportUtil = {
  initialize,
  captureException,
  BreadcrumbTransport,
};

export default CrashReportUtil;
