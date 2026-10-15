const { createStatusError } = require('../http/errors');

const methodNotAllowed = (message) => (_req, _res, next) => next(createStatusError(message, 405));

module.exports = {
  methodNotAllowed,
};