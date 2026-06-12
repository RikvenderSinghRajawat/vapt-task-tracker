const Notification = require('../models/Notification');

const NOTIFICATION_RETENTION_DAYS = 14;

async function cleanupOldNotifications() {
  try {
    const cutoff = new Date(Date.now() - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const result = await Notification.updateMany(
      { createdAt: { $lt: cutoff }, deletedAt: null },
      { deletedAt: new Date(), deletedBy: null }
    );

    if (result.modifiedCount > 0) {
      console.log(`[Cleanup] Archived ${result.modifiedCount} notifications older than ${NOTIFICATION_RETENTION_DAYS} days`);
    }

    const permanentlyDeleted = await Notification.deleteMany({
      createdAt: { $lt: cutoff },
      deletedAt: { $ne: null }
    });

    if (permanentlyDeleted.deletedCount > 0) {
      console.log(`[Cleanup] Permanently deleted ${permanentlyDeleted.deletedCount} already-archived notifications`);
    }

    return result.modifiedCount + permanentlyDeleted.deletedCount;
  } catch (error) {
    console.error('[Cleanup] Notification cleanup failed:', error.message);
    return 0;
  }
}

module.exports = cleanupOldNotifications;
