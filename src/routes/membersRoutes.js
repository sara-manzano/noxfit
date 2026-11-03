const router = require('express').Router();
const { rejectPut } = require('../middleware/methodNotAllowed');
const { requireMemberAuth, requireTrainerAdmin, requireTrainerAuth } = require('../middleware/auth');

const {
  getCurrentMemberInvoice,
  getMemberInvoice,
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
  .get(requireMemberAuth, getCurrentMember)
  .patch(requireMemberAuth, updateCurrentMember)
  .put(requireMemberAuth, rejectMemberPut);

router.get('/me/invoice', requireMemberAuth, getCurrentMemberInvoice);

router.get('/directory', requireTrainerAuth, listMemberDirectory);

router.route('/')
  .get(requireTrainerAdmin, listMembers)
  .post(requireTrainerAdmin, createMember);

router.get('/:member_id/invoice', requireTrainerAuth, getMemberInvoice);

router.route('/:member_id')
  .get(requireTrainerAdmin, getMemberById)
  .patch(requireTrainerAdmin, updateMember)
  .put(rejectMemberPut)
  .delete(requireTrainerAdmin, deleteMember);

module.exports = router;