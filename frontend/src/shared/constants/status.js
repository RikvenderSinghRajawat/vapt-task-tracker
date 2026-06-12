/**
 * Status Constants - Single source of truth for status levels
 */

export const STATUS_LEVELS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  FIXED: 'fixed',
  CLOSED: 'closed',
  REOPENED: 'reopened'
};

export const STATUS_CONFIG = {
  [STATUS_LEVELS.OPEN]: {
    label: 'Open',
    shortLabel: 'OPEN',
    color: '#F0883E',
    bgColor: 'rgba(240, 136, 62, 0.15)',
    borderColor: 'rgba(240, 136, 62, 0.3)',
    icon: '🔓',
    description: 'Finding is open and needs attention',
    isActive: true,
    order: 1
  },
  [STATUS_LEVELS.IN_PROGRESS]: {
    label: 'In Progress',
    shortLabel: 'PROG',
    color: '#58A6FF',
    bgColor: 'rgba(88, 166, 255, 0.15)',
    borderColor: 'rgba(88, 166, 255, 0.3)',
    icon: '🔄',
    description: 'Remediation is in progress',
    isActive: true,
    order: 2
  },
  [STATUS_LEVELS.FIXED]: {
    label: 'Fixed',
    shortLabel: 'FIXED',
    color: '#3FB950',
    bgColor: 'rgba(63, 185, 80, 0.15)',
    borderColor: 'rgba(63, 185, 80, 0.3)',
    icon: '✅',
    description: 'Fix has been implemented',
    isActive: false,
    order: 3
  },
  [STATUS_LEVELS.CLOSED]: {
    label: 'Closed',
    shortLabel: 'CLOSED',
    color: '#6E7681',
    bgColor: 'rgba(110, 118, 129, 0.15)',
    borderColor: 'rgba(110, 118, 129, 0.3)',
    icon: '🔒',
    description: 'Finding has been verified and closed',
    isActive: false,
    order: 4
  },
  [STATUS_LEVELS.REOPENED]: {
    label: 'Reopened',
    shortLabel: 'REOPEN',
    color: '#D73A49',
    bgColor: 'rgba(215, 58, 73, 0.15)',
    borderColor: 'rgba(215, 58, 73, 0.3)',
    icon: '🔁',
    description: 'Previously closed finding has been reopened',
    isActive: true,
    order: 5
  }
};

/**
 * Get status config by level
 * @param {string} status - Status level
 * @returns {object} status configuration
 */
export const getStatusConfig = (status) => {
  return STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG[STATUS_LEVELS.OPEN];
};

/**
 * Get all status levels sorted by order
 * @returns {array} ordered status levels
 */
export const getOrderedStatuses = () => {
  return Object.values(STATUS_CONFIG)
    .sort((a, b) => a.order - b.order)
    .map(config => ({
      value: Object.keys(STATUS_CONFIG).find(key => STATUS_CONFIG[key] === config),
      ...config
    }));
};

/**
 * Get only active statuses (not closed/fixed)
 * @returns {array} active statuses
 */
export const getActiveStatuses = () => {
  return getOrderedStatuses().filter(s => s.isActive);
};

/**
 * Calculate status statistics from findings
 * @param {array} findings - Array of finding objects
 * @returns {object} status counts
 */
export const calculateStatusStats = (findings = []) => {
  const stats = {
    open: 0,
    in_progress: 0,
    fixed: 0,
    closed: 0,
    reopened: 0,
    total: findings.length,
    active: 0,
    resolved: 0
  };
  
  findings.forEach(finding => {
    const status = finding.status?.toLowerCase();
    if (stats.hasOwnProperty(status)) {
      stats[status]++;
    }
    
    const config = getStatusConfig(status);
    if (config.isActive) {
      stats.active++;
    } else {
      stats.resolved++;
    }
  });
  
  return stats;
};

/**
 * Check if a status transition is valid
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @param {string} userRole - Role of user attempting transition
 * @returns {boolean} whether transition is allowed
 */
export const isValidStatusTransition = (fromStatus, toStatus, userRole) => {
  const validTransitions = {
    [STATUS_LEVELS.OPEN]: [STATUS_LEVELS.IN_PROGRESS, STATUS_LEVELS.CLOSED],
    [STATUS_LEVELS.IN_PROGRESS]: [STATUS_LEVELS.FIXED, STATUS_LEVELS.OPEN],
    [STATUS_LEVELS.FIXED]: [STATUS_LEVELS.CLOSED, STATUS_LEVELS.REOPENED],
    [STATUS_LEVELS.CLOSED]: [STATUS_LEVELS.REOPENED],
    [STATUS_LEVELS.REOPENED]: [STATUS_LEVELS.IN_PROGRESS, STATUS_LEVELS.OPEN, STATUS_LEVELS.CLOSED]
  };
  
  // Admin/VAPT can force any transition
  if (userRole === 'admin' || userRole === 'vapt_analyst') {
    return true;
  }
  
  const allowed = validTransitions[fromStatus?.toLowerCase()] || [];
  return allowed.includes(toStatus?.toLowerCase());
};

export default {
  STATUS_LEVELS,
  STATUS_CONFIG,
  getStatusConfig,
  getOrderedStatuses,
  getActiveStatuses,
  calculateStatusStats,
  isValidStatusTransition
};
