const crypto = require('node:crypto');

const generateId = (prefix) => `${prefix}-${crypto.randomBytes(5).toString('hex')}`;

const getReferenceId = (reference) => reference?._id || reference;

module.exports = { generateId, getReferenceId };
