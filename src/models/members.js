const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  member_id: { type: String, required: true, unique: true, trim: true },
  full_name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true, select: false },
  phone: { type: String },
  membership_type: { type: String, enum: ['Básica', 'Premium', 'VIP'] },
  join_date: { type: Date },
  active: { type: Boolean, default: true },
});

module.exports = mongoose.model('Member', memberSchema);
