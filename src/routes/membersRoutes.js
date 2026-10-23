const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { rejectPut } = require('../middleware/methodNotAllowed');
const { requireMemberAuth, requireTrainerAdmin, requireTrainerAuth } = require('../middleware/auth');

const {
  listMemberDirectory,
  listMembers,
  getMemberById,
  getCurrentMember,
  createMember,
  updateCurrentMember,
  updateMember,
  deleteMember,
} = require('../controllers/membersController');

const rejectMemberPut = rejectPut('members');

router.route('/me')
  .get(requireMemberAuth, asyncHandler(getCurrentMember))
  .patch(requireMemberAuth, asyncHandler(updateCurrentMember))
  .put(requireMemberAuth, rejectMemberPut);

router.get('/directory', requireTrainerAuth, asyncHandler(listMemberDirectory));

router.route('/')
  .get(requireTrainerAdmin, asyncHandler(listMembers))
  .post(requireTrainerAdmin, asyncHandler(createMember));

router.route('/:member_id')
  .get(requireTrainerAdmin, asyncHandler(getMemberById))
  .patch(requireTrainerAdmin, asyncHandler(updateMember))
  .put(rejectMemberPut)
  .delete(requireTrainerAdmin, asyncHandler(deleteMember));

module.exports = router;