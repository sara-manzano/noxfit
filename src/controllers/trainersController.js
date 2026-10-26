const crypto = require('node:crypto');
const { generateId } = require('../config/ids');
const Trainer = require('../models/trainers');
const { signAccountToken } = require('../config/auth');
const { createStatusError, createForbiddenError } = require('../http/errors');
const { sendCollection, sendItem, sendNoContent } = require('../http/responses');
const { sanitizeTrainerPayload } = require('../middleware/validators');
const {
  ensureFound,
  listAccountRecords,
  listAccountDirectory,
  getAccountRecord,
  createAccountRecord,
  updateAccountRecord,
  deleteAccountRecord,
} = require('./accountControllerHelpers');

const isSameToken = (received, expected) => {
  const receivedBuffer = Buffer.from(String(received ?? ''));
  const expectedBuffer = Buffer.from(expected);

  return receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
};

const ensureAnotherAdminExists = async (trainer_id) => {
  const target = await Trainer.findOne({ trainer_id, is_admin: true, active: { $ne: false } }).select('_id').lean();

  if (!target) {
    return;
  }

  const otherAdmin = await Trainer.exists({ _id: { $ne: target._id }, is_admin: true, active: { $ne: false } });

  if (!otherAdmin) {
    throw createStatusError('At least one active trainer admin must remain', 409);
  }
};

const ensurePublicTrainerRegistrationAllowed = async (req) => {
  if (await Trainer.exists({})) {
    throw createStatusError('Public trainer registration is closed; ask an admin to create the account', 403);
  }

  const bootstrapToken = process.env.TRAINER_BOOTSTRAP_TOKEN;

  if (!bootstrapToken) {
    throw createStatusError('TRAINER_BOOTSTRAP_TOKEN is required to bootstrap the first trainer admin', 503);
  }

  if (!isSameToken(req.headers['x-bootstrap-token'], bootstrapToken)) {
    throw createStatusError('A valid bootstrap token is required to create the first trainer admin', 403);
  }
};

const listTrainers = async (req, res) => {
  const trainers = await listAccountRecords(Trainer, req.query, 'activity_type');

  return sendCollection(res, trainers);
};

const listTrainerDirectory = async (_req, res) => sendCollection(
  res,
  await listAccountDirectory(Trainer, 'trainer_id full_name activity_type center avatar')
);

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
  const trainer = await getAccountRecord(Trainer, 'trainer_id', req.auth.identifier, 'Trainer', '+avatar');

  return sendItem(res, trainer);
};

const createTrainer = async (req, res) => {
  const trainer = await createAccountRecord(
    Trainer,
    sanitizeTrainerPayload({ trainer_id: generateId('T'), ...req.body }, {
      requirePassword: true,
      allowAdminField: true,
    })
  );

  return sendItem(res, trainer, 201);
};

const applyTrainerUpdate = async (res, trainer_id, body, options) => {
  const payload = sanitizeTrainerPayload(body, { partial: true, ...options });

  if (payload.is_admin === false || payload.active === false) {
    await ensureAnotherAdminExists(trainer_id);
  }

  const trainer = await updateAccountRecord(Trainer, { trainer_id }, payload);

  ensureFound(trainer, 'Trainer');

  return sendItem(res, trainer);
};

const updateCurrentTrainer = (req, res) => {
  if (!req.auth.isAdmin && Object.keys(req.body).some((field) => field !== 'avatar')) {
    throw createForbiddenError('Trainer admin access is required to change fields other than avatar');
  }

  return applyTrainerUpdate(res, req.auth.identifier, req.body, { allowIdentifierUpdate: false });
};

const updateTrainer = (req, res) => applyTrainerUpdate(
  res,
  req.params.trainer_id,
  req.body,
  { allowAdminField: true }
);

const deleteTrainer = async (req, res) => {
  await ensureAnotherAdminExists(req.params.trainer_id);
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