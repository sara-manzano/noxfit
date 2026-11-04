const router = require('express').Router();
const { rejectPut } = require('../middleware/methodNotAllowed');
const { authenticateRequest, requireTrainerAdmin } = require('../middleware/auth');
const { getHighlights, updateHighlights } = require('../controllers/highlightsController');

router.route('/')
  .get(authenticateRequest, getHighlights)
  .patch(requireTrainerAdmin, updateHighlights)
  .put(rejectPut('highlights'));

module.exports = router;
