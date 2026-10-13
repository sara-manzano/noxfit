const { verifyToken } = require('../config/auth');

const createAuthError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const authenticateRequest = (req, _res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader) {
      throw createAuthError('Authorization header is required', 401);
    }

    const [scheme, token] = authorizationHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw createAuthError('Authorization header must use the Bearer scheme', 401);
    }

    const payload = verifyToken(token);

    req.auth = {
      identifier: payload.sub,
      role: payload.role,
      isAdmin: Boolean(payload.is_admin),
    };

    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(createAuthError('Invalid or expired token', 401));
    }

    return next(error);
  }
};

const requireMemberAuth = (req, res, next) => {
  authenticateRequest(req, res, (error) => {
    if (error) {
      return next(error);
    }

    if (req.auth.role !== 'member') {
      return next(createAuthError('Member access is required', 403));
    }

    return next();
  });
};

const requireTrainerAuth = (req, res, next) => {
  authenticateRequest(req, res, (error) => {
    if (error) {
      return next(error);
    }

    if (req.auth.role !== 'trainer') {
      return next(createAuthError('Trainer access is required', 403));
    }

    return next();
  });
};

const requireTrainerAdmin = (req, res, next) => {
  requireTrainerAuth(req, res, (error) => {
    if (error) {
      return next(error);
    }

    if (!req.auth.isAdmin) {
      return next(createAuthError('Trainer admin access is required', 403));
    }

    return next();
  });
};

module.exports = {
  authenticateRequest,
  requireMemberAuth,
  requireTrainerAuth,
  requireTrainerAdmin,
};