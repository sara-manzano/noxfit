const router = require('express').Router();
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

router.post('/register', registerMember);
router.post('/login', loginMember);

router.route('/me')
  .get(requireMemberAuth, getCurrentMember)
  .patch(requireMemberAuth, updateCurrentMember)
  .put(requireMemberAuth, updateCurrentMember);

router.use(requireTrainerAdmin);

router.route('/')
  .get(listMembers)
  .post(createMember);

router.route('/:memberId')
  .get(getMemberById)
  .patch(updateMember)
  .put(updateMember)
  .delete(deleteMember);

module.exports = router;