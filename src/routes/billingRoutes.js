const router = require('express').Router();
const { requireMemberAuth } = require('../middleware/auth');
const { billingLimiter } = require('../middleware/rateLimiters');
const {
  getSubscription,
  createCheckoutSession,
  getSessionPacksSummary,
  createPackCheckoutSession,
  createPortalSession,
  listInvoices,
} = require('../controllers/billingController');

router.use(requireMemberAuth);

router.get('/subscription', getSubscription);
router.get('/invoices', listInvoices);
router.post('/checkout', billingLimiter, createCheckoutSession);
router.get('/packs', getSessionPacksSummary);
router.post('/packs/checkout', billingLimiter, createPackCheckoutSession);
router.post('/portal', billingLimiter, createPortalSession);

module.exports = router;
