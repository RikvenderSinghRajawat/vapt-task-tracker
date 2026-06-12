import { API_BASE_URL } from './apiBaseResolver';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

export const AUTH_CONFIG = {
  TOKEN_STORAGE_KEY: 'vapt_access_token',
  REFRESH_TOKEN_STORAGE_KEY: 'vapt_refresh_token',
  USER_STORAGE_KEY: 'vapt_user',
  TOKEN_REFRESH_INTERVAL: 15 * 60 * 1000,
};

export const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: true,
  ENABLE_REAL_TIME_UPDATES: true,
  ENABLE_BULK_OPERATIONS: true,
  ENABLE_EXPORT: true,
  ENABLE_AI_RECOMMENDATIONS: false,
  ENABLE_CUSTOM_DASHBOARDS: true,
};

export const UI_CONFIG = {
  ITEMS_PER_PAGE: 20,
  MAX_FILE_UPLOAD_SIZE: 52428800,
  ALLOWED_FILE_TYPES: ['pdf', 'docx', 'xlsx', 'csv', 'jpg', 'png', 'json', 'zip'],
  NOTIFICATION_TIMEOUT: 5000,
};

export const SEVERITY_LEVELS = {
  CRITICAL: { value: 5, color: '#FF0000', label: 'Critical' },
  HIGH: { value: 4, color: '#FF6B00', label: 'High' },
  MEDIUM: { value: 3, color: '#FFA500', label: 'Medium' },
  LOW: { value: 2, color: '#FFD700', label: 'Low' },
  INFO: { value: 1, color: '#00A0FF', label: 'Informational' },
};

export const PROJECT_STATUSES = {
  PLANNING: 'planning',
  RECEIVED: 'received',
  IN_PROGRESS: 'in_progress',
  REMEDIATION: 'remediation',
  RETEST: 'retest',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CLOSED: 'closed',
};

export const FINDING_STATUSES = {
  OPEN: 'open',
  ACKNOWLEDGED: 'acknowledged',
  IN_REMEDIATION: 'in_remediation',
  RESOLVED: 'resolved',
  VERIFIED: 'verified',
  DEFERRED: 'deferred',
  MITIGATED: 'mitigated',
  REJECTED: 'rejected',
};

export const CACHE_CONFIG = {
  PROJECT_TIMEOUT: 24 * 60 * 60 * 1000,
  FINDING_TIMEOUT: 24 * 60 * 60 * 1000,
  ANALYTICS_TIMEOUT: 60 * 60 * 1000,
  USER_TIMEOUT: 24 * 60 * 60 * 1000,
};
