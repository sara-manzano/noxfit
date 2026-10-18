const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { methodNotAllowed } = require('../middleware/methodNotAllowed');
const { requireMemberAuth, requireTrainerAdmin } = require('../middleware/auth');

const {
  listMembers,
  getMemberById,
  getCurrentMember,
  createMember,
  updateCurrentMember,
  updateMember,
  deleteMember,
} = require('../controllers/membersController');

const rejectPut = methodNotAllowed('PUT is not supported for members; use PATCH for partial updates');

router.route('/me')
  .get(requireMemberAuth, asyncHandler(getCurrentMember))
  .patch(requireMemberAuth, asyncHandler(updateCurrentMember))
  .put(requireMemberAuth, rejectPut);

router.route('/')
  .get(requireTrainerAdmin, asyncHandler(listMembers))
  .post(requireTrainerAdmin, asyncHandler(createMember));

router.route('/:member_id')
  .get(requireTrainerAdmin, asyncHandler(getMemberById))
  .patch(requireTrainerAdmin, asyncHandler(updateMember))
  .put(rejectPut)
  .delete(requireTrainerAdmin, asyncHandler(deleteMember));

module.exports = router;