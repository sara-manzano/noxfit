const Member = require('../models/members');
const Reservation = require('../models/reservations');
const { hashPassword, comparePassword, signToken } = require('../config/auth');
const { sendCollection, sendItem, sendNoContent } = require('../http/responses');
const { sanitizeLoginPayload, sanitizeMemberPayload } = require('../middleware/validators');
const {
  ensureFound,
  listAccountRecords,
  getAccountRecord,
  createAccountRecord,
  createAccountAuthResponse,
  authenticateAccount,
  updateAccountRecord,
  deleteAccountRecord,
} = require('./accountControllerHelpers');

const buildMemberToken = (member) => signToken({
  sub: member.member_id,
  role: 'member',
});

const listMembers = async (req, res) => {
  const response = await listAccountRecords(Member, req.query, 'membership_type');

  return sendCollection(res, response.items);
};

const getMemberById = async (req, res) => {
  const member = await getAccountRecord(Member, 'member_id', req.params.member_id, 'Member');

  return sendItem(res, member);
};

const registerMember = async (req, res) => {
  const member = await createAccountRecord(
    Member,
    sanitizeMemberPayload(req.body, { requirePassword: true }),
    hashPassword
  );

  return sendItem(res, createAccountAuthResponse(member, buildMemberToken), 201);
};

const loginMember = async (req, res) => {
  const { email, password } = sanitizeLoginPayload(req.body);
  const response = await authenticateAccount({
    Model: Member,
    email,
    password,
    comparePassword,
    buildToken: buildMemberToken,
    roleLabel: 'member',
  });

  return sendItem(res, response);
};

const getCurrentMember = async (req, res) => {
  const member = await getAccountRecord(Member, 'member_id', req.auth.identifier, 'Member');

  return sendItem(res, member);
};

const createMember = async (req, res) => {
  const member = await createAccountRecord(
    Member,
    sanitizeMemberPayload(req.body, { requirePassword: true }),
    hashPassword
  );

  return sendItem(res, member, 201);
};

const updateCurrentMember = async (req, res) => {
  const member = await updateAccountRecord(
    Member,
    { member_id: req.auth.identifier },
    sanitizeMemberPayload(req.body, { partial: true, allowIdentifierUpdate: false }),
    hashPassword
  );

  ensureFound(member, 'Member');

  return sendItem(res, member);
};

const updateMember = async (req, res) => {
  const member = await updateAccountRecord(
    Member,
    { member_id: req.params.member_id },
    sanitizeMemberPayload(req.body, { partial: true }),
    hashPassword
  );

  ensureFound(member, 'Member');

  return sendItem(res, member);
};

const deleteMember = async (req, res) => {
  await deleteAccountRecord({
    Model: Member,
    ReservationModel: Reservation,
    identifierField: 'member_id',
    identifierValue: req.params.member_id,
    reservationField: 'member',
    resourceName: 'Member',
  });
  return sendNoContent(res);
};

module.exports = {
  listMembers,
  getMemberById,
  registerMember,
  loginMember,
  getCurrentMember,
  createMember,
  updateCurrentMember,
  updateMember,
  deleteMember,
};