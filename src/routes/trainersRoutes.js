const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { methodNotAllowed } = require('../middleware/methodNotAllowed');
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

const rejectPut = methodNotAllowed('PUT no esta soportado para entrenadores; usa PATCH para cambios parciales');

router.post('/register', asyncHandler(registerTrainer));
router.post('/login', asyncHandler(loginTrainer));

router.route('/me')
  .get(requireTrainerAuth, asyncHandler(getCurrentTrainer))
  .patch(requireTrainerAuth, asyncHandler(updateCurrentTrainer))
  .put(requireTrainerAuth, rejectPut);

router.use(requireTrainerAdmin);

router.route('/')
  .get(asyncHandler(listTrainers))
  .post(asyncHandler(createTrainer));

router.route('/:trainer_id')
  .get(asyncHandler(getTrainerById))
  .patch(asyncHandler(updateTrainer))
  .put(rejectPut)
  .delete(asyncHandler(deleteTrainer));

module.exports = router;