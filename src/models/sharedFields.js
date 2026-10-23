const createAccountSchemaFields = (identifierField) => ({
  [identifierField]: { type: String, required: true, unique: true, trim: true },
  full_name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true, select: false },
  reset_token_hash: { type: String, select: false },
  reset_token_expires: { type: Date, select: false },
  password_changed_at: { type: Date },
  phone: { type: String },
  avatar: { type: String, select: false },
  active: { type: Boolean, default: true },
});

const sanitizeAccountResponse = (_, ret) => {
  ret.id = ret._id?.toString();
  delete ret._id;
  delete ret.__v;
  delete ret.password_hash;
  delete ret.reset_token_hash;
  delete ret.reset_token_expires;
  delete ret.password_changed_at;
  delete ret.bootstrap_admin;

  return ret;
};

const applyAccountResponseTransform = (schema) => {
  schema.set('toJSON', { transform: sanitizeAccountResponse });
  schema.set('toObject', { transform: sanitizeAccountResponse });
};

module.exports = {
  createAccountSchemaFields,
  applyAccountResponseTransform,
};