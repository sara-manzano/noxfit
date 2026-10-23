const router = require('express').Router();
const { authenticateRequest } = require('../middleware/auth');
const { rejectPut } = require('../middleware/methodNotAllowed');

const {
  listReservations,
  getTrainerAvailability,
  getReservationById,
  createReservation,
  updateReservation,
  deleteReservation,
} = require('../controllers/reservationsController');

const rejectReservationPut = rejectPut('reservations');

router.use(authenticateRequest);

router.route('/')
  .get(listReservations)
  .post(createReservation);

router.get('/availability', getTrainerAvailability);

router.route('/:reservation_id')
  .get(getReservationById)
  .patch(updateReservation)
  .put(rejectReservationPut)
  .delete(deleteReservation);

module.exports = router;