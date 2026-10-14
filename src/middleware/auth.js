const { verifyToken } = require('../config/auth');
const Member = require('../models/members');
const Trainer = require('../models/trainers');

const createAuthError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const createDeletedAccountError = () => createAuthError('The account associated with this token no longer exists', 401);

const normalizeAuthError = (error) => {
  if (error.statusCode) {
    return error;
  }

  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return createAuthError('Invalid or expired token', 401);
  }

  return error;
};

const getBearerToken = (req) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    throw createAuthError('Authorization header is required', 401);
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw createAuthError('Authorization header must use the Bearer scheme', 401);
  }

  return token;
};

const resolveAccount = async (payload) => {
  if (!payload?.sub || !payload?.role) {
    throw createAuthError('Invalid or expired token', 401);
  }

  if (payload.role === 'member') {
    const member = await Member.findOne({ member_id: payload.sub })
      .select('_id active')
      .lean();

    if (!member) {
      throw createDeletedAccountError();
    }

    if (member.active === false) {
      throw createAuthError('This account is inactive', 403);
    }

    return {
      accountId: member._id.toString(),
      isAdmin: false,
    };
  }

  if (payload.role === 'trainer') {
    const trainer = await Trainer.findOne({ trainer_id: payload.sub })
      .select('_id active is_admin')
      .lean();

    if (!trainer) {
      throw createDeletedAccountError();
    }

    if (trainer.active === false) {
      throw createAuthError('This account is inactive', 403);
    }

    return {
      accountId: trainer._id.toString(),
      isAdmin: Boolean(trainer.is_admin),
    };
  }

  throw createAuthError('Invalid or expired token', 401);
};

const buildAuthContext = async (req) => {
  const token = getBearerToken(req);
  const payload = verifyToken(token);
  const account = await resolveAccount(payload);

  return {
    identifier: payload.sub,
    role: payload.role,
    accountId: account.accountId,
    isAdmin: account.isAdmin,
  };
};

const authenticateRequest = async (req, _res, next) => {
  try {
    req.auth = await buildAuthContext(req);
    return next();
  } catch (error) {
    return next(normalizeAuthError(error));
  }
};

const requireMemberAuth = async (req, _res, next) => {
  try {
    req.auth = await buildAuthContext(req);

    if (req.auth.role !== 'member') {
      throw createAuthError('Member access is required', 403);
    }

    return next();
  } catch (error) {
    return next(normalizeAuthError(error));
  }
};

const requireTrainerAuth = async (req, _res, next) => {
  try {
    req.auth = await buildAuthContext(req);

    if (req.auth.role !== 'trainer') {
      throw createAuthError('Trainer access is required', 403);
    }

    return next();
  } catch (error) {
    return next(normalizeAuthError(error));
  }
};

const requireTrainerAdmin = async (req, _res, next) => {
  try {
    req.auth = await buildAuthContext(req);

    if (req.auth.role !== 'trainer') {
      throw createAuthError('Trainer access is required', 403);
    }

    if (!req.auth.isAdmin) {
      throw createAuthError('Trainer admin access is required', 403);
    }

    return next();
  } catch (error) {
    return next(normalizeAuthError(error));
  }
};

const requireReservationAccess = async (req, _res, next) => {
  try {
    req.auth = await buildAuthContext(req);

    const canAccessReservations = req.auth.role === 'member'
      || (req.auth.role === 'trainer' && req.auth.isAdmin);

    if (!canAccessReservations) {
      throw createAuthError('Member or trainer admin access is required', 403);
    }

    return next();
  } catch (error) {
    return next(normalizeAuthError(error));
  }
};

module.exports = {
  authenticateRequest,
  requireMemberAuth,
  requireReservationAccess,
  requireTrainerAuth,
  requireTrainerAdmin,
};