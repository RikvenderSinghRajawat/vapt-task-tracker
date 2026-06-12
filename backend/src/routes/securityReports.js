const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getReports,
  uploadReport,
  downloadReport,
  deleteReport,
  upload
} = require('../controllers/securityReportController');

router.route('/')
  .get(protect, getReports)
  .post(protect, upload, uploadReport);

router.get('/:id/download', protect, downloadReport);
router.delete('/:id', protect, deleteReport);

module.exports = router;
