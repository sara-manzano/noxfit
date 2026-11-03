const Reservation = require('../models/reservations');
const Waitlist = require('../models/waitlist');
const { generateId } = require('../config/ids');
const { normalizeDateOnly } = require('../config/validation');
const { ensureNoReservationConflicts, createWithConflictCheck } = require('./reservationConflicts');
const { notifyReservation } = require('./notifications');

const tryCreateReservationFor = async (entry) => {
  const slot = {
    trainer: entry.trainer,
    member: entry.member,
    date: entry.date,
    time_slot: entry.time_slot,
    activity_type: entry.activity_type,
    status: 'Confirmada',
  };

  try {
    await ensureNoReservationConflicts(Reservation, slot);

    return await createWithConflictCheck(Reservation, {
      reservation_id: generateId('R'),
      ...slot,
      booked_by: 'member',
      center: entry.center,
    });
  } catch (error) {
    if (error.statusCode === 409 || error.code === 11000) {
      return null;
    }

    throw error;
  }
};

const promoteFromWaitlist = async ({ trainer, date, time_slot }) => {
  if (!trainer || !date || !time_slot) {
    return [];
  }

  const entries = await Waitlist.find({
    trainer,
    date: normalizeDateOnly(date),
    time_slot,
    status: 'Esperando',
  }).sort({ createdAt: 1 });
  const promoted = [];

  for (const entry of entries) {
    const reservation = await tryCreateReservationFor(entry);

    if (!reservation) {
      continue;
    }

    entry.status = 'Promovida';
    entry.reservation_id = reservation.reservation_id;
    await entry.save();
    promoted.push(reservation);
    await notifyReservation('waitlist_promoted', reservation._id);
  }

  return promoted;
};

module.exports = { promoteFromWaitlist };
