const mongoose = require('mongoose');
const { createAccountSchemaFields, applyAccountResponseTransform } = require('./sharedFields');
const { MEMBERSHIP_TYPES } = require('../config/validation');

const memberSchema = new mongoose.Schema({
  ...createAccountSchemaFields('member_id'),
  membership_type: { type: String, enum: MEMBERSHIP_TYPES },
  join_date: { type: Date },
});

applyAccountResponseTransform(memberSchema);

module.exports = mongoose.model('Member', memberSchema);
