const { createStatusError } = require('../http/errors');
const { verifyToken } = require('../config/auth');
const Member = require('../models/members');
const Trainer = require('../models/trainers');

const createAuthError = (message, statusCode) => createStatusError(message, statusCode);

const createForbiddenError = (message) => createAuthError(message, 403);
const createDeletedAccountError = () => createAuthError('La cuenta asociada a este token ya no existe', 401);

const normalizeAuthError = (error) => {
  if (error.statusCode) {
    return error;
  }

  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return createAuthError('El token no es valido o ha caducado', 401);
  }

  return error;
};

const getBearerToken = (req) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    throw createAuthError('La cabecera Authorization es obligatoria', 401);
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw createAuthError('La cabecera Authorization debe usar Bearer <token>', 401);
  }

  return token;
};

const resolveAccount = async (payload) => {
  if (!payload?.sub || !payload?.role) {
    throw createAuthError('El token no es valido o ha caducado', 401);
  }

  if (payload.role === 'member') {
    const member = await Member.findOne({ member_id: payload.sub })
      .select('_id active')
      .lean();

    if (!member) {
      throw createDeletedAccountError();
    }

    if (member.active === false) {
      throw createAuthError('La cuenta esta inactiva', 403);
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
      throw createAuthError('La cuenta esta inactiva', 403);
    }

    return {
      accountId: trainer._id.toString(),
      isAdmin: Boolean(trainer.is_admin),
    };
  }

  throw createAuthError('El token no es valido o ha caducado', 401);
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
    const roleLabel = role === 'member' ? 'miembro' : 'entrenador';
    throw createForbiddenError(`Hace falta acceso de ${roleLabel}`);
  }
};

const ensureTrainerAdmin = (auth) => {
  ensureRole(auth, 'trainer');

  if (!auth.isAdmin) {
    throw createForbiddenError('Hace falta acceso de entrenador admin');
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
    throw createForbiddenError('Las reservas requieren acceso de miembro o entrenador admin');
  }
});

module.exports = {
  authenticateRequest,
  requireMemberAuth,
  requireReservationAccess,
  requireTrainerAuth,
  requireTrainerAdmin,
};