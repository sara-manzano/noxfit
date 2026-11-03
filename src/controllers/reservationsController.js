const Member = require('../models/members');
const Trainer = require('../models/trainers');
const Reservation = require('../models/reservations');
const crypto = require('crypto');
const { sendCollection, sendItem, sendNoContent } = require('../http/responses');
const { sanitizeReservationPayload } = require('../middleware/validators');
const { createStatusError, createForbiddenError } = require('../http/errors');
const { generateId } = require('../config/ids');
const { isValidTimeSlot, isWithinOpeningHours, normalizeDateOnly } = require('../config/validation');
const { isMemberAuth, isTrainerAdmin, isStandardTrainer } = require('../middleware/auth');
const { ensureFound } = require('./accountControllerHelpers');
const {
  buildSlotFilter,
  createWithConflictCheck,
  ensureNoReservationConflicts,
  ensureTrainerWorksAtCenter,
  getTrainerSlotStatus,
} = require('../services/reservationConflicts');
const { ensureOutsideChangeWindow, releaseSlot } = require('../services/reservationLifecycle');
const { notifyReservation } = require('../services/notifications');
const { getReservationWindow, MINUTE_MS } = require('../services/reservationTime');

const CHECKIN_OPENS_MINUTES_BEFORE = 30;
const MAX_CHECKIN_CODE_LENGTH = 100;

const reservationPopulation = [
  { path: 'member', select: 'member_id full_name email membership_type' },
  { path: 'trainer', select: 'trainer_id full_name activity_type center hourly_rate' },
];

const getReferenceId = (reference) => reference?._id || reference;

const getCheckinWindow = (reservation) => {
  const window = getReservationWindow(reservation);

  return window && {
    opensAt: new Date(window.start.getTime() - CHECKIN_OPENS_MINUTES_BEFORE * MINUTE_MS),
    closesAt: window.end,
  };
};

const findAccountId = async (Model, identifierField, identifier) => {
  const account = await Model.findOne({ [identifierField]: identifier }).select('_id').lean();
  return account?._id;
};

const findReservationForOwnershipCheck = (reservation_id) => Reservation.findOne({ reservation_id })
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

  for (const field of ['status', 'activity_type', 'date', 'member_id', 'trainer_id']) {
    if (query[field] !== undefined && typeof query[field] !== 'string') {
      throw createStatusError(`${field} must be a string`, 400);
    }
  }

  for (const field of ['status', 'activity_type']) {
    if (query[field]) {
      filters[field] = query[field];
    }
  }

  if (query.date) {
    const date = normalizeDateOnly(query.date);

    if (Number.isNaN(date.getTime())) {
      throw createStatusError('date must be a valid date', 400);
    }

    filters.date = date;
  }

  if (query.member_id) {
    const member = await findAccountId(Member, 'member_id', query.member_id);

    if (!member) {
      return null;
    }

    filters.member = member;
  }

  if (query.trainer_id) {
    const trainer = await findAccountId(Trainer, 'trainer_id', query.trainer_id);

    if (!trainer) {
      return null;
    }

    filters.trainer = trainer;
  }

  return filters;
};

const resolveReservationReferences = async (payload) => {
  const data = { ...payload };

  if (payload.member_id) {
    data.member = ensureFound(await findAccountId(Member, 'member_id', payload.member_id), 'Member');
  }

  if (payload.trainer_id) {
    data.trainer = ensureFound(await findAccountId(Trainer, 'trainer_id', payload.trainer_id), 'Trainer');
  }

  delete data.member_id;
  delete data.trainer_id;

  return data;
};

const ensureTrainerMatchesCenter = async (trainerId, center) => {
  if (!trainerId || !center) {
    return;
  }

  ensureTrainerWorksAtCenter(await Trainer.findById(trainerId).select('center').lean(), center);
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

const getTrainerAvailability = async (req, res) => {
  const { date, time_slot } = req.query;

  if (!date || Number.isNaN(normalizeDateOnly(date).getTime())) {
    throw createStatusError('date must be a valid date', 400);
  }

  if (!isValidTimeSlot(time_slot)) {
    throw createStatusError('time_slot must use HH:MM - HH:MM and end after it starts', 400);
  }

  if (!isWithinOpeningHours(time_slot)) {
    throw createStatusError('time_slot must be within opening hours (07:00 - 20:00)', 400);
  }

  const [trainers, slotReservations] = await Promise.all([
    Trainer.find().select('trainer_id').lean(),
    Reservation.find(buildSlotFilter({ date, time_slot: time_slot.trim() })).select('trainer activity_type').lean(),
  ]);

  const reservationsByTrainer = new Map();

  for (const item of slotReservations) {
    const key = item.trainer.toString();
    reservationsByTrainer.set(key, [...(reservationsByTrainer.get(key) || []), item]);
  }

  const items = trainers.map((trainer) => ({
    trainer_id: trainer.trainer_id,
    ...getTrainerSlotStatus(reservationsByTrainer.get(trainer._id.toString()) || []),
  }));

  return sendCollection(res, items);
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

const ensureSlotIsFree = (payload) => ensureNoReservationConflicts(Reservation, {
  trainer: payload.trainer,
  member: payload.member,
  date: payload.date,
  time_slot: payload.time_slot,
  activity_type: payload.activity_type,
  status: payload.status || 'Confirmada',
});

const createReservation = async (req, res) => {
  let bookedBy = req.body?.booked_by === 'trainer' ? 'trainer' : 'member';

  if (isMemberAuth(req)) {
    bookedBy = 'member';
  } else if (isStandardTrainer(req)) {
    bookedBy = 'trainer';
  }

  const reservationData = sanitizeReservationPayload(req.body, {
    requireMemberId: !isMemberAuth(req),
    requireTrainerId: !isStandardTrainer(req),
    requireReservationId: false,
  });

  reservationData.booked_by = bookedBy;
  reservationData.reservation_id ||= generateId('R');

  if (isMemberAuth(req)) {
    delete reservationData.price;
    delete reservationData.status;
  }

  ensureMemberReservationAccess(req, reservationData.member_id, 'You can only create reservations for your own account');
  ensureTrainerReservationAccess(req, reservationData.trainer_id, 'You can only create reservations for your own account');
  assignCurrentMember(req, reservationData);
  assignCurrentTrainer(req, reservationData);

  const payload = await resolveReservationReferences(reservationData);

  await ensureTrainerMatchesCenter(payload.trainer, payload.center);
  await ensureSlotIsFree(payload);

  const reservation = await createWithConflictCheck(Reservation, payload);
  const createdReservation = await Reservation.findById(reservation._id)
    .populate(reservationPopulation)
    .lean();

  if (createdReservation.member && createdReservation.status === 'Confirmada') {
    await notifyReservation('confirmation', reservation._id);
  }

  return sendItem(res, createdReservation, 201);
};

const trainerReschedulableFields = ['date', 'time_slot'];

const ensureTrainerOnlyReschedules = (body) => {
  const fields = Object.keys(body || {});

  if (!fields.length || fields.some((field) => !trainerReschedulableFields.includes(field))) {
    throw createForbiddenError('Trainers can only change the date and time_slot of their own reservations');
  }
};

const previousValues = (reservation) => Object.fromEntries(
  ['member', 'trainer', 'date', 'time_slot', 'activity_type', 'center', 'status', 'reservation_id']
    .filter((field) => reservation[field] !== undefined)
    .map((field) => [field, getReferenceId(reservation[field])])
);

const hasSlotChanged = (payload, existingReservation) => Boolean(
  (payload.date && payload.date.getTime() !== new Date(existingReservation.date).getTime())
  || (payload.time_slot && payload.time_slot !== existingReservation.time_slot)
  || (payload.trainer && String(payload.trainer) !== String(getReferenceId(existingReservation.trainer)))
);

const applyReservationUpdate = async (req, res, body, { requireConfirmed = false } = {}) => {
  if (isStandardTrainer(req)) {
    ensureTrainerOnlyReschedules(body);
  }

  const reservationData = sanitizeReservationPayload(body, { partial: true });
  const existingReservation = await findReservationForOwnershipCheck(req.params.reservation_id);

  ensureFound(existingReservation, 'Reservation');

  if (!isTrainerAdmin(req)) {
    ensureReservationOwner(req, existingReservation, 'update');
    ensureMemberReservationAccess(req, reservationData.member_id, 'You cannot move a reservation to another member');
    ensureTrainerReservationAccess(req, reservationData.trainer_id, 'You cannot move a reservation to another trainer');
    assignCurrentMember(req, reservationData);
    delete reservationData.booked_by;
    delete reservationData.price;
    delete reservationData.reservation_id;

    if (reservationData.status !== 'Cancelada') {
      delete reservationData.status;
    }
  }

  if (requireConfirmed && existingReservation.status !== 'Confirmada') {
    throw createStatusError('Only confirmed reservations can be rescheduled', 409);
  }

  const payload = await resolveReservationReferences(reservationData);
  const wasActive = existingReservation.status === 'Confirmada';
  const isCancelling = wasActive && payload.status === 'Cancelada';
  const isMoving = hasSlotChanged(payload, existingReservation);

  if (isMemberAuth(req) && wasActive && (isCancelling || isMoving)) {
    ensureOutsideChangeWindow(existingReservation);
  }

  if (isCancelling) {
    payload.cancelled_at = new Date();
    payload.cancelled_by = isMemberAuth(req) ? 'member' : 'trainer';
  }

  await ensureTrainerMatchesCenter(
    payload.trainer || getReferenceId(existingReservation.trainer),
    payload.center ?? existingReservation.center
  );

  const slot = {
    trainer: payload.trainer || getReferenceId(existingReservation.trainer),
    member: payload.member || getReferenceId(existingReservation.member),
    date: payload.date || existingReservation.date,
    time_slot: payload.time_slot || existingReservation.time_slot,
    activity_type: payload.activity_type ?? existingReservation.activity_type,
    status: payload.status || existingReservation.status,
  };

  await ensureNoReservationConflicts(Reservation, { reservation_id: req.params.reservation_id, ...slot });

  const reservation = await Reservation.findOneAndUpdate(
    { reservation_id: req.params.reservation_id },
    payload,
    { returnDocument: 'after', runValidators: true }
  )
    .populate(reservationPopulation)
    .lean();

  ensureFound(reservation, 'Reservation');

  try {
    await ensureNoReservationConflicts(Reservation, { reservation_id: reservation.reservation_id, ...slot });
  } catch (error) {
    await Reservation.updateOne({ _id: reservation._id }, previousValues(existingReservation));
    throw error;
  }

  if (isCancelling) {
    await notifyReservation('cancellation', reservation._id);
    await releaseSlot(existingReservation);
  } else if (isMoving && wasActive) {
    await notifyReservation('rescheduled', reservation._id);
    await releaseSlot(existingReservation);
  }

  return sendItem(res, reservation);
};

const updateReservation = (req, res) => applyReservationUpdate(req, res, req.body);

const rescheduleReservation = (req, res) => {
  const { date, time_slot } = req.body || {};

  if (date === undefined && time_slot === undefined) {
    throw createStatusError('date or time_slot is required', 400);
  }

  return applyReservationUpdate(
    req,
    res,
    { ...(date !== undefined ? { date } : {}), ...(time_slot !== undefined ? { time_slot } : {}) },
    { requireConfirmed: true }
  );
};

const cancelReservation = async (req, res) => {
  const existingReservation = ensureFound(
    await findReservationForOwnershipCheck(req.params.reservation_id),
    'Reservation'
  );

  if (!isTrainerAdmin(req)) {
    ensureReservationOwner(req, existingReservation, 'cancel');
  }

  if (existingReservation.status !== 'Confirmada') {
    throw createStatusError('Only confirmed reservations can be cancelled', 409);
  }

  if (isMemberAuth(req)) {
    ensureOutsideChangeWindow(existingReservation);
  }

  const reservation = await Reservation.findOneAndUpdate(
    { reservation_id: existingReservation.reservation_id, status: 'Confirmada' },
    { status: 'Cancelada', cancelled_at: new Date(), cancelled_by: isMemberAuth(req) ? 'member' : 'trainer' },
    { returnDocument: 'after' }
  )
    .populate(reservationPopulation)
    .lean();

  if (!reservation) {
    throw createStatusError('Only confirmed reservations can be cancelled', 409);
  }

  await notifyReservation('cancellation', reservation._id);
  await releaseSlot(existingReservation);

  return sendItem(res, reservation);
};

const deleteReservation = async (req, res) => {
  if (isStandardTrainer(req)) {
    throw createForbiddenError('Trainer admin access is required to modify or delete reservations');
  }

  if (!isTrainerAdmin(req)) {
    const reservation = await findReservationForOwnershipCheck(req.params.reservation_id);
    ensureReservationOwner(req, reservation, 'delete');

    if (reservation.status === 'Confirmada') {
      ensureOutsideChangeWindow(reservation);
    }
  }

  const deleted = ensureFound(
    await Reservation.findOneAndDelete({ reservation_id: req.params.reservation_id }),
    'Reservation'
  );

  if (deleted.status === 'Confirmada') {
    await releaseSlot(deleted);
  }

  return sendNoContent(res);
};

const getCheckinCode = async (req, res) => {
  const reservation = ensureFound(
    await Reservation.findOne({ reservation_id: req.params.reservation_id }).select('+checkin_code').lean(),
    'Reservation'
  );

  if (!isMemberAuth(req) || String(getReferenceId(reservation.member)) !== req.auth.accountId) {
    throw createForbiddenError('You can only get the check-in code of your own reservations');
  }

  if (reservation.status !== 'Confirmada') {
    throw createStatusError('Check-in is only available for confirmed reservations', 409);
  }

  let { checkin_code } = reservation;

  if (!checkin_code) {
    const candidate = crypto.randomBytes(16).toString('hex');
    await Reservation.updateOne(
      { _id: reservation._id, checkin_code: { $exists: false } },
      { $set: { checkin_code: candidate } }
    );
    ({ checkin_code } = await Reservation.findById(reservation._id).select('+checkin_code').lean());
  }

  const window = getCheckinWindow(reservation);

  return sendItem(res, {
    reservation_id: reservation.reservation_id,
    code: checkin_code,
    valid_from: window?.opensAt ?? null,
    valid_until: window?.closesAt ?? null,
  });
};

const checkInReservation = async (req, res) => {
  if (req.auth.role !== 'trainer') {
    throw createForbiddenError('Trainer access is required to check in members');
  }

  const { code } = req.body || {};

  if (typeof code !== 'string' || !code.trim() || code.length > MAX_CHECKIN_CODE_LENGTH) {
    throw createStatusError('code must be a non-empty string', 400);
  }

  const reservation = ensureFound(
    await Reservation.findOne({ checkin_code: code.trim() }).lean(),
    'Reservation'
  );

  if (!isTrainerAdmin(req) && String(getReferenceId(reservation.trainer)) !== req.auth.accountId) {
    throw createForbiddenError('You can only check in members for your own reservations');
  }

  if (reservation.checked_in_at) {
    throw createStatusError('This reservation was already checked in', 409);
  }

  if (reservation.status !== 'Confirmada') {
    throw createStatusError('Check-in is only available for confirmed reservations', 409);
  }

  const window = getCheckinWindow(reservation);
  const now = new Date();

  if (window && (now < window.opensAt || now > window.closesAt)) {
    throw createStatusError(
      `Check-in is only possible from ${CHECKIN_OPENS_MINUTES_BEFORE} minutes before the session until it ends`,
      409
    );
  }

  const checkedIn = await Reservation.findOneAndUpdate(
    { _id: reservation._id, status: 'Confirmada', checked_in_at: { $exists: false } },
    { status: 'Completada', checked_in_at: new Date() },
    { returnDocument: 'after' }
  )
    .populate(reservationPopulation)
    .lean();

  if (!checkedIn) {
    throw createStatusError('This reservation was already checked in', 409);
  }

  return sendItem(res, checkedIn);
};

module.exports = {
  listReservations,
  getTrainerAvailability,
  getReservationById,
  createReservation,
  updateReservation,
  rescheduleReservation,
  cancelReservation,
  deleteReservation,
  getCheckinCode,
  checkInReservation,
};
