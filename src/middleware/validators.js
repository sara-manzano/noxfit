const { createStatusError } = require('../http/errors');
const {
  MEMBERSHIP_TYPES,
  RESERVATION_BOOKERS,
  RESERVATION_STATUSES,
  TRAINING_CENTERS,
  getBookableTimeSlotError,
  normalizeDateOnly,
} = require('../config/validation');
const MIN_PASSWORD_LENGTH = 8;
const AVATAR_PATTERN = /^https:\/\/res\.cloudinary\.com\/[A-Za-z0-9_-]+\/image\/upload\/[A-Za-z0-9_.,:/-]+$/;
const MAX_AVATAR_LENGTH = 500;
const MAX_BIO_LENGTH = 400;

const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isValidDate = (value) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const isNonNegativeNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

const createValidationError = (message) => createStatusError(message, 400);

const assignIfDefined = (target, fieldName, value) => {
  if (value !== undefined) {
    target[fieldName] = value;
  }
};

const requireField = (value, fieldName) => {
  if (!value) {
    throw createValidationError(`${fieldName} is required`);
  }

  return value;
};

const readStringField = (payload, fieldName) => {
  if (payload[fieldName] === undefined) {
    return undefined;
  }

  if (!isNonEmptyString(payload[fieldName])) {
    throw createValidationError(`${fieldName} must be a non-empty string`);
  }

  return payload[fieldName].trim();
};

const readRequiredStringField = (payload, fieldName) => {
  const value = readStringField(payload, fieldName);

  return requireField(value, fieldName);
};

const readEnumField = (payload, fieldName, allowedValues) => {
  const value = readStringField(payload, fieldName);

  if (value === undefined) {
    return undefined;
  }

  if (!allowedValues.includes(value)) {
    throw createValidationError(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }

  return value;
};

const readDateField = (payload, fieldName) => {
  if (payload[fieldName] === undefined) {
    return undefined;
  }

  if (!isValidDate(payload[fieldName])) {
    throw createValidationError(`${fieldName} must be a valid date`);
  }

  return normalizeDateOnly(payload[fieldName]);
};

const readBooleanField = (payload, fieldName) => {
  if (payload[fieldName] === undefined) {
    return undefined;
  }

  if (typeof payload[fieldName] !== 'boolean') {
    throw createValidationError(`${fieldName} must be true or false`);
  }

  return payload[fieldName];
};

const readNumberField = (payload, fieldName) => {
  if (payload[fieldName] === undefined) {
    return undefined;
  }

  if (!isNonNegativeNumber(payload[fieldName])) {
    throw createValidationError(`${fieldName} must be a positive number or zero`);
  }

  return payload[fieldName];
};

const readTimeSlotField = (payload, fieldName) => {
  const value = readStringField(payload, fieldName);

  if (value === undefined) {
    return undefined;
  }

  const error = getBookableTimeSlotError(value);

  if (error) {
    throw createValidationError(`${fieldName} ${error}`);
  }

  return value;
};

const readEmailField = (payload, fieldName) => {
  const value = readStringField(payload, fieldName);

  if (value === undefined) {
    return undefined;
  }

  if (!isValidEmail(value)) {
    throw createValidationError(`${fieldName} must be a valid email address`);
  }

  return value.toLowerCase();
};

const readPasswordField = (payload, fieldName = 'password') => {
  const value = readStringField(payload, fieldName);

  if (value === undefined) {
    return undefined;
  }

  if (value.length < MIN_PASSWORD_LENGTH) {
    throw createValidationError(`${fieldName} must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  return value;
};

const readAvatarField = (payload, fieldName = 'avatar') => {
  const value = payload[fieldName];

  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value !== 'string' || value.length > MAX_AVATAR_LENGTH || !AVATAR_PATTERN.test(value)) {
    throw createValidationError(`${fieldName} must be a Cloudinary image URL of at most ${MAX_AVATAR_LENGTH} characters`);
  }

  return value;
};

const readBioField = (payload) => {
  if (payload.bio === null) {
    return null;
  }

  const value = readStringField(payload, 'bio');

  if (value !== undefined && value.length > MAX_BIO_LENGTH) {
    throw createValidationError(`bio must be at most ${MAX_BIO_LENGTH} characters long`);
  }

  return value;
};

const readAccountFields = (payload, idField, { partial, requirePassword, allowIdentifierUpdate, allowActiveField = true }) => {
  const data = {};

  if (partial) {
    if (allowIdentifierUpdate) {
      assignIfDefined(data, idField, readStringField(payload, idField));
    }

    assignIfDefined(data, 'full_name', readStringField(payload, 'full_name'));
    assignIfDefined(data, 'email', readEmailField(payload, 'email'));
  } else {
    data[idField] = readRequiredStringField(payload, idField);
    data.full_name = readRequiredStringField(payload, 'full_name');
    data.email = requireField(readEmailField(payload, 'email'), 'email');
  }

  const password = readPasswordField(payload, 'password');
  assignIfDefined(data, 'password', requirePassword ? requireField(password, 'password') : password);
  assignIfDefined(data, 'phone', readStringField(payload, 'phone'));
  assignIfDefined(data, 'avatar', readAvatarField(payload));

  if (allowActiveField) {
    assignIfDefined(data, 'active', readBooleanField(payload, 'active'));
  }

  return data;
};

const sanitizeMemberPayload = (
  payload,
  { partial = false, requirePassword = false, allowIdentifierUpdate = true, allowPlanFields = true, allowActiveField = true } = {}
) => {
  const data = readAccountFields(payload, 'member_id', { partial, requirePassword, allowIdentifierUpdate, allowActiveField });

  if (allowPlanFields) {
    assignIfDefined(data, 'membership_type', readEnumField(payload, 'membership_type', MEMBERSHIP_TYPES));
    assignIfDefined(data, 'join_date', readDateField(payload, 'join_date'));
  }

  return data;
};

const sanitizeTrainerPayload = (
  payload,
  {
    partial = false,
    requirePassword = false,
    allowAdminField = false,
    allowIdentifierUpdate = true,
    allowActiveField = true,
  } = {}
) => {
  const data = readAccountFields(payload, 'trainer_id', { partial, requirePassword, allowIdentifierUpdate, allowActiveField });

  assignIfDefined(data, 'activity_type', readStringField(payload, 'activity_type'));
  assignIfDefined(data, 'center', readEnumField(payload, 'center', TRAINING_CENTERS));
  assignIfDefined(data, 'years_experience', readNumberField(payload, 'years_experience'));
  assignIfDefined(data, 'hourly_rate', readNumberField(payload, 'hourly_rate'));
  assignIfDefined(data, 'bio', readBioField(payload));

  if (allowAdminField) {
    assignIfDefined(data, 'is_admin', readBooleanField(payload, 'is_admin'));
  }

  return data;
};

const readRoleAndEmail = (payload) => ({
  role: requireField(readStringField(payload, 'role'), 'role').toLowerCase(),
  email: requireField(readEmailField(payload, 'email'), 'email'),
});

const sanitizeRoleLoginPayload = (payload) => ({
  ...readRoleAndEmail(payload),
  password: requireField(readPasswordField(payload, 'password'), 'password'),
});

const sanitizeForgotPasswordPayload = (payload) => readRoleAndEmail(payload);

const sanitizeResetPasswordPayload = (payload) => {
  const role = requireField(readStringField(payload, 'role'), 'role');
  const token = requireField(readStringField(payload, 'token'), 'token');
  const password = requireField(readPasswordField(payload, 'password'), 'password');

  return { role: role.toLowerCase(), token, password };
};

const sanitizeReservationPayload = (
  payload,
  {
    partial = false,
    requireMemberId = true,
    requireTrainerId = true,
    requireReservationId = true,
  } = {}
) => {
  const data = {};
  const readId = (field, mustExist) => {
    const value = readStringField(payload, field);

    return mustExist ? requireField(value, field) : value;
  };

  assignIfDefined(data, 'reservation_id', readId('reservation_id', !partial && requireReservationId));
  assignIfDefined(data, 'member_id', readId('member_id', !partial && requireMemberId));
  assignIfDefined(data, 'trainer_id', readId('trainer_id', !partial && requireTrainerId));

  const date = readDateField(payload, 'date');
  assignIfDefined(data, 'date', partial ? date : requireField(date, 'date'));

  assignIfDefined(data, 'activity_type', readStringField(payload, 'activity_type'));
  assignIfDefined(data, 'center', readEnumField(payload, 'center', TRAINING_CENTERS));
  assignIfDefined(data, 'time_slot', readTimeSlotField(payload, 'time_slot'));
  assignIfDefined(data, 'status', readEnumField(payload, 'status', RESERVATION_STATUSES));
  assignIfDefined(data, 'booked_by', readEnumField(payload, 'booked_by', RESERVATION_BOOKERS));
  assignIfDefined(data, 'price', readNumberField(payload, 'price'));

  return data;
};

module.exports = {
  sanitizeMemberPayload,
  sanitizeTrainerPayload,
  sanitizeReservationPayload,
  sanitizeRoleLoginPayload,
  sanitizeForgotPasswordPayload,
  sanitizeResetPasswordPayload,
};