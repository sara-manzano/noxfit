const { createStatusError } = require('../http/errors');

const rejectPut = (resource) => (_req, _res, next) => next(
  createStatusError(`PUT is not supported for ${resource}; use PATCH for partial updates`, 405)
);

module.exports = {
  rejectPut,
};