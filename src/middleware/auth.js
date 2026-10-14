const { createStatusError } = require('../http/errors');
const { verifyToken } = require('../config/auth');
const Member = require('../models/members');
const Trainer = require('../models/trainers');

const createAuthError = (message, statusCode) => createStatusError(message, statusCode);

const createForbiddenError = (message) => createAuthError(message, 403);
const createDeletedAccountError = () => createAuthError('Account for this token no longer exists', 401);

const normalizeAuthError = (error) => {
  if (error.statusCode) {
    return error;
  }

  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return createAuthError('Token is invalid or expired', 401);
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
    throw createAuthError('Authorization header must use Bearer <token>', 401);
  }

  return token;
};

const resolveAccount = async (payload) => {
  if (!payload?.sub || !payload?.role) {
    throw createAuthError('Token is invalid or expired', 401);
  }

  if (payload.role === 'member') {
    const member = await Member.findOne({ member_id: payload.sub })
      .select('_id active')
      .lean();

    if (!member) {
      throw createDeletedAccountError();
    }

    if (member.active === false) {
      throw createAuthError('Account is inactive', 403);
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
      throw createAuthError('Account is inactive', 403);
    }

    return {
      accountId: trainer._id.toString(),
      isAdmin: Boolean(trainer.is_admin),
    };
  }

  throw createAuthError('Token is invalid or expired', 401);
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

const loadAuthContext = async (req) => {
  req.auth = await buildAuthContext(req);
  return req.auth;
};

const ensureRole = (auth, role) => {
  if (auth.role !== role) {
    throw createForbiddenError(`${role[0].toUpperCase()}${role.slice(1)} access is required`);
  }
};

const ensureTrainerAdmin = (auth) => {
  ensureRole(auth, 'trainer');

  if (!auth.isAdmin) {
    throw createForbiddenError('Trainer admin access is required');
  }
};

const withAuth = (guard) => async (req, _res, next) => {
  try {
    const auth = await loadAuthContext(req);

    if (guard) {
      guard(auth);
    }

    return next();
  } catch (error) {
    return next(normalizeAuthError(error));
  }
};

const authenticateRequest = withAuth();
const requireMemberAuth = withAuth((auth) => ensureRole(auth, 'member'));
const requireTrainerAuth = withAuth((auth) => ensureRole(auth, 'trainer'));
const requireTrainerAdmin = withAuth(ensureTrainerAdmin);
const requireReservationAccess = withAuth((auth) => {
  const canAccessReservations = auth.role === 'member'
    || (auth.role === 'trainer' && auth.isAdmin);

  if (!canAccessReservations) {
    throw createForbiddenError('Reservations require member or trainer admin access');
  }
});

module.exports = {
  authenticateRequest,
  requireMemberAuth,
  requireReservationAccess,
  requireTrainerAuth,
  requireTrainerAdmin,
};