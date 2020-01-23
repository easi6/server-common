import Bluebird from 'bluebird';
import config from 'config';
import grpc from 'grpc';
import _ from 'lodash';
import moment, {Moment} from 'moment';
import logger from '../../../config/logger';
import {Easi6Error} from '../../err';
import * as services from './coupon_grpc_pb';
import * as messages from './coupon_pb';

const couponServiceConfig: any = config.has('coupon_service') ? config.get('coupon_service') : {};
const {serviceHost = 'localhost:6565'} = couponServiceConfig;

const client = new services.CouponServerClient(serviceHost, grpc.credentials.createInsecure());

function convertKey(obj: any) {
  const keys = _.keys(obj);
  const res: any = {};
  _.forEach(keys, (key) => {
    const matches = key.match(/(.*)List/) || key.match(/(.*)list/);
    if (matches) {
      res[matches[1]] = obj[key];
      delete obj[key];
    } else {
      res[key] = obj[key];
    }
  });
  if (res.validUntil) {
    res.validUntil = moment(res.validUntil).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
  }
  if (res.validFrom) {
    res.validFrom = moment(res.validFrom).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
  }
  return res;
}

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
  pickup,
  dest,
  paymentMethod,
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
  pickup: {latitude: number, longitude: number};
  dest?: {latitude: number, longitude: number};
  paymentMethod?: string;
}): Promise<any> => {
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
  request.setPickupLatitude(pickup.latitude);
  request.setPickupLongitude(pickup.longitude);
  if (paymentMethod) {
    request.setPaymentMethod(paymentMethod);
  }
  if (dest && dest.latitude && dest.longitude) {
    request.setDestLatitude(dest.latitude);
    request.setDestLongitude(dest.longitude);
  }

  try {
    // @ts-ignore
    const response: messages.ListAvailCouponReply = await Bluebird.fromCallback(cb =>
      client.getAvailCoupons(request, cb)
    );
    // @ts-ignore
    const couponList: messages.CouponEntry[] = response.getCouponsList();
    return _.map(couponList, coupon => _.omit(convertKey(coupon.toObject()), ['id']));
  } catch (e) {
    logger.error('availCouponFailed', e);
  }
};



export const registerCouponOrPromotion = async ({
  code, // promotion code
  riderId,
}: {
  code: string;
  riderId: string;
}): Promise<any> => {
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
    return convertKey(response.toObject());
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
        _.omit(convertKey(coupon.toObject()), ['avail', 'id'] /* avail flag is meaningless here */)
      ),
    };
  } catch (e) {
    logger.error('getMyCouponsFailed', e);
  }
};

export const startCouponUse = async ({riderId, code}: { riderId: string; code: string }): Promise<any> => {
  // @ts-ignore
  const request = new messages.StartCouponUseRequest();
  request.setUserId(riderId);
  request.setCode(code);

  try {
    // @ts-ignore
    const response: messages.CouponEntry = await Bluebird.fromCallback(cb => client.startCouponUse(request, cb));
    return convertKey(response.toObject());
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
    return convertKey(response.toObject());
  } catch (e) {
    logger.error('finishCouponUseFailed', e);
  }
};

export const checkCouponAvail = async ({
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
  pickup,
  dest,
  paymentMethod,
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
  code: string;
  skipCheck: boolean;
  pickup: {latitude: number, longitude: number};
  dest?: {latitude: number, longitude: number};
  paymentMethod?: string;
}): Promise<any> => {
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
  request.setPickupLatitude(pickup.latitude);
  request.setPickupLongitude(pickup.longitude);
  if (paymentMethod) {
    request.setPaymentMethod(paymentMethod);
  }
  if (dest && dest.latitude && dest.longitude) {
    request.setDestLatitude(dest.latitude);
    request.setDestLongitude(dest.longitude);
  }

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

export const getCouponDetail = async ({code}: { code: string }): Promise<any> => {
  // @ts-ignore
  const request = new messages.CouponDetailRequest();
  request.setCode(code);

  try {
    // @ts-ignore
    const response: messages.CouponDetailReply = await Bluebird.fromCallback(cb => client.getCouponDetail(request, cb));
    return convertKey(response.getCoupon().toObject());
  } catch (e) {
    logger.error('getCouponDetailFailed', e);
    return {coupon: null, logs: []};
  }
};

export const cancelCouponUse = async ({riderId, code}: { riderId: string; code: string }): Promise<any> => {
  // @ts-ignore
  const request = new messages.CancelCouponUseRequest();
  request.setUserId(riderId);
  request.setCode(code);

  try {
    // @ts-ignore
    const response: messages.CouponEntry = await Bluebird.fromCallback(cb => client.cancelCouponUse(request, cb));
    return convertKey(response.toObject());
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

export const checkImplicitPromotion = async ({
  carType,
  productType,
  region,
  city,
  fare,
  currency,
  datetime,
  timezone,
  riderId,
  paymentMethod,
  pickup,
  dest,
}: {
  carType: number,
  productType: number,
  region: string,
  city: string,
  fare: number,
  currency: string,
  datetime: Date | Moment,
  timezone: number,
  riderId: string,
  paymentMethod: string,
  pickup: {latitude: number, longitude: number},
  dest?: {latitude: number, longitude: number},
}): Promise<any> => {

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
  request.setPaymentMethod(paymentMethod);
  request.setPickupLatitude(pickup.latitude);
  request.setPickupLongitude(pickup.longitude);
  if (dest && dest.latitude && dest.longitude) {
    request.setDestLatitude(dest.latitude);
    request.setDestLongitude(dest.longitude);
  }

  try {
    // @ts-ignore
    const response: messages.CheckCouponReply = await Bluebird.fromCallback(cb => client.checkImplicitPromotion(request, cb));
    return response.toObject();
  } catch (e) {
    logger.error('checkImplicitPromotion', e);
    return {
      applicable: false,
      originalPrice: 0,
      discountedPrice: 0,
      title: null
    };
  }
};