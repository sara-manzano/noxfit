const mongoose = require('mongoose');
const {
  TRAINING_CENTERS,
  WAITLIST_STATUSES,
  isValidTimeSlot,
  normalizeDateOnly,
} = require('../config/validation');

const waitlistSchema = new mongoose.Schema({
  waitlist_id: { type: String, required: true, unique: true, trim: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true },
  activity_type: { type: String },
  center: { type: String, enum: TRAINING_CENTERS },
  date: { type: Date, required: true, set: normalizeDateOnly },
  time_slot: {
    type: String,
    trim: true,
    required: true,
    validate: {
      validator: isValidTimeSlot,
      message: 'time_slot must use HH:MM - HH:MM and end after it starts',
    },
  },
  status: { type: String, enum: WAITLIST_STATUSES, default: 'Esperando', required: true },
  reservation_id: { type: String },
}, { timestamps: true });

waitlistSchema.index({ trainer: 1, date: 1, time_slot: 1, status: 1, createdAt: 1 });

waitlistSchema.index(
  { member: 1, trainer: 1, date: 1, time_slot: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'Esperando' },
    name: 'unique_waiting_member_slot',
  }
);

module.exports = mongoose.model('Waitlist', waitlistSchema);
