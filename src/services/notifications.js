const mailer = require('../config/mailer');
const Reservation = require('../models/reservations');

const notifyReservation = async (kind, reservationId) => {
  try {
    const reservation = await Reservation.findById(reservationId)
      .populate({ path: 'member', select: 'full_name email' })
      .populate({ path: 'trainer', select: 'full_name' })
      .lean();

    if (!reservation?.member?.email) {
      return;
    }

    await mailer.sendReservationEmail(reservation.member.email, kind, reservation);
  } catch (error) {
    console.error(`[notifications] Could not send "${kind}" email:`, error.message);
  }
};

module.exports = { notifyReservation };
