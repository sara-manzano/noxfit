const { rateLimit } = require('express-rate-limit');

const createLimiter = (windowMs, limit, options = {}) => rateLimit({
  windowMs,
  limit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
  ...options,
});

const loginLimiter = createLimiter(15 * 60 * 1000, 10, { skipSuccessfulRequests: true });
const registerLimiter = createLimiter(60 * 60 * 1000, 10);
const forgotPasswordLimiter = createLimiter(60 * 60 * 1000, 5);
const resetPasswordLimiter = createLimiter(15 * 60 * 1000, 10);

module.exports = { loginLimiter, registerLimiter, forgotPasswordLimiter, resetPasswordLimiter };
