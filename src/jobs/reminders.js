const Reservation = require('../models/reservations');
const { normalizeDateOnly } = require('../config/validation');
const { notifyReservation } = require('../services/notifications');
const { getReservationWindow, HOUR_MS } = require('../services/reservationTime');

const REMINDER_LEAD_HOURS = 24;
const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

const sendDueReminders = async (now = new Date()) => {
  const candidates = await Reservation.find({
    status: 'Confirmada',
    member: { $type: 'objectId' },
    date: {
      $gte: normalizeDateOnly(now),
      $lte: normalizeDateOnly(new Date(now.getTime() + (REMINDER_LEAD_HOURS + 24) * HOUR_MS)),
    },
    reminder_sent_at: { $exists: false },
  }).select('date time_slot').lean();
  let sent = 0;

  for (const candidate of candidates) {
    const window = getReservationWindow(candidate);
    const msUntilStart = window ? window.start.getTime() - now.getTime() : -1;

    if (msUntilStart <= 0 || msUntilStart > REMINDER_LEAD_HOURS * HOUR_MS) {
      continue;
    }

    const claim = await Reservation.updateOne(
      { _id: candidate._id, reminder_sent_at: { $exists: false } },
      { $set: { reminder_sent_at: now } }
    );

    if (claim.modifiedCount === 1) {
      await notifyReservation('reminder', candidate._id);
      sent += 1;
    }
  }

  return sent;
};

const startReminderJob = (intervalMs = DEFAULT_INTERVAL_MS) => {
  const run = () => sendDueReminders().catch((error) => console.error('[reminders] Run failed:', error.message));
  const timer = setInterval(run, intervalMs);

  timer.unref();
  run();

  return timer;
};

module.exports = { sendDueReminders, startReminderJob };
