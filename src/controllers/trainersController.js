const crypto = require('node:crypto');
const Trainer = require('../models/trainers');
const { signAccountToken } = require('../config/auth');
const { createStatusError } = require('../http/errors');
const { sendCollection, sendItem, sendNoContent } = require('../http/responses');
const { sanitizeTrainerPayload } = require('../middleware/validators');
const {
  ensureFound,
  listAccountRecords,
  getAccountRecord,
  createAccountRecord,
  updateAccountRecord,
  deleteAccountRecord,
} = require('./accountControllerHelpers');

// Only the very first trainer can self-register, and only with the bootstrap token.
const ensurePublicTrainerRegistrationAllowed = async (req) => {
  if (await Trainer.exists({})) {
    throw createStatusError('Public trainer registration is closed; ask an admin to create the account', 403);
  }

  const bootstrapToken = process.env.TRAINER_BOOTSTRAP_TOKEN;

  if (!bootstrapToken) {
    throw createStatusError('TRAINER_BOOTSTRAP_TOKEN is required to bootstrap the first trainer admin', 503);
  }

  if (req.headers['x-bootstrap-token'] !== bootstrapToken) {
    throw createStatusError('A valid bootstrap token is required to create the first trainer admin', 403);
  }
};

const listTrainers = async (req, res) => {
  const trainers = await listAccountRecords(Trainer, req.query, 'activity_type');

  return sendCollection(res, trainers);
};

const listTrainerDirectory = async (_req, res) => {
  const trainers = await Trainer.find({ active: { $ne: false } })
    .select('trainer_id full_name activity_type -_id')
    .sort({ full_name: 1 })
    .lean();

  return sendCollection(res, trainers);
};

const getTrainerById = async (req, res) => {
  const trainer = await getAccountRecord(Trainer, 'trainer_id', req.params.trainer_id, 'Trainer');

  return sendItem(res, trainer);
};

const registerTrainer = async (req, res) => {
  await ensurePublicTrainerRegistrationAllowed(req);

  const payload = sanitizeTrainerPayload(req.body, { requirePassword: true });
  const trainer = await createAccountRecord(Trainer, payload, {
    is_admin: true,
    bootstrap_admin: true,
  });

  return sendItem(res, { token: signAccountToken('trainer', trainer), user: trainer }, 201);
};

const getCurrentTrainer = async (req, res) => {
  const trainer = await getAccountRecord(Trainer, 'trainer_id', req.auth.identifier, 'Trainer');

  return sendItem(res, trainer);
};

const createTrainer = async (req, res) => {
  const trainer = await createAccountRecord(
    Trainer,
    sanitizeTrainerPayload({ trainer_id: `T-${crypto.randomBytes(5).toString('hex')}`, ...req.body }, {
      requirePassword: true,
      allowAdminField: true,
    })
  );

  return sendItem(res, trainer, 201);
};

const updateCurrentTrainer = async (req, res) => {
  const trainer = await updateAccountRecord(
    Trainer,
    { trainer_id: req.auth.identifier },
    sanitizeTrainerPayload(req.body, { partial: true, allowIdentifierUpdate: false })
  );

  ensureFound(trainer, 'Trainer');

  return sendItem(res, trainer);
};

const updateTrainer = async (req, res) => {
  const trainer = await updateAccountRecord(
    Trainer,
    { trainer_id: req.params.trainer_id },
    sanitizeTrainerPayload(req.body, {
      partial: true,
      allowAdminField: true,
    })
  );

  ensureFound(trainer, 'Trainer');

  return sendItem(res, trainer);
};

const deleteTrainer = async (req, res) => {
  await deleteAccountRecord(Trainer, 'trainer_id', req.params.trainer_id, 'trainer', 'Trainer');

  return sendNoContent(res);
};

module.exports = {
  listTrainerDirectory,
  listTrainers,
  getTrainerById,
  registerTrainer,
  getCurrentTrainer,
  createTrainer,
  updateCurrentTrainer,
  updateTrainer,
  deleteTrainer,
};