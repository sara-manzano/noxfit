const MEMBER_TYPES = ['Básica', 'Premium', 'VIP'];
const RESERVATION_STATUS = ['Confirmada', 'Completada', 'Cancelada'];
const MIN_PASSWORD_LENGTH = 8;
const { createStatusError } = require('../http/errors');
const { isValidTimeSlot, normalizeDateOnly } = require('../config/validation');

const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isValidDate = (value) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const isBoolean = (value) => typeof value === 'boolean';

const isPositiveNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

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

  if (!isBoolean(payload[fieldName])) {
    throw createValidationError(`${fieldName} must be true or false`);
  }

  return payload[fieldName];
};

const readNumberField = (payload, fieldName) => {
  if (payload[fieldName] === undefined) {
    return undefined;
  }

  if (!isPositiveNumber(payload[fieldName])) {
    throw createValidationError(`${fieldName} must be a positive number or zero`);
  }

  return payload[fieldName];
};

const readTimeSlotField = (payload, fieldName) => {
  const value = readStringField(payload, fieldName);

  if (value === undefined) {
    return undefined;
  }

  if (!isValidTimeSlot(value)) {
    throw createValidationError(`${fieldName} must use HH:MM - HH:MM and end after it starts`);
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

const sanitizeMemberPayload = (
  payload,
  { partial = false, requirePassword = false, allowIdentifierUpdate = true } = {}
) => {
  const data = {};

  if (partial) {
    if (allowIdentifierUpdate) {
      assignIfDefined(data, 'member_id', readStringField(payload, 'member_id'));
    }

    assignIfDefined(data, 'full_name', readStringField(payload, 'full_name'));
    assignIfDefined(data, 'email', readEmailField(payload, 'email'));
  } else {
    data.member_id = readRequiredStringField(payload, 'member_id');
    data.full_name = readRequiredStringField(payload, 'full_name');
    data.email = requireField(readEmailField(payload, 'email'), 'email');
  }

  const password = readPasswordField(payload, 'password');
  assignIfDefined(data, 'password', requirePassword ? requireField(password, 'password') : password);

  assignIfDefined(data, 'phone', readStringField(payload, 'phone'));
  assignIfDefined(data, 'membership_type', readEnumField(payload, 'membership_type', MEMBER_TYPES));
  assignIfDefined(data, 'join_date', readDateField(payload, 'join_date'));
  assignIfDefined(data, 'active', readBooleanField(payload, 'active'));

  return data;
};

const sanitizeTrainerPayload = (
  payload,
  {
    partial = false,
    requirePassword = false,
    allowAdminField = false,
    allowIdentifierUpdate = true,
  } = {}
) => {
  const data = {};

  if (partial) {
    if (allowIdentifierUpdate) {
      assignIfDefined(data, 'trainer_id', readStringField(payload, 'trainer_id'));
    }

    assignIfDefined(data, 'full_name', readStringField(payload, 'full_name'));
    assignIfDefined(data, 'email', readEmailField(payload, 'email'));
  } else {
    data.trainer_id = readRequiredStringField(payload, 'trainer_id');
    data.full_name = readRequiredStringField(payload, 'full_name');
    data.email = requireField(readEmailField(payload, 'email'), 'email');
  }

  const password = readPasswordField(payload, 'password');
  assignIfDefined(data, 'password', requirePassword ? requireField(password, 'password') : password);

  assignIfDefined(data, 'activity_type', readStringField(payload, 'activity_type'));
  assignIfDefined(data, 'phone', readStringField(payload, 'phone'));
  assignIfDefined(data, 'years_experience', readNumberField(payload, 'years_experience'));
  assignIfDefined(data, 'hourly_rate', readNumberField(payload, 'hourly_rate'));

  if (allowAdminField) {
    assignIfDefined(data, 'is_admin', readBooleanField(payload, 'is_admin'));
  }

  assignIfDefined(data, 'active', readBooleanField(payload, 'active'));

  return data;
};

const sanitizeLoginPayload = (payload) => {
  const email = readEmailField(payload, 'email');
  const password = readPasswordField(payload, 'password');

  requireField(email, 'email');
  requireField(password, 'password');

  return { email, password };
};

const sanitizeRoleLoginPayload = (payload) => {
  const role = readStringField(payload, 'role');

  requireField(role, 'role');

  return {
    role: role.toLowerCase(),
    ...sanitizeLoginPayload(payload),
  };
};

const sanitizeReservationPayload = (
  payload,
  { partial = false, requireMemberId = true, requireTrainerId = true } = {}
) => {
  const data = {};

  if (!partial) {
    data.reservation_id = readRequiredStringField(payload, 'reservation_id');

    const memberId = readStringField(payload, 'member_id');
    const trainerId = readStringField(payload, 'trainer_id');

    assignIfDefined(data, 'member_id', requireMemberId ? requireField(memberId, 'member_id') : memberId);
    assignIfDefined(data, 'trainer_id', requireTrainerId ? requireField(trainerId, 'trainer_id') : trainerId);
    data.date = requireField(readDateField(payload, 'date'), 'date');
  } else {
    assignIfDefined(data, 'reservation_id', readStringField(payload, 'reservation_id'));
    assignIfDefined(data, 'member_id', readStringField(payload, 'member_id'));
    assignIfDefined(data, 'trainer_id', readStringField(payload, 'trainer_id'));
    assignIfDefined(data, 'date', readDateField(payload, 'date'));
  }

  assignIfDefined(data, 'activity_type', readStringField(payload, 'activity_type'));
  assignIfDefined(data, 'time_slot', readTimeSlotField(payload, 'time_slot'));
  assignIfDefined(data, 'status', readEnumField(payload, 'status', RESERVATION_STATUS));
  assignIfDefined(data, 'price', readNumberField(payload, 'price'));

  return data;
};

module.exports = {
  sanitizeMemberPayload,
  sanitizeTrainerPayload,
  sanitizeReservationPayload,
  sanitizeLoginPayload,
  sanitizeRoleLoginPayload,
};