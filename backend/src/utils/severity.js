'use strict';

const CVSS_SEVERITY_MAP = [
  { max: 0.0, label: 'info' },
  { max: 3.9, label: 'low' },
  { max: 6.9, label: 'medium' },
  { max: 8.9, label: 'high' },
  { max: 10.0, label: 'critical' },
];

function cvssToSeverity(cvssScore) {
  if (cvssScore === null || cvssScore === undefined || cvssScore === '') return null;
  const score = parseFloat(cvssScore);
  if (isNaN(score) || score < 0 || score > 10) return null;
  for (const entry of CVSS_SEVERITY_MAP) {
    if (score <= entry.max) return entry.label;
  }
  return 'critical';
}

function severityFromBody(body) {
  if (body.cvssScore !== undefined && body.cvssScore !== null && body.cvssScore !== '') {
    const sev = cvssToSeverity(body.cvssScore);
    if (sev) return sev;
  }
  if (body.cvss && body.cvss.score !== undefined) {
    const sev = cvssToSeverity(body.cvss.score);
    if (sev) return sev;
  }
  if (body.severity) return body.severity;
  return 'medium';
}

const SEVERITY_COLORS = new Map([
  ['critical', '#dc2626'],
  ['high', '#ea580c'],
  ['medium', '#ca8a04'],
  ['low', '#16a34a'],
  ['info', '#0891b2'],
]);

const SEVERITY_BG_COLORS = new Map([
  ['critical', 'rgba(220, 38, 38, 0.15)'],
  ['high', 'rgba(234, 88, 12, 0.15)'],
  ['medium', 'rgba(202, 138, 4, 0.15)'],
  ['low', 'rgba(22, 163, 74, 0.15)'],
  ['info', 'rgba(8, 145, 178, 0.15)'],
]);

function getSeverityColor(severity) {
  return SEVERITY_COLORS.get(severity) || '#64748b';
}

function getSeverityBgColor(severity) {
  return SEVERITY_BG_COLORS.get(severity) || 'rgba(100, 116, 139, 0.15)';
}

const ACTIVE_SEVERITY_STATUSES = ['open', 'in_progress', 'reopened', 'under_review'];
const CLOSED_SEVERITY_STATUSES = ['closed', 'resolved', 'verified', 'accepted_risk', 'duplicate'];

function isActiveStatus(status) {
  return ACTIVE_SEVERITY_STATUSES.includes((status || '').toLowerCase());
}

function isClosedStatus(status) {
  return CLOSED_SEVERITY_STATUSES.includes((status || '').toLowerCase());
}

module.exports = {
  CVSS_SEVERITY_MAP,
  cvssToSeverity,
  severityFromBody,
  getSeverityColor,
  getSeverityBgColor,
  ACTIVE_SEVERITY_STATUSES,
  CLOSED_SEVERITY_STATUSES,
  isActiveStatus,
  isClosedStatus,
};
