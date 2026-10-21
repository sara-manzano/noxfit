const { createStatusError } = require('../http/errors');
const { normalizeDateOnly } = require('../config/validation');

const ACTIVE_RESERVATION_STATUSES = ['Confirmada', 'Completada'];

const getReferenceId = (reference) => reference?._id?.toString() || reference?.toString();

const buildReservationConflictFilter = ({ reservation_id, trainer, member, date, time_slot }) => {
  if (!date || !time_slot || (!trainer && !member)) {
    return null;
  }

  const filter = {
    date: normalizeDateOnly(date),
    time_slot,
    status: { $in: ACTIVE_RESERVATION_STATUSES },
    $or: [],
  };

  if (trainer) {
    filter.$or.push({ trainer });
  }

  if (member) {
    filter.$or.push({ member });
  }

  if (reservation_id) {
    filter.reservation_id = { $ne: reservation_id };
  }

  return filter;
};

const ensureNoReservationConflicts = async (ReservationModel, {
  reservation_id,
  trainer,
  member,
  date,
  time_slot,
  status = 'Confirmada',
}) => {
  if (!ACTIVE_RESERVATION_STATUSES.includes(status)) {
    return;
  }

  const filter = buildReservationConflictFilter({ reservation_id, trainer, member, date, time_slot });

  if (!filter) {
    return;
  }

  const conflict = await ReservationModel.findOne(filter).select('trainer member').lean();

  if (!conflict) {
    return;
  }

  if (trainer && getReferenceId(conflict.trainer) === trainer.toString()) {
    throw createStatusError('Trainer is already booked for that time slot', 409);
  }

  if (member && getReferenceId(conflict.member) === member.toString()) {
    throw createStatusError('Member already has a reservation for that time slot', 409);
  }

  throw createStatusError('Time slot is already reserved', 409);
};

module.exports = {
  buildReservationConflictFilter,
  ensureNoReservationConflicts,
};