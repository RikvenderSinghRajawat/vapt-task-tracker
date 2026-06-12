const SupportRequest = require('../models/SupportRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { getStoragePaths, buildFileUrl } = require('../config/storage');
const path = require('path');
const fs = require('fs');

const ADMIN_ROLES = ['admin', 'super_admin', 'vapt_analyst', 'vapt_tl'];

const isAdminUser = (user) => ADMIN_ROLES.includes(user.role);

const addTimeline = (request, action, user, details = null) => {
  request.timeline.push({ action, user: user._id, timestamp: new Date(), details });
};

const createNotification = async (recipientId, senderId, type, title, message, actionUrl = null) => {
  try {
    const entityType = 'support';
    const entityId = actionUrl ? actionUrl.split('/').pop() : null;
    await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type,
      title,
      message,
      actionUrl,
      redirectUrl: actionUrl,
      entityType,
      entityId,
      priority: 'normal',
      deliveryMethods: { inApp: true, email: false },
      messageType: 'notification',
      createdBy: senderId
    });
  } catch (err) {
    console.error('[Support] Notification error:', err.message);
  }
};

const createAuditLog = async (req, action, entityType, entityId, entityName, details = null) => {
  try {
    await AuditLog.create({
      user: req.user._id,
      action,
      entityType,
      entityId: entityId.toString(),
      entityName,
      details,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
  } catch (err) {
    console.error('[Support] Audit log error:', err.message);
  }
};

// ─── USER: Get my requests ───
exports.getMyRequests = async (req, res, next) => {
  try {
    const { status, category, search, page = 1, limit = 20 } = req.query;
    const query = { createdBy: req.user._id, deletedAt: null };

    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { requestId: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [requests, total] = await Promise.all([
      SupportRequest.find(query)
        .populate('assignedTo', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      SupportRequest.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: requests,
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
};

// ─── USER: Create a request ───
exports.createRequest = async (req, res, next) => {
  try {
    const { title, description, category } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description are required' });
    }

    const requestData = {
      title: title.trim(),
      description,
      category: category || 'other',
      createdBy: req.user._id
    };

    if (req.files && req.files.length > 0) {
      requestData.attachments = req.files.map(f => ({
        filename: f.filename,
        originalname: f.originalname,
        url: buildFileUrl('support', f.filename),
        size: f.size,
        mimetype: f.mimetype
      }));
    }

    const supportRequest = await SupportRequest.create(requestData);

    addTimeline(supportRequest, 'created', req.user, { title: requestData.title });
    await supportRequest.save();

    await createAuditLog(req, 'create_support_request', 'support_request', supportRequest._id, supportRequest.requestId, { title: requestData.title });

    const adminUsers = await User.find({ role: { $in: ['admin', 'super_admin', 'vapt_analyst', 'vapt_tl'] }, isActive: true });
    for (const admin of adminUsers) {
      await createNotification(
        admin._id,
        req.user._id,
        'support_request',
        `New Support Request: ${supportRequest.requestId}`,
        `${req.user.name || req.user.email} created "${supportRequest.title}"`,
        `/support/${supportRequest._id}`
      );
    }

    const populated = await SupportRequest.findById(supportRequest._id)
      .populate('assignedTo', 'name email role');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// ─── USER: Get single request (own only) ───
exports.getRequest = async (req, res, next) => {
  try {
    const request = await SupportRequest.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('comments.user', 'name email role')
      .populate('timeline.user', 'name email role')
      .populate('resolvedBy', 'name email role');

    if (!request || request.deletedAt) {
      return res.status(404).json({ success: false, message: 'Support request not found' });
    }

    if (!isAdminUser(req.user) && request.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this request' });
    }

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

// ─── USER: Add comment to own request ───
exports.addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const request = await SupportRequest.findById(req.params.id);
    if (!request || request.deletedAt) {
      return res.status(404).json({ success: false, message: 'Support request not found' });
    }

    if (!isAdminUser(req.user) && request.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to comment on this request' });
    }

    if (request.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Cannot comment on a closed request' });
    }

    request.comments.push({ user: req.user._id, text: text.trim(), isInternal: isAdminUser(req.user) && req.body.isInternal === true });
    addTimeline(request, 'comment', req.user, { text: text.trim().substring(0, 100) });
    await request.save();

    if (isAdminUser(req.user)) {
      await createNotification(
        request.createdBy,
        req.user._id,
        'support_comment',
        `New response on ${request.requestId}`,
        `${req.user.name || req.user.email} replied: "${text.trim().substring(0, 200)}"`,
        `/support/${request._id}`
      );
    } else {
      const adminUsers = await User.find({ role: { $in: ['admin', 'super_admin', 'vapt_analyst', 'vapt_tl'] }, isActive: true });
      for (const admin of adminUsers) {
        await createNotification(
          admin._id,
          req.user._id,
          'support_comment',
          `New comment on ${request.requestId}`,
          `${req.user.name || req.user.email} commented: "${text.trim().substring(0, 200)}"`,
          `/support/${request._id}`
        );
      }
    }

    const populated = await SupportRequest.findById(request._id)
      .populate('comments.user', 'name email role');

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Get all requests ───
exports.getAllRequests = async (req, res, next) => {
  try {
    const { status, category, assignedTo, search, createdBy, page = 1, limit = 20 } = req.query;
    const query = { deletedAt: null };

    if (status) query.status = status;
    if (category) query.category = category;
    if (assignedTo) query.assignedTo = assignedTo;
    if (createdBy) query.createdBy = createdBy;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { requestId: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [requests, total] = await Promise.all([
      SupportRequest.find(query)
        .populate('createdBy', 'name email role')
        .populate('assignedTo', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      SupportRequest.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: requests,
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Get request detail ───
exports.getRequestDetail = async (req, res, next) => {
  try {
    const request = await SupportRequest.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('comments.user', 'name email role')
      .populate('timeline.user', 'name email role')
      .populate('resolvedBy', 'name email role');

    if (!request || request.deletedAt) {
      return res.status(404).json({ success: false, message: 'Support request not found' });
    }

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Assign request ───
exports.assignRequest = async (req, res, next) => {
  try {
    const { assignedTo } = req.body;
    if (!assignedTo) {
      return res.status(400).json({ success: false, message: 'assignedTo user ID is required' });
    }

    const assignee = await User.findById(assignedTo);
    if (!assignee || !assignee.isActive) {
      return res.status(404).json({ success: false, message: 'User not found or inactive' });
    }

    if (!ADMIN_ROLES.includes(assignee.role)) {
      return res.status(400).json({ success: false, message: 'Can only assign to admin/VAPT users' });
    }

    const request = await SupportRequest.findById(req.params.id);
    if (!request || request.deletedAt) {
      return res.status(404).json({ success: false, message: 'Support request not found' });
    }

    const previousAssignee = request.assignedTo;
    request.assignedTo = assignee._id;
    request.assignedAt = new Date();

    addTimeline(request, 'assigned', req.user, {
      from: previousAssignee ? (await User.findById(previousAssignee))?.name || 'Unassigned' : 'Unassigned',
      to: assignee.name || assignee.email
    });

    await request.save();
    await createAuditLog(req, 'assign_support_request', 'support_request', request._id, request.requestId, { assignedTo: assignee.email });

    await createNotification(
      assignee._id,
      req.user._id,
      'support_assignment',
      `You've been assigned: ${request.requestId}`,
      `${req.user.name || req.user.email} assigned "${request.title}" to you`,
      `/support/${request._id}`
    );

    if (request.createdBy.toString() !== assignee._id.toString()) {
      await createNotification(
        request.createdBy,
        req.user._id,
        'support_assignment',
        `Request assigned: ${request.requestId}`,
        `Your request "${request.title}" has been assigned to ${assignee.name || assignee.email}`,
        `/support/${request._id}`
      );
    }

    const populated = await SupportRequest.findById(request._id)
      .populate('assignedTo', 'name email role');

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Update status ───
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, resolutionNotes } = req.body;
    const validStatuses = SupportRequest.STATUSES || ['open', 'in_progress', 'resolved', 'closed', 'reopened'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Valid status is required: ${validStatuses.join(', ')}` });
    }

    const request = await SupportRequest.findById(req.params.id);
    if (!request || request.deletedAt) {
      return res.status(404).json({ success: false, message: 'Support request not found' });
    }

    const oldStatus = request.status;
    request.status = status;

    if ((status === 'resolved' || status === 'closed') && !request.resolvedAt) {
      request.resolvedAt = new Date();
      request.resolvedBy = req.user._id;
      if (resolutionNotes) request.resolutionNotes = resolutionNotes;
    }

    if (status === 'reopened') {
      request.resolvedAt = null;
      request.resolvedBy = null;
    }

    addTimeline(request, 'status_change', req.user, { from: oldStatus, to: status });
    await request.save();

    await createAuditLog(req, 'update_support_status', 'support_request', request._id, request.requestId, { from: oldStatus, to: status });

    await createNotification(
      request.createdBy,
      req.user._id,
      'support_status',
      `Status updated: ${request.requestId}`,
      `Your request "${request.title}" changed from ${oldStatus} to ${status}`,
      `/support/${request._id}`
    );

    if (request.assignedTo && request.assignedTo.toString() !== request.createdBy.toString()) {
      await createNotification(
        request.assignedTo,
        req.user._id,
        'support_status',
        `Status updated: ${request.requestId}`,
      `"${request.title}" changed from ${oldStatus} to ${status}`,
        `/support/${request._id}`
    );
    }

    const populated = await SupportRequest.findById(request._id)
      .populate('assignedTo', 'name email role')
      .populate('resolvedBy', 'name email role');

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Add admin comment ───
exports.addAdminComment = async (req, res, next) => {
  try {
    const { text, isInternal } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const request = await SupportRequest.findById(req.params.id);
    if (!request || request.deletedAt) {
      return res.status(404).json({ success: false, message: 'Support request not found' });
    }

    request.comments.push({
      user: req.user._id,
      text: text.trim(),
      isInternal: isInternal === true
    });

    addTimeline(request, 'comment', req.user, { text: text.trim().substring(0, 100), isInternal: isInternal === true });
    await request.save();

    if (isInternal !== true) {
      await createNotification(
        request.createdBy,
        req.user._id,
        'support_comment',
        `New response on ${request.requestId}`,
        `${req.user.name || req.user.email} replied: "${text.trim().substring(0, 200)}"`,
        `/support/${request._id}`
      );

      if (request.assignedTo && request.assignedTo.toString() !== req.user._id.toString()) {
        await createNotification(
          request.assignedTo,
          req.user._id,
          'support_comment',
          `New comment on ${request.requestId}`,
          `${req.user.name || req.user.email} commented on "${request.title}"`,
          `/support/${request._id}`
        );
      }
    }

    const populated = await SupportRequest.findById(request._id)
      .populate('comments.user', 'name email role');

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Get summary stats ───
exports.getSummary = async (req, res, next) => {
  try {
    const [openCount, inProgressCount, resolvedCount, closedCount, totalCount, unassignedCount] = await Promise.all([
      SupportRequest.countDocuments({ status: 'open', deletedAt: null }),
      SupportRequest.countDocuments({ status: 'in_progress', deletedAt: null }),
      SupportRequest.countDocuments({ status: 'resolved', deletedAt: null }),
      SupportRequest.countDocuments({ status: 'closed', deletedAt: null }),
      SupportRequest.countDocuments({ deletedAt: null }),
      SupportRequest.countDocuments({ assignedTo: { $exists: false }, deletedAt: null })
    ]);

    const categoryBreakdown = await SupportRequest.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const recentRequests = await SupportRequest.find({ deletedAt: null })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        total: totalCount,
        open: openCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
        closed: closedCount,
        unassigned: unassignedCount,
        categoryBreakdown,
        recentRequests
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Upload attachment to existing request ───
exports.uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const request = await SupportRequest.findById(req.params.id);
    if (!request || request.deletedAt) {
      return res.status(404).json({ success: false, message: 'Support request not found' });
    }

    const attachment = {
      filename: req.file.filename,
      originalname: req.file.originalname,
      url: buildFileUrl('support', req.file.filename),
      size: req.file.size,
      mimetype: req.file.mimetype
    };

    request.attachments.push(attachment);
    addTimeline(request, 'attachment', req.user, { filename: req.file.originalname });
    await request.save();

    res.status(200).json({ success: true, data: request.attachments });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN: Delete attachment ───
exports.deleteAttachment = async (req, res, next) => {
  try {
    const { attachmentId } = req.params;
    const request = await SupportRequest.findById(req.params.id);
    if (!request || request.deletedAt) {
      return res.status(404).json({ success: false, message: 'Support request not found' });
    }

    const attachment = request.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    const filePath = path.join(getStoragePaths().support, attachment.filename);
    try { fs.unlinkSync(filePath); } catch (_) {}

    request.attachments.pull(attachmentId);
    await request.save();

    res.status(200).json({ success: true, message: 'Attachment deleted' });
  } catch (error) {
    next(error);
  }
};

// ─── Get admins for assignment dropdown ───
exports.getAdminUsers = async (req, res, next) => {
  try {
    const admins = await User.find({
      role: { $in: ['admin', 'super_admin', 'vapt_analyst', 'vapt_tl'] },
      isActive: true,
      deletedAt: null
    }).select('name email role');

    res.status(200).json({ success: true, data: admins });
  } catch (error) {
    next(error);
  }
};
