const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  reservation_id: { type: String, required: true, unique: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true },
  activity_type: { type: String },
  date: { type: Date, required: true },
  time_slot: { type: String },
  status: { type: String, enum: ['Confirmada', 'Completada', 'Cancelada'] },
  price: { type: Number }
});

module.exports = mongoose.model('Reservation', reservationSchema);