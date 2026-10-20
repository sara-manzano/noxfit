const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { login, registerMember } = require('../controllers/authController');

router.post('/login', asyncHandler(login));
router.post('/register', asyncHandler(registerMember));

module.exports = router;