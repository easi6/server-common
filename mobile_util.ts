import config from 'config';
import rp from 'request-promise';
import * as URL from 'url';
import logger from '../../config/logger';

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
  }: {
    token: string;
    locale: string;
    os?: 'ios' | 'android';
    osSubType?: 'simulator' | 'huawei';
    osVersion?: string;
    appType: 'rider' | 'driver';
    appVersion: string;
    imei?: string;
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
  };

  let auth;
  if (accessToken) {
    auth = { bearer: accessToken };
  }
  try {
    const opts: any = {
      body,
      headers,
    };
    if (auth) {
      opts.auth = auth;
    }

    const mobile = await request.post('/v1/mobiles', opts);
    return mobile;
  } catch (err) {
    logger.warn(`register mobile failed ${err.message}`);
  }
};

export const getAllMobiles = (uuid: string) => {
  try {
    return request.get(`/v1/users/${uuid}/mobiles:all`);
  } catch (err) {
    logger.warn(`get all mobiles of user=${uuid} error: ${err.message}`);
    return [];
  }
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
