/**
 * Formatters Utility - Common formatting functions
 */

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted date
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '-';
  
  const {
    format = 'medium', // 'short', 'medium', 'long', 'relative'
    includeTime = false,
    locale = 'en-US'
  } = options;
  
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) return '-';
  
  if (format === 'relative') {
    return formatRelativeTime(dateObj);
  }
  
  const formatOptions = {
    short: { month: 'short', day: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric', weekday: 'long' }
  };
  
  const opts = formatOptions[format] || formatOptions.medium;
  
  if (includeTime) {
    opts.hour = '2-digit';
    opts.minute = '2-digit';
  }
  
  return dateObj.toLocaleDateString(locale, opts);
};

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
  if (!date) return '-';
  
  const dateObj = new Date(date);
  const now = new Date();
  const diffMs = now - dateObj;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
};

/**
 * Format number with separators
 * @param {number} num - Number to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted number
 */
export const formatNumber = (num, options = {}) => {
  if (num == null) return '-';
  
  const {
    decimals = 0,
    prefix = '',
    suffix = '',
    compact = false
  } = options;
  
  const numValue = parseFloat(num);
  if (isNaN(numValue)) return '-';
  
  if (compact && numValue >= 1000) {
    const suffixes = ['', 'K', 'M', 'B', 'T'];
    const suffixIndex = Math.floor(Math.log10(numValue) / 3);
    const shortValue = (numValue / Math.pow(1000, suffixIndex)).toFixed(decimals);
    return `${prefix}${shortValue}${suffixes[suffixIndex]}${suffix}`;
  }
  
  return `${prefix}${numValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}${suffix}`;
};

/**
 * Format file size
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted size
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

/**
 * Format duration
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration
 */
export const formatDuration = (minutes) => {
  if (!minutes || minutes < 0) return '-';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (days > 0) {
    return `${days}d ${remainingHours}h ${mins}m`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength).trim()}...`;
};

/**
 * Format finding ID
 * @param {string} id - Finding ID
 * @returns {string} Formatted ID
 */
export const formatFindingId = (id) => {
  if (!id) return '-';
  return id.toString().toUpperCase();
};

/**
 * Format user name
 * @param {object} user - User object
 * @returns {string} Formatted name
 */
export const formatUserName = (user) => {
  if (!user) return '-';
  return user.name || user.displayName || user.email || 'Unknown';
};

/**
 * Format role for display
 * @param {string} role - Role string
 * @returns {string} Formatted role
 */
export const formatRole = (role) => {
  if (!role) return '-';
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Format severity for display
 * @param {string} severity - Severity level
 * @returns {string} Formatted severity
 */
export const formatSeverity = (severity) => {
  if (!severity) return '-';
  return severity.charAt(0).toUpperCase() + severity.slice(1);
};

/**
 * Format status for display
 * @param {string} status - Status level
 * @returns {string} Formatted status
 */
export const formatStatus = (status) => {
  if (!status) return '-';
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Format percentage
 * @param {number} value - Value (0-1 or 0-100)
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value == null) return '-';
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return '-';
  
  // Assume value is 0-1 if less than 1, otherwise 0-100
  const normalizedValue = numValue <= 1 ? numValue * 100 : numValue;
  
  return `${normalizedValue.toFixed(decimals)}%`;
};

/**
 * Format currency
 * @param {number} amount - Amount
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency
 */
export const formatCurrency = (amount, currency = 'USD') => {
  if (amount == null) return '-';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
};

/**
 * Format phone number
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone
 */
export const formatPhone = (phone) => {
  if (!phone) return '-';
  
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

/**
 * Format list to string
 * @param {array} items - Array of items
 * @param {string} separator - Separator
 * @returns {string} Formatted list
 */
export const formatList = (items, separator = ', ') => {
  if (!items || items.length === 0) return '-';
  return items.join(separator);
};

/**
 * Format multiline text to HTML
 * @param {string} text - Text with newlines
 * @returns {string} HTML string
 */
export const formatMultiline = (text) => {
  if (!text) return '';
  return text.replace(/\n/g, '<br />');
};

export default {
  formatDate,
  formatRelativeTime,
  formatNumber,
  formatFileSize,
  formatDuration,
  truncateText,
  formatFindingId,
  formatUserName,
  formatRole,
  formatSeverity,
  formatStatus,
  formatPercentage,
  formatCurrency,
  formatPhone,
  formatList,
  formatMultiline
};
