const { createStatusError } = require('../http/errors');
const { normalizeDateOnly } = require('../config/validation');

const ACTIVE_RESERVATION_STATUSES = ['Confirmada', 'Completada'];

const normalizeReservationDate = (value) => normalizeDateOnly(value);

const getReferenceId = (reference) => reference?._id?.toString() || reference?.toString();

const buildReservationConflictFilter = ({ reservation_id, trainer, member, date, time_slot }) => {
  if (!date || !time_slot || (!trainer && !member)) {
    return null;
  }

  const filter = {
    date: normalizeReservationDate(date),
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
    throw createStatusError('El entrenador ya esta ocupado en esa franja horaria', 409);
  }

  if (member && getReferenceId(conflict.member) === member.toString()) {
    throw createStatusError('El miembro ya tiene una reserva en esa franja horaria', 409);
  }

  throw createStatusError('La franja horaria ya esta reservada', 409);
};

module.exports = {
  ACTIVE_RESERVATION_STATUSES,
  normalizeReservationDate,
  buildReservationConflictFilter,
  ensureNoReservationConflicts,
};