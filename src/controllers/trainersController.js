const Trainer = require('../models/trainers');
const Reservation = require('../models/reservations');
const { hashPassword, comparePassword, signToken } = require('../config/auth');
const { sendCollection, sendItem, sendNoContent } = require('../http/responses');
const { sanitizeLoginPayload, sanitizeTrainerPayload } = require('../middleware/validators');
const {
  ensureFound,
  ensureNoLinkedRecords,
  listAccountRecords,
  getAccountRecord,
  createAccountRecord,
  createAccountAuthResponse,
  authenticateAccount,
  updateAccountRecord,
} = require('./accountControllerHelpers');

const buildTrainerToken = (trainer) => signToken({
  sub: trainer.trainer_id,
  role: 'trainer',
  is_admin: trainer.is_admin,
});

const listTrainers = async (req, res) => {
  const response = await listAccountRecords(Trainer, req.query, 'activity_type');

  return sendCollection(res, response.items);
};

const getTrainerById = async (req, res) => {
  const trainer = await getAccountRecord(Trainer, 'trainer_id', req.params.trainer_id, 'Trainer');

  return sendItem(res, trainer);
};

const registerTrainer = async (req, res) => {
  const trainersCount = await Trainer.countDocuments();
  const trainer = await createAccountRecord(
    Trainer,
    sanitizeTrainerPayload(req.body, { requirePassword: true }),
    hashPassword,
    { is_admin: trainersCount === 0 }
  );

  return sendItem(res, createAccountAuthResponse(trainer, buildTrainerToken), 201);
};

const loginTrainer = async (req, res) => {
  const { email, password } = sanitizeLoginPayload(req.body);
  const response = await authenticateAccount({
    Model: Trainer,
    email,
    password,
    comparePassword,
    buildToken: buildTrainerToken,
    roleLabel: 'trainer',
  });

  return sendItem(res, response);
};

const getCurrentTrainer = async (req, res) => {
  const trainer = await getAccountRecord(Trainer, 'trainer_id', req.auth.identifier, 'Trainer');

  return sendItem(res, trainer);
};

const createTrainer = async (req, res) => {
  const trainer = await createAccountRecord(
    Trainer,
    sanitizeTrainerPayload(req.body, {
      requirePassword: true,
      allowAdminField: true,
    }),
    hashPassword
  );

  return sendItem(res, trainer, 201);
};

const updateCurrentTrainer = async (req, res) => {
  const trainer = await updateAccountRecord(
    Trainer,
    { trainer_id: req.auth.identifier },
    sanitizeTrainerPayload(req.body, { partial: true }),
    hashPassword
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
    }),
    hashPassword
  );

  ensureFound(trainer, 'Trainer');

  return sendItem(res, trainer);
};

const deleteTrainer = async (req, res) => {
  const trainer = ensureFound(
    await Trainer.findOne({ trainer_id: req.params.trainer_id }).select('_id').lean(),
    'Trainer'
  );

  await ensureNoLinkedRecords(
    Reservation.exists({ trainer: trainer._id }),
    'Trainer cannot be deleted while reservations are linked to the account'
  );

  await Trainer.findOneAndDelete({ trainer_id: req.params.trainer_id });

  return sendNoContent(res);
};

module.exports = {
  listTrainers,
  getTrainerById,
  registerTrainer,
  loginTrainer,
  getCurrentTrainer,
  createTrainer,
  updateCurrentTrainer,
  updateTrainer,
  deleteTrainer,
};