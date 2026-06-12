const cleanupExpiredItems = require('./cleanupRecycleBin');
const monitorSla = require('./slaMonitor');
const cleanupOldMisEntries = require('./cleanupMis');
const cleanupDeletedNotes = require('./cleanupNotes');
const cleanupOldNotifications = require('./cleanupNotifications');
const { checkAndNotify } = require('../services/vaptCalendarNotificationService');

const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const SLA_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const MIS_CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
const NOTES_CLEANUP_INTERVAL_MS = 3 * 60 * 60 * 1000;
const NOTIFICATION_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const VAPT_CALENDAR_INTERVAL_MS = 60 * 60 * 1000;

function startScheduler() {
  cleanupExpiredItems();
  monitorSla();
  cleanupOldMisEntries();
  cleanupDeletedNotes();
  cleanupOldNotifications();
  checkAndNotify();
  setInterval(cleanupExpiredItems, CHECK_INTERVAL_MS);
  setInterval(monitorSla, SLA_CHECK_INTERVAL_MS);
  setInterval(cleanupOldMisEntries, MIS_CLEANUP_INTERVAL_MS);
  setInterval(cleanupDeletedNotes, NOTES_CLEANUP_INTERVAL_MS);
  setInterval(cleanupOldNotifications, NOTIFICATION_CLEANUP_INTERVAL_MS);
  setInterval(checkAndNotify, VAPT_CALENDAR_INTERVAL_MS);
  console.log(`[Scheduler] Recycle bin cleanup job started (runs every ${CHECK_INTERVAL_MS / 60000} minutes)`);
  console.log(`[Scheduler] SLA monitor started (runs every ${SLA_CHECK_INTERVAL_MS / 60000} minutes)`);
  console.log(`[Scheduler] MIS cleanup job started (runs every ${MIS_CLEANUP_INTERVAL_MS / 3600000} hours)`);
  console.log(`[Scheduler] Notes cleanup job started (runs every ${NOTES_CLEANUP_INTERVAL_MS / 3600000} hours)`);
  console.log(`[Scheduler] Notification cleanup started (runs every ${NOTIFICATION_CLEANUP_INTERVAL_MS / 3600000} hours)`);
  console.log(`[Scheduler] VAPT Calendar notification check started (runs every ${VAPT_CALENDAR_INTERVAL_MS / 3600000} hours)`);
}

module.exports = { startScheduler };
