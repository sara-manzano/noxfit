const router = require('express').Router();
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

router.post('/register', registerTrainer);
router.post('/login', loginTrainer);

router.route('/me')
  .get(requireTrainerAuth, getCurrentTrainer)
  .patch(requireTrainerAuth, updateCurrentTrainer)
  .put(requireTrainerAuth, updateCurrentTrainer);

router.use(requireTrainerAdmin);

router.route('/')
  .get(listTrainers)
  .post(createTrainer);

router.route('/:trainerId')
  .get(getTrainerById)
  .patch(updateTrainer)
  .put(updateTrainer)
  .delete(deleteTrainer);

module.exports = router;