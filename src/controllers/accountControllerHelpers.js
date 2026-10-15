const { createStatusError } = require('../http/errors');

const createConflictError = (message) => createStatusError(message, 409);

const createNotFoundError = (resourceName) => createStatusError(`${resourceName} was not found`, 404);

const createUnauthorizedError = () => createStatusError('Invalid email or password', 401);

const ensureFound = (record, resourceName) => {
  if (!record) {
    throw createNotFoundError(resourceName);
  }

  return record;
};

const ensureNoLinkedRecords = async (existsPromise, message) => {
  const hasLinkedRecords = await existsPromise;

  if (hasLinkedRecords) {
    throw createConflictError(message);
  }
};

const buildAccountFilters = (query, fieldName) => {
  const filters = {};

  if (query.active === 'true') {
    filters.active = true;
  }

  if (query.active === 'false') {
    filters.active = false;
  }

  if (fieldName && query[fieldName]) {
    filters[fieldName] = query[fieldName];
  }

  return filters;
};

const listAccountRecords = async (Model, query, fieldName) => {
  const filters = buildAccountFilters(query, fieldName);
  const items = await Model.find(filters).sort({ full_name: 1 });

  return {
    items,
    total: items.length,
  };
};

const getAccountRecord = async (Model, identifierField, identifierValue, resourceName) => ensureFound(
  await Model.findOne({ [identifierField]: identifierValue }),
  resourceName
);

const withHashedPassword = async (data, hashPassword) => {
  if (!data.password) {
    return data;
  }

  const password_hash = await hashPassword(data.password);
  const nextData = { ...data, password_hash };

  delete nextData.password;

  return nextData;
};

const createAccountRecord = async (Model, payload, hashPassword, extraData = {}) => {
  const data = await withHashedPassword(payload, hashPassword);
  return Model.create({ ...data, ...extraData });
};

const createAccountAuthResponse = (account, buildToken) => ({
  token: buildToken(account),
  user: account,
});

const authenticateAccount = async ({
  Model,
  email,
  password,
  comparePassword,
  buildToken,
  roleLabel,
}) => {
  const account = await Model.findOne({ email }).select('+password_hash');

  if (!account) {
    throw createUnauthorizedError();
  }

  const passwordMatches = await comparePassword(password, account.password_hash);

  if (!passwordMatches) {
    throw createUnauthorizedError();
  }

  ensureActiveAccount(account, roleLabel);

  return createAccountAuthResponse(account, buildToken);
};

const updateAccountRecord = async (Model, filter, payload, hashPassword) => {
  const data = await withHashedPassword(payload, hashPassword);

  return Model.findOneAndUpdate(filter, data, {
    returnDocument: 'after',
    runValidators: true,
  });
};

const deleteAccountRecord = async ({
  Model,
  ReservationModel,
  identifierField,
  identifierValue,
  reservationField,
  resourceName,
}) => {
  const account = ensureFound(
    await Model.findOne({ [identifierField]: identifierValue }).select('_id').lean(),
    resourceName
  );

  await ensureNoLinkedRecords(
    ReservationModel.exists({ [reservationField]: account._id }),
    `${resourceName} cannot be deleted while reservations are linked to the account`
  );

  await Model.findOneAndDelete({ [identifierField]: identifierValue });
};

const ensureActiveAccount = (account, roleLabel) => {
  if (account.active === false) {
    throw createStatusError(`${roleLabel} account is inactive`, 403);
  }
};

module.exports = {
  createStatusError,
  createConflictError,
  createNotFoundError,
  createUnauthorizedError,
  ensureFound,
  ensureNoLinkedRecords,
  buildAccountFilters,
  listAccountRecords,
  getAccountRecord,
  withHashedPassword,
  createAccountRecord,
  createAccountAuthResponse,
  authenticateAccount,
  updateAccountRecord,
  deleteAccountRecord,
  ensureActiveAccount,
};