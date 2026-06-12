const VaptCalendar = require('../models/VaptCalendar');
const Notification = require('../models/sql').Notification || require('mongoose').model('Notification');
const User = require('../models/sql').User || require('mongoose').model('User');
const { emitToUser } = require('./socketService');

const REMINDER_DAYS = [30, 15, 7, 1];

async function checkAndNotify() {
  const now = new Date();

  const entries = await VaptCalendar.find({
    deletedAt: null,
    nextVaptDueDate: { $ne: null }
  }).lean();

  for (const entry of entries) {
    if (!entry.nextVaptDueDate) continue;
    const due = new Date(entry.nextVaptDueDate);
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const alreadyNotifiedOverdue = await Notification.findOne({
        type: 'vapt_overdue',
        'data.calendarId': entry._id.toString(),
        createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      });
      if (!alreadyNotifiedOverdue) {
        await notifyAdminsAndVapt({
          type: 'vapt_overdue',
          title: 'VAPT Assessment Overdue',
          message: `"${entry.projectName}" VAPT assessment was due on ${entry.nextVaptDueDate.slice(0,10)}.`,
          calendarId: entry._id,
          projectName: entry.projectName
        });
      }
      continue;
    }

    if (REMINDER_DAYS.includes(diffDays)) {
      const alreadyNotified = await Notification.findOne({
        type: 'vapt_reminder',
        'data.calendarId': entry._id.toString(),
        'data.reminderDay': diffDays
      });
      if (!alreadyNotified) {
        await notifyAdminsAndVapt({
          type: 'vapt_reminder',
          title: `VAPT Due in ${diffDays} Day${diffDays > 1 ? 's' : ''}`,
          message: `"${entry.projectName}" VAPT assessment is due in ${diffDays} day${diffDays > 1 ? 's' : ''} (${entry.nextVaptDueDate.slice(0,10)}).`,
          calendarId: entry._id,
          projectName: entry.projectName,
          reminderDay: diffDays
        });
      }
    }
  }
}

async function notifyAdminsAndVapt({ type, title, message, calendarId, projectName, reminderDay }) {
  const adminUsers = await User.find({ role: { $in: ['admin', 'vapt_analyst'] }, active: true }).lean();
  for (const user of adminUsers) {
    const notification = await Notification.create({
      recipient: user._id,
      type,
      title,
      message,
      priority: type === 'vapt_overdue' ? 'high' : 'normal',
      entityType: 'VaptCalendar',
      entityId: calendarId.toString(),
      redirectUrl: '/vapt-calendar',
      data: { calendarId: calendarId.toString(), projectName, reminderDay, type },
      deliveryMethods: { inApp: true, email: false, slack: false },
      deliveryStatus: {
        inApp: { delivered: true, deliveredAt: new Date() },
        email: { sent: false },
        slack: { sent: false }
      }
    });
    emitToUser(user._id.toString(), 'notification', notification);
  }
}

module.exports = { checkAndNotify };
