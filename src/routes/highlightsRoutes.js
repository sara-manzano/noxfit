const router = require('express').Router();
const { rejectPut } = require('../middleware/methodNotAllowed');
const { authenticateRequest, requireTrainerAuth } = require('../middleware/auth');
const { getHighlights, updateHighlights } = require('../controllers/highlightsController');

router.route('/')
  .get(authenticateRequest, getHighlights)
  .patch(requireTrainerAuth, updateHighlights)
  .put(rejectPut('highlights'));

module.exports = router;
