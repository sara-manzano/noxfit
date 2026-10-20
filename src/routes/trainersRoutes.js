const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { methodNotAllowed } = require('../middleware/methodNotAllowed');
const { requireTrainerAdmin, requireTrainerAuth, authenticateRequest } = require('../middleware/auth');

const {
  listTrainerDirectory,
  listTrainers,
  getTrainerById,
  registerTrainer,
  getCurrentTrainer,
  createTrainer,
  updateCurrentTrainer,
  updateTrainer,
  deleteTrainer,
} = require('../controllers/trainersController');

const rejectPut = methodNotAllowed('PUT is not supported for trainers; use PATCH for partial updates');

router.post('/register', asyncHandler(registerTrainer));

router.route('/me')
  .get(requireTrainerAuth, asyncHandler(getCurrentTrainer))
  .patch(requireTrainerAdmin, asyncHandler(updateCurrentTrainer))
  .put(requireTrainerAuth, rejectPut);

router.get('/directory', authenticateRequest, asyncHandler(listTrainerDirectory));

router.route('/')
  .get(requireTrainerAdmin, asyncHandler(listTrainers))
  .post(requireTrainerAdmin, asyncHandler(createTrainer));

router.route('/:trainer_id')
  .get(requireTrainerAdmin, asyncHandler(getTrainerById))
  .patch(requireTrainerAdmin, asyncHandler(updateTrainer))
  .put(rejectPut)
  .delete(requireTrainerAdmin, asyncHandler(deleteTrainer));

module.exports = router;