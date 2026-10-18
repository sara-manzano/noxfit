const Member = require('../models/members');
const Trainer = require('../models/trainers');
const { comparePassword, signToken } = require('../config/auth');
const { sendItem } = require('../http/responses');
const { sanitizeRoleLoginPayload } = require('../middleware/validators');
const { authenticateAccount, createStatusError } = require('./accountControllerHelpers');

const buildMemberToken = (member) => signToken({
  sub: member.member_id,
  role: 'member',
});

const buildTrainerToken = (trainer) => signToken({
  sub: trainer.trainer_id,
  role: 'trainer',
  is_admin: trainer.is_admin,
});

const loginConfig = {
  member: {
    Model: Member,
    buildToken: buildMemberToken,
    roleLabel: 'member',
  },
  trainer: {
    Model: Trainer,
    buildToken: buildTrainerToken,
    roleLabel: 'trainer',
  },
};

const login = async (req, res) => {
  const { role, email, password } = sanitizeRoleLoginPayload(req.body);
  const config = loginConfig[role];

  if (!config) {
    throw createStatusError('role must be one of: member, trainer', 400);
  }

  const response = await authenticateAccount({
    Model: config.Model,
    email,
    password,
    comparePassword,
    buildToken: config.buildToken,
    roleLabel: config.roleLabel,
  });

  return sendItem(res, response);
};

module.exports = {
  login,
};