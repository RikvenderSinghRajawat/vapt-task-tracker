const express = require('express');
const router = express.Router();
const {
  getReports,
  getReport,
  createReport,
  uploadReportFile,
  updateReport,
  deleteReport,
  downloadReport,
  addReview
} = require('../controllers/reportController');
const { generateExecutiveReport } = require('../controllers/executiveReportController');
const { protect, checkProjectAccess } = require('../middleware/auth.js');
const { projectIdValidation, createReportValidation, updateReportValidation, idValidation } = require('../middleware/validation.js');
router.route('/:projectId/reports')
  .get(protect, checkProjectAccess, projectIdValidation, getReports)
  .post(protect, checkProjectAccess, projectIdValidation, createReportValidation, createReport);

router.route('/:projectId/reports/executive-pdf')
  .get(protect, checkProjectAccess, projectIdValidation, generateExecutiveReport);

router.route('/:projectId/reports/:id')
  .get(protect, checkProjectAccess, projectIdValidation, idValidation, getReport)
  .put(protect, checkProjectAccess, projectIdValidation, idValidation, updateReportValidation, updateReport)
  .delete(protect, checkProjectAccess, projectIdValidation, idValidation, deleteReport);

router.route('/:projectId/reports/:id/upload')
  .post(protect, checkProjectAccess, projectIdValidation, idValidation, uploadReportFile);

router.route('/:projectId/reports/:id/download')
  .get(protect, checkProjectAccess, projectIdValidation, idValidation, downloadReport);

router.route('/:projectId/reports/:id/review')
  .post(protect, checkProjectAccess, projectIdValidation, idValidation, addReview);

module.exports = router;
