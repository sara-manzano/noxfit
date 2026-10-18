const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { login } = require('../controllers/authController');

router.post('/login', asyncHandler(login));

module.exports = router;