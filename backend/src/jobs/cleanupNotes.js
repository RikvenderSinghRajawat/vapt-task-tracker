const Note = require('../models/Note');

const cleanupDeletedNotes = async () => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 15); // 15 days retention
  try {
    const result = await Note.deleteMany({ deletedAt: { $lte: cutoff } });
    if (result.deletedCount > 0) {
      console.log(`[Cleanup] Permanently deleted ${result.deletedCount} notes older than 15 days from recycle bin`);
    }
  } catch (err) {
    console.error('[Cleanup] Notes cleanup error:', err.message);
  }
};

module.exports = cleanupDeletedNotes;