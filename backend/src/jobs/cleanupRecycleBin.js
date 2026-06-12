const RETENTION_DAYS = 15;

module.exports = async function cleanupExpiredItems() {
  const { Project, Finding, Report, User, Milestone, Notification } = require('../models/sql');
  const QuarterlyAudit = require('../models/QuarterlyAudit');

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const filter = { deletedAt: { $ne: null, $lte: cutoff } };

  const models = [
    { model: Project, name: 'project' },
    { model: Finding, name: 'finding' },
    { model: Report, name: 'report' },
    { model: User, name: 'user' },
    { model: Milestone, name: 'milestone' },
    { model: Notification, name: 'notification' },
    { model: QuarterlyAudit, name: 'quarterly_audit' },
  ];

  for (const { model, name } of models) {
    try {
      const items = await model.find(filter);
      if (items.length === 0) continue;

      for (const item of items) {
        await model.findByIdAndDelete(item._id);
      }
      console.log(`[Cleanup] Permanently deleted ${items.length} expired ${name}(s)`);
    } catch (err) {
      console.error(`[Cleanup] Error deleting ${name}:`, err.message);
    }
  }
};
