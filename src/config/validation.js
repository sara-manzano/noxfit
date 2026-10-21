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

module.exports = {
  TRAINING_CENTERS,
  isValidTimeSlot,
  normalizeDateOnly,
};