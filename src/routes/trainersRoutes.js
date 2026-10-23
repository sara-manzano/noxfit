const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { rejectPut } = require('../middleware/methodNotAllowed');
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

const rejectTrainerPut = rejectPut('trainers');

router.post('/register', asyncHandler(registerTrainer));

router.route('/me')
  .get(requireTrainerAuth, asyncHandler(getCurrentTrainer))
  .patch(requireTrainerAdmin, asyncHandler(updateCurrentTrainer))
  .put(requireTrainerAuth, rejectTrainerPut);

router.get('/directory', authenticateRequest, asyncHandler(listTrainerDirectory));

router.route('/')
  .get(requireTrainerAdmin, asyncHandler(listTrainers))
  .post(requireTrainerAdmin, asyncHandler(createTrainer));

router.route('/:trainer_id')
  .get(requireTrainerAdmin, asyncHandler(getTrainerById))
  .patch(requireTrainerAdmin, asyncHandler(updateTrainer))
  .put(rejectTrainerPut)
  .delete(requireTrainerAdmin, asyncHandler(deleteTrainer));

module.exports = router;