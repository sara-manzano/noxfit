const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { requireReservationAccess } = require('../middleware/auth');
const { methodNotAllowed } = require('../middleware/methodNotAllowed');

const {
  listReservations,
  getReservationById,
  createReservation,
  updateReservation,
  deleteReservation,
} = require('../controllers/reservationsController');

const rejectPut = methodNotAllowed('PUT is not supported for reservations; use PATCH for partial updates');

router.use(requireReservationAccess);

router.route('/')
  .get(asyncHandler(listReservations))
  .post(asyncHandler(createReservation));

router.route('/:reservation_id')
  .get(asyncHandler(getReservationById))
  .patch(asyncHandler(updateReservation))
  .put(rejectPut)
  .delete(asyncHandler(deleteReservation));

module.exports = router;