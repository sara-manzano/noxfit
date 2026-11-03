const { parseTimeSlot } = require('../config/validation');

const TIME_ZONE = 'Europe/Madrid';
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

const zoneFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const getZoneOffsetMs = (utcMs) => {
  const parts = Object.fromEntries(zoneFormatter.formatToParts(new Date(utcMs)).map((part) => [part.type, part.value]));
  const zonedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);

  return zonedAsUtc - Math.floor(utcMs / 1000) * 1000;
};

// Reservation dates are stored as UTC midnight; time slots are wall-clock time in Madrid.
const zonedMinutesToUtcMs = (date, minutes) => {
  const guess = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, minutes);
  const firstPass = guess - getZoneOffsetMs(guess);

  return guess - getZoneOffsetMs(firstPass);
};

const getReservationWindow = ({ date, time_slot }) => {
  const slot = parseTimeSlot(time_slot);

  if (!slot || !date) {
    return null;
  }

  const day = new Date(date);

  return {
    start: new Date(zonedMinutesToUtcMs(day, slot.start)),
    end: new Date(zonedMinutesToUtcMs(day, slot.end)),
  };
};

const formatReservationDate = (date) => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date(date));

module.exports = {
  HOUR_MS,
  MINUTE_MS,
  formatReservationDate,
  getReservationWindow,
};
