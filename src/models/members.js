const mongoose = require('mongoose');
const { createAccountSchemaFields, applyAccountResponseTransform } = require('./sharedFields');

const memberSchema = new mongoose.Schema({
  ...createAccountSchemaFields('member_id'),
  membership_type: { type: String, enum: ['Básica', 'Premium', 'VIP'] },
  join_date: { type: Date },
});

applyAccountResponseTransform(memberSchema);

module.exports = mongoose.model('Member', memberSchema);
