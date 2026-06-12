import { API_BASE_URL } from '../config/apiBaseResolver';
import { AUTH_CONFIG } from '../config/api.config';
import { authStorage } from './authStorage';

const API_BASE = API_BASE_URL;


export const AUDIT_TYPES = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  CREATE_USER: 'create_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
  CREATE_PROJECT: 'create_project',
  UPDATE_PROJECT: 'update_project',
  DELETE_PROJECT: 'delete_project',
  CREATE_FINDING: 'create_finding',
  UPDATE_FINDING: 'update_finding',
  CLOSE_FINDING: 'close_finding',
  REOPEN_FINDING: 'reopen_finding',
  DELETE_FINDING: 'delete_finding',
  CREATE_MILESTONE: 'create_milestone',
  UPDATE_MILESTONE: 'update_milestone',
  DELETE_MILESTONE: 'delete_milestone',
  CHANGE_PASSWORD: 'change_password',
  RESET_PASSWORD: 'reset_password',
};

export const getAuditLogs = async (filters = {}) => {
  const token = authStorage.getAccessToken();
  const apiParams = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === '' || value == null) continue;
    if (key === 'type') {
      apiParams.action = value.toLowerCase();
    } else {
      apiParams[key] = value;
    }
  }
  const params = new URLSearchParams(apiParams);

  try {
    const response = await fetch(`${API_BASE}/audit-logs?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    return [];
  }
};

export const logAuditEvent = async () => ({ success: true });

export const auditLogHelpers = {
  logLogin: logAuditEvent,
  logLogout: logAuditEvent,
  logProjectCreate: logAuditEvent,
  logProjectUpdate: logAuditEvent,
  logProjectDelete: logAuditEvent,
  logFindingCreate: logAuditEvent,
  logFindingUpdate: logAuditEvent,
  logFindingClose: logAuditEvent,
  logFindingReopen: logAuditEvent,
  logStatusChange: logAuditEvent,
  logSeverityChange: logAuditEvent,
  logRequestCreate: logAuditEvent,
  logRequestApprove: logAuditEvent,
  logRequestReject: logAuditEvent,
  logUserCreate: logAuditEvent,
  logUserUpdate: logAuditEvent,
  logRoleChange: logAuditEvent,
  logReportGenerate: logAuditEvent
};

export default {
  AUDIT_TYPES,
  getAuditLogs,
  logAuditEvent,
  ...auditLogHelpers
};
