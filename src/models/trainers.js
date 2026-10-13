const mongoose = require('mongoose');

const trainerSchema = new mongoose.Schema({
  trainer_id: { type: String, required: true, unique: true, trim: true },
  full_name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true, select: false },
  activity_type: { type: String },
  phone: { type: String },
  years_experience: { type: Number, min: 0 },
  hourly_rate: { type: Number, min: 0 },
  is_admin: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
});

module.exports = mongoose.model('Trainer', trainerSchema);