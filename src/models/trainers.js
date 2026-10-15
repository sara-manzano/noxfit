const mongoose = require('mongoose');
const { createAccountSchemaFields, applyAccountResponseTransform } = require('./sharedFields');

const trainerSchema = new mongoose.Schema({
  ...createAccountSchemaFields('trainer_id'),
  activity_type: { type: String },
  years_experience: { type: Number, min: 0 },
  hourly_rate: { type: Number, min: 0 },
  is_admin: { type: Boolean, default: false },
  bootstrap_admin: { type: Boolean, default: false, select: false },
});

trainerSchema.index(
  { bootstrap_admin: 1 },
  {
    unique: true,
    partialFilterExpression: { bootstrap_admin: true },
    name: 'unique_bootstrap_admin',
  }
);

applyAccountResponseTransform(trainerSchema);

module.exports = mongoose.model('Trainer', trainerSchema);