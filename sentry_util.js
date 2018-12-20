
import _ from 'lodash';
import util from 'util';
import winston from 'winston';
import * as Sentry from '@sentry/node';

const isProd = process.env.NODE_ENV === 'production';
const commitHash = process.env.COMMIT_HASH;

export const initialize = (opts = {}) => {
  const initOpts = _.defaults(opts, {
    debug: !isProd,
    enabled: isProd,
    release: commitHash,
  });
  Sentry.init(initOpts);
};

export const captureException = (err) => {
  Sentry.captureException(err);
};

export const BreadcrumbTransport = winston.transports.BreadcrumbTransport = function (options) {
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
};

//
// Inherit from `winston.Transport` so you can take advantage
// of the base functionality and `.handleExceptions()`.
//
util.inherits(BreadcrumbTransport, winston.Transport);

BreadcrumbTransport.prototype.log = function (level, msg, meta, callback) {
  Sentry.addBreadcrumb({
    level,
    message: msg,
    data: meta,
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
