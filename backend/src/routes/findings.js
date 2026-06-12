const express = require('express');
const router = express.Router();
const {
  getFindings, getFinding, createFinding, updateFinding, deleteFinding,
  addComment, closeFinding, reopenFinding, exportFindingsCSV, exportFindingsExcel
} = require('../controllers/findingController');
const { protect, checkProjectAccess, authorize } = require('../middleware/auth');
const { projectIdValidation, createFindingValidation, updateFindingValidation, idValidation } = require('../middleware/validation');
/**
 * @swagger
 * /api/projects/{projectId}/findings:
 *   get:
 *     summary: Get all findings for a project
 *     tags: [Findings]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: severity
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of findings
 *   post:
 *     summary: Create a new finding
 *     tags: [Findings]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Finding created
 */
router.route('/:projectId/findings')
  .get(protect, checkProjectAccess, projectIdValidation, getFindings)
  .post(protect, checkProjectAccess, projectIdValidation, createFindingValidation, createFinding);

router.route('/:projectId/findings/:id')
  .get(protect, checkProjectAccess, projectIdValidation, idValidation, getFinding)
  .put(protect, checkProjectAccess, projectIdValidation, idValidation, updateFindingValidation, updateFinding)
  .delete(protect, authorize('admin', 'vapt_analyst'), projectIdValidation, idValidation, deleteFinding);

router.route('/:projectId/findings/export/csv')
  .get(protect, checkProjectAccess, projectIdValidation, exportFindingsCSV);

router.route('/:projectId/findings/export/excel')
  .get(protect, checkProjectAccess, projectIdValidation, exportFindingsExcel);

router.route('/:projectId/findings/:id/comments')
  .post(protect, checkProjectAccess, projectIdValidation, idValidation, addComment);

router.route('/:projectId/findings/:id/close')
  .post(protect, checkProjectAccess, projectIdValidation, idValidation, closeFinding);

router.route('/:projectId/findings/:id/reopen')
  .post(protect, checkProjectAccess, projectIdValidation, idValidation, reopenFinding);

module.exports = router;
