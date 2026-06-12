const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getApiKeys, createApiKey, deleteApiKey, revokeApiKey } = require('../controllers/apiKeyController');

router.route('/').get(protect, getApiKeys).post(protect, createApiKey);
router.route('/:id').delete(protect, deleteApiKey);
router.patch('/:id/revoke', protect, revokeApiKey);

module.exports = router;
