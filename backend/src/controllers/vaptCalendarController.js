const VaptCalendar = require('../models/VaptCalendar');
const AuditLog = require('../models/AuditLog');
const { emitToUser } = require('../services/socketService');

function computeStatus(dueDate) {
  if (!dueDate) return 'upcoming';
  const now = new Date();
  const due = new Date(dueDate);
  const days = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'overdue';
  if (days <= 30) return 'due_soon';
  return 'upcoming';
}

function computeNextDueDate(lastDate, frequency) {
  if (!lastDate) return null;
  const d = new Date(lastDate);
  switch (frequency) {
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'half_yearly': d.setMonth(d.getMonth() + 6); break;
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
    default: d.setFullYear(d.getFullYear() + 1);
  }
  return d;
}

exports.getList = async (req, res, next) => {
  try {
    const { status, frequency, assessmentType, search, startDate, endDate, sortBy, order } = req.query;
    const filter = { deletedAt: null };

    if (status) filter.status = status;
    if (frequency) filter.assessmentFrequency = frequency;
    if (assessmentType) filter.assessmentType = assessmentType;
    if (search) {
      filter.$or = [
        { projectName: { $regex: search, $options: 'i' } }
      ];
    }
    if (startDate || endDate) {
      filter.nextVaptDueDate = {};
      if (startDate) filter.nextVaptDueDate.$gte = new Date(startDate);
      if (endDate) filter.nextVaptDueDate.$lte = new Date(endDate);
    }

    const sortField = sortBy || 'nextVaptDueDate';
    const sortOrder = order === 'asc' ? 1 : -1;

    const items = await VaptCalendar.find(filter)
      .populate('project', 'name code')
      .sort({ [sortField]: sortOrder })
      .lean();

    const data = items.map(item => {
      const statusVal = computeStatus(item.nextVaptDueDate);
      const daysRemaining = item.nextVaptDueDate
        ? Math.ceil((new Date(item.nextVaptDueDate) - new Date()) / (1000 * 60 * 60 * 24))
        : null;
      return {
        id: item._id?.toString(),
        project: item.project,
        projectName: item.projectName,
        projectType: item.projectType,
        assessmentType: item.assessmentType,
        lastVaptDate: item.lastVaptDate,
        nextVaptDueDate: item.nextVaptDueDate,
        assessmentFrequency: item.assessmentFrequency,
        notes: item.notes,
        status: statusVal,
        daysRemaining,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      };
    });

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const item = await VaptCalendar.findOne({ _id: req.params.id, deletedAt: null })
      .populate('project', 'name code');

    if (!item) return res.status(404).json({ success: false, message: 'Assessment not found' });

    res.status(200).json({
      success: true,
      data: {
        ...item.toJSON(),
        status: computeStatus(item.nextVaptDueDate)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { lastVaptDate, assessmentFrequency, nextVaptDueDate } = req.body;

    let computedDueDate = nextVaptDueDate;
    if (!computedDueDate && lastVaptDate && assessmentFrequency) {
      computedDueDate = computeNextDueDate(lastVaptDate, assessmentFrequency);
    }

    const entry = await VaptCalendar.create({
      ...req.body,
      nextVaptDueDate: computedDueDate,
      status: computeStatus(computedDueDate),
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await AuditLog.create({
      action: 'VAPT_CALENDAR_CREATE',
      entityType: 'VaptCalendar',
      entityId: entry._id,
      user: req.user._id,
      details: { projectName: entry.projectName, nextVaptDueDate: computedDueDate }
    });

    res.status(201).json({ success: true, data: entry.toJSON() });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const entry = await VaptCalendar.findOne({ _id: req.params.id, deletedAt: null });
    if (!entry) return res.status(404).json({ success: false, message: 'Assessment not found' });

    const fields = ['projectName', 'projectType', 'assessmentType', 'lastVaptDate', 'nextVaptDueDate', 'assessmentFrequency', 'notes'];
    fields.forEach(f => { if (req.body[f] !== undefined) entry[f] = req.body[f]; });

    if (!entry.nextVaptDueDate && entry.lastVaptDate && entry.assessmentFrequency) {
      entry.nextVaptDueDate = computeNextDueDate(entry.lastVaptDate, entry.assessmentFrequency);
    }

    entry.status = computeStatus(entry.nextVaptDueDate);
    entry.updatedBy = req.user._id;
    await entry.save();

    await AuditLog.create({
      action: 'VAPT_CALENDAR_UPDATE',
      entityType: 'VaptCalendar',
      entityId: entry._id,
      user: req.user._id,
      details: { projectName: entry.projectName, nextVaptDueDate: entry.nextVaptDueDate }
    });

    res.status(200).json({ success: true, data: entry.toJSON() });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const entry = await VaptCalendar.findOne({ _id: req.params.id, deletedAt: null });
    if (!entry) return res.status(404).json({ success: false, message: 'Assessment not found' });

    entry.deletedAt = new Date();
    entry.deletedBy = req.user._id;
    await entry.save();

    await AuditLog.create({
      action: 'VAPT_CALENDAR_DELETE',
      entityType: 'VaptCalendar',
      entityId: entry._id,
      user: req.user._id,
      details: { projectName: entry.projectName }
    });

    res.status(200).json({ success: true, message: 'Assessment deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [total, upcoming, dueSoon, overdue] = await Promise.all([
      VaptCalendar.countDocuments({ deletedAt: null }),
      VaptCalendar.countDocuments({ deletedAt: null, nextVaptDueDate: { $gt: thirtyDaysLater } }),
      VaptCalendar.countDocuments({
        deletedAt: null,
        nextVaptDueDate: { $gte: now, $lte: thirtyDaysLater }
      }),
      VaptCalendar.countDocuments({
        deletedAt: null,
        nextVaptDueDate: { $lt: now }
      })
    ]);

    const nextDue = await VaptCalendar.findOne({ deletedAt: null, nextVaptDueDate: { $gte: now } })
      .sort('nextVaptDueDate')
      .select('projectName nextVaptDueDate')
      .lean();

    const monthlyData = await VaptCalendar.aggregate([
      { $match: { deletedAt: null, nextVaptDueDate: { $ne: null } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$nextVaptDueDate' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 12 }
    ]);

    res.status(200).json({
      success: true,
      data: { total, upcoming, dueSoon, overdue, nextDue, monthlyData }
    });
  } catch (error) {
    next(error);
  }
};

exports.recalculateAll = async (req, res, next) => {
  try {
    const entries = await VaptCalendar.find({ deletedAt: null });
    let updated = 0;
    for (const entry of entries) {
      const newStatus = computeStatus(entry.nextVaptDueDate);
      if (entry.status !== newStatus) {
        entry.status = newStatus;
        entry.updatedBy = req.user._id;
        await entry.save();
        updated++;
      }
    }
    res.status(200).json({ success: true, message: `Recalculated ${updated} entries` });
  } catch (error) {
    next(error);
  }
};
