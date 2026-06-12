const { Finding, Task, Project, User, Notification } = require('../models');
const { applySlaFields } = require('../services/slaService');


const OPEN_FINDING_STATUSES = ['open', 'in_progress', 'acknowledged', 'in_remediation', 'resolved'];
const OPEN_TASK_STATUSES = ['backlog', 'todo', 'in_progress', 'blocked', 'review'];

async function notifyOnce({ recipient, type, title, message, priority, relatedEntity, actionUrl, redirectUrl, entityType, entityId, uniqueTag }) {
  if (!recipient) return;
  const exists = await Notification.exists({
    recipient,
    type,
    'data.uniqueTag': uniqueTag,
    deletedAt: null
  });
  if (exists) return;

  await Notification.create({
    recipient,
    type,
    title,
    message,
    priority,
    relatedEntity,
    actionUrl,
    redirectUrl: redirectUrl || actionUrl,
    entityType,
    entityId,
    data: { uniqueTag },
    deliveryMethods: { inApp: true, email: false }
  });
}

async function monitorFindingSla() {
  const findings = await Finding.find({
    deletedAt: null,
    status: { $in: OPEN_FINDING_STATUSES }
  }).limit(500);

  let updated = 0;
  for (const finding of findings) {
    const previousStatus = finding.sla_status;
    const next = applySlaFields(finding.toObject());
    finding.sla_deadline = next.sla_deadline;
    finding.sla_status = next.sla_status;

    if (finding.isModified('sla_deadline') || finding.isModified('sla_status')) {
      await finding.save();
      updated++;
    }

    if (!['at_risk', 'breached'].includes(finding.sla_status)) continue;

    const project = await Project.findById(finding.project).select('name code manager');
    const recipients = [
      finding.assignee,
      ...(finding.assignedDevelopers || []),
      project?.manager,
      finding.escalationOwner
    ].filter(Boolean).map(id => id.toString());

    const admins = finding.sla_status === 'breached'
      ? await User.find({ role: { $in: ['admin', 'super_admin'] }, isActive: true, deletedAt: null }).select('_id')
      : [];
    admins.forEach(admin => recipients.push(admin._id.toString()));

    const uniqueRecipients = [...new Set(recipients)];
    const uniqueTag = `finding:${finding._id}:${finding.sla_status}`;
    await Promise.all(uniqueRecipients.map(recipient => notifyOnce({
      recipient,
      type: `sla_${finding.sla_status}`,
      title: finding.sla_status === 'breached' ? 'SLA breached' : 'SLA at risk',
      message: `${finding.title} is ${finding.sla_status.replace('_', ' ')}.`,
      priority: finding.sla_status === 'breached' ? 'urgent' : 'high',
      relatedEntity: { type: 'finding', id: finding._id },
      actionUrl: `/projects/${finding.project}/findings/${finding._id}`,
      redirectUrl: `/projects/${finding.project}/findings/${finding._id}`,
      entityType: 'finding',
      entityId: finding._id.toString(),
      uniqueTag
    })));


  }

  return updated;
}

async function monitorTaskSla() {
  const tasks = await Task.find({
    deletedAt: null,
    status: { $in: OPEN_TASK_STATUSES },
    slaDeadline: { $ne: null }
  }).limit(500);

  let updated = 0;
  for (const task of tasks) {
    const deadlineMs = new Date(task.slaDeadline).getTime();
    const remaining = deadlineMs - Date.now();
    const nextStatus = remaining <= 0 ? 'breached' : remaining <= 24 * 60 * 60 * 1000 ? 'at_risk' : 'on_track';
    if (task.slaStatus !== nextStatus) {
      task.slaStatus = nextStatus;
      task.activity = task.activity || [];
      task.activity.push({ action: `sla_${nextStatus}`, at: new Date() });
      await task.save();
      updated++;
    }

    if (!['at_risk', 'breached'].includes(task.slaStatus)) continue;
    const recipients = [task.assignedTo, task.assignedBy].filter(Boolean).map(id => id.toString());
    await Promise.all([...new Set(recipients)].map(recipient => notifyOnce({
      recipient,
      type: `task_sla_${task.slaStatus}`,
      title: task.slaStatus === 'breached' ? 'Task SLA breached' : 'Task SLA at risk',
      message: `${task.title} is ${task.slaStatus.replace('_', ' ')}.`,
      priority: task.slaStatus === 'breached' ? 'urgent' : 'high',
      relatedEntity: { type: 'task', id: task._id },
      actionUrl: '/my-tasks',
      redirectUrl: '/my-tasks',
      entityType: 'task',
      entityId: task._id.toString(),
      uniqueTag: `task:${task._id}:${task.slaStatus}`
    })));
  }

  return updated;
}

async function monitorSla() {
  try {
    const [findingsUpdated, tasksUpdated] = await Promise.all([monitorFindingSla(), monitorTaskSla()]);
    if (findingsUpdated || tasksUpdated) {
      console.log(`[Scheduler] SLA monitor updated findings=${findingsUpdated}, tasks=${tasksUpdated}`);
    }
  } catch (error) {
    console.error('[Scheduler] SLA monitor failed:', error.message);
  }
}

module.exports = monitorSla;
