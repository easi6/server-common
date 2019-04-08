import Bluebird from 'bluebird';
import config from 'config';
import grpc from 'grpc';
import _ from 'lodash';
import moment, { Moment } from 'moment';
import logger from '../../config/logger';
import { Easi6Error } from '../err';
import * as services from '../proto_gen/coupon_grpc_pb';
import * as messages from '../proto_gen/coupon_pb';

const couponServiceConfig: any = config.has('coupon_service') ? config.get('coupon_service') : {};
const { serviceHost = 'localhost:6565' } = couponServiceConfig;

export const createPromotion = async ({
  code,
  title,
  description,
  discount_type,
  amount,
  currency,
  count_limit,
  total_count,
  count_check_policy,
  regions,
  cities,
  car_types,
  product_types,
  times,
  valid_from,
  valid_until,
}: {
  code: string;
  title: string;
  description: string;
  discount_type: number;
  amount: number;
  currency: string;
  count_limit: number;
  total_count: number;
  count_check_policy: number;
  regions: [string];
  cities: [string];
  car_types: [number];
  product_types: [number];
  times: [[number, number]];
  valid_from: Date;
  valid_until: Date;
}): Promise<any> => {
  const client = new services.CouponServerClient(serviceHost, grpc.credentials.createInsecure());
  // @ts-ignore
  const request = new messages.CreatePromotionRequest();
  request.setCode(code);
  request.setTitle(title);
  request.setDescription(description);
  request.setDiscountType(discount_type);
  request.setAmount(amount);
  request.setCurrency(currency);
  request.setCountLimit(count_limit);
  request.setTotalCount(total_count);
  request.setCountCheckPolicy(count_check_policy);
  request.setRegionsList(regions);
  request.setCitiesList(cities);
  request.setCarTypesList(car_types);
  request.setProductTypesList(product_types);
  request.setTimesList(
    _.map(times, timespan => {
      // @ts-ignore
      const t = new messages.Timespan();
      t.setBegin(timespan[0]);
      t.setUntil(timespan[1]);
      return t;
    })
  );
  request.setValidFrom(moment(valid_from).format());
  request.setValidUntil(moment(valid_until).format());

  try {
    // @ts-ignore
    const response: messages.PromotionDetailReply = await Bluebird.fromCallback(cb =>
      client.createPromotion(request, cb)
    );
    return response.toObject();
  } catch (e) {
    logger.error('createPromotionFailed', e);
  }
};

export const getAvailCoupons = async ({
  carType,
  productType,
  region,
  city,
  fare,
  currency,
  datetime,
  timezone,
  riderId,
}: {
  carType: number;
  productType: number;
  region: string;
  city: string;
  fare: number;
  currency: string;
  datetime: Date;
  timezone: number;
  riderId: string;
}): Promise<any> => {
  const client = new services.CouponServerClient(serviceHost, grpc.credentials.createInsecure());

  // stuffing request
  // @ts-ignore
  const request = new messages.AvailCouponRequest();
  request.setCarType(carType);
  request.setProductType(productType);
  request.setRegion(region);
  request.setCity(city);
  request.setFare(fare);
  request.setCurrency(currency);
  request.setDatetime(moment(datetime).format());
  request.setTimezone(timezone);
  request.setUserId(riderId);

  try {
    // @ts-ignore
    const response: messages.ListAvailCouponReply = await Bluebird.fromCallback(cb =>
      client.getAvailCoupons(request, cb)
    );
    // @ts-ignore
    const couponList: messages.CouponEntry[] = response.getCouponsList();
    return _.map(couponList, coupon => _.omit(coupon.toObject(), ['id']));
  } catch (e) {
    logger.error('availCouponFailed', e);
  }
};

export const issueCouponFromPromotion = async ({
  code, // promotion code
  riderId,
}: {
  code: string;
  riderId: string;
}): Promise<any> => {
  const client = new services.CouponServerClient(serviceHost, grpc.credentials.createInsecure());

  // @ts-ignore
  const request = new messages.IssuePromotionCouponRequest();
  request.setCode(code);
  request.setUserId(riderId);

  try {
    // @ts-ignore
    const response: messages.CouponDetail = await Bluebird.fromCallback(cb => client.issuePromotionCoupon(request, cb));
    // @ts-ignore
    return response.toObject();
  } catch (e) {
    logger.error('issueCouponFromPromotionFailed', e);
  }
};

export const registerCouponOrPromotion = async ({
  code, // promotion code
  riderId,
}: {
  code: string;
  riderId: string;
}): Promise<any> => {
  const client = new services.CouponServerClient(serviceHost, grpc.credentials.createInsecure());

  // @ts-ignore
  const request = new messages.IssuePromotionCouponRequest();
  request.setCode(code);
  request.setUserId(riderId);

  try {
    // @ts-ignore
    const response: messages.CouponDetail = await Bluebird.fromCallback(cb =>
      client.registerCouponOrPromotion(request, cb)
    );
    // @ts-ignore
    return response.toObject();
  } catch (e) {
    logger.error('registerCouponOrPromotionFailed', e);
    if (e.message.includes('issue count exceeded')) {
      throw new Easi6Error('coupon_issue_count_exceeded');
    } else if (e.message.includes('total count exceeded')) {
      throw new Easi6Error('coupon_total_count_exceeded');
    } else {
      throw new Easi6Error('not_found', 'coupon');
    }
  }
};

export const getMyCoupons = async ({
  riderId,
  validAfter,
  page,
  limit,
}: {
  riderId: string;
  validAfter: Date | Moment;
  page: number;
  limit: number;
}): Promise<any> => {
  const client = new services.CouponServerClient(serviceHost, grpc.credentials.createInsecure());

  const validAfterMoment = moment(validAfter).isValid() ? moment(validAfter) : moment();

  // @ts-ignore
  const request = new messages.ListCouponRequest();
  request.setUserId(riderId);
  request.setValid(validAfterMoment.unix());
  request.setPage(page);
  request.setLimit(limit);

  try {
    // @ts-ignore
    const response: messages.ListCouponReply = await Bluebird.fromCallback(cb => client.getMyCoupons(request, cb));
    // @ts-ignore
    const couponList: messages.CouponEntry[] = response.getCouponsList();
    return {
      hasNext: response.getHasNext(),
      coupons: _.map(couponList, coupon =>
        _.omit(coupon.toObject(), ['avail', 'id'] /* avail flag is meaningless here */)
      ),
    };
  } catch (e) {
    logger.error('getMyCouponsFailed', e);
  }
};

export const startCouponUse = async ({ riderId, code }: { riderId: string; code: string }): Promise<any> => {
  const client = new services.CouponServerClient(serviceHost, grpc.credentials.createInsecure());

  // @ts-ignore
  const request = new messages.StartCouponUseRequest();
  request.setUserId(riderId);
  request.setCode(code);

  try {
    // @ts-ignore
    const response: messages.CouponEntry = await Bluebird.fromCallback(cb => client.startCouponUse(request, cb));
    return response.toObject();
  } catch (e) {
    logger.error('startCouponUseFailed', e);
  }
};

export const finishCouponUse = async ({
  riderId,
  code,
  originalPrice,
  discountedPrice,
  rentalNumber,
}: {
  riderId: string;
  code: string;
  originalPrice: number;
  discountedPrice: number;
  rentalNumber: string;
}): Promise<any> => {
  const client = new services.CouponServerClient(serviceHost, grpc.credentials.createInsecure());

  // @ts-ignore
  const request = new messages.FinishCouponUseRequest();
  request.setUserId(riderId);
  request.setCode(code);
  request.setOriginalPrice(originalPrice);
  request.setDiscountedPrice(discountedPrice);
  request.setRentalNumber(rentalNumber);

  try {
    // @ts-ignore
    const response: messages.CouponEntry = await Bluebird.fromCallback(cb => client.finishCouponUse(request, cb));
    return response.toObject();
  } catch (e) {
    logger.error('finishCouponUseFailed', e);
  }
};

export const checkCouponAvail = async ({
  rentalNumber,
  carType,
  productType,
  region,
  city,
  fare,
  currency,
  datetime,
  timezone,
  riderId,
  code,
  skipCheck,
}: {
  rentalNumber: number;
  carType: number;
  productType: number;
  region: string;
  city: string;
  fare: number;
  currency: string;
  datetime: Date;
  timezone: number;
  riderId: string;
  code: string;
  skipCheck: boolean;
}): Promise<any> => {
  const client = new services.CouponServerClient(serviceHost, grpc.credentials.createInsecure());

  // @ts-ignore
  const request = new messages.CheckCouponAvailRequest();
  request.setCarType(carType);
  request.setProductType(productType);
  request.setRegion(region);
  request.setCity(city);
  request.setDatetime(moment(datetime).format());
  request.setFare(fare);
  request.setCurrency(currency);
  request.setTimezone(timezone);
  request.setUserId(riderId);
  request.setCode(code); // coupon code
  request.setSkipValidityCheck(skipCheck);

  try {
    // @ts-ignore
    const response: messages.CheckCouponReply = await Bluebird.fromCallback(cb => client.checkCouponAvail(request, cb));
    const res = response.toObject();
    logger.verbose('checkCouponAvail response', res);
    return res;
  } catch (e) {
    logger.error('checkCouponAvailFailed', e);
  }
};

export const getCouponDetail = async ({ code }: { code: string }): Promise<any> => {
  const client = new services.CouponServerClient(serviceHost, grpc.credentials.createInsecure());

  // @ts-ignore
  const request = new messages.CouponDetailRequest();
  request.setCode(code);

  try {
    // @ts-ignore
    const response: messages.CouponDetailReply = await Bluebird.fromCallback(cb => client.getCouponDetail(request, cb));
    return _.pick(_.get(response.toObject(), 'coupon') as any, [
      'title',
      'description',
      'imageUrl',
      'status',
      'code',
      'discountType',
      'amount',
      'currency',
      'validUntil',
    ]);
  } catch (e) {
    logger.error('getCouponDetailFailed', e);
  }
};

export const cancelCouponUse = async ({ riderId, code }: { riderId: string; code: string }): Promise<any> => {
  const client = new services.CouponServerClient(serviceHost, grpc.credentials.createInsecure());

  // @ts-ignore
  const request = new messages.CancelCouponUseRequest();
  request.setUserId(riderId);
  request.setCode(code);

  try {
    // @ts-ignore
    const response: messages.CouponEntry = await Bluebird.fromCallback(cb => client.cancelCouponUse(request, cb));
    return response.toObject();
  } catch (e) {
    logger.error('cancelCouponUseUseFailed', e);
  }
};

export const getMyCouponCount = async ({
  riderId,
  validAfter,
}: {
  riderId: string;
  validAfter: Date | Moment;
}): Promise<any> => {
  const client = new services.CouponServerClient(serviceHost, grpc.credentials.createInsecure());
  const validAfterMoment = moment(validAfter).isValid() ? moment(validAfter) : moment();

  // @ts-ignore
  const request = new messages.CouponCountRequest();
  request.setUserId(riderId);
  request.setValid(validAfterMoment.unix());

  try {
    // @ts-ignore
    const response: messages.CouponCountReply = await Bluebird.fromCallback(cb => client.getMyCouponCount(request, cb));
    return response.getCount();
  } catch (e) {
    logger.error('getMyCouponCountFailed', e);
    return 0;
  }
};
