const { generateId } = require('../config/ids');
const Member = require('../models/members');
const Reservation = require('../models/reservations');
const { ACTIVE_RESERVATION_STATUSES } = require('../config/validation');
const { createStatusError } = require('../http/errors');
const { buildMemberInvoice, parseMonth, renderInvoiceHtml, renderInvoicePdf } = require('../services/memberInvoice');
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
  ensureCurrentPassword,
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

const updateCurrentMember = async (req, res) => {
  if (req.body.password !== undefined) {
    await ensureCurrentPassword(Member, 'member_id', req.auth.identifier, req.body.current_password);
  }

  return applyMemberUpdate(
    res,
    req.auth.identifier,
    req.body,
    { allowIdentifierUpdate: false, allowPlanFields: false, allowActiveField: false }
  );
};

const updateMember = (req, res) => applyMemberUpdate(res, req.params.member_id, req.body);

const deleteMember = async (req, res) => {
  await deleteAccountRecord(Member, 'member_id', req.params.member_id, 'member', 'Member');

  return sendNoContent(res);
};

const listMemberDirectory = async (_req, res) => sendCollection(
  res,
  await listAccountDirectory(Member, 'member_id full_name')
);

const sendMemberInvoice = async (req, res, member) => {
  const { format } = req.query;

  if (format !== undefined && !['json', 'html', 'pdf'].includes(format)) {
    throw createStatusError('format must be json, html or pdf', 400);
  }

  const period = parseMonth(req.query.month);
  const reservations = await Reservation.find({
    member: member._id,
    status: { $in: ACTIVE_RESERVATION_STATUSES },
    date: { $gte: period.start, $lt: period.end },
  }).sort({ date: 1, time_slot: 1 }).lean();
  const invoice = buildMemberInvoice(member, reservations, period);

  if (format === 'html') {
    return res.type('html').send(renderInvoiceHtml(invoice));
  }

  if (format === 'pdf') {
    res.set('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    return res.type('pdf').send(await renderInvoicePdf(invoice));
  }

  return sendItem(res, invoice);
};

const getMemberInvoice = async (req, res) => sendMemberInvoice(
  req,
  res,
  ensureFound(await Member.findOne({ member_id: req.params.member_id }).lean(), 'Member')
);

const getCurrentMemberInvoice = async (req, res) => sendMemberInvoice(
  req,
  res,
  ensureFound(await Member.findOne({ member_id: req.auth.identifier }).lean(), 'Member')
);

module.exports = {
  getCurrentMemberInvoice,
  getMemberInvoice,
  listMemberDirectory,
  listMembers,
  getMemberById,
  getCurrentMember,
  createMember,
  updateCurrentMember,
  updateMember,
  deleteMember,
};