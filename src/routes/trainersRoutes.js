const router = require('express').Router();
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

router.post('/register', registerTrainer);

router.route('/me')
  .get(requireTrainerAuth, getCurrentTrainer)
  .patch(requireTrainerAdmin, updateCurrentTrainer)
  .put(requireTrainerAuth, rejectTrainerPut);

router.get('/directory', authenticateRequest, listTrainerDirectory);

router.route('/')
  .get(requireTrainerAdmin, listTrainers)
  .post(requireTrainerAdmin, createTrainer);

router.route('/:trainer_id')
  .get(requireTrainerAdmin, getTrainerById)
  .patch(requireTrainerAdmin, updateTrainer)
  .put(rejectTrainerPut)
  .delete(requireTrainerAdmin, deleteTrainer);

module.exports = router;