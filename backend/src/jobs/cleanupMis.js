const MisEntry = require('../models/Mis');

const cleanupOldMisEntries = async () => {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 12);
  try {
    const result = await MisEntry.deleteMany({ date: { $lt: cutoff } });
    if (result.deletedCount > 0) {
      console.log(`[Cleanup] Deleted ${result.deletedCount} MIS entries older than 12 months`);
    }
  } catch (err) {
    console.error('[Cleanup] MIS cleanup error:', err.message);
  }
};

module.exports = cleanupOldMisEntries;
