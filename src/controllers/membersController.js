const Member = require('../models/members');
const Reservation = require('../models/reservations');
const { hashPassword } = require('../config/auth');
const { sendCollection, sendItem, sendNoContent } = require('../http/responses');
const { sanitizeMemberPayload } = require('../middleware/validators');
const {
  ensureFound,
  listAccountRecords,
  getAccountRecord,
  createAccountRecord,
  updateAccountRecord,
  deleteAccountRecord,
} = require('./accountControllerHelpers');

const listMembers = async (req, res) => {
  const response = await listAccountRecords(Member, req.query, 'membership_type');

  return sendCollection(res, response.items);
};

const getMemberById = async (req, res) => {
  const member = await getAccountRecord(Member, 'member_id', req.params.member_id, 'Member');

  return sendItem(res, member);
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
  getCurrentMember,
  createMember,
  updateCurrentMember,
  updateMember,
  deleteMember,
};