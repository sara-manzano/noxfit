const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { requireMemberAuth, requireTrainerAdmin } = require('../middleware/auth');

const {
  listMembers,
  getMemberById,
  registerMember,
  loginMember,
  getCurrentMember,
  createMember,
  updateCurrentMember,
  updateMember,
  deleteMember,
} = require('../controllers/membersController');

router.post('/register', asyncHandler(registerMember));
router.post('/login', asyncHandler(loginMember));

router.route('/me')
  .get(requireMemberAuth, asyncHandler(getCurrentMember))
  .patch(requireMemberAuth, asyncHandler(updateCurrentMember))
  .put(requireMemberAuth, asyncHandler(updateCurrentMember));

router.use(requireTrainerAdmin);

router.route('/')
  .get(asyncHandler(listMembers))
  .post(asyncHandler(createMember));

router.route('/:member_id')
  .get(asyncHandler(getMemberById))
  .patch(asyncHandler(updateMember))
  .put(asyncHandler(updateMember))
  .delete(asyncHandler(deleteMember));

module.exports = router;