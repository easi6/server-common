import config from "config";
import request from "request-promise";
import URL from "url";

const corporateServiceConfig: any = config.has('corporate_service') ? config.get('corporate_service') : {
  protocol: 'http:',
  hostname: 'localhost',
  port: 8080,
  pathname: '/v1',
};

export const corporateSvcRequest = request.defaults({
  baseUrl: URL.format(corporateServiceConfig),
  json: true,
});
