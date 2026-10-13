const MEMBER_TYPES = ['Básica', 'Premium', 'VIP'];
const RESERVATION_STATUS = ['Confirmada', 'Completada', 'Cancelada'];
const MIN_PASSWORD_LENGTH = 8;
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

const createValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const readStringField = (payload, fieldName) => {
  if (payload[fieldName] === undefined) {
    return undefined;
  }

  if (!isNonEmptyString(payload[fieldName])) {
    throw createValidationError(`The field ${fieldName} must be a non-empty string`);
  }

  return payload[fieldName].trim();
};

const readRequiredStringField = (payload, fieldName) => {
  const value = readStringField(payload, fieldName);

  if (!value) {
    throw createValidationError(`The field ${fieldName} is required`);
  }

  return value;
};

const readEnumField = (payload, fieldName, allowedValues) => {
  const value = readStringField(payload, fieldName);

  if (value === undefined) {
    return undefined;
  }

  if (!allowedValues.includes(value)) {
    throw createValidationError(`The field ${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }

  return value;
};

const readDateField = (payload, fieldName) => {
  if (payload[fieldName] === undefined) {
    return undefined;
  }

  if (!isValidDate(payload[fieldName])) {
    throw createValidationError(`The field ${fieldName} must be a valid date`);
  }

  return new Date(payload[fieldName]);
};

const readBooleanField = (payload, fieldName) => {
  if (payload[fieldName] === undefined) {
    return undefined;
  }

  if (!isBoolean(payload[fieldName])) {
    throw createValidationError(`The field ${fieldName} must be true or false`);
  }

  return payload[fieldName];
};

const readNumberField = (payload, fieldName) => {
  if (payload[fieldName] === undefined) {
    return undefined;
  }

  if (!isPositiveNumber(payload[fieldName])) {
    throw createValidationError(`The field ${fieldName} must be a positive number`);
  }

  return payload[fieldName];
};

const readTimeSlotField = (payload, fieldName) => {
  const value = readStringField(payload, fieldName);

  if (value === undefined) {
    return undefined;
  }

  if (!isValidTimeSlot(value)) {
    throw createValidationError(`The field ${fieldName} must use HH:MM - HH:MM and end after it starts`);
  }

  return value;
};

const readEmailField = (payload, fieldName) => {
  const value = readStringField(payload, fieldName);

  if (value === undefined) {
    return undefined;
  }

  if (!isValidEmail(value)) {
    throw createValidationError(`The field ${fieldName} must be a valid email`);
  }

  return value.toLowerCase();
};

const readPasswordField = (payload, fieldName = 'password') => {
  const value = readStringField(payload, fieldName);

  if (value === undefined) {
    return undefined;
  }

  if (value.length < MIN_PASSWORD_LENGTH) {
    throw createValidationError(`The field ${fieldName} must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  return value;
};

const sanitizeMemberPayload = (payload, { partial = false, requirePassword = false } = {}) => {
  const data = {};

  if (!partial) {
    data.member_id = readRequiredStringField(payload, 'member_id');
    data.full_name = readRequiredStringField(payload, 'full_name');
    data.email = readEmailField(payload, 'email');
  } else {
    const memberId = readStringField(payload, 'member_id');
    const fullName = readStringField(payload, 'full_name');
    const email = readEmailField(payload, 'email');

    if (memberId !== undefined) data.member_id = memberId;
    if (fullName !== undefined) data.full_name = fullName;
    if (email !== undefined) data.email = email;
  }

  if (!partial && data.email === undefined) {
    throw createValidationError('The field email is required');
  }

  const password = readPasswordField(payload, 'password');

  if (password !== undefined) {
    data.password = password;
  }

  if (requirePassword && !password) {
    throw createValidationError('The field password is required');
  }

  const phone = readStringField(payload, 'phone');
  const membershipType = readEnumField(payload, 'membership_type', MEMBER_TYPES);
  const joinDate = readDateField(payload, 'join_date');
  const active = readBooleanField(payload, 'active');

  if (phone !== undefined) data.phone = phone;
  if (membershipType !== undefined) data.membership_type = membershipType;
  if (joinDate !== undefined) data.join_date = joinDate;
  if (active !== undefined) data.active = active;

  return data;
};

const sanitizeTrainerPayload = (payload, { partial = false, requirePassword = false, allowAdminField = false } = {}) => {
  const data = {};

  if (!partial) {
    data.trainer_id = readRequiredStringField(payload, 'trainer_id');
    data.full_name = readRequiredStringField(payload, 'full_name');
    data.email = readEmailField(payload, 'email');
  } else {
    const trainerId = readStringField(payload, 'trainer_id');
    const fullName = readStringField(payload, 'full_name');
    const email = readEmailField(payload, 'email');

    if (trainerId !== undefined) data.trainer_id = trainerId;
    if (fullName !== undefined) data.full_name = fullName;
    if (email !== undefined) data.email = email;
  }

  if (!partial && data.email === undefined) {
    throw createValidationError('The field email is required');
  }

  const password = readPasswordField(payload, 'password');

  if (password !== undefined) {
    data.password = password;
  }

  if (requirePassword && !password) {
    throw createValidationError('The field password is required');
  }

  const activityType = readStringField(payload, 'activity_type');
  const phone = readStringField(payload, 'phone');
  const yearsExperience = readNumberField(payload, 'years_experience');
  const hourlyRate = readNumberField(payload, 'hourly_rate');
  const isAdmin = allowAdminField ? readBooleanField(payload, 'is_admin') : undefined;
  const active = readBooleanField(payload, 'active');

  if (activityType !== undefined) data.activity_type = activityType;
  if (phone !== undefined) data.phone = phone;
  if (yearsExperience !== undefined) data.years_experience = yearsExperience;
  if (hourlyRate !== undefined) data.hourly_rate = hourlyRate;
  if (isAdmin !== undefined) data.is_admin = isAdmin;
  if (active !== undefined) data.active = active;

  return data;
};

const sanitizeLoginPayload = (payload) => {
  const email = readEmailField(payload, 'email');
  const password = readPasswordField(payload, 'password');

  if (!email) {
    throw createValidationError('The field email is required');
  }

  if (!password) {
    throw createValidationError('The field password is required');
  }

  return { email, password };
};

const sanitizeReservationPayload = (payload, { partial = false } = {}) => {
  const data = {};

  if (!partial) {
    data.reservation_id = readRequiredStringField(payload, 'reservation_id');
    data.member_id = readRequiredStringField(payload, 'member_id');
    data.trainer_id = readRequiredStringField(payload, 'trainer_id');
    data.date = readDateField(payload, 'date');

    if (!data.date) {
      throw createValidationError('The field date is required');
    }
  } else {
    const reservationId = readStringField(payload, 'reservation_id');
    const memberId = readStringField(payload, 'member_id');
    const trainerId = readStringField(payload, 'trainer_id');
    const date = readDateField(payload, 'date');

    if (reservationId !== undefined) data.reservation_id = reservationId;
    if (memberId !== undefined) data.member_id = memberId;
    if (trainerId !== undefined) data.trainer_id = trainerId;
    if (date !== undefined) data.date = date;
  }

  const activityType = readStringField(payload, 'activity_type');
  const timeSlot = readTimeSlotField(payload, 'time_slot');
  const status = readEnumField(payload, 'status', RESERVATION_STATUS);
  const price = readNumberField(payload, 'price');

  if (activityType !== undefined) data.activity_type = activityType;
  if (timeSlot !== undefined) data.time_slot = timeSlot;
  if (status !== undefined) data.status = status;
  if (price !== undefined) data.price = price;

  return data;
};

module.exports = {
  sanitizeMemberPayload,
  sanitizeTrainerPayload,
  sanitizeReservationPayload,
  sanitizeLoginPayload,
};