const Member = require('../models/members');
const Trainer = require('../models/trainers');
const Reservation = require('../models/reservations');
const { sanitizeReservationPayload } = require('../middleware/validators');

const reservationPopulation = [
  { path: 'member', select: 'member_id full_name email' },
  { path: 'trainer', select: 'trainer_id full_name activity_type' },
];

const isTrainerAdmin = (req) => req.auth?.role === 'trainer' && req.auth?.isAdmin;

const createForbiddenError = (message) => {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
};

const createNotFoundError = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
};

const findMemberIdByCode = async (memberId) => {
  const member = await Member.findOne({ member_id: memberId }).select('_id').lean();

  if (!member) {
    throw createNotFoundError('Member not found');
  }

  return member._id;
};

const findTrainerIdByCode = async (trainerId) => {
  const trainer = await Trainer.findOne({ trainer_id: trainerId }).select('_id').lean();

  if (!trainer) {
    throw createNotFoundError('Trainer not found');
  }

  return trainer._id;
};

const findReservationByCode = (reservationId) => Reservation.findOne({ reservation_id: reservationId });

const findReservationForOwnershipCheck = (reservationId) => findReservationByCode(reservationId)
  .populate({ path: 'member', select: 'member_id' })
  .lean();

const ensureReservationOwner = (reservation, accountId, action) => {
  if (!reservation) {
    throw createNotFoundError('Reservation not found');
  }

  if (reservation.member?._id?.toString() !== accountId) {
    throw createForbiddenError(`You can only ${action} your own reservations`);
  }
};

const buildReservationFilters = async (query) => {
  const filters = {};

  if (query.status) {
    filters.status = query.status;
  }

  if (query.activity_type) {
    filters.activity_type = query.activity_type;
  }

  if (query.date) {
    filters.date = query.date;
  }

  if (query.member_id) {
    try {
      filters.member = await findMemberIdByCode(query.member_id);
    } catch (error) {
      if (error.statusCode === 404) {
        return { filters: null, emptyResult: true };
      }

      throw error;
    }

    if (!filters.member) {
      return { filters: null, emptyResult: true };
    }
  }

  if (query.trainer_id) {
    try {
      filters.trainer = await findTrainerIdByCode(query.trainer_id);
    } catch (error) {
      if (error.statusCode === 404) {
        return { filters: null, emptyResult: true };
      }

      throw error;
    }

    if (!filters.trainer) {
      return { filters: null, emptyResult: true };
    }
  }

  return { filters, emptyResult: false };
};

const resolveReservationReferences = async (payload) => {
  const data = { ...payload };

  if (payload.member_id) {
    data.member = await findMemberIdByCode(payload.member_id);
  }

  if (payload.trainer_id) {
    data.trainer = await findTrainerIdByCode(payload.trainer_id);
  }

  delete data.member_id;
  delete data.trainer_id;

  return data;
};

const listReservations = async (req, res, next) => {
  try {
    const { filters, emptyResult } = await buildReservationFilters(req.query);

    if (emptyResult) {
      return res.status(200).json({ items: [], total: 0 });
    }

    if (!isTrainerAdmin(req)) {
      if (req.query.member_id && req.query.member_id !== req.auth.identifier) {
        throw createForbiddenError('You can only view your own reservations');
      }

      filters.member = req.auth.accountId;
    }

    const reservations = await Reservation.find(filters)
      .populate(reservationPopulation)
      .sort({ date: 1, time_slot: 1 })
      .lean();

    return res.status(200).json({
      items: reservations,
      total: reservations.length,
    });
  } catch (error) {
    return next(error);
  }
};

const getReservationById = async (req, res, next) => {
  try {
    const reservation = await Reservation.findOne({ reservation_id: req.params.reservationId })
      .populate(reservationPopulation)
      .lean();

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    if (!isTrainerAdmin(req) && reservation.member?._id?.toString() !== req.auth.accountId) {
      throw createForbiddenError('You can only view your own reservations');
    }

    return res.status(200).json(reservation);
  } catch (error) {
    return next(error);
  }
};

const createReservation = async (req, res, next) => {
  try {
    const reservationData = sanitizeReservationPayload(req.body);

    if (!isTrainerAdmin(req)) {
      if (reservationData.member_id && reservationData.member_id !== req.auth.identifier) {
        throw createForbiddenError('You can only create reservations for your own account');
      }

      reservationData.member_id = req.auth.identifier;
    }

    const payload = await resolveReservationReferences(reservationData);
    const reservation = await Reservation.create(payload);

    const createdReservation = await Reservation.findById(reservation._id)
      .populate(reservationPopulation)
      .lean();

    return res.status(201).json(createdReservation);
  } catch (error) {
    return next(error);
  }
};

const updateReservation = async (req, res, next) => {
  try {
    const reservationData = sanitizeReservationPayload(req.body, { partial: true });

    if (!isTrainerAdmin(req)) {
      const existingReservation = await findReservationForOwnershipCheck(req.params.reservationId);

      ensureReservationOwner(existingReservation, req.auth.accountId, 'update');

      if (reservationData.member_id && reservationData.member_id !== req.auth.identifier) {
        throw createForbiddenError('You cannot move a reservation to another member');
      }

      reservationData.member_id = req.auth.identifier;
    }

    const payload = await resolveReservationReferences(reservationData);

    const reservation = await Reservation.findOneAndUpdate(
      { reservation_id: req.params.reservationId },
      payload,
      { new: true, runValidators: true }
    )
      .populate(reservationPopulation)
      .lean();

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    return res.status(200).json(reservation);
  } catch (error) {
    return next(error);
  }
};

const deleteReservation = async (req, res, next) => {
  try {
    if (!isTrainerAdmin(req)) {
      const reservation = await findReservationForOwnershipCheck(req.params.reservationId);

      ensureReservationOwner(reservation, req.auth.accountId, 'delete');
    }

    const reservation = await Reservation.findOneAndDelete({ reservation_id: req.params.reservationId });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listReservations,
  getReservationById,
  createReservation,
  updateReservation,
  deleteReservation,
};
