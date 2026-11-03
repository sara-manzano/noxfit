const router = require('express').Router();
const { authenticateRequest } = require('../middleware/auth');
const { rejectPut } = require('../middleware/methodNotAllowed');

const {
  listReservations,
  getTrainerAvailability,
  getReservationById,
  createReservation,
  updateReservation,
  rescheduleReservation,
  cancelReservation,
  deleteReservation,
  getCheckinCode,
  checkInReservation,
} = require('../controllers/reservationsController');

const rejectReservationPut = rejectPut('reservations');

router.use(authenticateRequest);

router.route('/')
  .get(listReservations)
  .post(createReservation);

router.get('/availability', getTrainerAvailability);
router.post('/checkin', checkInReservation);

router.post('/:reservation_id/cancel', cancelReservation);
router.post('/:reservation_id/reschedule', rescheduleReservation);
router.get('/:reservation_id/checkin-code', getCheckinCode);

router.route('/:reservation_id')
  .get(getReservationById)
  .patch(updateReservation)
  .put(rejectReservationPut)
  .delete(deleteReservation);

module.exports = router;