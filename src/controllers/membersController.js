const Member = require('../models/members');
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
  const members = await listAccountRecords(Member, req.query, 'membership_type');

  return sendCollection(res, members);
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
    sanitizeMemberPayload(req.body, { requirePassword: true })
  );

  return sendItem(res, member, 201);
};

const updateCurrentMember = async (req, res) => {
  const member = await updateAccountRecord(
    Member,
    { member_id: req.auth.identifier },
    sanitizeMemberPayload(req.body, { partial: true, allowIdentifierUpdate: false, allowPlanFields: false })
  );

  ensureFound(member, 'Member');

  return sendItem(res, member);
};

const updateMember = async (req, res) => {
  const member = await updateAccountRecord(
    Member,
    { member_id: req.params.member_id },
    sanitizeMemberPayload(req.body, { partial: true })
  );

  ensureFound(member, 'Member');

  return sendItem(res, member);
};

const deleteMember = async (req, res) => {
  await deleteAccountRecord(Member, 'member_id', req.params.member_id, 'member', 'Member');

  return sendNoContent(res);
};

const listMemberDirectory = async (_req, res) => {
  const members = await Member.find({ active: { $ne: false } })
    .select('member_id full_name -_id')
    .sort({ full_name: 1 })
    .lean();

  return sendCollection(res, members);
};

module.exports = {
  listMemberDirectory,
  listMembers,
  getMemberById,
  getCurrentMember,
  createMember,
  updateCurrentMember,
  updateMember,
  deleteMember,
};