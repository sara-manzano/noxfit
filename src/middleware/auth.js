const { createStatusError, createForbiddenError } = require('../http/errors');
const { verifyToken } = require('../config/auth');
const Member = require('../models/members');
const Trainer = require('../models/trainers');

const createDeletedAccountError = () => createStatusError('Account for this token no longer exists', 401);

const normalizeAuthError = (error) => {
  if (error.statusCode) {
    return error;
  }

  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return createStatusError('Token is invalid or expired', 401);
  }

  return error;
};

const getBearerToken = (req) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    throw createStatusError('Authorization header is required', 401);
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw createStatusError('Authorization header must use Bearer <token>', 401);
  }

  return token;
};

const resolveAccount = async (payload) => {
  if (!payload?.sub || !payload?.role) {
    throw createStatusError('Token is invalid or expired', 401);
  }

  let account;

  if (payload.role === 'member') {
    account = await Member.findOne({ member_id: payload.sub }).select('_id active password_changed_at').lean();
  } else if (payload.role === 'trainer') {
    account = await Trainer.findOne({ trainer_id: payload.sub }).select('_id active is_admin password_changed_at').lean();
  } else {
    throw createStatusError('Token is invalid or expired', 401);
  }

  if (!account) {
    throw createDeletedAccountError();
  }

  if (account.active === false) {
    throw createStatusError('Account is inactive', 403);
  }

  // Tokens issued before the last password change are revoked.
  if (account.password_changed_at && Math.floor(account.password_changed_at.getTime() / 1000) > payload.iat) {
    throw createStatusError('Token is invalid or expired', 401);
  }

  return {
    accountId: account._id.toString(),
    isAdmin: Boolean(account.is_admin),
  };
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

module.exports = {
  authenticateRequest,
  requireMemberAuth,
  requireTrainerAuth,
  requireTrainerAdmin,
};