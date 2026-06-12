const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getAudits, getAudit, uploadAudit, deleteAudit } = require('../controllers/quarterlyAuditController');
const { createUploader } = require('../config/upload');

const upload = createUploader('audits');

router.get('/', protect, authorize('admin', 'vapt_analyst'), getAudits);
router.get('/:id', protect, authorize('admin', 'vapt_analyst'), getAudit);
router.post('/', protect, authorize('admin', 'vapt_analyst'), upload.single('file'), uploadAudit);
router.delete('/:id', protect, authorize('admin', 'vapt_analyst'), deleteAudit);

module.exports = router;
