import config from 'config';
import _ from 'lodash';
import request from 'request-promise';
import URL from 'url';
import uuidv4 from 'uuid/v4';

const accountSvcHttpConfig = _.pick(
  config.has('account_service')
    ? config.get('account_service')
    : {
        protocol: 'http:',
        hostname: 'localhost',
        port: 8081,
      },
  ['protocol', 'hostname', 'port', 'pathname']
);
export const accountSvcRequest = request.defaults({
  baseUrl: URL.format(accountSvcHttpConfig),
  json: true,
});

export const getAuthorization = (authHeader: object) => {
  // repsonse example
  /*
  {
    "authorities": [
      {
        "authority": "ROLE_INSECURE_USER"
      }
    ],
    ...
    "principal": "bb3058dc-c543-4e7c-b0eb-fe9b7a5164b7",
    "oauth2Request": {
      "clientId": "tada-rider-app",
      "scope": [ "read", "write", "trust" ],
      "requestParameters": {
        "client_id": "tada-rider-app"
      },
      ...
    },
    "name": "bb3058dc-c543-4e7c-b0eb-fe9b7a5164b7"
  }
 */
  return accountSvcRequest({
    headers: { authorization: authHeader },
    uri: '/v1/accounts/me/authorize',
    method: 'get',
  }).then(authentication => ({
    authInfo: {
      ...authentication.oauth2Request,
      app:
        authentication.oauth2Request.clientId === 'tada-rider-app' ||
        authentication.oauth2Request.clientId === 'tada_customer_app'
          ? 'tada_customer_app'
          : 'tada_driver_app',
    },
    principal: authentication.principal,
    authority: _.get(authentication, 'authorities[0].authority'),
  }));
};

export const signup = (signupDto: {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  uuid?: string;

  isRider: boolean;

  // facebook account kit access token
  akfAccessToken: string;

  // facebook or google auth use case these fields
  provider?: string;
  identifier?: string;
  appId?: string;
  idtoken?: string;
  accessToken?: string;
}) => {
  let basicUser;
  let basicPassword;
  if (signupDto.isRider) {
    basicUser = 'tada-rider-app';
    basicPassword = 'tada-rider-app-secret12345';
  } else {
    basicUser = 'tada-driver-app';
    basicPassword = 'tada-driver-app-secret12345';
  }

  if (!signupDto.uuid) {
    signupDto.uuid = uuidv4();
  }

  // response example
  /*
  {
    "firstName": "Jaehwa",
    "lastName": "Han",
    "email": "drh@snu.ac.kr",
    "phone": "+821031808148",
    "authorities": [
      "ROLE_INSECURE_USER"
    ],
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."
  }
   */

  if (signupDto.akfAccessToken) {
    delete signupDto.phone;
  }
  return accountSvcRequest({
    auth: {
      user: basicUser,
      pass: basicPassword,
    },
    uri: '/v1/accounts',
    method: 'post',
    body: { ...signupDto, authority: signupDto.isRider ? 'ROLE_INSECURE_USER' : 'ROLE_PRE_DRIVER' },
  }).then(response => ({
    email: _.get(response, 'email'),
    oauth: { access_token: _.get(response, 'accessToken'), refresh_token: _.get(response, 'refreshToken') },
    authority: _.get(response, 'authorities[0]'),
    uuid: _.get(response, 'uuid'),
  }));
};

export const uuidGrantAccessToken = ({ uuid, appId }: { uuid: string; appId: string }) => {
  let basicUser;
  let basicPassword;

  if (appId === 'tada_customer_app') {
    basicUser = 'tada-rider-app';
    basicPassword = 'tada-rider-app-secret12345';
  } else {
    basicUser = 'tada-driver-app';
    basicPassword = 'tada-driver-app-secret12345';
  }

  return accountSvcRequest({
    auth: {
      user: basicUser,
      pass: basicPassword,
    },
    uri: '/v1/oauth/token',
    method: 'post',
    form: {
      grant_type: 'uuid',
      passcode: 'i*CUtJ6q',
      uuid,
    },
  }).then(({ access_token, refresh_token }) => ({
    access_token,
    refresh_token,
  }));
};

export const refreshTokenGrantAccessToken = ({ refreshToken, appId }: { refreshToken: string; appId: string }) => {
  let basicUser;
  let basicPassword;

  if (appId === 'tada_customer_app') {
    basicUser = 'tada-rider-app';
    basicPassword = 'tada-rider-app-secret12345';
  } else {
    basicUser = 'tada-driver-app';
    basicPassword = 'tada-driver-app-secret12345';
  }

  return accountSvcRequest({
    auth: {
      user: basicUser,
      pass: basicPassword,
    },
    uri: '/v1/oauth/token',
    method: 'post',
    form: {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    },
  }).then(({ access_token, refresh_token }) => ({
    access_token,
    refresh_token,
  }));
};

export const updateAccount = ({
  firstName,
  lastName,
  accessToken,
  authorization,
}: {
  firstName?: string;
  lastName?: string;
  accessToken?: string;
  authorization?: string;
}) => {
  return accountSvcRequest({
    ...(accessToken && { auth: { bearer: accessToken } }),
    ...(authorization && { headers: { authorization } }),
    uri: '/v1/accounts/me',
    method: 'put',
    body: {
      firstName,
      lastName,
    },
  });
};
