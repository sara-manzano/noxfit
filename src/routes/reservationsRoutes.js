const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
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
  .get(asyncHandler(listReservations))
  .post(asyncHandler(createReservation));

router.get('/availability', asyncHandler(getTrainerAvailability));

router.route('/:reservation_id')
  .get(asyncHandler(getReservationById))
  .patch(asyncHandler(updateReservation))
  .put(rejectReservationPut)
  .delete(asyncHandler(deleteReservation));

module.exports = router;