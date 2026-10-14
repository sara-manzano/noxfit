const MEMBER_TYPES = ['Básica', 'Premium', 'VIP'];
const RESERVATION_STATUS = ['Confirmada', 'Completada', 'Cancelada'];
const MIN_PASSWORD_LENGTH = 8;
const { createStatusError } = require('../http/errors');
const { isValidTimeSlot } = require('../config/validation');

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

const assignOptionalFields = (target, entries) => {
  entries.forEach(([fieldName, value]) => {
    assignIfDefined(target, fieldName, value);
  });
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

  return new Date(payload[fieldName]);
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

const readAccountIdentityFields = (payload, { partial, identifierField }) => {
  if (!partial) {
    return {
      [identifierField]: readRequiredStringField(payload, identifierField),
      full_name: readRequiredStringField(payload, 'full_name'),
      email: readEmailField(payload, 'email'),
    };
  }

  const data = {};

  assignIfDefined(data, identifierField, readStringField(payload, identifierField));
  assignIfDefined(data, 'full_name', readStringField(payload, 'full_name'));
  assignIfDefined(data, 'email', readEmailField(payload, 'email'));

  return data;
};

const readPasswordForPayload = (payload, requirePassword) => {
  const password = readPasswordField(payload, 'password');

  if (requirePassword) {
    return requireField(password, 'password');
  }

  return password;
};

const readReservationReferenceField = (payload, fieldName, isRequired) => {
  const value = readStringField(payload, fieldName);

  if (!isRequired) {
    return value;
  }

  return requireField(value, fieldName);
};

const readRequiredDateField = (payload, fieldName) => requireField(
  readDateField(payload, fieldName),
  fieldName
);

const sanitizeMemberPayload = (payload, { partial = false, requirePassword = false } = {}) => {
  const data = readAccountIdentityFields(payload, {
    partial,
    identifierField: 'member_id',
  });

  if (!partial) {
    requireField(data.email, 'email');
  }

  assignIfDefined(data, 'password', readPasswordForPayload(payload, requirePassword));

  assignOptionalFields(data, [
    ['phone', readStringField(payload, 'phone')],
    ['membership_type', readEnumField(payload, 'membership_type', MEMBER_TYPES)],
    ['join_date', readDateField(payload, 'join_date')],
    ['active', readBooleanField(payload, 'active')],
  ]);

  return data;
};

const sanitizeTrainerPayload = (payload, { partial = false, requirePassword = false, allowAdminField = false } = {}) => {
  const data = readAccountIdentityFields(payload, {
    partial,
    identifierField: 'trainer_id',
  });

  if (!partial) {
    requireField(data.email, 'email');
  }

  assignIfDefined(data, 'password', readPasswordForPayload(payload, requirePassword));

  assignOptionalFields(data, [
    ['activity_type', readStringField(payload, 'activity_type')],
    ['phone', readStringField(payload, 'phone')],
    ['years_experience', readNumberField(payload, 'years_experience')],
    ['hourly_rate', readNumberField(payload, 'hourly_rate')],
    ['is_admin', allowAdminField ? readBooleanField(payload, 'is_admin') : undefined],
    ['active', readBooleanField(payload, 'active')],
  ]);

  return data;
};

const sanitizeLoginPayload = (payload) => {
  const email = readEmailField(payload, 'email');
  const password = readPasswordField(payload, 'password');

  requireField(email, 'email');
  requireField(password, 'password');

  return { email, password };
};

const sanitizeReservationPayload = (
  payload,
  { partial = false, requireMemberId = true, requireTrainerId = true } = {}
) => {
  const data = {};

  if (!partial) {
    data.reservation_id = readRequiredStringField(payload, 'reservation_id');

    assignOptionalFields(data, [
      ['member_id', readReservationReferenceField(payload, 'member_id', requireMemberId)],
      ['trainer_id', readReservationReferenceField(payload, 'trainer_id', requireTrainerId)],
    ]);

    data.date = readRequiredDateField(payload, 'date');
  } else {
    assignOptionalFields(data, [
      ['reservation_id', readStringField(payload, 'reservation_id')],
      ['member_id', readStringField(payload, 'member_id')],
      ['trainer_id', readStringField(payload, 'trainer_id')],
      ['date', readDateField(payload, 'date')],
    ]);
  }

  assignOptionalFields(data, [
    ['activity_type', readStringField(payload, 'activity_type')],
    ['time_slot', readTimeSlotField(payload, 'time_slot')],
    ['status', readEnumField(payload, 'status', RESERVATION_STATUS)],
    ['price', readNumberField(payload, 'price')],
  ]);

  return data;
};

module.exports = {
  sanitizeMemberPayload,
  sanitizeTrainerPayload,
  sanitizeReservationPayload,
  sanitizeLoginPayload,
};