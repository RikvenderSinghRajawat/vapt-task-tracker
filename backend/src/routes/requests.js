const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.js');
const {
  createFindingRequest,
  getPendingRequests,
  approveRequest,
  rejectRequest
} = require('../controllers/requestController');

router.post('/', protect, createFindingRequest);
router.get('/pending', protect, authorize('admin', 'super_admin', 'vapt_analyst', 'project_manager'), getPendingRequests);
router.post('/:id/approve', protect, authorize('admin', 'super_admin', 'vapt_analyst', 'project_manager'), approveRequest);
router.post('/:id/reject', protect, authorize('admin', 'super_admin', 'vapt_analyst', 'project_manager'), rejectRequest);

module.exports = router;
