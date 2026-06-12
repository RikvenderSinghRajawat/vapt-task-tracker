const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth.js');

// @desc    Get audit logs
// @route   GET /api/audit-logs
// @access  Private/Admin
router.get('/', protect, authorize('admin', 'vapt_analyst'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, type, entityType, userId, startDate, endDate } = req.query;
    const query = {};
    
    const actionVal = action || type;
    if (actionVal) query.action = actionVal;
    if (entityType) query.entityType = entityType;
    if (userId) query.user = userId;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('user', 'name email avatar role')
        .sort('-timestamp')
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments(query)
    ]);

    // Transform audit logs to frontend-expected format
    const transformed = logs.map(log => ({
      id: log._id?.toString() || log.id,
      timestamp: log.timestamp || log.createdAt,
      type: log.action || 'unknown',
      action: log.action,
      userEmail: log.user?.email || log.details?.email || 'Unknown',
      userName: log.user?.name || log.details?.name || 'System',
      userRole: log.user?.role || 'N/A',
      userId: log.user?._id?.toString() || '',
      entityType: log.entityType || '',
      entityId: log.entityId || '',
      entityName: log.entityName || '',
      status: log.status || 'success',
      ipAddress: log.ipAddress || '',
      userAgent: log.userAgent || '',
      details: log.details || {},
      changes: log.changes || []
    }));

    res.status(200).json({
      success: true,
      count: transformed.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: transformed
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;