const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { login, registerMember, forgotPassword, resetPassword } = require('../controllers/authController');
const { loginLimiter, registerLimiter, forgotPasswordLimiter, resetPasswordLimiter } = require('../middleware/rateLimiters');

router.post('/login', loginLimiter, asyncHandler(login));
router.post('/register', registerLimiter, asyncHandler(registerMember));
router.post('/forgot-password', forgotPasswordLimiter, asyncHandler(forgotPassword));
router.post('/reset-password', resetPasswordLimiter, asyncHandler(resetPassword));

module.exports = router;