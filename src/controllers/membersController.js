const Member = require('../models/members');
const Reservation = require('../models/reservations');
const { hashPassword, comparePassword, signToken } = require('../config/auth');
const { sanitizeLoginPayload, sanitizeMemberPayload } = require('../middleware/validators');

const createConflictError = (message) => {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
};

const buildMemberToken = (member) => signToken({
  sub: member.member_id,
  role: 'member',
});

const createMemberAuthResponse = (member) => ({
  token: buildMemberToken(member),
  user: member,
});

const createUnauthorizedError = () => {
  const error = new Error('Invalid email or password');
  error.statusCode = 401;
  return error;
};

const buildMemberFilters = (query) => {
  const filters = {};

  if (query.active === 'true') {
    filters.active = true;
  }

  if (query.active === 'false') {
    filters.active = false;
  }

  if (query.membership_type) {
    filters.membership_type = query.membership_type;
  }

  return filters;
};

const listMembers = async (req, res, next) => {
  try {
    const filters = buildMemberFilters(req.query);

    const members = await Member.find(filters)
      .sort({ full_name: 1 });

    return res.status(200).json({
      items: members,
      total: members.length,
    });
  } catch (error) {
    return next(error);
  }
};

const getMemberById = async (req, res, next) => {
  try {
    const member = await Member.findOne({ member_id: req.params.memberId });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    return res.status(200).json(member);
  } catch (error) {
    return next(error);
  }
};

const registerMember = async (req, res, next) => {
  try {
    const memberData = sanitizeMemberPayload(req.body, { requirePassword: true });
    const passwordHash = await hashPassword(memberData.password);

    delete memberData.password;

    const member = await Member.create({
      ...memberData,
      password_hash: passwordHash,
    });

    return res.status(201).json(createMemberAuthResponse(member));
  } catch (error) {
    return next(error);
  }
};

const loginMember = async (req, res, next) => {
  try {
    const { email, password } = sanitizeLoginPayload(req.body);
    const member = await Member.findOne({ email }).select('+password_hash');

    if (!member) {
      throw createUnauthorizedError();
    }

    const isPasswordValid = await comparePassword(password, member.password_hash);

    if (!isPasswordValid) {
      throw createUnauthorizedError();
    }

    if (member.active === false) {
      const error = new Error('This member account is inactive');
      error.statusCode = 403;
      throw error;
    }

    return res.status(200).json(createMemberAuthResponse(member));
  } catch (error) {
    return next(error);
  }
};

const getCurrentMember = async (req, res, next) => {
  try {
    const member = await Member.findOne({ member_id: req.auth.identifier });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    return res.status(200).json(member);
  } catch (error) {
    return next(error);
  }
};

const createMember = async (req, res, next) => {
  try {
    const memberData = sanitizeMemberPayload(req.body, { requirePassword: true });
    const passwordHash = await hashPassword(memberData.password);

    delete memberData.password;

    const member = await Member.create({
      ...memberData,
      password_hash: passwordHash,
    });

    return res.status(201).json(member);
  } catch (error) {
    return next(error);
  }
};

const updateCurrentMember = async (req, res, next) => {
  try {
    const memberData = sanitizeMemberPayload(req.body, { partial: true });

    if (memberData.password) {
      memberData.password_hash = await hashPassword(memberData.password);
      delete memberData.password;
    }

    const member = await Member.findOneAndUpdate(
      { member_id: req.auth.identifier },
      memberData,
      { new: true, runValidators: true }
    );

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    return res.status(200).json(member);
  } catch (error) {
    return next(error);
  }
};

const updateMember = async (req, res, next) => {
  try {
    const memberData = sanitizeMemberPayload(req.body, { partial: true });

    if (memberData.password) {
      memberData.password_hash = await hashPassword(memberData.password);
      delete memberData.password;
    }

    const member = await Member.findOneAndUpdate(
      { member_id: req.params.memberId },
      memberData,
      { new: true, runValidators: true }
    );

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    return res.status(200).json(member);
  } catch (error) {
    return next(error);
  }
};

const deleteMember = async (req, res, next) => {
  try {
    const member = await Member.findOne({ member_id: req.params.memberId }).select('_id').lean();

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const hasReservations = await Reservation.exists({ member: member._id });

    if (hasReservations) {
      throw createConflictError('Member cannot be deleted while reservations are linked to the account');
    }

    await Member.findOneAndDelete({ member_id: req.params.memberId });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listMembers,
  getMemberById,
  registerMember,
  loginMember,
  getCurrentMember,
  createMember,
  updateCurrentMember,
  updateMember,
  deleteMember,
};