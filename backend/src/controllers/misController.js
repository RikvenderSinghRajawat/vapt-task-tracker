const Mis = require('../models/Mis');
const User = require('../models/User');
const Project = require('../models/Project');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');

const asObjectId = (id) => {
  if (!id) return null;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch (e) {
    return null;
  }
};

const isGlobalViewer = (role) => {
  return role === 'admin' || role === 'super_admin' || role === 'vapt_analyst' || role === 'vapt_tl';
};

const buildMisFilter = (req, query = {}) => {
  const filter = { deletedAt: null };
  
  // Security: Users only see their own, Admin/VAPT see all
  if (!isGlobalViewer(req.user.role)) {
    filter.user = req.user._id;
  } else if (query.userId) {
    filter.user = asObjectId(query.userId);
  }

  if (query.project) filter.project = asObjectId(query.project);
  if (query.status) filter.workStatus = query.status;
  if (query.activityType) filter.activityType = query.activityType;
  if (query.priority) filter.priority = query.priority;
  
  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) filter.date.$gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } }
    ];
  }

  if (query.tags) {
    const tags = Array.isArray(query.tags) ? query.tags : query.tags.split(',').map(t => t.trim());
    filter.tags = { $in: tags };
  }

  return filter;
};

exports.getEntries = async (req, res, next) => {
  try {
    const filter = buildMisFilter(req, req.query);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let sort = { date: -1, createdAt: -1 };
    if (req.query.sortBy === 'oldest') sort = { date: 1, createdAt: 1 };
    else if (req.query.sortBy === 'duration') sort = { duration: -1 };

    const [entries, total] = await Promise.all([
      Mis.find(filter)
        .populate('project', 'name code')
        .populate('relatedFinding', 'title findingId')
        .populate('relatedTask', 'title')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Mis.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: {
        entries,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getMisEntry = async (req, res, next) => {
  try {
    const query = isGlobalViewer(req.user.role)
      ? { _id: req.params.id, deletedAt: null }
      : { _id: req.params.id, user: req.user._id, deletedAt: null };
    const entry = await Mis.findOne(query)
      .populate('project', 'name code')
      .populate('relatedFinding', 'title findingId')
      .populate('relatedTask', 'title');
    if (!entry) {
      return res.status(404).json({ success: false, message: 'MIS entry not found' });
    }
    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

exports.getSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const todayStart = new Date(now.setHours(0,0,0,0));
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    
    const [todayAgg, weekAgg, activeProjectsAgg, topCategoryAgg, lastEntry] = await Promise.all([
      // Today stats
      Mis.aggregate([
        { $match: { user: userId, date: { $gte: todayStart }, deletedAt: null } },
        { $group: { _id: null, hours: { $sum: '$duration' }, count: { $sum: 1 } } }
      ]),
      // Week stats
      Mis.aggregate([
        { $match: { user: userId, date: { $gte: weekStart }, deletedAt: null } },
        { $group: { _id: null, hours: { $sum: '$duration' }, count: { $sum: 1 } } }
      ]),
      // Active projects this week
      Mis.distinct('project', { user: userId, date: { $gte: weekStart }, deletedAt: null, project: { $ne: null } }),
      // Top category
      Mis.aggregate([
        { $match: { user: userId, date: { $gte: weekStart }, deletedAt: null } },
        { $group: { _id: '$activityType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 }
      ]),
      // Last update
      Mis.findOne({ user: userId, deletedAt: null }).sort({ updatedAt: -1 })
    ]);

    const todayHours = todayAgg[0] ? Math.round((todayAgg[0].hours / 60) * 10) / 10 : 0;
    const weekHours = weekAgg[0] ? Math.round((weekAgg[0].hours / 60) * 10) / 10 : 0;
    const productivityScore = Math.min(100, Math.round((weekHours / 40) * 100)); // Simple 40h week target

    res.status(200).json({
      success: true,
      data: {
        today: { entries: todayAgg[0]?.count || 0, hours: todayHours },
        week: { entries: weekAgg[0]?.count || 0, hours: weekHours },
        activeProjects: activeProjectsAgg.length,
        topCategory: topCategoryAgg[0]?._id || 'N/A',
        productivityScore,
        lastUpdate: lastEntry?.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.createEntry = async (req, res, next) => {
  try {
    const entryData = { ...req.body, user: req.user._id };
    
    // Normalize empty strings to null for ObjectIds
    ['project', 'relatedFinding', 'relatedTask'].forEach(field => {
      if (entryData[field] === '') entryData[field] = null;
    });

    const entry = await Mis.create(entryData);
    
    await AuditLog.create({
      user: req.user._id,
      action: 'create_mis_entry',
      entityType: 'mis',
      entityId: entry._id,
      entityName: entry.title,
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

exports.updateEntry = async (req, res, next) => {
  try {
    // Only owner or admin can update MIS entries
    const query = (req.user.role === 'admin' || req.user.role === 'super_admin')
      ? { _id: req.params.id, deletedAt: null }
      : { _id: req.params.id, user: req.user._id, deletedAt: null };
    const entry = await Mis.findOne(query);
    if (!entry) return res.status(404).json({ success: false, message: 'MIS entry not found' });

    Object.assign(entry, req.body);
    await entry.save();

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

exports.deleteEntry = async (req, res, next) => {
  try {
    // Only owner or admin can delete MIS entries
    const query = (req.user.role === 'admin' || req.user.role === 'super_admin')
      ? { _id: req.params.id, deletedAt: null }
      : { _id: req.params.id, user: req.user._id, deletedAt: null };
    const entry = await Mis.findOne(query);
    if (!entry) return res.status(404).json({ success: false, message: 'MIS entry not found' });

    entry.deletedAt = new Date();
    entry.deletedBy = req.user._id;
    await entry.save();

    res.status(200).json({ success: true, message: 'Entry deleted' });
  } catch (error) {
    next(error);
  }
};

// Admin Endpoints
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ deletedAt: null }).select('name email role department avatar');
    const now = new Date();
    const todayStart = new Date(now.setHours(0,0,0,0));
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));

    const userStats = await Promise.all(users.map(async (u) => {
      const [todayAgg, weekAgg, totalAgg, lastUpdate] = await Promise.all([
        Mis.countDocuments({ user: u._id, date: { $gte: todayStart }, deletedAt: null }),
        Mis.countDocuments({ user: u._id, date: { $gte: weekStart }, deletedAt: null }),
        Mis.aggregate([
          { $match: { user: u._id, deletedAt: null } },
          { $group: { _id: null, hours: { $sum: '$duration' } } }
        ]),
        Mis.findOne({ user: u._id, deletedAt: null }).sort({ updatedAt: -1 }).select('updatedAt')
      ]);

      return {
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        avatar: u.avatar,
        todayEntries: todayAgg,
        weekEntries: weekAgg,
        totalHours: totalAgg[0] ? Math.round(totalAgg[0].hours / 60) : 0,
        lastUpdate: lastUpdate?.updatedAt
      };
    }));

    res.status(200).json({ success: true, data: userStats });
  } catch (error) {
    next(error);
  }
};

exports.getAdminAnalytics = async (req, res, next) => {
  try {
    const [hoursByProject, activityDistribution, dailyTrend, hoursByUser, weeklyWorkload, monthlyWorkload, topActiveUsers] = await Promise.all([
      // Hours by project
      Mis.aggregate([
        { $match: { deletedAt: null, project: { $ne: null } } },
        { $lookup: { from: 'projects', localField: 'project', foreignField: '_id', as: 'proj' } },
        { $unwind: '$proj' },
        { $group: { _id: '$proj.name', hours: { $sum: '$duration' } } },
        { $project: { project: '$_id', hours: { $round: [{ $divide: ['$hours', 60] }, 1] } } },
        { $sort: { hours: -1 } },
        { $limit: 10 }
      ]),
      // Activity type distribution
      Mis.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$activityType', hours: { $sum: '$duration' } } },
        { $project: { activityType: '$_id', hours: { $round: [{ $divide: ['$hours', 60] }, 1] } } },
        { $sort: { hours: -1 } }
      ]),
      // Daily trend (last 14 days)
      Mis.aggregate([
        { $match: { deletedAt: null, date: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, hours: { $sum: '$duration' } } },
        { $project: { date: '$_id', hours: { $round: [{ $divide: ['$hours', 60] }, 1] } } },
        { $sort: { date: 1 } }
      ]),
      // Hours by user
      Mis.aggregate([
        { $match: { deletedAt: null } },
        { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'usr' } },
        { $unwind: '$usr' },
        { $group: { _id: '$usr.name', hours: { $sum: '$duration' } } },
        { $project: { user: '$_id', hours: { $round: [{ $divide: ['$hours', 60] }, 1] } } },
        { $sort: { hours: -1 } },
        { $limit: 10 }
      ]),
      // Weekly workload (last 12 weeks)
      Mis.aggregate([
        { $match: { deletedAt: null, date: { $gte: new Date(Date.now() - 84 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { week: { $isoWeek: '$date' }, year: { $isoWeekYear: '$date' } }, hours: { $sum: '$duration' } } },
        { $project: { week: { $concat: [{ $toString: '$_id.year' }, '-W', { $toString: '$_id.week' }] }, hours: { $round: [{ $divide: ['$hours', 60] }, 1] } } },
        { $sort: { '_id.year': 1, '_id.week': 1 } }
      ]),
      // Monthly workload (last 12 months)
      Mis.aggregate([
        { $match: { deletedAt: null, date: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, hours: { $sum: '$duration' } } },
        { $project: { month: '$_id', hours: { $round: [{ $divide: ['$hours', 60] }, 1] } } },
        { $sort: { _id: 1 } }
      ]),
      // Top active users
      Mis.aggregate([
        { $match: { deletedAt: null, date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'usr' } },
        { $unwind: '$usr' },
        { $group: { _id: '$usr.name', entries: { $sum: 1 }, hours: { $sum: '$duration' } } },
        { $project: { user: '$_id', entries: 1, hours: { $round: [{ $divide: ['$hours', 60] }, 1] } } },
        { $sort: { entries: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        hoursByProject,
        activityDistribution,
        dailyTrend,
        hoursByUser,
        weeklyWorkload,
        monthlyWorkload,
        topActiveUsers
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('name email role department avatar');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const query = req.query || {};
    const filter = { user: new mongoose.Types.ObjectId(userId), deletedAt: null };
    
    if (query.startDate || query.endDate) {
      filter.date = {};
      if (query.startDate) filter.date.$gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }
    if (query.activityType) filter.activityType = query.activityType;
    if (query.status) filter.workStatus = query.status;
    if (query.project) filter.project = new mongoose.Types.ObjectId(query.project);
    if (query.priority) filter.priority = query.priority;

    const [entries, stats, categoryBreakdown, projectStats, hourlyDistribution] = await Promise.all([
      Mis.find(filter).populate('project', 'name').sort({ date: -1 }).limit(100),
      Mis.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), deletedAt: null } },
        { $group: { _id: null, hours: { $sum: '$duration' }, count: { $sum: 1 } } }
      ]),
      // Activity type breakdown for this user
      Mis.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), deletedAt: null } },
        { $group: { _id: '$activityType', hours: { $sum: '$duration' }, count: { $sum: 1 } } },
        { $project: { 
            activityType: '$_id',
            hours: { $round: [{ $divide: ['$hours', 60] }, 1] },
            entries: '$count'
          } 
        },
        { $sort: { hours: -1 } }
      ]),
      // Projects worked on by this user
      Mis.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), deletedAt: null, project: { $ne: null } } },
        { $lookup: { from: 'projects', localField: 'project', foreignField: '_id', as: 'proj' } },
        { $unwind: { path: '$proj', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$proj.name', hours: { $sum: '$duration' }, count: { $sum: 1 } } },
        { $project: { 
            project: '$_id',
            hours: { $round: [{ $divide: ['$hours', 60] }, 1] },
            entries: '$count'
          } 
        },
        { $sort: { hours: -1 } }
      ]),
      // Hourly distribution (daily trend for this user - last 30 days)
      Mis.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), deletedAt: null, date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, hours: { $sum: '$duration' } } },
        { $project: { 
            date: '$_id',
            hours: { $round: [{ $divide: ['$hours', 60] }, 1] }
          } 
        },
        { $sort: { date: 1 } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        avatar: user.avatar,
        totalEntries: stats[0]?.count || 0,
        totalHours: stats[0] ? Math.round(stats[0].hours / 60) : 0,
        entries,
        categoryBreakdown,
        projectStats,
        hourlyDistribution
      }
    });
  } catch (error) {
    next(error);
  }
};

// Export utility for unit tests
exports.buildMisFilter = buildMisFilter;
exports.asObjectId = asObjectId;
