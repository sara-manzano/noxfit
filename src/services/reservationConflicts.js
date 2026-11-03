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

const findMemberConflict = (ReservationModel, slotFilter, member) => (
  ReservationModel.findOne({ ...slotFilter, member }).select('_id').lean()
);

// Returns the reason the trainer cannot take another booking in the slot, or null if there is room.
const findTrainerConflict = async (ReservationModel, { reservation_id, trainer, date, time_slot, activity_type }) => {
  const slotReservations = await ReservationModel
    .find({ ...buildSlotFilter({ reservation_id, date, time_slot }), trainer })
    .select('activity_type')
    .lean();

  if (isPersonalTraining(activity_type) && slotReservations.length > 0) {
    return 'Trainer is not available for personal training in that time slot';
  }

  return getTrainerSlotStatus(slotReservations).available ? null : 'Trainer has no spots left for that time slot';
};

const ensureNoReservationConflicts = async (ReservationModel, slot) => {
  const { reservation_id, trainer, member, date, time_slot, status = 'Confirmada' } = slot;

  if (!ACTIVE_RESERVATION_STATUSES.includes(status) || !date || !time_slot) {
    return;
  }

  if (member && await findMemberConflict(ReservationModel, buildSlotFilter({ reservation_id, date, time_slot }), member)) {
    throw createStatusError('Member already has a reservation for that time slot', 409);
  }

  const trainerConflict = trainer && await findTrainerConflict(ReservationModel, slot);

  if (trainerConflict) {
    throw createStatusError(trainerConflict, 409);
  }
};

// Re-checks after insert so two concurrent bookings cannot both claim the last spot.
const createWithConflictCheck = async (ReservationModel, data) => {
  const reservation = await ReservationModel.create(data);

  try {
    await ensureNoReservationConflicts(ReservationModel, { ...data, reservation_id: reservation.reservation_id });
  } catch (error) {
    await ReservationModel.deleteOne({ _id: reservation._id });
    throw error;
  }

  return reservation;
};

const ensureTrainerWorksAtCenter = (trainer, center) => {
  if (trainer?.center && center && trainer.center !== center) {
    throw createStatusError(`This trainer works at ${trainer.center}, not at ${center}`, 409);
  }
};

module.exports = {
  buildSlotFilter,
  createWithConflictCheck,
  ensureNoReservationConflicts,
  ensureTrainerWorksAtCenter,
  findMemberConflict,
  findTrainerConflict,
  getTrainerSlotStatus,
};