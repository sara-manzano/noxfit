const mongoose = require('mongoose');

const sessionPackPurchaseSchema = new mongoose.Schema({
  checkout_session_id: { type: String, required: true, unique: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
  pack: { type: String, required: true },
  sessions: { type: Number, required: true, min: 1 },
  amount_cents: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('SessionPackPurchase', sessionPackPurchaseSchema);
