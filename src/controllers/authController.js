const crypto = require('crypto');
const Member = require('../models/members');
const Trainer = require('../models/trainers');
const { createStatusError } = require('../http/errors');
const { sendItem } = require('../http/responses');
const { sanitizeRoleLoginPayload, sanitizeMemberPayload } = require('../middleware/validators');
const { authenticateAccount, createAccountRecord } = require('./accountControllerHelpers');

const login = async (req, res) => {
  const { role, email, password } = sanitizeRoleLoginPayload(req.body);

  let Model;
  if (role === 'member') {
    Model = Member;
  } else if (role === 'trainer') {
    Model = Trainer;
  } else {
    throw createStatusError('role must be one of: member, trainer', 400);
  }

  return sendItem(res, await authenticateAccount(Model, role, email, password));
};

// Only whitelisted fields are accepted so self-registration cannot set plan, status or id.
const registerMember = async (req, res) => {
  const { full_name, email, password, phone } = req.body || {};
  const data = sanitizeMemberPayload(
    { member_id: `M-${crypto.randomBytes(5).toString('hex')}`, full_name, email, password, phone },
    { requirePassword: true }
  );

  return sendItem(res, await createAccountRecord(Member, data, { membership_type: 'Básica' }), 201);
};

module.exports = {
  login,
  registerMember,
};
