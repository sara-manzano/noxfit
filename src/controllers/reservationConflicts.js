const { createStatusError } = require('../http/errors');
const {
  ACTIVE_RESERVATION_STATUSES,
  MAX_RESERVATIONS_PER_TRAINER_SLOT,
  isPersonalTraining,
  normalizeDateOnly,
} = require('../config/validation');

const buildSlotFilter = ({ reservation_id, date, time_slot }) => {
  const filter = {
    date: normalizeDateOnly(date),
    time_slot,
    status: { $in: ACTIVE_RESERVATION_STATUSES },
  };

  if (reservation_id) {
    filter.reservation_id = { $ne: reservation_id };
  }

  return filter;
};

const getTrainerSlotStatus = (slotReservations) => {
  const hasPersonalTraining = slotReservations.some((item) => isPersonalTraining(item.activity_type));
  const spotsLeft = Math.max(MAX_RESERVATIONS_PER_TRAINER_SLOT - slotReservations.length, 0);

  return {
    reservations_count: slotReservations.length,
    has_personal_training: hasPersonalTraining,
    spots_left: hasPersonalTraining ? 0 : spotsLeft,
    available: !hasPersonalTraining && spotsLeft > 0,
  };
};

const ensureNoReservationConflicts = async (ReservationModel, {
  reservation_id,
  trainer,
  member,
  date,
  time_slot,
  activity_type,
  status = 'Confirmada',
}) => {
  if (!ACTIVE_RESERVATION_STATUSES.includes(status) || !date || !time_slot) {
    return;
  }

  const slotFilter = buildSlotFilter({ reservation_id, date, time_slot });

  if (member) {
    const memberConflict = await ReservationModel.findOne({ ...slotFilter, member }).select('_id').lean();

    if (memberConflict) {
      throw createStatusError('Member already has a reservation for that time slot', 409);
    }
  }

  if (!trainer) {
    return;
  }

  const slotReservations = await ReservationModel.find({ ...slotFilter, trainer })
    .select('activity_type')
    .lean();
  const slotStatus = getTrainerSlotStatus(slotReservations);

  if (slotStatus.has_personal_training) {
    throw createStatusError('Trainer is not available for that time slot', 409);
  }

  if (isPersonalTraining(activity_type) && slotReservations.length > 0) {
    throw createStatusError('Trainer is not available for personal training in that time slot', 409);
  }

  if (!slotStatus.available) {
    throw createStatusError('Trainer has no spots left for that time slot', 409);
  }
};

module.exports = {
  buildSlotFilter,
  ensureNoReservationConflicts,
  getTrainerSlotStatus,
};