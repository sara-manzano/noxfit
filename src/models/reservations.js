const mongoose = require('mongoose');

const TIME_SLOT_PATTERN = /^([01]\d|2[0-3]):([0-5]\d) - ([01]\d|2[0-3]):([0-5]\d)$/;

const isValidTimeSlot = (value) => {
  if (typeof value !== 'string') {
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

const reservationSchema = new mongoose.Schema({
  reservation_id: { type: String, required: true, unique: true, trim: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true },
  activity_type: { type: String },
  date: { type: Date, required: true },
  time_slot: {
    type: String,
    trim: true,
    validate: {
      validator: (value) => value === undefined || isValidTimeSlot(value),
      message: 'time_slot must use HH:MM - HH:MM and end after it starts',
    },
  },
  status: {
    type: String,
    enum: ['Confirmada', 'Completada', 'Cancelada'],
    required: true,
    default: 'Confirmada',
  },
  price: { type: Number, min: 0 },
});

module.exports = mongoose.model('Reservation', reservationSchema);