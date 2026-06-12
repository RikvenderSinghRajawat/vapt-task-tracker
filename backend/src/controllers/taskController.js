'use strict';

const { Task, User, Project, AuditLog, Notification } = require('../models');
const TaskCounter = require('../models/TaskCounter');
const { buildFileUrl } = require('../config/storage');
const rbacUtils = require('../utils/rbac');
const { isAdmin, isVapt, hasGlobalAccess, allocatedProjectIds } = rbacUtils;
const socketService = require('../services/socketService');

const pushActivity = (task, action, performedBy, details) => {
  if (!task.activityLogs) task.activityLogs = [];
  task.activityLogs.push({ action, performedBy, details, timestamp: new Date() });
};

const notify = async (recipient, type, title, msg, priority, task) => {
  try {
    const recipientUser = await User.findById(recipient).select('role').lean();
    if (!recipientUser) return;
    if (task?.isSelfTask) return;
    return Notification.create({
      recipient,
      sender: task?.createdBy,
      type,
      title,
      message: msg,
      priority,
      relatedEntity: { type: 'task', id: task?._id },
      actionUrl: `/my-tasks?taskId=${task?._id}`,
      redirectUrl: `/my-tasks?taskId=${task?._id}`,
      entityType: 'task',
      entityId: task?._id?.toString(),
      projectId: task?.project,
      taskId: task?._id,
    });
  } catch (_) {}
};

const populate = (q) =>
  q.populate('assignedTo', 'name email role avatar')
    .populate('assignedBy', 'name email role')
    .populate('createdBy', 'name email role avatar');

async function scopedQuery(user) {
  let query = { deletedAt: { $exists: false } };
  if (isAdmin(user)) return { query };

  const orConditions = [{ assignedTo: user._id }, { createdBy: user._id }];

  if (isVapt(user)) {
    const privilegedRoles = await User.find({ role: { $in: ['admin', 'super_admin', 'vapt_analyst', 'vapt_tl'] } }).select('_id');
    orConditions.push({ assignedBy: { $in: privilegedRoles.map(r => r._id) }, assignedTo: user._id });
  } else if (user.role === 'project_manager') {
    const pmProjectIds = allocatedProjectIds(user).map(String);
    if (pmProjectIds.length > 0) orConditions.push({ project: { $in: pmProjectIds } });
  } else if (user.role === 'developer') {
    const pms = await User.find({ role: 'project_manager' }).select('_id');
    orConditions.push({ assignedBy: { $in: pms.map(p => p._id) }, assignedTo: user._id });
  }
  query.$or = orConditions;
  return { query, projectIds: [] };
}

async function canAssignTo(actor, assigneeId, projectId = null) {
  if (isAdmin(actor)) return true;
  if (String(actor._id) === String(assigneeId)) return true;

  if (!projectId) {
    if (isVapt(actor)) {
      const assignee = await User.findById(assigneeId).select('role');
      return assignee && isVapt(assignee);
    }
    if (actor.role === 'project_manager') {
      const assignee = await User.findById(assigneeId).select('role');
      return assignee && assignee.role === 'developer';
    }
    return false;
  }

  if (isVapt(actor)) {
    return String(actor._id) === String(assigneeId);
  }
  if (actor.role === 'project_manager') {
    const managesProj = (allocatedProjectIds(actor) || []).map(String).includes(String(projectId));
    if (!managesProj) return false;
    const assignee = await User.findById(assigneeId).select('role allocatedProjects');
    return assignee.role === 'developer' &&
      (assignee.allocatedProjects || []).map(String).includes(String(projectId));
  }
  return false;
}

async function getEditPermission(task, actor) {
  if (isAdmin(actor)) return 'full';
  if (String(task.createdBy) === String(actor._id)) return 'full';

  if (String(task.assignedTo) === String(actor._id)) {
    let creatorRole;
    if (typeof task.createdBy === 'object' && task.createdBy?.role) {
      creatorRole = task.createdBy.role;
    } else {
      const creator = await User.findById(task.createdBy).select('role').lean();
      creatorRole = creator?.role;
    }
    if (creatorRole && ['admin', 'super_admin', 'vapt_tl', 'project_manager'].includes(creatorRole)) {
      return 'status_only';
    }
    return 'full';
  }

  if (isVapt(actor) && task.project && (allocatedProjectIds(actor) || []).map(String).includes(String(task.project))) return 'full';
  if (actor.role === 'project_manager' && task.project && (allocatedProjectIds(actor) || []).map(String).includes(String(task.project))) return 'full';

  return false;
}

const VALID_TRANSITIONS = {
  queued: ['pending', 'in_progress', 'cancelled', 'escalated'],
  pending: ['queued', 'in_progress', 'blocked', 'cancelled', 'escalated'],
  in_progress: ['review', 'blocked', 'completed', 'escalated'],
  blocked: ['in_progress', 'pending', 'escalated'],
  review: ['completed', 'in_progress', 'reopened', 'escalated'],
  completed: ['reopened'],
  cancelled: ['reopened'],
  reopened: ['pending', 'in_progress', 'escalated'],
  escalated: ['in_progress', 'review', 'pending', 'cancelled'],
};

function normalizeStatus(status) {
  if (typeof status !== 'string') return status;
  return status.trim().toLowerCase().replace(/\s+/g, '_');
}

function canTransition(from, to) {
  // eslint-disable-next-line security/detect-object-injection -- from is task.status (DB enum), fallback to empty array
  return from !== to && (VALID_TRANSITIONS[from] || []).includes(to);
}

const terminal = s => ['completed', 'cancelled'].includes(s);

async function generateTaskId(userRole) {
  try {
    const userCode = TaskCounter.getUserCode(userRole);
    const sequence = await TaskCounter.getNextSequence(userCode);
    return `${userCode}-${String(sequence).padStart(3, '0')}`;
  } catch (_) {
    return null;
  }
}

exports.getTasks = async (req, res, next) => {
  try {
    const { status, priority, project, assignedTo, taskType, search, sortBy, sortOrder, page = 1, limit = 50 } = req.query;
    const { query } = await scopedQuery(req.user);
    const finalQ = { ...query, deletedAt: { $exists: false } };
    if (status) finalQ.status = status;
    if (priority) finalQ.priority = priority;
    if (project) finalQ.project = project;
    if (assignedTo) finalQ.assignedTo = assignedTo;
    if (taskType) finalQ.taskType = taskType;
    if (search) {
      finalQ.$and = [{ $or: [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }] }];
    }
    const skip = (+page - 1) * +limit;
    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const sort = sortBy === 'updatedAt' ? { updatedAt: sortDir }
      : sortBy === 'title' ? { title: sortDir }
      : sortBy === 'priority' ? { priority: sortDir }
      : sortBy === 'severity' ? { severity: sortDir }
      : sortBy === 'status' ? { status: sortDir }
      : sortBy === 'dueDate' ? { dueDate: sortDir }
      : sortBy === 'startDate' ? { startDate: sortDir }
      : sortBy === 'taskType' ? { taskType: sortDir }
      : { createdAt: -1 };
    const [tasks, total] = await Promise.all([
      populate(Task.find(finalQ).sort(sort).skip(skip).limit(+limit)),
      Task.countDocuments(finalQ),
    ]);
    res.status(200).json({ success: true, data: tasks, pagination: { total, page: +page, limit: +limit, pages: Math.ceil(total / +limit) } });
  } catch (e) { next(e); }
};

exports.getMyTasks = async (req, res, next) => {
  try {
    const { status, priority, taskType, search, page = 1, limit = 50 } = req.query;
    const { query } = await scopedQuery(req.user);
    const finalQ = { ...query, deletedAt: { $exists: false } };
    if (status) finalQ.status = status;
    if (priority) finalQ.priority = priority;
    if (taskType) finalQ.taskType = taskType;
    if (search) {
      finalQ.$and = [{ $or: [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }] }];
    }
    const skip = (+page - 1) * +limit;
    const sort = { createdAt: -1 };
    const [tasks, total] = await Promise.all([
      populate(Task.find(finalQ).sort(sort).skip(skip).limit(+limit)),
      Task.countDocuments(finalQ),
    ]);
    res.status(200).json({ success: true, data: tasks, pagination: { total, page: +page, limit: +limit, pages: Math.ceil(total / +limit) } });
  } catch (e) { next(e); }
};

exports.getTeamTasks = async (req, res, next) => {
  try {
    const { projectId, status, page = 1, limit = 50 } = req.query;
    const { query: base, projectIds } = await scopedQuery(req.user);

    let q;
    if (isAdmin(req.user)) {
      q = { ...base };
      if (projectId) q.project = projectId;
    } else if (req.user.role === 'project_manager') {
      const pIds = (allocatedProjectIds(req.user) || []).map(String);
      const devs = await User.find({ role: 'developer', allocatedProjects: { $in: pIds } }).select('_id');
      q = {
        deletedAt: { $exists: false },
        $or: [
          { assignedTo: { $in: [req.user._id, ...devs.map(d => d._id)] } },
          ...(pIds.length ? [{ project: { $in: pIds } }] : []),
        ],
      };
      if (projectId) q.project = projectId;
    } else if (isVapt(req.user)) {
      const pIds = (allocatedProjectIds(req.user) || []).map(String);
      const pm = req.user;
      const devs = await User.find({ role: 'developer', allocatedProjects: { $in: pIds } }).select('_id');
      q = {
        deletedAt: { $exists: false },
        $or: [
          { assignedTo: pm._id },
          { createdBy: pm._id },
          { assignedBy: pm._id },
          ...(pIds.length ? [{ project: { $in: pIds } }] : []),
          ...(devs.length ? [{ assignedTo: { $in: devs.map(d => d._id) }, project: { $in: pIds } }] : []),
        ],
      };
      if (projectId) q.project = projectId;
    } else {
      q = { ...base, deletedAt: { $exists: false } };
      if (projectId) q.project = projectId;
    }

    if (status) q.status = status;
    const [tasks, total] = await Promise.all([
      populate(Task.find(q).sort({ createdAt: -1 }).skip((+page - 1) * +limit).limit(+limit)),
      Task.countDocuments(q),
    ]);
    res.status(200).json({ success: true, data: tasks, pagination: { total, page: +page, limit: +limit, pages: Math.ceil(total / +limit) } });
  } catch (e) { next(e); }
};

exports.getTask = async (req, res, next) => {
  try {
    const { query } = await scopedQuery(req.user);
    const task = await populate(Task.findOne({ _id: req.params.id, ...query, deletedAt: { $exists: false } }));
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.status(200).json({ success: true, data: task });
  } catch (e) { next(e); }
};

exports.getTaskActivity = async (req, res, next) => {
  try {
    const { query } = await scopedQuery(req.user);
    const task = await Task.findOne({ _id: req.params.id, ...query, deletedAt: { $exists: false } }).select('activityLogs title');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.status(200).json({ success: true, data: task.activityLogs.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) });
  } catch (e) { next(e); }
};

exports.createTask = async (req, res, next) => {
  try {
    const { title, description, assignedTo, taskType, category, priority, severity, status,
      startDate, dueDate, estimatedHours, progress, tags } = req.body;
    const normalizedStatus = normalizeStatus(status) || 'pending';
    const normalizedPriority = (priority || 'medium').toLowerCase();
    const normalizedTaskType = (taskType || 'miscellaneous').toLowerCase().replace(/\s+/g, '_');

    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Title is required' });

    const currentUserId = String(req.user._id || req.user.id);
    const effAssignedTo = assignedTo ? String(assignedTo) : currentUserId;
    const isSelfTask = effAssignedTo === currentUserId;

    if (!isSelfTask && !(await canAssignTo(req.user, effAssignedTo))) {
      return res.status(403).json({ success: false, message: 'Not authorized to assign this task to that user' });
    }

    let taskCode = null;
    let assignedUserRole = req.user.role;
    if (assignedTo) {
      const assignedUser = await User.findById(assignedTo).select('role').lean();
      if (assignedUser) assignedUserRole = assignedUser.role;
    }
    taskCode = await generateTaskId(assignedUserRole);

    const taskDoc = await Task.create({
      title: title.trim(),
      description: description || '',
      createdBy: req.user._id,
      assignedBy: req.user._id,
      assignedTo: effAssignedTo,
      taskType: normalizedTaskType,
      category: category || '',
      priority: normalizedPriority,
      severity: severity || 'medium',
      status: normalizedStatus,
      startDate, dueDate,
      estimatedHours: estimatedHours || 0,
      progress: progress || 0,
      tags: Array.isArray(tags) ? tags : [],
      isSelfTask,
      taskCode,
      activityLogs: [{ action: 'Task Created', performedBy: req.user._id, details: `Task "${title}" created.` }],
    });

    if (!isSelfTask) {
      notify(effAssignedTo, 'task_assigned', 'New Task Assigned', `You have been assigned: "${title}"`,
        priority === 'critical' ? 'urgent' : 'normal', taskDoc);
      socketService.emitToUser(effAssignedTo, 'task_assigned', taskDoc);
    }

    socketService.emitToUser(req.user._id, 'task_created', taskDoc);

    res.status(201).json({ success: true, data: await populate(Task.findById(taskDoc._id)) });
  } catch (e) {
    console.error('Task creation error:', e);
    if (e.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: Object.values(e.errors).map(err => err.message).join(', ') });
    }
    next(e);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    if (!taskId || taskId === 'undefined' || taskId === 'null') {
      return res.status(400).json({ success: false, message: 'Invalid task ID' });
    }

    const { query: baseQ } = await scopedQuery(req.user);
    const task = await Task.findOne({ _id: taskId, ...baseQ, deletedAt: { $exists: false } });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const permission = await getEditPermission(task, req.user);
    if (!permission) return res.status(403).json({ success: false, message: 'Not authorized to update this task' });

    if (permission === 'status_only') {
      const allowed = ['status'];
      Object.keys(req.body).forEach(k => {
        if (!allowed.includes(k)) delete req.body[k];
      });
    }

    const { assignedTo, status, ...rest } = req.body;
    const normalizedStatus = normalizeStatus(status);

    if (assignedTo !== undefined && String(assignedTo) !== String(task.assignedTo)) {
      if (!(await canAssignTo(req.user, assignedTo, task.project))) {
        return res.status(403).json({ success: false, message: 'Not authorized to reassign to this user' });
      }
      pushActivity(task, 'reassigned', req.user._id, `→ ${assignedTo}`);
      task.assignedTo = assignedTo;
      task.assignedBy = req.user._id;
      task.isSelfTask = String(assignedTo) === String(req.user._id);
      await notify(assignedTo, 'task_reassigned', 'Task Reassigned', `"${task.title}" reassigned to you.`,
        task.priority === 'Critical' ? 'urgent' : 'normal', task);
      socketService.emitToUser(assignedTo, 'task_assigned', task);
    }

    if (normalizedStatus !== undefined && normalizedStatus !== task.status) {
      if (!canTransition(task.status, normalizedStatus)) {
        return res.status(400).json({ success: false, message: `Cannot transition from "${task.status}" to "${normalizedStatus}"` });
      }
      pushActivity(task, 'status_changed', req.user._id, `${task.status} → ${normalizedStatus}`);
      task.status = normalizedStatus;
      if (normalizedStatus === 'completed') { task.completedDate = new Date(); task.progress = 100; }
      else if (terminal(normalizedStatus) && !terminal(task.status)) {}

      if (String(task.createdBy) !== String(req.user._id)) {
        await notify(task.createdBy, 'task_status_changed', 'Task Status Updated',
          `"${task.title}" moved to ${normalizedStatus} by ${req.user.email || req.user.name}`,
          normalizedStatus === 'completed' ? 'normal' : 'normal', task);
      }
    }

    const participants = [task.assignedTo, task.createdBy].filter(id => id && String(id) !== String(req.user._id));
    participants.forEach(userId => {
      socketService.emitToUser(userId, 'task_updated', task);
    });

    if (rest.priority) rest.priority = String(rest.priority).toLowerCase();
    if (rest.taskType) rest.taskType = String(rest.taskType).toLowerCase().replace(/\s+/g, '_');
    if (rest.severity) rest.severity = String(rest.severity).toLowerCase();

    const MUTABLE = ['title', 'description', 'priority', 'severity', 'taskType', 'category', 'startDate', 'dueDate', 'slaDeadline',
      'completedDate', 'estimatedHours', 'actualHours', 'progress', 'notes', 'sprint', 'milestone',
      'escalationLevel', 'isTeamTask', 'project', 'finding', 'report', 'linkedReport', 'linkedFinding',
      'linkedProject', 'assets', 'tags', 'labels', 'dependencies', 'reminders', 'checklist', 'recurrence', 'workLogs', 'sla'];

    MUTABLE.forEach(f => {
      if (rest[f] !== undefined) { // eslint-disable-line security/detect-object-injection -- f from hardcoded MUTABLE whitelist
        try {
          task[f] = rest[f]; // eslint-disable-line security/detect-object-injection -- f from hardcoded MUTABLE whitelist
        } catch (_) {}
      }
    });

    pushActivity(task, 'field_updated', req.user._id, 'Fields patched');
    await task.save();

    await AuditLog.create({
      user: req.user._id, action: 'update_task', entityType: 'task',
      entityId: task._id.toString(), entityName: task.title,
      ipAddress: req.ip, userAgent: req.get('User-Agent'), status: 'success',
    });

    res.status(200).json({ success: true, data: await populate(Task.findById(task._id)) });
  } catch (e) {
    console.error('Task update error:', e);
    if (e.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: Object.values(e.errors).map(err => err.message).join(', ') });
    }
    if (e.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
    res.status(500).json({ success: false, message: 'Internal server error updating task' });
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const { query } = await scopedQuery(req.user);
    const task = await Task.findOne({ _id: req.params.id, ...query, deletedAt: { $exists: false } });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (String(task.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the task creator can delete this task' });
    }
    task.deletedAt = new Date(); task.deletedBy = req.user._id; task.isArchived = true;
    pushActivity(task, 'deleted', req.user._id, 'Archived');
    await task.save();
    await AuditLog.create({
      user: req.user._id, action: 'delete_task', entityType: 'task',
      entityId: task._id.toString(), entityName: task.title,
      ipAddress: req.ip, userAgent: req.get('User-Agent'), status: 'success',
    });
    res.status(200).json({ success: true, message: 'Task deleted' });
  } catch (e) { next(e); }
};

exports.addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Comment text required' });
    const { query } = await scopedQuery(req.user);
    const task = await Task.findOne({ _id: req.params.id, ...query, deletedAt: { $exists: false } });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    task.comments.push({ user: req.user._id, text: text.trim() });
    pushActivity(task, 'comment', req.user._id, 'Comment added');
    await task.save();
    if (String(task.assignedTo) !== String(req.user._id)) {
      await notify(task.assignedTo, 'task_comment', 'New Comment', `"${task.title}" has a new comment.`, 'normal', task);
    }
    res.status(200).json({ success: true, data: { comments: task.comments } });
  } catch (e) { next(e); }
};

exports.uploadAttachment = async (req, res, next) => {
  try {
    const { query } = await scopedQuery(req.user);
    const task = await Task.findOne({ _id: req.params.id, ...query, deletedAt: { $exists: false } });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    task.attachments.push({
      name: req.file.originalname, path: buildFileUrl('evidence', req.file.filename),
      uploadedBy: req.user._id, uploadedAt: new Date(), size: req.file.size, mimeType: req.file.mimetype,
    });
    pushActivity(task, 'attachment', req.user._id, `File "${req.file.originalname}" uploaded`);
    await task.save();
    res.status(200).json({ success: true, data: { attachments: task.attachments } });
  } catch (e) { next(e); }
};

exports.startTask = async (req, res, next) => {
  try {
    const { query } = await scopedQuery(req.user);
    const task = await Task.findOne({ _id: req.params.id, ...query, deletedAt: { $exists: false } });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (String(task.assignedTo) !== String(req.user._id) && !isAdmin(req.user)) return res.status(403).json({ success: false, message: 'Only the assignee can start this task' });
    if (!canTransition(task.status, 'in_progress')) return res.status(400).json({ success: false, message: `Cannot start from "${task.status}"` });
    task.status = 'in_progress'; task.startDate = task.startDate || new Date();
    pushActivity(task, 'started', req.user._id, 'Task started');
    await task.save();
    socketService.emitToUser(task.createdBy, 'task_updated', task);
    res.status(200).json({ success: true, message: 'Started', data: await populate(Task.findById(task._id)) });
  } catch (e) { next(e); }
};

exports.completeTask = async (req, res, next) => {
  try {
    const { query } = await scopedQuery(req.user);
    const task = await Task.findOne({ _id: req.params.id, ...query, deletedAt: { $exists: false } });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (String(task.assignedTo) !== String(req.user._id) && !isAdmin(req.user)) return res.status(403).json({ success: false, message: 'Only the assignee can complete this task' });
    if (!canTransition(task.status, 'completed')) return res.status(400).json({ success: false, message: `Cannot complete from "${task.status}"` });
    task.status = 'completed'; task.completedDate = new Date(); task.progress = 100;
    pushActivity(task, 'completed', req.user._id, 'Task completed');
    await task.save();
    if (String(task.createdBy) !== String(req.user._id)) await notify(task.createdBy, 'task_completed', 'Task Completed', `"${task.title}" is done.`, 'normal', task);
    res.status(200).json({ success: true, message: 'Completed', data: await populate(Task.findById(task._id)) });
  } catch (e) { next(e); }
};

exports.reopenTask = async (req, res, next) => {
  try {
    const { query } = await scopedQuery(req.user);
    const task = await Task.findOne({ _id: req.params.id, ...query, deletedAt: { $exists: false } });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (!isAdmin(req.user) && !hasGlobalAccess(req.user) && String(task.createdBy) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Only Admin or creator can reopen' });
    if (!canTransition(task.status, 'reopened')) return res.status(400).json({ success: false, message: `Cannot reopen from "${task.status}"` });
    task.status = 'reopened'; task.completedDate = undefined; task.progress = 0;
    pushActivity(task, 'reopened', req.user._id, 'Task reopened');
    await task.save();
    res.status(200).json({ success: true, message: 'Reopened', data: await populate(Task.findById(task._id)) });
  } catch (e) { next(e); }
};

exports.escalateTask = async (req, res, next) => {
  try {
    const { query } = await scopedQuery(req.user);
    const task = await Task.findOne({ _id: req.params.id, ...query, deletedAt: { $exists: false } });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (!isAdmin(req.user) && !isVapt(req.user) && String(task.assignedTo) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Only Admin, VAPT lead, or assignee can escalate' });
    if (!canTransition(task.status, 'escalated')) return res.status(400).json({ success: false, message: `Cannot escalate from "${task.status}"` });
    task.escalationLevel = (task.escalationLevel || 0) + 1;
    task.status = 'escalated';
    pushActivity(task, 'escalated', req.user._id, `Escalated (level ${task.escalationLevel})`);
    await task.save();
    const admins = await User.find({ role: { $in: ['admin', 'super_admin', 'vapt_analyst', 'vapt_tl'] }, isActive: true }).select('_id');
    const pm = task.project ? await Project.findById(task.project).select('manager') : null;
    const recipients = [...admins.map(a => a._id), pm?.manager].filter(Boolean);
    if (recipients.length) await Notification.insertMany(recipients.map(r => ({
      recipient: r, type: 'task_escalated', title: 'Task Escalated',
      message: `"${task.title}" escalated.`, priority: 'urgent',
      relatedEntity: { type: 'task', id: task._id },
      actionUrl: `/tasks/${task._id}`,
      redirectUrl: `/tasks/${task._id}`,
      entityType: 'task',
      entityId: task._id.toString(),
    })));
    res.status(200).json({ success: true, data: await populate(Task.findById(task._id)) });
  } catch (e) { next(e); }
};

exports.rotateCompletedTasks = async (req, res, next) => {
  try {
    const MAX_COMPLETED = 100;
    const completedCount = await Task.countDocuments({ status: 'completed', deletedAt: { $exists: false } });

    if (completedCount <= MAX_COMPLETED) {
      return res.status(200).json({ success: true, message: 'No rotation needed', rotated: 0 });
    }

    const excess = completedCount - MAX_COMPLETED;
    const oldestCompleted = await Task.find({ status: 'completed', deletedAt: { $exists: false } })
      .sort({ completedDate: 1, createdAt: 1 })
      .limit(excess)
      .select('_id title');

    const ids = oldestCompleted.map(t => t._id);
    await Task.updateMany(
      { _id: { $in: ids } },
      { $set: { status: 'queued', completedDate: null, progress: 0 } }
    );

    const tasks = await Task.find({ _id: { $in: ids } });
    for (const task of tasks) {
      pushActivity(task, 'rotated', req.user._id, 'Auto-rotated from completed → queued (limit reached)');
      await task.save();
    }

    res.status(200).json({ success: true, message: `Rotated ${ids.length} completed tasks to queued`, rotated: ids.length });
  } catch (e) { next(e); }
};

exports.getTaskAnalytics = async (req, res, next) => {
  try {
    const { query: baseQuery } = await scopedQuery(req.user);
    const tasks = await Task.find({ ...baseQuery, deletedAt: { $exists: false } })
      .populate('project', 'name')
      .lean();

    const now = new Date();

    const initStatusMap = () => ({
      queued: 0, pending: 0, in_progress: 0, blocked: 0,
      review: 0, completed: 0, cancelled: 0, reopened: 0, escalated: 0,
    });

    const byStatus = initStatusMap();
    const byPriority = { Critical: 0, High: 0, Medium: 0, Low: 0, Informational: 0 };
    const byType = {};
    const byProject = {};

    const myTasksByStatus = initStatusMap();
    let myTotal = 0;

    tasks.forEach(t => {
      const status = t.status || 'pending';
      const priority = t.priority || 'Medium';
      const type = t.taskType || 'Miscellaneous';
      const projectName = t.project?.name || 'Unassigned';

      if (Object.prototype.hasOwnProperty.call(byStatus, status)) {
        byStatus[status]++; // eslint-disable-line security/detect-object-injection
      } else {
        byStatus[status] = (byStatus[status] || 0) + 1; // eslint-disable-line security/detect-object-injection
      }

      if (Object.prototype.hasOwnProperty.call(byPriority, priority)) {
        byPriority[priority]++; // eslint-disable-line security/detect-object-injection
      }

      byType[type] = (byType[type] || 0) + 1; // eslint-disable-line security/detect-object-injection
      byProject[projectName] = (byProject[projectName] || 0) + 1; // eslint-disable-line security/detect-object-injection

      if (String(t.assignedTo) === String(req.user._id)) {
        myTotal++;
        if (Object.prototype.hasOwnProperty.call(myTasksByStatus, status)) {
          myTasksByStatus[status]++; // eslint-disable-line security/detect-object-injection
        }
      }
    });

    const total = tasks.length;
    const completed = (byStatus.completed || 0);

    const overdue = tasks.filter(t =>
      t.slaDeadline &&
      new Date(t.slaDeadline) < now &&
      !['completed', 'cancelled', 'closed'].includes(t.status)
    ).length;

    const atRisk = tasks.filter(t =>
      t.slaDeadline &&
      !['completed', 'cancelled', 'closed'].includes(t.status) &&
      ((new Date(t.slaDeadline) - now) / 86400000) >= 0 &&
      ((new Date(t.slaDeadline) - now) / 86400000) <= 3
    ).length;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total, completed,
          open: total - completed - (byStatus.cancelled || 0),
          pending: (byStatus.pending || 0) + (byStatus.queued || 0),
          inProgress: byStatus.in_progress || 0,
          overdue, atRisk,
          completionRate: total ? Math.round((completed / total) * 100) : 0,
          escalated: byStatus.escalated || 0,
        },
        byStatus, byPriority, byType, byProject,
        personal: {
          total: myTotal,
          byStatus: myTasksByStatus,
          completionRate: myTotal ? Math.round(((myTasksByStatus.completed || 0) / myTotal) * 100) : 0,
        },
      },
    });
  } catch (e) { next(e); }
};
