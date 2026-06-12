'use strict';

const SLA_HOURS = {
  critical: 24,
  high: 72,
  medium: 168,
  low: 720,
  info: 720,
};

const ACTIVE_STATUSES = ['open', 'in_progress', 'reopened', 'under_review'];
const RESOLVED_STATUSES = ['closed', 'resolved', 'verified', 'accepted_risk', 'duplicate'];

function calcDeadlineMs(finding) {
  const severity = String(finding.severity || '').toLowerCase();
  const hours = SLA_HOURS[severity];
  if (!hours) return null;
  const start = finding.assignedAt || finding.createdAt || finding.created_at || Date.now();
  return new Date(start).getTime() + hours * 60 * 60 * 1000;
}

function calculateSlaDeadline(finding) {
  const ms = calcDeadlineMs(finding);
  return ms ? new Date(ms) : null;
}

function calculateSlaStatus(finding) {
  const status = String(finding.status || '').toLowerCase();
  if (RESOLVED_STATUSES.includes(status)) return 'resolved';

  const deadline = finding.sla_deadline
    ? new Date(finding.sla_deadline)
    : calculateSlaDeadline(finding);
  if (!deadline || isNaN(deadline.getTime())) return 'on_track';

  const now = Date.now();
  const deadlineMs = deadline.getTime();
  const remaining = deadlineMs - now;

  if (remaining <= 0) return 'breached';

  const startMs = (finding.assignedAt || finding.createdAt || finding.created_at)
    ? new Date(finding.assignedAt || finding.createdAt || finding.created_at).getTime()
    : now;
  const totalWindow = deadlineMs - startMs;
  const pctRemaining = totalWindow > 0 ? remaining / totalWindow : 0;

  if (pctRemaining <= 0.25) return 'at_risk';
  return 'on_track';
}

function calculateSlaPercentage(finding) {
  const status = String(finding.status || '').toLowerCase();
  if (RESOLVED_STATUSES.includes(status)) return 100;

  const deadline = finding.sla_deadline
    ? new Date(finding.sla_deadline)
    : calculateSlaDeadline(finding);
  if (!deadline || isNaN(deadline.getTime())) return null;

  const now = Date.now();
  const deadlineMs = deadline.getTime();
  const remaining = deadlineMs - now;

  const startMs = (finding.assignedAt || finding.createdAt || finding.created_at)
    ? new Date(finding.assignedAt || finding.createdAt || finding.created_at).getTime()
    : now;
  const totalWindow = deadlineMs - startMs;

  if (totalWindow <= 0) return remaining <= 0 ? 0 : 100;

  const elapsed = now - startMs;
  const pct = Math.min(100, Math.max(0, (elapsed / totalWindow) * 100));
  return Math.round(pct);
}

function calculateRemainingMs(finding) {
  if (RESOLVED_STATUSES.includes(String(finding.status || '').toLowerCase())) return 0;
  const deadline = finding.sla_deadline
    ? new Date(finding.sla_deadline)
    : calculateSlaDeadline(finding);
  if (!deadline || isNaN(deadline.getTime())) return null;
  return deadline.getTime() - Date.now();
}

function applySlaFields(finding) {
  const deadline = finding.sla_deadline || calculateSlaDeadline(finding);
  return {
    ...(finding.toJSON ? finding.toJSON() : finding),
    sla_deadline: deadline,
    sla_status: calculateSlaStatus({ ...finding, sla_deadline: deadline }),
    sla_percentage: calculateSlaPercentage({ ...finding, sla_deadline: deadline }),
    sla_remaining_ms: calculateRemainingMs({ ...finding, sla_deadline: deadline }),
  };
}

module.exports = {
  SLA_HOURS,
  calculateSlaDeadline,
  calculateSlaStatus,
  calculateSlaPercentage,
  calculateRemainingMs,
  applySlaFields,
};
