const TIME_SLOT_PATTERN = /^([01]\d|2[0-3]):([0-5]\d) - ([01]\d|2[0-3]):([0-5]\d)$/;

const normalizeDateOnly = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return date;
  }

  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const isValidTimeSlot = (value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }

  const match = value.trim().match(TIME_SLOT_PATTERN);

  if (!match) {
    return false;
  }

  const startMinutes = Number(match[1]) * 60 + Number(match[2]);
  const endMinutes = Number(match[3]) * 60 + Number(match[4]);

  return endMinutes > startMinutes;
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
  normalizeDateOnly,
};