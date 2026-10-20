const Reservation = require('../models/reservations');
const { createStatusError } = require('../http/errors');
const { hashPassword, comparePassword, signAccountToken } = require('../config/auth');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ensureFound = (record, resourceName) => {
  if (!record) {
    throw createStatusError(`${resourceName} was not found`, 404);
  }

  return record;
};

const listAccountRecords = (Model, query, extraFilterField) => {
  const filters = {};

  if (query.active === 'true') filters.active = true;
  if (query.active === 'false') filters.active = false;

  if (extraFilterField && query[extraFilterField]) {
    filters[extraFilterField] = query[extraFilterField];
  }

  return Model.find(filters).sort({ full_name: 1 });
};

const getAccountRecord = async (Model, identifierField, identifierValue, resourceName) => ensureFound(
  await Model.findOne({ [identifierField]: identifierValue }),
  resourceName
);

const withHashedPassword = async (data) => {
  if (!data.password) {
    return data;
  }

  const { password, ...rest } = data;
  return { ...rest, password_hash: await hashPassword(password) };
};

const createAccountRecord = async (Model, payload, extraData = {}) => {
  const data = await withHashedPassword(payload);
  return Model.create({ ...data, ...extraData });
};

const updateAccountRecord = async (Model, filter, payload) => {
  const data = await withHashedPassword(payload);

  return Model.findOneAndUpdate(filter, data, {
    returnDocument: 'after',
    runValidators: true,
  });
};

const deleteAccountRecord = async (Model, identifierField, identifierValue, reservationField, resourceName) => {
  const account = ensureFound(
    await Model.findOne({ [identifierField]: identifierValue }).select('_id').lean(),
    resourceName
  );

  if (await Reservation.exists({ [reservationField]: account._id })) {
    throw createStatusError(`${resourceName} cannot be deleted while reservations are linked to the account`, 409);
  }

  await Model.findOneAndDelete({ [identifierField]: identifierValue });
};

const authenticateAccount = async (Model, role, email, password) => {
  const account = await Model.findOne({
    email: { $regex: `^${escapeRegExp(email)}$`, $options: 'i' },
  }).select('+password_hash');

  // Same error for unknown email and wrong password so we don't leak which one failed.
  if (!account || !(await comparePassword(password, account.password_hash))) {
    throw createStatusError('Invalid email or password', 401);
  }

  if (account.active === false) {
    throw createStatusError(`${role} account is inactive`, 403);
  }

  return { token: signAccountToken(role, account), user: account };
};

module.exports = {
  ensureFound,
  listAccountRecords,
  getAccountRecord,
  createAccountRecord,
  updateAccountRecord,
  deleteAccountRecord,
  authenticateAccount,
};
