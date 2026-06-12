/**
 * Severity Constants - Single source of truth for severity levels
 */

export const SEVERITY_LEVELS = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info'
};

export const SEVERITY_CONFIG = {
  [SEVERITY_LEVELS.CRITICAL]: {
    label: 'Critical',
    shortLabel: 'CRIT',
    color: '#D73A49',
    bgColor: 'rgba(215, 58, 73, 0.15)',
    borderColor: 'rgba(215, 58, 73, 0.3)',
    icon: '🔴',
    priority: 1,
    cvssRange: [9.0, 10.0],
    description: 'Immediate action required'
  },
  [SEVERITY_LEVELS.HIGH]: {
    label: 'High',
    shortLabel: 'HIGH',
    color: '#F0883E',
    bgColor: 'rgba(240, 136, 62, 0.15)',
    borderColor: 'rgba(240, 136, 62, 0.3)',
    icon: '🟠',
    priority: 2,
    cvssRange: [7.0, 8.9],
    description: 'Fix as soon as possible'
  },
  [SEVERITY_LEVELS.MEDIUM]: {
    label: 'Medium',
    shortLabel: 'MED',
    color: '#DBAB09',
    bgColor: 'rgba(219, 171, 9, 0.15)',
    borderColor: 'rgba(219, 171, 9, 0.3)',
    icon: '🟡',
    priority: 3,
    cvssRange: [4.0, 6.9],
    description: 'Fix in next release'
  },
  [SEVERITY_LEVELS.LOW]: {
    label: 'Low',
    shortLabel: 'LOW',
    color: '#3FB950',
    bgColor: 'rgba(63, 185, 80, 0.15)',
    borderColor: 'rgba(63, 185, 80, 0.3)',
    icon: '🟢',
    priority: 4,
    cvssRange: [0.1, 3.9],
    description: 'Fix when convenient'
  },
  [SEVERITY_LEVELS.INFO]: {
    label: 'Info',
    shortLabel: 'INFO',
    color: '#58A6FF',
    bgColor: 'rgba(88, 166, 255, 0.15)',
    borderColor: 'rgba(88, 166, 255, 0.3)',
    icon: '🔵',
    priority: 5,
    cvssRange: [0.0, 0.0],
    description: 'Informational'
  }
};

/**
 * Get severity from CVSS score
 * @param {number} cvssScore - CVSS v3.1 score (0-10)
 * @returns {string} severity level
 */
export const getSeverityFromCvss = (cvssScore) => {
  const score = parseFloat(cvssScore);
  if (isNaN(score)) return SEVERITY_LEVELS.INFO;
  
  if (score >= 9.0) return SEVERITY_LEVELS.CRITICAL;
  if (score >= 7.0) return SEVERITY_LEVELS.HIGH;
  if (score >= 4.0) return SEVERITY_LEVELS.MEDIUM;
  if (score > 0) return SEVERITY_LEVELS.LOW;
  return SEVERITY_LEVELS.INFO;
};

/**
 * Get severity config by level
 * @param {string} severity - Severity level
 * @returns {object} severity configuration
 */
export const getSeverityConfig = (severity) => {
  return SEVERITY_CONFIG[severity?.toLowerCase()] || SEVERITY_CONFIG[SEVERITY_LEVELS.INFO];
};

/**
 * Get all severity levels sorted by priority
 * @returns {array} ordered severity levels
 */
export const getOrderedSeverities = () => {
  return Object.values(SEVERITY_CONFIG)
    .sort((a, b) => a.priority - b.priority)
    .map(config => ({
      value: Object.keys(SEVERITY_CONFIG).find(key => SEVERITY_CONFIG[key] === config),
      ...config
    }));
};

/**
 * Calculate severity statistics from findings
 * @param {array} findings - Array of finding objects
 * @returns {object} severity counts
 */
export const calculateSeverityStats = (findings = []) => {
  const stats = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
    total: findings.length
  };
  
  findings.forEach(finding => {
    const severity = finding.severity?.toLowerCase();
    if (stats.hasOwnProperty(severity)) {
      stats[severity]++;
    }
  });
  
  return stats;
};

export default {
  SEVERITY_LEVELS,
  SEVERITY_CONFIG,
  getSeverityFromCvss,
  getSeverityConfig,
  getOrderedSeverities,
  calculateSeverityStats
};
