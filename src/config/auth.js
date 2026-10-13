const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('The JWT_SECRET variable is missing.');
  }

  return process.env.JWT_SECRET;
};

const hashPassword = async (password) => bcrypt.hash(password, 10);

const comparePassword = async (password, passwordHash) => bcrypt.compare(password, passwordHash);

const signToken = (payload) => jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });

const verifyToken = (token) => jwt.verify(token, getJwtSecret());

module.exports = {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
};