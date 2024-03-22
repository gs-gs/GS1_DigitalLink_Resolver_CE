/* eslint-disable consistent-return */
const { ForbiddenError } = require('../utils/custom-error');
const { getGlobalWritingLock } = require('../db/query-controller/global-lock');
const utils = require('../bin/resolver_utils');

exports.checkWritingLock = async (req, res, next) => {
  try {
    const result = await getGlobalWritingLock();

    if (result[0].locked === true) {
      return next(new ForbiddenError('Forbidden'), 403);
    }
    next();
  } catch {
    utils.logThis('exports.checkWritingLock error:', e.toString());
    return next(new ErrorResponse('Server error getting writing lock', 500));
  }
};
