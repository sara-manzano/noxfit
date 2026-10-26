const TIME_SLOT_PATTERN = /^([01]\d|2[0-3]):([0-5]\d) - ([01]\d|2[0-3]):([0-5]\d)$/;

const normalizeDateOnly = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return date;
  }

  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const OPENING_MINUTES = 7 * 60;
const CLOSING_MINUTES = 20 * 60;

const parseTimeSlot = (value) => {
  const match = typeof value === 'string' ? value.trim().match(TIME_SLOT_PATTERN) : null;

  return match
    ? { start: Number(match[1]) * 60 + Number(match[2]), end: Number(match[3]) * 60 + Number(match[4]) }
    : null;
};

const isValidTimeSlot = (value) => {
  const slot = parseTimeSlot(value);

  return Boolean(slot) && slot.end > slot.start;
};

const isWithinOpeningHours = (value) => {
  const slot = parseTimeSlot(value);

  return Boolean(slot) && slot.start >= OPENING_MINUTES && slot.end <= CLOSING_MINUTES;
};

const TRAINING_CENTERS = ['Noxfit Salamanca', 'Noxfit Alcobendas'];
const MEMBERSHIP_TYPES = ['Básica', 'Premium', 'VIP'];
const RESERVATION_STATUSES = ['Confirmada', 'Completada', 'Cancelada'];
const ACTIVE_RESERVATION_STATUSES = ['Confirmada', 'Completada'];
const RESERVATION_BOOKERS = ['member', 'trainer'];
const MAX_RESERVATIONS_PER_TRAINER_SLOT = 12;

const isPersonalTraining = (activityType) => (
  typeof activityType === 'string' && activityType.trim().toLowerCase() === 'entrenamiento personal'
);

module.exports = {
  ACTIVE_RESERVATION_STATUSES,
  MAX_RESERVATIONS_PER_TRAINER_SLOT,
  MEMBERSHIP_TYPES,
  RESERVATION_BOOKERS,
  RESERVATION_STATUSES,
  TRAINING_CENTERS,
  isPersonalTraining,
  isValidTimeSlot,
  isWithinOpeningHours,
  normalizeDateOnly,
};