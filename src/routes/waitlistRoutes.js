const router = require('express').Router();
const { authenticateRequest } = require('../middleware/auth');
const { listWaitlist, joinWaitlist, leaveWaitlist } = require('../controllers/waitlistController');

router.use(authenticateRequest);

router.route('/')
  .get(listWaitlist)
  .post(joinWaitlist);

router.delete('/:waitlist_id', leaveWaitlist);

module.exports = router;
