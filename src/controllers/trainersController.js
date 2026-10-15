const Trainer = require('../models/trainers');
const Reservation = require('../models/reservations');
const { hashPassword, comparePassword, signToken } = require('../config/auth');
const { sendCollection, sendItem, sendNoContent } = require('../http/responses');
const { sanitizeLoginPayload, sanitizeTrainerPayload } = require('../middleware/validators');
const {
  createStatusError,
  ensureFound,
  listAccountRecords,
  getAccountRecord,
  createAccountRecord,
  createAccountAuthResponse,
  authenticateAccount,
  updateAccountRecord,
  deleteAccountRecord,
} = require('./accountControllerHelpers');

const buildTrainerToken = (trainer) => signToken({
  sub: trainer.trainer_id,
  role: 'trainer',
  is_admin: trainer.is_admin,
});

const ensureBootstrapTokenIsConfigured = () => {
  if (!process.env.TRAINER_BOOTSTRAP_TOKEN) {
    throw createStatusError('TRAINER_BOOTSTRAP_TOKEN es obligatorio para crear el primer entrenador admin', 503);
  }

  return process.env.TRAINER_BOOTSTRAP_TOKEN;
};

const ensurePublicTrainerRegistrationAllowed = async (req) => {
  const trainerExists = await Trainer.exists({});

  if (trainerExists) {
    throw createStatusError('El registro publico de entrenadores esta cerrado; pide a un admin que cree la cuenta', 403);
  }

  const bootstrapToken = ensureBootstrapTokenIsConfigured();
  const providedToken = req.headers['x-bootstrap-token'];

  if (providedToken !== bootstrapToken) {
    throw createStatusError('Hace falta un bootstrap token valido para crear el primer entrenador admin', 403);
  }
};

const listTrainers = async (req, res) => {
  const response = await listAccountRecords(Trainer, req.query, 'activity_type');

  return sendCollection(res, response.items);
};

const getTrainerById = async (req, res) => {
  const trainer = await getAccountRecord(Trainer, 'trainer_id', req.params.trainer_id, 'Trainer');

  return sendItem(res, trainer);
};

const registerTrainer = async (req, res) => {
  await ensurePublicTrainerRegistrationAllowed(req);

  const payload = sanitizeTrainerPayload(req.body, { requirePassword: true });
  const trainer = await createAccountRecord(Trainer, payload, hashPassword, {
    is_admin: true,
    bootstrap_admin: true,
  });

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
    sanitizeTrainerPayload(req.body, { partial: true, allowIdentifierUpdate: false }),
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
  await deleteAccountRecord({
    Model: Trainer,
    ReservationModel: Reservation,
    identifierField: 'trainer_id',
    identifierValue: req.params.trainer_id,
    reservationField: 'trainer',
    resourceName: 'Trainer',
  });

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