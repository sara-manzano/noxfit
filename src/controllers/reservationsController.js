const Member = require('../models/members');
const Trainer = require('../models/trainers');
const Reservation = require('../models/reservations');
const { sendCollection, sendItem, sendNoContent } = require('../http/responses');
const { sanitizeReservationPayload } = require('../middleware/validators');
const { createStatusError, ensureFound } = require('./accountControllerHelpers');
const { ensureNoReservationConflicts } = require('./reservationConflicts');

const reservationPopulation = [
  { path: 'member', select: 'member_id full_name email' },
  { path: 'trainer', select: 'trainer_id full_name activity_type' },
];

const isTrainerAdmin = (req) => req.auth?.role === 'trainer' && req.auth?.isAdmin;

const createForbiddenError = (message) => createStatusError(message, 403);
const getReferenceId = (reference) => reference?._id || reference;

const findMemberIdByCode = async (member_id) => {
  const member = await Member.findOne({ member_id }).select('_id').lean();
  return ensureFound(member, 'Member')._id;
};

const findTrainerIdByCode = async (trainer_id) => {
  const trainer = await Trainer.findOne({ trainer_id }).select('_id').lean();
  return ensureFound(trainer, 'Trainer')._id;
};

const findReservationByCode = (reservation_id) => Reservation.findOne({ reservation_id });

const findReservationForOwnershipCheck = (reservation_id) => findReservationByCode(reservation_id)
  .populate({ path: 'member', select: 'member_id' })
  .lean();

const resolveFilterReference = async (value, resolver) => {
  if (!value) {
    return undefined;
  }

  try {
    return await resolver(value);
  } catch (error) {
    if (error.statusCode === 404) {
      return null;
    }

    throw error;
  }
};

const ensureReservationOwner = (reservation, accountId, action) => {
  ensureFound(reservation, 'Reservation');

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
    filters.member = await resolveFilterReference(query.member_id, findMemberIdByCode);

    if (filters.member === null) {
      return { filters: null, emptyResult: true };
    }
  }

  if (query.trainer_id) {
    filters.trainer = await resolveFilterReference(query.trainer_id, findTrainerIdByCode);

    if (filters.trainer === null) {
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

const ensureMemberReservationAccess = (req, memberId, message) => {
  if (!isTrainerAdmin(req) && memberId && memberId !== req.auth.identifier) {
    throw createForbiddenError(message);
  }
};

const assignCurrentMember = (req, reservationData) => {
  if (!isTrainerAdmin(req)) {
    reservationData.member_id = req.auth.identifier;
  }
};

const listReservations = async (req, res) => {
  const { filters, emptyResult } = await buildReservationFilters(req.query);

  if (emptyResult) {
    return sendCollection(res, []);
  }

  if (!isTrainerAdmin(req)) {
    ensureMemberReservationAccess(req, req.query.member_id, 'You can only view your own reservations');
    filters.member = req.auth.accountId;
  }

  const reservations = await Reservation.find(filters)
    .populate(reservationPopulation)
    .sort({ date: 1, time_slot: 1 })
    .lean();

  return sendCollection(res, reservations);
};

const getReservationById = async (req, res) => {
  const reservation = ensureFound(
    await Reservation.findOne({ reservation_id: req.params.reservation_id })
      .populate(reservationPopulation)
      .lean(),
    'Reservation'
  );

  if (!isTrainerAdmin(req) && reservation.member?._id?.toString() !== req.auth.accountId) {
    throw createForbiddenError('You can only view your own reservations');
  }

  return sendItem(res, reservation);
};

const createReservation = async (req, res) => {
  const reservationData = sanitizeReservationPayload(req.body, {
    requireMemberId: isTrainerAdmin(req),
  });

  ensureMemberReservationAccess(req, reservationData.member_id, 'You can only create reservations for your own account');
  assignCurrentMember(req, reservationData);

  const payload = await resolveReservationReferences(reservationData);

  await ensureNoReservationConflicts(Reservation, {
    trainer: payload.trainer,
    member: payload.member,
    date: payload.date,
    time_slot: payload.time_slot,
    status: payload.status || 'Confirmada',
  });

  const reservation = await Reservation.create(payload);
  const createdReservation = await Reservation.findById(reservation._id)
    .populate(reservationPopulation)
    .lean();

  return sendItem(res, createdReservation, 201);
};

const updateReservation = async (req, res) => {
  const reservationData = sanitizeReservationPayload(req.body, { partial: true });
  const existingReservation = await findReservationForOwnershipCheck(req.params.reservation_id);

  ensureFound(existingReservation, 'Reservation');

  if (!isTrainerAdmin(req)) {
    ensureReservationOwner(existingReservation, req.auth.accountId, 'update');
    ensureMemberReservationAccess(req, reservationData.member_id, 'You cannot move a reservation to another member');
    assignCurrentMember(req, reservationData);
  }

  const payload = await resolveReservationReferences(reservationData);

  await ensureNoReservationConflicts(Reservation, {
    reservation_id: req.params.reservation_id,
    trainer: payload.trainer || getReferenceId(existingReservation.trainer),
    member: payload.member || getReferenceId(existingReservation.member),
    date: payload.date || existingReservation.date,
    time_slot: payload.time_slot || existingReservation.time_slot,
    status: payload.status || existingReservation.status,
  });

  const reservation = await Reservation.findOneAndUpdate(
    { reservation_id: req.params.reservation_id },
    payload,
    { returnDocument: 'after', runValidators: true }
  )
    .populate(reservationPopulation)
    .lean();

  ensureFound(reservation, 'Reservation');

  return sendItem(res, reservation);
};

const deleteReservation = async (req, res) => {
  if (!isTrainerAdmin(req)) {
    const reservation = await findReservationForOwnershipCheck(req.params.reservation_id);
    ensureReservationOwner(reservation, req.auth.accountId, 'delete');
  }

  ensureFound(
    await Reservation.findOneAndDelete({ reservation_id: req.params.reservation_id }),
    'Reservation'
  );

  return sendNoContent(res);
};

module.exports = {
  listReservations,
  getReservationById,
  createReservation,
  updateReservation,
  deleteReservation,
};
