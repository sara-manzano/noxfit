const createStatusError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const createForbiddenError = (message) => createStatusError(message, 403);

module.exports = {
  createStatusError,
  createForbiddenError,
};