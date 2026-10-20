const crypto = require('node:crypto');
const Member = require('../models/members');
const Trainer = require('../models/trainers');
const Reservation = require('../models/reservations');
const { sendCollection, sendItem, sendNoContent } = require('../http/responses');
const { sanitizeReservationPayload } = require('../middleware/validators');
const { createStatusError } = require('../http/errors');
const { ensureFound } = require('./accountControllerHelpers');
const { ensureNoReservationConflicts } = require('./reservationConflicts');

const reservationPopulation = [
  { path: 'member', select: 'member_id full_name email' },
  { path: 'trainer', select: 'trainer_id full_name activity_type' },
];

const isTrainerAdmin = (req) => req.auth?.role === 'trainer' && req.auth?.isAdmin;
const isMemberAuth = (req) => req.auth?.role === 'member';
const isStandardTrainer = (req) => req.auth?.role === 'trainer' && !req.auth?.isAdmin;

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
  .populate({ path: 'trainer', select: 'trainer_id' })
  .lean();

const isReservationOwner = (req, reservation) => {
  const ownerReference = isMemberAuth(req) ? reservation.member : reservation.trainer;
  return ownerReference?._id?.toString() === req.auth.accountId;
};

const ensureReservationOwner = (req, reservation, action) => {
  ensureFound(reservation, 'Reservation');

  if (!isReservationOwner(req, reservation)) {
    throw createForbiddenError(`You can only ${action} your own reservations`);
  }
};

const buildReservationFilters = async (query) => {
  const filters = {};

  for (const field of ['status', 'activity_type', 'date']) {
    if (query[field]) {
      filters[field] = query[field];
    }
  }

  if (query.member_id) {
    const member = await Member.findOne({ member_id: query.member_id }).select('_id').lean();

    if (!member) {
      return null;
    }

    filters.member = member._id;
  }

  if (query.trainer_id) {
    const trainer = await Trainer.findOne({ trainer_id: query.trainer_id }).select('_id').lean();

    if (!trainer) {
      return null;
    }

    filters.trainer = trainer._id;
  }

  return filters;
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
  if (isMemberAuth(req) && memberId && memberId !== req.auth.identifier) {
    throw createForbiddenError(message);
  }
};

const assignCurrentMember = (req, reservationData) => {
  if (isMemberAuth(req)) {
    reservationData.member_id = req.auth.identifier;
  }
};

const ensureTrainerReservationAccess = (req, trainerId, message) => {
  if (isStandardTrainer(req) && trainerId && trainerId !== req.auth.identifier) {
    throw createForbiddenError(message);
  }
};

const assignCurrentTrainer = (req, reservationData) => {
  if (isStandardTrainer(req)) {
    reservationData.trainer_id = req.auth.identifier;
  }
};

const listReservations = async (req, res) => {
  const filters = await buildReservationFilters(req.query);

  if (!filters) {
    return sendCollection(res, []);
  }

  if (isMemberAuth(req)) {
    ensureMemberReservationAccess(req, req.query.member_id, 'You can only view your own reservations');
    filters.member = req.auth.accountId;
  }

  if (isStandardTrainer(req)) {
    ensureTrainerReservationAccess(req, req.query.trainer_id, 'You can only view your own reservations');
    filters.trainer = req.auth.accountId;
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

  if (!isTrainerAdmin(req) && !isReservationOwner(req, reservation)) {
    throw createForbiddenError('You can only view your own reservations');
  }

  return sendItem(res, reservation);
};

const createReservation = async (req, res) => {
  const requestedBooker = req.body?.booked_by === 'trainer' ? 'trainer' : 'member';
  const bookedBy = isMemberAuth(req)
    ? 'member'
    : isStandardTrainer(req) ? 'trainer' : requestedBooker;

  const reservationData = sanitizeReservationPayload(req.body, {
    requireMemberId: !isMemberAuth(req),
    requireTrainerId: !isStandardTrainer(req),
    requireReservationId: false,
  });

  reservationData.booked_by = bookedBy;
  reservationData.reservation_id ||= `R-${crypto.randomBytes(5).toString('hex')}`;

  ensureMemberReservationAccess(req, reservationData.member_id, 'You can only create reservations for your own account');
  ensureTrainerReservationAccess(req, reservationData.trainer_id, 'You can only create reservations for your own account');
  assignCurrentMember(req, reservationData);
  assignCurrentTrainer(req, reservationData);

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

const ensureNotStandardTrainer = (req) => {
  if (isStandardTrainer(req)) {
    throw createForbiddenError('Trainer admin access is required to modify or delete reservations');
  }
};

const updateReservation = async (req, res) => {
  ensureNotStandardTrainer(req);

  const reservationData = sanitizeReservationPayload(req.body, { partial: true });
  const existingReservation = await findReservationForOwnershipCheck(req.params.reservation_id);

  ensureFound(existingReservation, 'Reservation');

  if (!isTrainerAdmin(req)) {
    ensureReservationOwner(req, existingReservation, 'update');
    ensureMemberReservationAccess(req, reservationData.member_id, 'You cannot move a reservation to another member');
    ensureTrainerReservationAccess(req, reservationData.trainer_id, 'You cannot move a reservation to another trainer');
    assignCurrentMember(req, reservationData);
    delete reservationData.booked_by;
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
  ensureNotStandardTrainer(req);

  if (!isTrainerAdmin(req)) {
    const reservation = await findReservationForOwnershipCheck(req.params.reservation_id);
    ensureReservationOwner(req, reservation, 'delete');
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
