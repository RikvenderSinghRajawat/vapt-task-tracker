const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { createUploader } = require('../config/upload');
const upload = createUploader('support', { maxFileSize: 10485760 });

const {
  getMyRequests,
  createRequest,
  getRequest,
  addComment,
  getAllRequests,
  getRequestDetail,
  assignRequest,
  updateStatus,
  addAdminComment,
  getSummary,
  uploadAttachment,
  deleteAttachment,
  getAdminUsers
} = require('../controllers/supportController');

const ADMIN_ROLES = ['admin', 'super_admin', 'vapt_analyst', 'vapt_tl'];

// ─── User endpoints ───
router.get('/my', protect, getMyRequests);
router.post('/', protect, upload.array('attachments', 5), createRequest);
router.post('/:id/comments', protect, addComment);

// ─── Admin endpoints ───
router.get('/admin/all', protect, authorize(...ADMIN_ROLES), getAllRequests);
router.get('/admin/summary', protect, authorize(...ADMIN_ROLES), getSummary);
router.get('/admin/users', protect, authorize(...ADMIN_ROLES), getAdminUsers);
router.get('/admin/:id', protect, authorize(...ADMIN_ROLES), getRequestDetail);
router.put('/admin/:id/assign', protect, authorize(...ADMIN_ROLES), assignRequest);
router.put('/admin/:id/status', protect, authorize(...ADMIN_ROLES), updateStatus);
router.post('/admin/:id/comments', protect, authorize(...ADMIN_ROLES), addAdminComment);
router.post('/admin/:id/attachments', protect, authorize(...ADMIN_ROLES), upload.single('file'), uploadAttachment);
router.delete('/admin/:id/attachments/:attachmentId', protect, authorize(...ADMIN_ROLES), deleteAttachment);

// ─── Shared: get single request (owner or admin) ───
router.get('/:id', protect, getRequest);

module.exports = router;
