const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const { methodNotAllowed } = require('../middleware/methodNotAllowed');
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

const rejectPut = methodNotAllowed('PUT no esta soportado para miembros; usa PATCH para cambios parciales');

router.post('/register', asyncHandler(registerMember));
router.post('/login', asyncHandler(loginMember));

router.route('/me')
  .get(requireMemberAuth, asyncHandler(getCurrentMember))
  .patch(requireMemberAuth, asyncHandler(updateCurrentMember))
  .put(requireMemberAuth, rejectPut);

router.use(requireTrainerAdmin);

router.route('/')
  .get(asyncHandler(listMembers))
  .post(asyncHandler(createMember));

router.route('/:member_id')
  .get(asyncHandler(getMemberById))
  .patch(asyncHandler(updateMember))
  .put(rejectPut)
  .delete(asyncHandler(deleteMember));

module.exports = router;