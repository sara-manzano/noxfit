const TIME_SLOT_PATTERN = /^([01]\d|2[0-3]):([0-5]\d) - ([01]\d|2[0-3]):([0-5]\d)$/;

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

module.exports = {
  TIME_SLOT_PATTERN,
  isValidTimeSlot,
};