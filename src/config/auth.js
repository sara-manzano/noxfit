const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required.');
  }

  return process.env.JWT_SECRET;
};

const hashPassword = async (password) => bcrypt.hash(password, 10);

const comparePassword = async (password, passwordHash) => {
  if (typeof password !== 'string' || typeof passwordHash !== 'string' || passwordHash.length === 0) {
    return false;
  }

  return bcrypt.compare(password, passwordHash);
};

const signToken = (payload) => jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });

const verifyToken = (token) => jwt.verify(token, getJwtSecret());

module.exports = {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
};