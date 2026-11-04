const Trainer = require('../models/trainers');
const Reservation = require('../models/reservations');
const Waitlist = require('../models/waitlist');
const { sendCollection, sendItem, sendNoContent } = require('../http/responses');
const { sanitizeReservationPayload } = require('../middleware/validators');
const { createStatusError, createForbiddenError } = require('../http/errors');
const { generateId } = require('../config/ids');
const { isMemberAuth, isTrainerAdmin } = require('../middleware/auth');
const { ensureFound } = require('./accountControllerHelpers');
const {
  buildSlotFilter,
  ensureTrainerWorksAtCenter,
  findMemberConflict,
  findTrainerConflict,
} = require('../services/reservationConflicts');

const waitlistPopulation = [
  { path: 'member', select: 'member_id full_name' },
  { path: 'trainer', select: 'trainer_id full_name activity_type center' },
];

const withPosition = async (entry) => ({
  ...entry,
  position: 1 + await Waitlist.countDocuments({
    trainer: entry.trainer._id,
    date: entry.date,
    time_slot: entry.time_slot,
    status: 'Esperando',
    createdAt: { $lt: entry.createdAt },
  }),
});

const listWaitlist = async (req, res) => {
  const filters = { status: 'Esperando' };

  if (isMemberAuth(req)) {
    filters.member = req.auth.accountId;
  } else if (!isTrainerAdmin(req)) {
    filters.trainer = req.auth.accountId;
  }

  const entries = await Waitlist.find(filters)
    .populate(waitlistPopulation)
    .sort({ date: 1, time_slot: 1, createdAt: 1 })
    .lean();

  // Entries whose member or trainer was deleted cannot be populated
  const liveEntries = entries.filter((entry) => entry.member && entry.trainer);

  return sendCollection(res, await Promise.all(liveEntries.map(withPosition)));
};

const joinWaitlist = async (req, res) => {
  if (!isMemberAuth(req)) {
    throw createForbiddenError('Member access is required to join the waiting list');
  }

  const data = sanitizeReservationPayload(req.body, {
    requireMemberId: false,
    requireTrainerId: true,
    requireReservationId: false,
  });

  if (!data.time_slot) {
    throw createStatusError('time_slot is required', 400);
  }

  const trainer = await Trainer.findOne({ trainer_id: data.trainer_id }).select('_id center').lean();

  ensureFound(trainer, 'Trainer');
  ensureTrainerWorksAtCenter(trainer, data.center);

  const slot = { trainer: trainer._id, date: data.date, time_slot: data.time_slot, activity_type: data.activity_type };

  if (await findMemberConflict(Reservation, buildSlotFilter(slot), req.auth.accountId)) {
    throw createStatusError('Member already has a reservation for that time slot', 409);
  }

  if (!await findTrainerConflict(Reservation, slot)) {
    throw createStatusError('That time slot still has spots available, book it directly', 409);
  }

  const alreadyWaiting = await Waitlist.exists({
    member: req.auth.accountId,
    trainer: trainer._id,
    date: data.date,
    time_slot: data.time_slot,
    status: 'Esperando',
  });

  if (alreadyWaiting) {
    throw createStatusError('Member is already on the waiting list for that time slot', 409);
  }

  const entry = await Waitlist.create({
    waitlist_id: generateId('W'),
    member: req.auth.accountId,
    trainer: trainer._id,
    activity_type: data.activity_type,
    center: data.center || trainer.center,
    date: data.date,
    time_slot: data.time_slot,
  });
  const created = await Waitlist.findById(entry._id).populate(waitlistPopulation).lean();

  return sendItem(res, await withPosition(created), 201);
};

const leaveWaitlist = async (req, res) => {
  const entry = ensureFound(await Waitlist.findOne({ waitlist_id: req.params.waitlist_id }).lean(), 'Waitlist entry');

  if (!isTrainerAdmin(req) && String(entry.member) !== req.auth.accountId) {
    throw createForbiddenError('You can only leave your own waiting list entries');
  }

  await Waitlist.deleteOne({ _id: entry._id });

  return sendNoContent(res);
};

module.exports = { listWaitlist, joinWaitlist, leaveWaitlist };
