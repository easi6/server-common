// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var coupon_pb = require('./coupon_pb.js');

function serialize_coupon_AvailCouponRequest(arg) {
  if (!(arg instanceof coupon_pb.AvailCouponRequest)) {
    throw new Error('Expected argument of type coupon.AvailCouponRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_coupon_AvailCouponRequest(buffer_arg) {
  return coupon_pb.AvailCouponRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_coupon_CancelCouponUseRequest(arg) {
  if (!(arg instanceof coupon_pb.CancelCouponUseRequest)) {
    throw new Error('Expected argument of type coupon.CancelCouponUseRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_coupon_CancelCouponUseRequest(buffer_arg) {
  return coupon_pb.CancelCouponUseRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_coupon_CheckCouponAvailRequest(arg) {
  if (!(arg instanceof coupon_pb.CheckCouponAvailRequest)) {
    throw new Error('Expected argument of type coupon.CheckCouponAvailRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_coupon_CheckCouponAvailRequest(buffer_arg) {
  return coupon_pb.CheckCouponAvailRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_coupon_CheckCouponReply(arg) {
  if (!(arg instanceof coupon_pb.CheckCouponReply)) {
    throw new Error('Expected argument of type coupon.CheckCouponReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_coupon_CheckCouponReply(buffer_arg) {
  return coupon_pb.CheckCouponReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_coupon_CouponCountReply(arg) {
  if (!(arg instanceof coupon_pb.CouponCountReply)) {
    throw new Error('Expected argument of type coupon.CouponCountReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_coupon_CouponCountReply(buffer_arg) {
  return coupon_pb.CouponCountReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_coupon_CouponCountRequest(arg) {
  if (!(arg instanceof coupon_pb.CouponCountRequest)) {
    throw new Error('Expected argument of type coupon.CouponCountRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_coupon_CouponCountRequest(buffer_arg) {
  return coupon_pb.CouponCountRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_coupon_CouponDetail(arg) {
  if (!(arg instanceof coupon_pb.CouponDetail)) {
    throw new Error('Expected argument of type coupon.CouponDetail');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_coupon_CouponDetail(buffer_arg) {
  return coupon_pb.CouponDetail.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_coupon_CouponDetailReply(arg) {
  if (!(arg instanceof coupon_pb.CouponDetailReply)) {
    throw new Error('Expected argument of type coupon.CouponDetailReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_coupon_CouponDetailReply(buffer_arg) {
  return coupon_pb.CouponDetailReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_coupon_CouponDetailRequest(arg) {
  if (!(arg instanceof coupon_pb.CouponDetailRequest)) {
    throw new Error('Expected argument of type coupon.CouponDetailRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_coupon_CouponDetailRequest(buffer_arg) {
  return coupon_pb.CouponDetailRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_coupon_CouponEntry(arg) {
  if (!(arg instanceof coupon_pb.CouponEntry)) {
    throw new Error('Expected argument of type coupon.CouponEntry');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_coupon_CouponEntry(buffer_arg) {
  return coupon_pb.CouponEntry.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_coupon_CouponWithPromotionReply(arg) {
  if (!(arg instanceof coupon_pb.CouponWithPromotionReply)) {
    throw new Error('Expected argument of type coupon.CouponWithPromotionReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_coupon_CouponWithPromotionReply(buffer_arg) {
  return coupon_pb.CouponWithPromotionReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_coupon_IssuePromotionCouponRequest(arg) {
  if (!(arg instanceof coupon_pb.IssuePromotionCouponRequest)) {
    throw new Error('Expected argument of type coupon.IssuePromotionCouponRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_coupon_IssuePromotionCouponRequest(buffer_arg) {
  return coupon_pb.IssuePromotionCouponRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_coupon_ListAvailCouponReply(arg) {
  if (!(arg instanceof coupon_pb.ListAvailCouponReply)) {
    throw new Error('Expected argument of type coupon.ListAvailCouponReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_coupon_ListAvailCouponReply(buffer_arg) {
  return coupon_pb.ListAvailCouponReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_coupon_ListCouponReply(arg) {
  if (!(arg instanceof coupon_pb.ListCouponReply)) {
    throw new Error('Expected argument of type coupon.ListCouponReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_coupon_ListCouponReply(buffer_arg) {
  return coupon_pb.ListCouponReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_coupon_ListCouponRequest(arg) {
  if (!(arg instanceof coupon_pb.ListCouponRequest)) {
    throw new Error('Expected argument of type coupon.ListCouponRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_coupon_ListCouponRequest(buffer_arg) {
  return coupon_pb.ListCouponRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_coupon_StartCouponUseRequest(arg) {
  if (!(arg instanceof coupon_pb.StartCouponUseRequest)) {
    throw new Error('Expected argument of type coupon.StartCouponUseRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_coupon_StartCouponUseRequest(buffer_arg) {
  return coupon_pb.StartCouponUseRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


var CouponServerService = exports.CouponServerService = {
  getMyCoupons: {
    path: '/coupon.CouponServer/GetMyCoupons',
    requestStream: false,
    responseStream: false,
    requestType: coupon_pb.ListCouponRequest,
    responseType: coupon_pb.ListCouponReply,
    requestSerialize: serialize_coupon_ListCouponRequest,
    requestDeserialize: deserialize_coupon_ListCouponRequest,
    responseSerialize: serialize_coupon_ListCouponReply,
    responseDeserialize: deserialize_coupon_ListCouponReply,
  },
  getMyCouponCount: {
    path: '/coupon.CouponServer/GetMyCouponCount',
    requestStream: false,
    responseStream: false,
    requestType: coupon_pb.CouponCountRequest,
    responseType: coupon_pb.CouponCountReply,
    requestSerialize: serialize_coupon_CouponCountRequest,
    requestDeserialize: deserialize_coupon_CouponCountRequest,
    responseSerialize: serialize_coupon_CouponCountReply,
    responseDeserialize: deserialize_coupon_CouponCountReply,
  },
  startCouponUse: {
    path: '/coupon.CouponServer/StartCouponUse',
    requestStream: false,
    responseStream: false,
    requestType: coupon_pb.StartCouponUseRequest,
    responseType: coupon_pb.CouponEntry,
    requestSerialize: serialize_coupon_StartCouponUseRequest,
    requestDeserialize: deserialize_coupon_StartCouponUseRequest,
    responseSerialize: serialize_coupon_CouponEntry,
    responseDeserialize: deserialize_coupon_CouponEntry,
  },
  cancelCouponUse: {
    path: '/coupon.CouponServer/CancelCouponUse',
    requestStream: false,
    responseStream: false,
    requestType: coupon_pb.CancelCouponUseRequest,
    responseType: coupon_pb.CouponEntry,
    requestSerialize: serialize_coupon_CancelCouponUseRequest,
    requestDeserialize: deserialize_coupon_CancelCouponUseRequest,
    responseSerialize: serialize_coupon_CouponEntry,
    responseDeserialize: deserialize_coupon_CouponEntry,
  },
  getCouponDetail: {
    path: '/coupon.CouponServer/GetCouponDetail',
    requestStream: false,
    responseStream: false,
    requestType: coupon_pb.CouponDetailRequest,
    responseType: coupon_pb.CouponDetailReply,
    requestSerialize: serialize_coupon_CouponDetailRequest,
    requestDeserialize: deserialize_coupon_CouponDetailRequest,
    responseSerialize: serialize_coupon_CouponDetailReply,
    responseDeserialize: deserialize_coupon_CouponDetailReply,
  },
  getCouponWithPromotionDetail: {
    path: '/coupon.CouponServer/GetCouponWithPromotionDetail',
    requestStream: false,
    responseStream: false,
    requestType: coupon_pb.CouponDetailRequest,
    responseType: coupon_pb.CouponWithPromotionReply,
    requestSerialize: serialize_coupon_CouponDetailRequest,
    requestDeserialize: deserialize_coupon_CouponDetailRequest,
    responseSerialize: serialize_coupon_CouponWithPromotionReply,
    responseDeserialize: deserialize_coupon_CouponWithPromotionReply,
  },
  getAvailCoupons: {
    path: '/coupon.CouponServer/GetAvailCoupons',
    requestStream: false,
    responseStream: false,
    requestType: coupon_pb.AvailCouponRequest,
    responseType: coupon_pb.ListAvailCouponReply,
    requestSerialize: serialize_coupon_AvailCouponRequest,
    requestDeserialize: deserialize_coupon_AvailCouponRequest,
    responseSerialize: serialize_coupon_ListAvailCouponReply,
    responseDeserialize: deserialize_coupon_ListAvailCouponReply,
  },
  checkCouponAvail: {
    path: '/coupon.CouponServer/CheckCouponAvail',
    requestStream: false,
    responseStream: false,
    requestType: coupon_pb.CheckCouponAvailRequest,
    responseType: coupon_pb.CheckCouponReply,
    requestSerialize: serialize_coupon_CheckCouponAvailRequest,
    requestDeserialize: deserialize_coupon_CheckCouponAvailRequest,
    responseSerialize: serialize_coupon_CheckCouponReply,
    responseDeserialize: deserialize_coupon_CheckCouponReply,
  },
  registerCouponOrPromotion: {
    path: '/coupon.CouponServer/RegisterCouponOrPromotion',
    requestStream: false,
    responseStream: false,
    requestType: coupon_pb.IssuePromotionCouponRequest,
    responseType: coupon_pb.CouponDetail,
    requestSerialize: serialize_coupon_IssuePromotionCouponRequest,
    requestDeserialize: deserialize_coupon_IssuePromotionCouponRequest,
    responseSerialize: serialize_coupon_CouponDetail,
    responseDeserialize: deserialize_coupon_CouponDetail,
  },
  checkImplicitPromotion: {
    path: '/coupon.CouponServer/CheckImplicitPromotion',
    requestStream: false,
    responseStream: false,
    requestType: coupon_pb.CheckCouponAvailRequest,
    responseType: coupon_pb.CheckCouponReply,
    requestSerialize: serialize_coupon_CheckCouponAvailRequest,
    requestDeserialize: deserialize_coupon_CheckCouponAvailRequest,
    responseSerialize: serialize_coupon_CheckCouponReply,
    responseDeserialize: deserialize_coupon_CheckCouponReply,
  },
};

exports.CouponServerClient = grpc.makeGenericClientConstructor(CouponServerService);
