const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { requireReservationAccess } = require('../middleware/auth');

const {
  listReservations,
  getReservationById,
  createReservation,
  updateReservation,
  deleteReservation,
} = require('../controllers/reservationsController');

router.use(requireReservationAccess);

router.route('/')
  .get(asyncHandler(listReservations))
  .post(asyncHandler(createReservation));

router.route('/:reservation_id')
  .get(asyncHandler(getReservationById))
  .patch(asyncHandler(updateReservation))
  .put(asyncHandler(updateReservation))
  .delete(asyncHandler(deleteReservation));

module.exports = router;