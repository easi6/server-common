export default (limit, maxLimit) => (req, res, next) => {
  let _limit = parseInt(limit, 10) || 10;
  let _maxLimit = parseInt(maxLimit, 10) || 50;

  req.query.page = (typeof req.query.page === 'string') ? parseInt(req.query.page, 10) || 0 : 0;
  if (typeof req.query.limit === 'string') {
    req.query.size = parseInt(req.query.limit, 10) || 0;
  } else if (typeof req.query.size === 'string') {
    req.query.size = parseInt(req.query.size, 10) || 0;
  } else {
    req.query.size = _limit;
  }

  if (req.query.size > _maxLimit) {
    req.query.size = _maxLimit;
  }

  if (req.query.page < 0) {
    req.query.page= 0;
  }

  if (req.query.size < 0) {
    req.query.size = 0;
  }
  req.query.limit = req.query.size;

  req.skip = req.query.limit * req.query.page;

  next();
};