const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getEntries, getMisEntry, createEntry, getSummary, updateEntry, deleteEntry,
  getAllUsers, getAdminAnalytics, getUserDetails
} = require('../controllers/misController');

/**
 * @swagger
 * tags:
 *   name: MIS
 *   description: My Daily Work Tracker (MIS) endpoints
 */

router.get('/summary', protect, getSummary);
router.get('/admin/all', protect, authorize('admin', 'vapt_analyst', 'vapt_tl'), getAllUsers);
router.get('/admin/analytics', protect, authorize('admin', 'vapt_analyst', 'vapt_tl'), getAdminAnalytics);
router.get('/admin/user/:userId', protect, authorize('admin', 'vapt_analyst', 'vapt_tl'), getUserDetails);

router.route('/')
  .get(protect, getEntries)
  .post(protect, createEntry);

router.route('/:id')
  .get(protect, getMisEntry)
  .put(protect, updateEntry)
  .delete(protect, deleteEntry);

module.exports = router;
