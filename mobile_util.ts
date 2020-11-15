import config from 'config';
import rp from 'request-promise';
import * as URL from 'url';
import logger from '../../config/logger';
import _ from 'lodash';

const mobileSvcConfig: any = config.has('mobile_service')
  ? config.get('mobile_service')
  : {
      protocol: 'http',
      hostname: 'localhost',
      port: 18012,
    };

const request = rp.defaults({
  baseUrl: URL.format(mobileSvcConfig),
  json: true,
});

export const registerMobile = async (
  {
    token,
    locale = 'en',
    os,
    osSubType,
    osVersion,
    appType,
    appVersion,
    imei,
    rooted,
  }: {
    token: string;
    locale: string;
    os?: 'ios' | 'android';
    osSubType?: 'simulator' | 'huawei';
    osVersion?: string;
    appType: 'rider' | 'driver';
    appVersion: string;
    imei?: string;
    rooted?: boolean;
  },
  accessToken?: string,
  headers?: any
) => {
  const body = {
    token,
    locale,
    os,
    osSubType,
    osVersion,
    appType,
    appVersion,
    imei,
    rooted,
  };

  let auth;
  if (accessToken) {
    auth = { bearer: accessToken };
  }
  try {
    const opts: any = {
      body,
    };
    if (auth) {
      opts.auth = auth;
    }
    if (headers) {
      opts.headers = _.omit(headers, ['content-length', 'Content-Length']);
    }

    const mobile = await request.post('/v1/mobiles', opts);
    return mobile;
  } catch (err) {
    logger.warn(`register mobile failed ${err.message}`);
  }
};

export const getAllMobiles = (uuid: string) => {
    return request.get(`/v1/users/${uuid}/mobiles:all`).catch((err) => {
      logger.warn(`get all mobiles of user=${uuid} error: ${err.message}`);
      return [];
    });
};

export const getMobiles = async (
  {
    userId,
    appType,
    os,
  }: {
    userId: string;
    os?: 'ios' | 'android';
    appType?: 'rider' | 'driver';
  },
  headers?: any
) => {
  try {
    const mobiles = await request.get({
      uri: `/v1/users/${userId}/mobiles`,
      qs: { os, appType },
      ...(headers || {}),
    });
    return mobiles;
  } catch (err) {
    logger.warn(`get all mobiles of user=${userId} error: ${err.message}`);
    return [];
  }
};

export const updateTopic = async({
  status, region, driverType, locale = 'en', unsubscribeFromOldTopics = true
}: {
  status: string;
  region: string;
  driverType: string;
  locale: string;
  unsubscribeFromOldTopics: boolean;
},
  accessToken?: string,
  headers?: any
) => {
  let auth;
  if (accessToken) {
    auth = { bearer: accessToken };
  }

  const body = {
    status,
    region,
    driverType,
    locale,
    unsubOld: unsubscribeFromOldTopics
  };

  const opts: any = {
    body
  };
  if (headers) {
    opts.headers = _.omit(headers, ['content-length', 'Content-Length']);
  }
  if (auth) {
    opts.auth = auth;
  }

  const mobiles = await request.post('/v1/topics:subscribe', opts);
  return mobiles;
};