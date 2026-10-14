const Trainer = require('../models/trainers');
const Reservation = require('../models/reservations');
const { hashPassword, comparePassword, signToken } = require('../config/auth');
const { sanitizeLoginPayload, sanitizeTrainerPayload } = require('../middleware/validators');

const createConflictError = (message) => {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
};

const buildTrainerToken = (trainer) => signToken({
  sub: trainer.trainer_id,
  role: 'trainer',
  is_admin: trainer.is_admin,
});

const createTrainerAuthResponse = (trainer) => ({
  token: buildTrainerToken(trainer),
  user: trainer,
});

const createUnauthorizedError = () => {
  const error = new Error('Invalid email or password');
  error.statusCode = 401;
  return error;
};

const buildTrainerFilters = (query) => {
  const filters = {};

  if (query.active === 'true') {
    filters.active = true;
  }

  if (query.active === 'false') {
    filters.active = false;
  }

  if (query.activity_type) {
    filters.activity_type = query.activity_type;
  }

  return filters;
};

const listTrainers = async (req, res, next) => {
  try {
    const filters = buildTrainerFilters(req.query);

    const trainers = await Trainer.find(filters)
      .sort({ full_name: 1 });

    return res.status(200).json({
      items: trainers,
      total: trainers.length,
    });
  } catch (error) {
    return next(error);
  }
};

const getTrainerById = async (req, res, next) => {
  try {
    const trainer = await Trainer.findOne({ trainer_id: req.params.trainerId });

    if (!trainer) {
      return res.status(404).json({ error: 'Trainer not found' });
    }

    return res.status(200).json(trainer);
  } catch (error) {
    return next(error);
  }
};

const registerTrainer = async (req, res, next) => {
  try {
    const trainerData = sanitizeTrainerPayload(req.body, { requirePassword: true });
    const trainersCount = await Trainer.countDocuments();
    const passwordHash = await hashPassword(trainerData.password);

    delete trainerData.password;

    const trainer = await Trainer.create({
      ...trainerData,
      password_hash: passwordHash,
      is_admin: trainersCount === 0,
    });

    return res.status(201).json(createTrainerAuthResponse(trainer));
  } catch (error) {
    return next(error);
  }
};

const loginTrainer = async (req, res, next) => {
  try {
    const { email, password } = sanitizeLoginPayload(req.body);
    const trainer = await Trainer.findOne({ email }).select('+password_hash');

    if (!trainer) {
      throw createUnauthorizedError();
    }

    const isPasswordValid = await comparePassword(password, trainer.password_hash);

    if (!isPasswordValid) {
      throw createUnauthorizedError();
    }

    if (trainer.active === false) {
      const error = new Error('This trainer account is inactive');
      error.statusCode = 403;
      throw error;
    }

    return res.status(200).json(createTrainerAuthResponse(trainer));
  } catch (error) {
    return next(error);
  }
};

const getCurrentTrainer = async (req, res, next) => {
  try {
    const trainer = await Trainer.findOne({ trainer_id: req.auth.identifier });

    if (!trainer) {
      return res.status(404).json({ error: 'Trainer not found' });
    }

    return res.status(200).json(trainer);
  } catch (error) {
    return next(error);
  }
};

const createTrainer = async (req, res, next) => {
  try {
    const trainerData = sanitizeTrainerPayload(req.body, {
      requirePassword: true,
      allowAdminField: true,
    });
    const passwordHash = await hashPassword(trainerData.password);

    delete trainerData.password;

    const trainer = await Trainer.create({
      ...trainerData,
      password_hash: passwordHash,
    });

    return res.status(201).json(trainer);
  } catch (error) {
    return next(error);
  }
};

const updateCurrentTrainer = async (req, res, next) => {
  try {
    const trainerData = sanitizeTrainerPayload(req.body, { partial: true });

    if (trainerData.password) {
      trainerData.password_hash = await hashPassword(trainerData.password);
      delete trainerData.password;
    }

    const trainer = await Trainer.findOneAndUpdate(
      { trainer_id: req.auth.identifier },
      trainerData,
      { new: true, runValidators: true }
    );

    if (!trainer) {
      return res.status(404).json({ error: 'Trainer not found' });
    }

    return res.status(200).json(trainer);
  } catch (error) {
    return next(error);
  }
};

const updateTrainer = async (req, res, next) => {
  try {
    const trainerData = sanitizeTrainerPayload(req.body, {
      partial: true,
      allowAdminField: true,
    });

    if (trainerData.password) {
      trainerData.password_hash = await hashPassword(trainerData.password);
      delete trainerData.password;
    }

    const trainer = await Trainer.findOneAndUpdate(
      { trainer_id: req.params.trainerId },
      trainerData,
      { new: true, runValidators: true }
    );

    if (!trainer) {
      return res.status(404).json({ error: 'Trainer not found' });
    }

    return res.status(200).json(trainer);
  } catch (error) {
    return next(error);
  }
};

const deleteTrainer = async (req, res, next) => {
  try {
    const trainer = await Trainer.findOne({ trainer_id: req.params.trainerId }).select('_id').lean();

    if (!trainer) {
      return res.status(404).json({ error: 'Trainer not found' });
    }

    const hasReservations = await Reservation.exists({ trainer: trainer._id });

    if (hasReservations) {
      throw createConflictError('Trainer cannot be deleted while reservations are linked to the account');
    }

    await Trainer.findOneAndDelete({ trainer_id: req.params.trainerId });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
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