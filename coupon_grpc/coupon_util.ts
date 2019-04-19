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

export const listPromotions = async ({page, limit}: { page: number, limit: number }): Promise<any> => {
  // @ts-ignore
  const request = new messages.ListPromotionRequest();
  request.setPage(page);
  request.setLimit(limit);

  try {
    // @ts-ignore
    const response: messages.ListPromotionReply = await Bluebird.fromCallback(cb =>
      client.listPromotions(request, cb)
    );
    // @ts-ignore
    const promotionList: messages.PromotionEntry[] = response.getPromotionsList();
    return {
      promotions: _.map(promotionList, promotion => convertKey(promotion.toObject())), pagination: response.getPagination().toObject()
    };
  } catch (e) {
    logger.error('listPromotions failed', e);
    return {promotions: [], pagination: {size: 0, totalElements: 0, totalPages: 0, page}};
  }
};

export const getPromotionDetail = async ({id}: { id: number }): Promise<any> => {
  // @ts-ignore
  const request = new messages.PromotionDetailRequest();
  request.setId(id);
  try {
    // @ts-ignore
    const response: messages.PromotionDetailReply = await Bluebird.fromCallback(cb =>
      client.getPromotionDetail(request, cb)
    );
    // @ts-ignore
    return convertKey(response.toObject());
  } catch (e) {
    logger.error('getPromotionDetail failed', e);
  }
};

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
  hired_only,
}: {
  code: string,
  title: string,
  description: string,
  discount_type: number,
  amount: number,
  currency: string,
  count_limit: number,
  total_count: number,
  count_check_policy: number,
  regions: [string],
  cities: [string],
  car_types: [number],
  product_types: [number],
  times: [[number, number]],
  valid_from: Date,
  valid_until: Date,
  hired_only: boolean,
}): Promise<any> => {
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
  request.setHiredOnly(hired_only);

  try {
    // @ts-ignore
    const response: messages.PromotionDetailReply = await Bluebird.fromCallback(cb =>
      client.createPromotion(request, cb)
    );
    return convertKey(response.toObject());
  } catch (e) {
    logger.error('createPromotionFailed', e);
  }
};


export const updatePromotion = async ({
  id,
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
  enabled,
  hired_only,
}: {
  id: number,
  title?: string,
  description?: string,
  discount_type?: number,
  amount?: number,
  currency?: string,
  count_limit?: number,
  total_count?: number,
  count_check_policy?: number,
  regions?: [string],
  cities?: [string],
  car_types?: [number],
  product_types?: [number],
  times?: [[number, number]],
  valid_from?: Date,
  valid_until?: Date,
  enabled?: boolean,
  hired_only?: boolean,
}): Promise<any> => {
  // @ts-ignore
  const request = new messages.UpdatePromotionRequest();
  request.setId(id);
  title != null && request.setTitle(title);
  description != null && request.setDescription(description);
  discount_type != null && request.setDiscountType(discount_type);
  amount != null && request.setAmount(amount);
  currency != null && request.setCurrency(currency);
  count_limit != null && request.setCountLimit(count_limit);
  total_count != null && request.setTotalCount(total_count);
  count_check_policy != null && request.setCountCheckPolicy(count_check_policy);
  regions != null && request.setRegionsList(regions);
  cities != null && request.setCitiesList(cities);
  car_types != null && request.setCarTypesList(car_types);
  product_types != null && request.setProductTypesList(product_types);
  times != null && request.setTimesList(
    _.map(times, timespan => {
      // @ts-ignore
      const t = new messages.Timespan();
      t.setBegin(timespan[0]);
      t.setUntil(timespan[1]);
      return t;
    })
  );
  valid_from != null && request.setValidFrom(moment(valid_from).format());
  valid_until != null && request.setValidUntil(moment(valid_until).format());
  enabled != null && request.setEnabled(enabled);
  hired_only != null && request.setHiredOnly(hired_only);

  try {
    // @ts-ignore
    const response: messages.PromotionDetailReply = await Bluebird.fromCallback(cb =>
      client.updatePromotion(request, cb)
    );
    return convertKey(response.toObject());
  } catch (e) {
    logger.error('updatePromotionFailed', e);
  }
};

export const listCoupons = async ({page, limit}: { page: number, limit: number }): Promise<any> => {
  // @ts-ignore
  const request = new messages.ListCouponRequest();
  request.setPage(page);
  request.setLimit(limit);

  try {
    // @ts-ignore
    const response: messages.ListCouponReply = await Bluebird.fromCallback(cb =>
      client.listCoupons(request, cb)
    );
    // @ts-ignore
    const couponList: messages.CouponDetailReply[] = response.getCouponsList();
    return {coupons: _.map(couponList, coupon => convertKey(coupon.toObject())), pagination: response.getPagination().toObject()};
  } catch (e) {
    logger.error('listCoupons failed', e);
    return {coupons: [], pagination: {size: 0, totalElements: 0, totalPages: 0, page}};
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
    return _.map(couponList, coupon => _.omit(convertKey(coupon.toObject()), ['id']));
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
  // @ts-ignore
  const request = new messages.IssuePromotionCouponRequest();
  request.setCode(code);
  request.setUserId(riderId);

  try {
    // @ts-ignore
    const response: messages.CouponDetail = await Bluebird.fromCallback(cb => client.issuePromotionCoupon(request, cb));
    // @ts-ignore
    return convertKey(response.toObject());
  } catch (e) {
    logger.error('issueCouponFromPromotionFailed', e);
  }
};

export const issueCoupon = async ({
  user_id,
  title,
  description,
  code,
  discount_type,
  amount,
  currency,
  regions,
  cities,
  car_types,
  product_types,
  times,
  valid_from,
  valid_until,
  hired_only
}: {
  user_id: string,
  title: string,
  description: string,
  code: string,
  discount_type: number,
  amount: number,
  currency: string,
  regions: [string],
  cities: [string],
  car_types: [number],
  product_types: [number],
  times: [[number, number]],
  valid_from?: Date|string,
  valid_until?: Date|string,
  hired_only: boolean,
}): Promise<any> => {
  // @ts-ignore
  const request = new messages.IssueCouponRequest();
  request.setUserId(user_id);
  request.setTitle(title);
  request.setDescription(description);
  request.setCode(code);
  request.setDiscountType(discount_type);
  request.setAmount(amount);
  request.setCurrency(currency);
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
  request.setValidFrom(moment(valid_from || 0).format());
  request.setValidUntil(moment(valid_until || "9999-12-01T00:00:00+09:00").format());
  request.setHiredOnly(hired_only);

  try {
    // @ts-ignore
    const response: messages.CouponDetail = await Bluebird.fromCallback(cb => client.issueCoupon(request, cb));
    // @ts-ignore
    return convertKey(response.toObject());
  } catch (e) {
    logger.error('issueCouponFailed', e);
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

export const registerCoupon = async ({
  code, // promotion code
  riderId,
}: {
  code: string;
  riderId: string;
}): Promise<any> => {
  // @ts-ignore
  const request = new messages.RegisterCouponRequest();
  request.setCode(code);
  request.setUserId(riderId);

  try {
    // @ts-ignore
    const response: messages.CouponDetail = await Bluebird.fromCallback(cb =>
      client.registerCoupon(request, cb)
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
    return {coupon: convertKey(response.getCoupon().toObject()),  logs: response.getLogsList().map((log: any) => log.toObject())};
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
