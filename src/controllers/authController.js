const { generateId } = require('../config/ids');
const Member = require('../models/members');
const Trainer = require('../models/trainers');
const { createStatusError } = require('../http/errors');
const { sendItem } = require('../http/responses');
const { sanitizeRoleLoginPayload, sanitizeMemberPayload, sanitizeForgotPasswordPayload, sanitizeResetPasswordPayload } = require('../middleware/validators');
const { authenticateAccount, createAccountRecord, requestPasswordReset, resetAccountPassword } = require('./accountControllerHelpers');
const { sendPasswordResetEmail } = require('../config/mailer');

const getAccountModel = (role) => {
  if (role === 'member') return Member;
  if (role === 'trainer') return Trainer;
  throw createStatusError('role must be one of: member, trainer', 400);
};

const login = async (req, res) => {
  const { role, email, password } = sanitizeRoleLoginPayload(req.body);

  return sendItem(res, await authenticateAccount(getAccountModel(role), role, email, password));
};

const registerMember = async (req, res) => {
  const { full_name, email, password, phone } = req.body;
  const data = sanitizeMemberPayload(
    { member_id: generateId('M'), full_name, email, password, phone },
    { requirePassword: true }
  );

  return sendItem(res, await createAccountRecord(Member, data, { membership_type: 'Básica' }), 201);
};

const forgotPassword = async (req, res) => {
  const { role, email } = sanitizeForgotPasswordPayload(req.body);
  const Model = getAccountModel(role);
  const token = await requestPasswordReset(Model, email);

  if (token) {
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const resetUrl = `${appUrl}/?reset=${token}&role=${role}`;

    sendPasswordResetEmail(email, resetUrl).catch((mailError) => {
      console.error('Password reset email failed:', mailError.message);
    });
  }

  return res.status(202).json({ message: 'If the account exists, a reset link has been sent' });
};

const resetPassword = async (req, res) => {
  const { role, token, password } = sanitizeResetPasswordPayload(req.body);
  await resetAccountPassword(getAccountModel(role), token, password);

  return res.status(200).json({ message: 'Password updated' });
};

module.exports = {
  login,
  registerMember,
  forgotPassword,
  resetPassword,
};
