const mongoose = require('mongoose');
const { isValidTimeSlot, normalizeDateOnly, TRAINING_CENTERS } = require('../config/validation');

const reservationSchema = new mongoose.Schema({
  reservation_id: { type: String, required: true, unique: true, trim: true },
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required() { return this.booked_by !== 'trainer'; },
  },
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true },
  booked_by: { type: String, enum: ['member', 'trainer'], default: 'member' },
  activity_type: { type: String },
  center: { type: String, enum: TRAINING_CENTERS },
  date: { type: Date, required: true, set: normalizeDateOnly },
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

reservationSchema.index(
  { trainer: 1, date: 1, time_slot: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['Confirmada', 'Completada'] },
    },
    name: 'unique_active_trainer_slot',
  }
);

reservationSchema.index(
  { member: 1, date: 1, time_slot: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['Confirmada', 'Completada'] },
      member: { $type: 'objectId' },
    },
    name: 'unique_active_member_slot',
  }
);

module.exports = mongoose.model('Reservation', reservationSchema);