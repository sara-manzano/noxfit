const mongoose = require('mongoose');
const { createAccountSchemaFields, applyAccountResponseTransform } = require('./sharedFields');
const { MEMBERSHIP_TYPES } = require('../config/validation');

const memberSchema = new mongoose.Schema({
  ...createAccountSchemaFields('member_id'),
  membership_type: { type: String, enum: MEMBERSHIP_TYPES },
  join_date: { type: Date },
  subscription_status: { type: String },
  subscription_current_period_end: { type: Date },
  subscription_cancel_at_period_end: { type: Boolean },
  stripe_customer_id: { type: String, select: false, index: true, sparse: true },
  stripe_subscription_id: { type: String, select: false },
});

applyAccountResponseTransform(memberSchema);

module.exports = mongoose.model('Member', memberSchema);
