/**
 * Sorting utilities for findings
 */

// Severity order (higher to lower priority)
const SEVERITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

// Closed statuses
const CLOSED_STATUSES = ['closed', 'verified', 'resolved', 'duplicate', 'accepted_risk'];

/**
 * Sort findings: open first (by severity), then closed (by severity)
 * @param {Array} findings - Array of findings to sort
 * @returns {Array} - Sorted array
 */
export const sortFindingsByStatusAndSeverity = (findings) => {
  if (!Array.isArray(findings)) return [];

  return [...findings].sort((a, b) => {
    const isAClosed = CLOSED_STATUSES.includes((a.status || '').toLowerCase());
    const isBClosed = CLOSED_STATUSES.includes((b.status || '').toLowerCase());

    // If one is open and one is closed, open comes first
    if (isAClosed !== isBClosed) {
      return isAClosed ? 1 : -1;
    }

    // Both are same status type, sort by severity
    const severityA = SEVERITY_ORDER[a.severity?.toLowerCase()] ?? 5;
    const severityB = SEVERITY_ORDER[b.severity?.toLowerCase()] ?? 5;

    return severityA - severityB;
  });
};

/**
 * Sort findings by severity only
 * @param {Array} findings - Array of findings to sort
 * @returns {Array} - Sorted array
 */
export const sortFindingsBySeverity = (findings) => {
  if (!Array.isArray(findings)) return [];

  return [...findings].sort((a, b) => {
    const severityA = SEVERITY_ORDER[a.severity?.toLowerCase()] ?? 5;
    const severityB = SEVERITY_ORDER[b.severity?.toLowerCase()] ?? 5;
    return severityA - severityB;
  });
};

export { CLOSED_STATUSES, SEVERITY_ORDER };
