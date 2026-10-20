const Member = require('../models/members');
const Trainer = require('../models/trainers');
const { createStatusError } = require('../http/errors');
const { sendItem } = require('../http/responses');
const { sanitizeRoleLoginPayload } = require('../middleware/validators');
const { authenticateAccount } = require('./accountControllerHelpers');

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

module.exports = {
  login,
};
