const { createStatusError } = require('../http/errors');
const { getReservationWindow, HOUR_MS } = require('./reservationTime');
const { promoteFromWaitlist } = require('./waitlist');

const DEFAULT_CHANGE_WINDOW_HOURS = 2;

const getChangeWindowHours = () => {
  const configured = Number(process.env.CANCELLATION_WINDOW_HOURS);

  return process.env.CANCELLATION_WINDOW_HOURS !== undefined && Number.isFinite(configured) && configured >= 0
    ? configured
    : DEFAULT_CHANGE_WINDOW_HOURS;
};

const ensureOutsideChangeWindow = (reservation, now = new Date()) => {
  const window = getReservationWindow(reservation);

  if (!window) {
    return;
  }

  const hours = getChangeWindowHours();

  if (window.start.getTime() - now.getTime() < hours * HOUR_MS) {
    throw createStatusError(`Reservations can only be cancelled or rescheduled up to ${hours} hours before they start`, 409);
  }
};

const releaseSlot = async (reservation) => {
  try {
    await promoteFromWaitlist({
      trainer: reservation.trainer?._id || reservation.trainer,
      date: reservation.date,
      time_slot: reservation.time_slot,
    });
  } catch (error) {
    console.error('[waitlist] Could not promote waiting members:', error.message);
  }
};

module.exports = {
  ensureOutsideChangeWindow,
  releaseSlot,
};
