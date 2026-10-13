const router = require('express').Router();
const { authenticateRequest } = require('../middleware/auth');

const {
  listReservations,
  getReservationById,
  createReservation,
  updateReservation,
  deleteReservation,
} = require('../controllers/reservationsController');

router.use(authenticateRequest);

router.route('/')
  .get(listReservations)
  .post(createReservation);

router.route('/:reservationId')
  .get(getReservationById)
  .patch(updateReservation)
  .put(updateReservation)
  .delete(deleteReservation);

module.exports = router;