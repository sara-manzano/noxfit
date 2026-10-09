const mongoose = require('mongoose');

const trainerSchema = new mongoose.Schema({
  trainer_id: { type: String, required: true, unique: true },
  full_name: { type: String, required: true },
  email: { type: String, required: true },
  activity_type: { type: String },
  phone: { type: String },
  years_experience: { type: Number },
  hourly_rate: { type: Number },
  active: { type: Boolean, default: true }
});

module.exports = mongoose.model('Trainer', trainerSchema);