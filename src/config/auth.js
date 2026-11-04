const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required.');
  }

  return process.env.JWT_SECRET;
};

const BCRYPT_ROUNDS = 12;
const JWT_ALGORITHM = 'HS256';

const hashPassword = async (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

const DUMMY_PASSWORD_HASH = bcrypt.hashSync('noxfit-dummy-password', BCRYPT_ROUNDS);

const comparePassword = async (password, passwordHash) => {
  if (typeof password !== 'string' || typeof passwordHash !== 'string' || passwordHash.length === 0) {
    return false;
  }

  return bcrypt.compare(password, passwordHash);
};

const signToken = (payload) => jwt.sign(payload, getJwtSecret(), { algorithm: JWT_ALGORITHM, expiresIn: '7d' });

const verifyToken = (token) => jwt.verify(token, getJwtSecret(), { algorithms: [JWT_ALGORITHM] });

const signAccountToken = (role, account) => {
  if (role === 'trainer') {
    return signToken({ sub: account.trainer_id, role, is_admin: account.is_admin });
  }

  return signToken({ sub: account.member_id, role });
};

module.exports = {
  hashPassword,
  comparePassword,
  DUMMY_PASSWORD_HASH,
  getJwtSecret,
  signAccountToken,
  verifyToken,
};