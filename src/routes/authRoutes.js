const router = require('express').Router();
const { login, registerMember, forgotPassword, resetPassword } = require('../controllers/authController');
const { loginLimiter, registerLimiter, forgotPasswordLimiter, resetPasswordLimiter } = require('../middleware/rateLimiters');

router.post('/login', loginLimiter, login);
router.post('/register', registerLimiter, registerMember);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPasswordLimiter, resetPassword);

module.exports = router;