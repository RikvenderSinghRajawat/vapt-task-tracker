const express = require('express');
const router = express.Router();
const FirewallLog = require('../models/FirewallLog');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin', 'super_admin', 'vapt_analyst', 'vapt_tl'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, srcIp, dstIp, protocol, startDate, endDate, search } = req.query;
    const query = {};

    if (action) query.action = action.toUpperCase();
    if (srcIp) query.srcIp = { $regex: srcIp, $options: 'i' };
    if (dstIp) query.dstIp = { $regex: dstIp, $options: 'i' };
    if (protocol) query.protocol = protocol.toUpperCase();
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { srcIp: { $regex: search, $options: 'i' } },
        { dstIp: { $regex: search, $options: 'i' } },
        { raw: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      FirewallLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      FirewallLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: logs,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/stats', protect, authorize('admin', 'super_admin', 'vapt_analyst', 'vapt_tl'), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const match = {};
    if (startDate || endDate) {
      match.timestamp = {};
      if (startDate) match.timestamp.$gte = new Date(startDate);
      if (endDate) match.timestamp.$lte = new Date(endDate);
    }

    const [actionCounts, topSrcIps, topDstPorts, protocolCounts, timeline] = await Promise.all([
      FirewallLog.aggregate([
        { $match: match },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      FirewallLog.aggregate([
        { $match: { ...match, srcIp: { $ne: null } } },
        { $group: { _id: '$srcIp', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      FirewallLog.aggregate([
        { $match: { ...match, dstPort: { $ne: null } } },
        { $group: { _id: '$dstPort', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      FirewallLog.aggregate([
        { $match: { ...match, protocol: { $ne: null } } },
        { $group: { _id: '$protocol', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      FirewallLog.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 90 },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        actionCounts: actionCounts.reduce((acc, r) => { acc[r._id] = r.count; return acc; }, {}),
        topSrcIps,
        topDstPorts,
        protocolCounts: protocolCounts.reduce((acc, r) => { acc[r._id] = r.count; return acc; }, {}),
        timeline,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', protect, authorize('admin', 'super_admin', 'vapt_analyst', 'vapt_tl'), async (req, res, next) => {
  try {
    const log = await FirewallLog.findById(req.params.id).lean();
    if (!log) {
      return res.status(404).json({ success: false, message: 'Firewall log not found' });
    }
    res.status(200).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
