const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  member_id: { type: String, required: true, unique: true },
  full_name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  membership_type: { type: String, enum: ['Básica', 'Premium', 'VIP'] },
  join_date: { type: Date },
  active: { type: Boolean, default: true }
});

module.exports = mongoose.model('Member', memberSchema);