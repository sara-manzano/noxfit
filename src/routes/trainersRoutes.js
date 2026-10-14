const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { requireTrainerAdmin, requireTrainerAuth } = require('../middleware/auth');

const {
  listTrainers,
  getTrainerById,
  registerTrainer,
  loginTrainer,
  getCurrentTrainer,
  createTrainer,
  updateCurrentTrainer,
  updateTrainer,
  deleteTrainer,
} = require('../controllers/trainersController');

router.post('/register', asyncHandler(registerTrainer));
router.post('/login', asyncHandler(loginTrainer));

router.route('/me')
  .get(requireTrainerAuth, asyncHandler(getCurrentTrainer))
  .patch(requireTrainerAuth, asyncHandler(updateCurrentTrainer))
  .put(requireTrainerAuth, asyncHandler(updateCurrentTrainer));

router.use(requireTrainerAdmin);

router.route('/')
  .get(asyncHandler(listTrainers))
  .post(asyncHandler(createTrainer));

router.route('/:trainer_id')
  .get(asyncHandler(getTrainerById))
  .patch(asyncHandler(updateTrainer))
  .put(asyncHandler(updateTrainer))
  .delete(asyncHandler(deleteTrainer));

module.exports = router;