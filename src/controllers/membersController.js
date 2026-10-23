const { generateId } = require('../config/ids');
const Member = require('../models/members');
const { sendCollection, sendItem, sendNoContent } = require('../http/responses');
const { sanitizeMemberPayload } = require('../middleware/validators');
const {
  ensureFound,
  listAccountRecords,
  listAccountDirectory,
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
  const member = await getAccountRecord(Member, 'member_id', req.auth.identifier, 'Member', '+avatar');

  return sendItem(res, member);
};

const createMember = async (req, res) => {
  const member = await createAccountRecord(
    Member,
    sanitizeMemberPayload(
      { member_id: generateId('M'), ...req.body },
      { requirePassword: true }
    )
  );

  return sendItem(res, member, 201);
};

const applyMemberUpdate = async (res, member_id, body, options) => {
  const member = await updateAccountRecord(
    Member,
    { member_id },
    sanitizeMemberPayload(body, { partial: true, ...options })
  );

  ensureFound(member, 'Member');

  return sendItem(res, member);
};

const updateCurrentMember = (req, res) => applyMemberUpdate(
  res,
  req.auth.identifier,
  req.body,
  { allowIdentifierUpdate: false, allowPlanFields: false }
);

const updateMember = (req, res) => applyMemberUpdate(res, req.params.member_id, req.body);

const deleteMember = async (req, res) => {
  await deleteAccountRecord(Member, 'member_id', req.params.member_id, 'member', 'Member');

  return sendNoContent(res);
};

const listMemberDirectory = async (_req, res) => sendCollection(
  res,
  await listAccountDirectory(Member, 'member_id full_name')
);

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