const createAccountSchemaFields = (identifierField) => ({
  [identifierField]: { type: String, required: true, unique: true, trim: true },
  full_name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true, select: false },
  phone: { type: String },
  active: { type: Boolean, default: true },
});

const sanitizeAccountResponse = (_, ret) => {
  ret.id = ret._id?.toString();
  delete ret._id;
  delete ret.__v;
  delete ret.password_hash;
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