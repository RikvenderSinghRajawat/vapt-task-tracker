const Notification = require('../models/Notification');
const User = require('../models/User');
const Project = require('../models/Project');
const { hasGlobalAccess, isAdmin } = require('../utils/rbac');

function getRoleBasedVisibility(user) {
  if (isAdmin(user)) return { deletedAt: null };
  return {
    deletedAt: null,
    $or: [
      { recipient: user._id },
      { sender: user._id },
      { mentionedUsers: user._id },
    ],
  };
}

async function getRelatedEntityUsers(notification) {
  const userIds = [];
  if (notification.recipient) userIds.push(notification.recipient);
  if (notification.sender) userIds.push(notification.sender);
  if (notification.mentionedUsers) userIds.push(...notification.mentionedUsers);

  if (notification.projectId) {
    const project = await Project.findById(notification.projectId).select('manager teamMembers.allocatedUsers').lean();
    if (project) {
      if (project.manager) userIds.push(project.manager);
      if (project.teamMembers) project.teamMembers.forEach(m => {
        if (m.user) userIds.push(m.user);
      });
      if (project.allocatedUsers) userIds.push(...project.allocatedUsers);
    }
  }

  if (notification.findingId) {
    const Finding = require('../models/Finding');
    const finding = await Finding.findById(notification.findingId).select('assignee assignedDevelopers createdBy').lean();
    if (finding) {
      if (finding.assignee) userIds.push(finding.assignee);
      if (finding.assignedDevelopers) userIds.push(...finding.assignedDevelopers);
      if (finding.createdBy) userIds.push(finding.createdBy);
    }
  }

  if (notification.taskId) {
    const Task = require('../models/Task');
    const task = await Task.findById(notification.taskId).select('assignedTo createdBy').lean();
    if (task) {
      if (task.assignedTo) userIds.push(task.assignedTo);
      if (task.createdBy) userIds.push(task.createdBy);
    }
  }

  return [...new Set(userIds.map(id => id.toString()))];
}

exports.getNotifications = async (req, res, next) => {
  try {
    const { isRead, type, messageType, search, entityType, page = 1, limit = 20, unreadOnly, days } = req.query;
    const query = getRoleBasedVisibility(req.user);

    const retentionDays = parseInt(days) || 14;
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    query.createdAt = { $gte: cutoff };

    if (isRead !== undefined) query.isRead = isRead === 'true';
    if (type) query.type = type;
    if (messageType) query.messageType = messageType;
    if (entityType) query.entityType = entityType;
    if (unreadOnly === 'true' || unreadOnly === '1') query.isRead = false;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate('recipient', 'name email avatar')
        .populate('sender', 'name email avatar')
        .populate('createdBy', 'name email avatar')
        .populate('mentionedUsers', 'name email avatar')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum),
      Notification.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUnreadNotifications = async (req, res, next) => {
  try {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const query = {
      recipient: req.user._id,
      isRead: false,
      deletedAt: null,
      createdAt: { $gte: cutoff },
    };

    const notifications = await Notification.find(query)
      .populate('sender', 'name email avatar')
      .sort('-createdAt')
      .limit(10);

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
      deletedAt: null,
    });

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification || notification.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this notification',
      });
    }

    notification.isRead = true;
    notification.readAt = Date.now();
    if (notification.readStatus) {
      notification.readStatus.set(req.user._id.toString(), true);
    }
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false, deletedAt: null },
      { isRead: true, readAt: Date.now() }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

exports.markAsUnread = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification || notification.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this notification',
      });
    }

    notification.isRead = false;
    notification.readAt = null;
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as unread',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    const isAdmin = ['admin', 'super_admin', 'vapt_analyst', 'vapt_tl'].includes(req.user.role);
    if (notification.recipient.toString() !== req.user._id.toString() && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification',
      });
    }

    notification.deletedAt = Date.now();
    notification.deletedBy = req.user._id;
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.replyToNotification = async (req, res, next) => {
  try {
    const { message, parentReplyId } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reply message is required',
      });
    }

    const parent = await Notification.findById(parentReplyId);
    if (!parent || parent.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Parent notification not found',
      });
    }

    const isAdmin = ['admin', 'super_admin', 'vapt_analyst', 'vapt_tl'].includes(req.user.role);
    if (!isAdmin) {
      const relatedUserIds = await getRelatedEntityUsers(parent);
      if (!relatedUserIds.includes(req.user._id.toString())) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to reply to this notification',
        });
      }
    }

    const reply = await Notification.create({
      recipient: parent.recipient,
      sender: req.user._id,
      type: parent.type,
      title: `Re: ${parent.title}`,
      message: message.trim(),
      priority: parent.priority,
      relatedEntity: parent.relatedEntity,
      actionUrl: parent.actionUrl,
      redirectUrl: parent.redirectUrl || parent.actionUrl,
      entityType: parent.entityType,
      entityId: parent.entityId,
      projectId: parent.projectId,
      findingId: parent.findingId,
      taskId: parent.taskId,
      parentReplyId: parent._id,
      messageType: 'reply',
      createdBy: req.user._id,
      deliveryMethods: { inApp: true, email: false },
    });

    res.status(201).json({
      success: true,
      message: 'Reply sent successfully',
      data: reply,
    });
  } catch (error) {
    next(error);
  }
};

exports.getNotificationThread = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification || notification.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    const isAdmin = ['admin', 'super_admin', 'vapt_analyst', 'vapt_tl'].includes(req.user.role);
    if (!isAdmin) {
      const relatedUserIds = await getRelatedEntityUsers(notification);
      if (!relatedUserIds.includes(req.user._id.toString())) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this thread',
        });
      }
    }

    const rootId = notification.parentReplyId || notification._id;
    const thread = await Notification.find({
      $or: [
        { _id: rootId },
        { parentReplyId: rootId },
        { parentReplyId: notification._id },
      ],
      deletedAt: null,
    })
      .populate('recipient', 'name email avatar')
      .populate('sender', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .sort('createdAt');

    res.status(200).json({
      success: true,
      data: thread,
    });
  } catch (error) {
    next(error);
  }
};

exports.createMentionNotification = async (req, res, next) => {
  try {
    const { recipientId, type, title, message, projectId, findingId, taskId } = req.body;

    if (!recipientId || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'recipientId, title, and message are required',
      });
    }

    const entityType = projectId && findingId ? 'finding' : taskId ? 'task' : null;
    const entityId = (findingId || taskId || '').toString();
    const redirectUrl = entityType === 'finding' ? `/projects/${projectId}/findings/${findingId}` : entityType === 'task' ? `/tasks/${taskId}` : null;

    const notification = await Notification.create({
      recipient: recipientId,
      sender: req.user._id,
      type: type || 'mention',
      title,
      message,
      priority: 'normal',
      redirectUrl,
      entityType,
      entityId,
      projectId,
      findingId,
      taskId,
      messageType: 'mention',
      mentionedUsers: [recipientId],
      createdBy: req.user._id,
      deliveryMethods: { inApp: true, email: false },
    });

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};
