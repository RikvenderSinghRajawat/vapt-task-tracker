const express = require('express');
const router = express.Router();
const {
  getMilestones,
  getMilestone,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  completeMilestone
} = require('../controllers/milestoneController');
const { protect, checkProjectAccess } = require('../middleware/auth.js');
const { projectIdValidation, idValidation } = require('../middleware/validation.js');
const auditLog = require('../middleware/auditLog.js');

router.route('/:projectId/milestones')
  .get(protect, checkProjectAccess, projectIdValidation, getMilestones)
  .post(protect, checkProjectAccess, auditLog('create_milestone', 'milestone'), projectIdValidation, createMilestone);

router.route('/:projectId/milestones/:id')
  .get(protect, checkProjectAccess, projectIdValidation, idValidation, getMilestone)
  .put(protect, checkProjectAccess, auditLog('update_milestone', 'milestone'), projectIdValidation, idValidation, updateMilestone)
  .delete(protect, checkProjectAccess, auditLog('delete_milestone', 'milestone'), projectIdValidation, idValidation, deleteMilestone);

router.route('/:projectId/milestones/:id/complete')
  .post(protect, checkProjectAccess, projectIdValidation, idValidation, completeMilestone);

module.exports = router;
