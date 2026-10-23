const crypto = require('node:crypto');

const generateId = (prefix) => `${prefix}-${crypto.randomBytes(5).toString('hex')}`;

module.exports = { generateId };
