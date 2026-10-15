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

const rejectPut = methodNotAllowed('PUT no esta soportado para reservas; usa PATCH para cambios parciales');

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