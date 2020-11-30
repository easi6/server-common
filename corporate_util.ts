import config from "config";
import request from "request-promise";
import URL from "url";
import * as messages from "../proto_gen/corporate_pb";
import Bluebird from "bluebird";
import logger from "../../config/logger";
import * as services from "../proto_gen/corporate_grpc_pb";
import * as grpcConfig from "../../config/grpc";
import grpc from "grpc";

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

const client = new services.CorporateClient(
  grpcConfig.grpcHost('corporate_service'),
  grpc.credentials.createInsecure(),
  grpcConfig.grpcClientConfig()
);

export const getCorporateMember = async (riderUuid: string): Promise<any> => {
  try {
    // @ts-ignore
    const getCorporateMemberRequest = new messages.GetCorporateMemberRequest();
    getCorporateMemberRequest.setUserId(riderUuid);

    // @ts-ignore
    const response: messages.CorporateMemberEntry = await Bluebird.fromCallback(cb =>
      client.getCorporateMember(getCorporateMemberRequest, cb)
    );

    return response.toObject();
  } catch (e) {
    logger.error('getCorporateMember err', e);
    return null;
  }
};
