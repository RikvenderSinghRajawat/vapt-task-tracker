import { API_BASE_URL } from '../config/apiBaseResolver';
import { authStorage } from './authStorage';

const API_BASE = API_BASE_URL;

let isRefreshing = false;
let refreshPromise = null;
let isLoggingOut = false;

function dispatchTokensCleared() {
  isRefreshing = false;
  refreshPromise = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:tokens-cleared'));
  }
}

function clearTokens() {
  authStorage.removeAccessToken();
  authStorage.removeRefreshToken();
  authStorage.removeSessionId();
}

async function _refreshAccessToken() {
  const storedRefresh = authStorage.getRefreshToken();
  if (!storedRefresh) throw new Error('No refresh token');

  const isCrossOrig = API_BASE.startsWith('http');
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: isCrossOrig ? 'include' : 'same-origin',
    body: JSON.stringify({ refreshToken: storedRefresh })
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.message || 'Token refresh failed');
  }

  const { accessToken, refreshToken: newRefresh, sessionId } = json.data || {};
  if (!accessToken) throw new Error('Invalid refresh response');

  authStorage.setAccessToken(accessToken);
  if (newRefresh) authStorage.setRefreshToken(newRefresh);
  if (sessionId) authStorage.setSessionId(sessionId);

  return accessToken;
}

function isUnauthorizedError(err) {
  return err.status === 401
    || err.message?.includes('Unauthorized')
    || err.message?.includes('Invalid authentication token')
    || err.message?.includes('Authentication token expired')
    || err.message?.includes('No auth token')
    || err.message?.includes('Token refresh failed');
}

async function _request(path, options = {}) {
  if (isLoggingOut) {
    const err = new Error('Session is being logged out');
    err.status = 401;
    throw err;
  }

  const token = authStorage.getAccessToken();
  const { params, noAuth, headers: extraHeaders, body: reqBody, credentials: reqCreds, ...fetchOptions } = options;
  const isFormData = reqBody instanceof FormData;
  const isCrossOrig = API_BASE.startsWith('http');
  const credentials = reqCreds ?? (isCrossOrig ? 'include' : 'same-origin');

  let url = `${API_BASE}${path}`;
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token && !noAuth ? { Authorization: `Bearer ${token}` } : {}),
    ...(extraHeaders || {})
  };

  const body = isFormData ? reqBody : (reqBody == null ? null : JSON.stringify(reqBody));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      credentials,
      headers,
      body,
    });
    clearTimeout(timeoutId);

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      let msg = json?.message || json?.error || `HTTP ${response.status}`;
      if (json?.errors && Array.isArray(json.errors)) {
        msg = json.errors.map(e => e.message || e.field).join(', ');
      }
      const error = new Error(msg);
      error.status = response.status;
      throw error;
    }

    return json.success === true ? json.data : json;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('Request timed out');

    if (!options.noAuth && isUnauthorizedError(err)) {
      if (isLoggingOut) throw err;

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = _refreshAccessToken().then(accessToken => {
          isRefreshing = false;
          return accessToken;
        }).catch(() => {
          isRefreshing = false;
          isLoggingOut = true;
          clearTokens();
          dispatchTokensCleared();
          throw err;
        });
      }

      try {
        const newToken = await refreshPromise;
        if (!newToken) throw err;
        options.headers = options.headers || {};
        options.headers.Authorization = `Bearer ${newToken}`;
        return _request(path, { ...options, _retry: true });
      } catch (_) {
        throw err;
      }
    }

    throw err;
  }
}

const normalizeList = (resp) => (Array.isArray(resp) ? resp : Array.isArray(resp?.data) ? resp.data : []);

export const refreshAccessToken = _refreshAccessToken;
export const request = _request;
export function resetLogoutState() {
  isLoggingOut = false;
  isRefreshing = false;
  refreshPromise = null;
}

export const projectAPI = {
  getProjects:    async (params = {}) => { const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v != null && v !== '')); return normalizeList(await _request(`/projects${q ? '?' + q : ''}`)); },
  getProject:     (id)                              => _request(`/projects/${id}`),
  createProject:  (data)                            => _request('/projects',   { method: 'POST', body: data }),
  updateProject:  (id, data)                        => _request(`/projects/${id}`, { method: 'PUT', body: data }),
  deleteProject:  (id)                              => _request(`/projects/${id}`, { method: 'DELETE' }),
  addComment:     (id, data)                        => _request(`/projects/${id}/comments`, { method: 'POST', body: data }),
};

export const findingAPI = {
  getFindings:     async (projectId, params = {}) => { const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v != null && v !== '')); return normalizeList(await _request(`/projects/${projectId}/findings${q ? '?' + q : ''}`)); },
  getFinding:      (projectId, id)                 => _request(`/projects/${projectId}/findings/${id}`),
  createFinding:   (projectId, data)               => _request(`/projects/${projectId}/findings`,  { method: 'POST', body: data }),
  updateFinding:   (projectId, id, data)           => _request(`/projects/${projectId}/findings/${id}`, { method: 'PUT', body: data }),
  deleteFinding:   (projectId, id)                 => _request(`/projects/${projectId}/findings/${id}`, { method: 'DELETE' }),
  closeFinding:    (projectId, id, notes)           => _request(`/projects/${projectId}/findings/${id}/close`,  { method: 'POST', body: { notes } }),
  reopenFinding:   (projectId, id)                  => _request(`/projects/${projectId}/findings/${id}/reopen`, { method: 'POST' }),
  addComment:      (projectId, id, data)            => _request(`/projects/${projectId}/findings/${id}/comments`, { method: 'POST', body: data }),
  bulkUpload:      (formData)                       => _request('/findings/bulk-upload', { method: 'POST', body: formData }),
  getAllFindings:  async (params = {})               => { const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v != null && v !== '')); return normalizeList(await _request(`/findings${q ? '?' + q : ''}`)); },
  bulkUpdateStatus: (findingIds, status, severity, assignee, comment, isDuplicate) =>
    _request('/findings/bulk-status', { method: 'PUT', body: { findingIds, status, severity, assignee, comment, isDuplicate } }),
  exportCSV: (projectId, params = {}) => {
    const token = authStorage.getAccessToken();
    const query = new URLSearchParams(params).toString();
    const url = projectId
      ? `${API_BASE}/projects/${projectId}/findings/export/csv${query ? '?'+query : ''}`
      : `${API_BASE}/findings/export/csv${query ? '?'+query : ''}`;
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `findings-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  },
  exportExcel: (projectId, params = {}) => {
    const token = authStorage.getAccessToken();
    const query = new URLSearchParams(params).toString();
    const url = projectId
      ? `${API_BASE}/projects/${projectId}/findings/export/excel${query ? '?'+query : ''}`
      : `${API_BASE}/findings/export/excel${query ? '?'+query : ''}`;
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `findings-${new Date().toISOString().slice(0,10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  },
};

export const milestoneAPI = {
  getMilestones:    async (projectId)           => normalizeList(await _request(`/projects/${projectId}/milestones`)),
  getMilestone:     (projectId, id)      => _request(`/projects/${projectId}/milestones/${id}`),
  createMilestone:  (projectId, data)    => _request(`/projects/${projectId}/milestones`,   { method: 'POST',  body: data }),
  updateMilestone:  (projectId, id, d)   => _request(`/projects/${projectId}/milestones/${id}`, { method: 'PUT',   body: d }),
  deleteMilestone:  (projectId, id)      => _request(`/projects/${projectId}/milestones/${id}`, { method: 'DELETE' }),
  completeMilestone:(projectId, id, n)    => _request(`/projects/${projectId}/milestones/${id}/complete`, { method: 'POST', body: n }),
};

export const authAPI = {
  sendLoginOtp:         (email, password)  => _request('/auth/send-login-otp',    { method: 'POST', body: { email, password } }),
  verifyLoginOtp:       (userId, otp)      => _request('/auth/verify-login-otp',  { method: 'POST', body: { userId, otp } }),
  resendLoginOtp:       (userId)           => _request('/auth/resend-login-otp',   { method: 'POST', body: { userId } }),
  forgotPassword:       (email)            => _request('/auth/forgotpassword',     { method: 'POST', body: { email } }),
  verifyForgotOtp:      (userId, otp)      => _request('/auth/verify-forgot-otp',  { method: 'POST', body: { userId, otp } }),
  resetPasswordWithOtp: (resetToken, password) => _request('/auth/reset-password-otp', { method: 'POST', body: { resetToken, password } }),
};

export const userAPI = {
  getUsers:                   async ()               => normalizeList(await _request('/users')),
  getUser:                    (id)              => _request(`/users/${id}`),
  createUser:                 (data)            => _request('/users',    { method: 'POST', body: data }),
  updateUser:                 (id, data)        => _request(`/users/${id}`, { method: 'PUT', body: data }),
  deleteUser:                 (id)              => _request(`/users/${id}`, { method: 'DELETE' }),
  resetPassword:              (email)           => _request('/auth/forgotpassword',   { method: 'POST', body: { email } }),
  getAuditLogs:               async ()               => normalizeList(await _request('/audit-logs')),
  updatePassword:             (curr, nw)        => _request('/auth/updatepassword',   { method: 'PUT',   body: { currentPassword: curr, newPassword: nw } }),
  allocateProjects:           (uid, pids)       => _request(`/users/${uid}`,         { method: 'PUT',   body: { allocatedProjects: pids } }),
  adminSetPasswordDirect:     (email, pwd)      => _request('/auth/admin-set-password', { method: 'PUT', body: { email, newPassword: pwd } }),
  updatePasswordDirect:       (token, pwd)      => _request(`/auth/reset-password/${token}`, { method: 'POST', body: { password: pwd } }),
};

export const reportAPI = {
  getReports:       async (projectId)                                      => normalizeList(await _request(`/projects/${projectId}/reports`)),
  getReport:        (projectId, id)                                   => _request(`/projects/${projectId}/reports/${id}`),
  createReport:     (projectId, data)                                 => _request(`/projects/${projectId}/reports`,  { method: 'POST', body: data }),
  generateExecutiveReport: (projectId) => {
    const token = authStorage.getAccessToken();
    window.open(`${API_BASE_URL}/projects/${projectId}/reports/executive?token=${token}`, '_blank');
  },
  previewExecutiveReport: (projectId) => {
    const token = authStorage.getAccessToken();
    window.open(`${API_BASE_URL}/projects/${projectId}/reports/executive?token=${token}&preview=true`, '_blank');
  },
  updateReport:     (projectId, id, data)                             => _request(`/projects/${projectId}/reports/${id}`, { method: 'PUT', body: data }),
  deleteReport:     (projectId, id)                                   => _request(`/projects/${projectId}/reports/${id}`, { method: 'DELETE' }),
  uploadReportFile: async (projectId, reportId, file, by)              => {
    const fd = new FormData();
    fd.append('file', file);
    if (by) fd.append('uploadedBy', by);
    return _request(`/projects/${projectId}/reports/${reportId}/upload`, { method: 'POST', body: fd });
  },
  downloadReport:   async (projectId, reportId, format) => {
    const token = authStorage.getAccessToken();
    const baseUrl = API_BASE.replace(/\/api\/?$/, '');
    const qs = format && format !== 'original' ? `?format=${encodeURIComponent(format)}` : '';
    const url = `${baseUrl}/api/projects/${projectId}/reports/${reportId}/download${qs}`;
    const response = await fetch(url, {
      credentials: API_BASE.startsWith('http') ? 'include' : 'same-origin',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Download failed' }));
      throw new Error(err.message || 'Download failed');
    }
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition');
    const fileName = disposition
      ? disposition.split('filename=')[1]?.replace(/"/g, '').trim()
      : `report-${reportId}.${format === 'pdf' ? 'pdf' : format === 'html' ? 'html' : 'json'}`;
    return { blob, fileName, contentType: response.headers.get('Content-Type') || 'application/octet-stream' };
  },
  downloadExecutivePdf: async (projectId) => {
    const token = authStorage.getAccessToken();
    const baseUrl = API_BASE.replace(/\/api\/?$/, '');
    const url = `${baseUrl}/api/projects/${projectId}/reports/executive-pdf`;
    const response = await fetch(url, {
      credentials: API_BASE.startsWith('http') ? 'include' : 'same-origin',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Download failed' }));
      throw new Error(err.message || 'Download failed');
    }
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition');
    const fileName = disposition
      ? disposition.split('filename=')[1]?.replace(/"/g, '').trim()
      : 'executive-report.pdf';
    return { blob, fileName, contentType: response.headers.get('Content-Type') || 'application/pdf' };
  },
};

export const analyticsAPI = {
  getDashboardStats:      ()                           => _request('/analytics/dashboard'),
  getProjectAnalytics:    (pid)                       => _request(`/analytics/projects/${pid}`),
  getAdvancedAnalytics:   ()                           => _request('/analytics/advanced'),
  getSeverityDistribution:()                           => _request('/analytics/severity-distribution'),
  getFindingsTrend:       (p  = '6months')             => _request(`/analytics/findings-trend?period=${p}`),
  getProjectPerformance:  ()                           => _request('/analytics/project-performance'),
  getTeamPerformance:     ()                           => _request('/analytics/team-performance'),
  getSLACompliance:       ()                           => _request('/analytics/sla-compliance'),
  getFindingAge:          ()                           => _request('/analytics/finding-age'),
};

const normalizeNotif = (n) => ({
  ...n,
  link: n.redirectUrl || n.link || n.actionUrl,
});

export const notificationAPI = {
  getNotifications:          async (params = {}) => {
    const raw = await _request('/notifications', { params });
    const list = normalizeList(raw);
    return {
      data: list.map(normalizeNotif),
      total: raw?.total ?? list.length,
      page: raw?.page ?? 1,
      pages: raw?.pages ?? 1,
    };
  },
  getUnreadNotifications:    async () => {
    const result = await _request('/notifications/unread');
    const list = normalizeList(result);
    return list.map(normalizeNotif);
  },
  markAsRead:                (id)    => _request(`/notifications/${id}/read`,   { method: 'PUT' }),
  markAsUnread:              (id)    => _request(`/notifications/${id}/unread`, { method: 'PUT' }),
  markAllAsRead:             ()      => _request('/notifications/read-all',   { method: 'PUT' }),
  getUnreadCount:            ()      => _request('/notifications/unread-count'),
  deleteNotification:        (id)    => _request(`/notifications/${id}`,       { method: 'DELETE' }),
  replyToNotification:       (parentId, message) => _request('/notifications/reply', { method: 'POST', body: { parentReplyId: parentId, message } }),
  getThread:                 (id)    => _request(`/notifications/${id}/thread`),
};

export const requestAPI = {
  createRequest:       (data)                                         => _request('/requests',                    { method: 'POST', body: data }),
  requestCloseFinding: (pid, fid, who, reason, checklist)             => _request('/requests',                    { method: 'POST', body: { type: 'close_finding', projectId: pid, findingId: fid, requestedBy: who, reason, checklist } }),
  requestReopenFinding:(pid, fid, who, reason)                         => _request('/requests',                    { method: 'POST', body: { type: 'reopen_finding', projectId: pid, findingId: fid, requestedBy: who, reason } }),
  requestHelp:         (pid, fid, reason)                              => _request('/requests',                    { method: 'POST', body: { type: 'help_request', projectId: pid, findingId: fid, reason } }),
  getPendingRequests:  async ()                                             => normalizeList(await _request('/requests/pending')),
  approveRequest:      (rid, by)                                      => _request(`/requests/${rid}/approve`,     { method: 'POST', body: { approvedBy: by } }),
  rejectRequest:       (rid, by, reason)                              => _request(`/requests/${rid}/reject`,      { method: 'POST', body: { rejectedBy: by, reason } }),
};

export const taskAPI = {
  getTasks:       async (params = {})                          => { const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v != null && v !== '')); return normalizeList(await _request(`/tasks${q ? '?' + q : ''}`)); },
  getMyTasks:     async (params = {})                          => { const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v != null && v !== '')); return normalizeList(await _request(`/tasks/my${q ? '?' + q : ''}`)); },
  getTask:        (id)                                          => _request(`/tasks/${id}`),
  createTask:     (data)                                        => _request('/tasks',              { method: 'POST',  body: data }),
  updateTask:     (id, data)                                    => _request(`/tasks/${id}`,        { method: 'PUT',   body: data }),
  deleteTask:     (id)                                           => _request(`/tasks/${id}`,        { method: 'DELETE' }),
  addComment:     (id, text)                                     => _request(`/tasks/${id}/comments`,    { method: 'POST', body: { text } }),
  uploadAttachment:(id, file)                                    => { const fd = new FormData(); fd.append('file', file); return _request(`/tasks/${id}/attachments`, { method: 'POST', body: fd }); },
  startTask:      (id)                                           => _request(`/tasks/${id}/start`,       { method: 'POST'  }),
  completeTask:   (id)                                           => _request(`/tasks/${id}/complete`,    { method: 'POST'  }),
  reopenTask:     (id)                                           => _request(`/tasks/${id}/reopen`,      { method: 'POST'  }),
  escalateTask:   (id)                                           => _request(`/tasks/${id}/escalate`,    { method: 'POST'  }),
  getAnalytics:   ()                                             => _request('/tasks/analytics'),
  rotateCompleted: ()                                              => _request('/tasks/rotate-completed', { method: 'POST' }),
};

export const recycleBinAPI = {
  getItems:         async (entityType)               => { const q = entityType ? `?entityType=${encodeURIComponent(entityType)}` : ''; return normalizeList(await _request(`/recycle-bin${q}`)); },
  restoreItem:      (entityType, id)           => _request(`/recycle-bin/restore/${encodeURIComponent(entityType)}/${id}`,  { method: 'POST'  }),
  permanentDelete:  (entityType, id)           => _request(`/recycle-bin/delete/${encodeURIComponent(entityType)}/${id}`,  { method: 'DELETE' }),
  getDaysRemaining: async (deletedAt)                => { const res = await _request('/recycle-bin/days-remaining', { method: 'POST', body: { deletedAt: deletedAt ? new Date(deletedAt).toISOString() : null } }); return res?.remainingDays ?? 0; },
};

export const quarterlyAuditAPI = {
  getAudits:      async ()                             => normalizeList(await _request('/quarterly-audits')),
  uploadAudit:    (data, file)                   => { const fd = new FormData(); fd.append('file', file); ['title','type','quarter','year','description'].forEach(k => { if (data[k]) fd.append(k, data[k]); }); return _request('/quarterly-audits', { method: 'POST', body: fd }); },
  getAudit:       (id)                           => _request(`/quarterly-audits/${id}`),
  deleteAudit:    (id)                           => _request(`/quarterly-audits/${id}`, { method: 'DELETE' }),
};

export const misAPI = {
  getEntries: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v != null && v !== '')).toString();
    return _request(`/mis${q ? '?'+q : ''}`);
  },
  createEntry: (data) => _request('/mis', { method: 'POST', body: data }),
  updateEntry: (id, data) => _request(`/mis/${id}`, { method: 'PUT', body: data }),
  deleteEntry: (id) => _request(`/mis/${id}`, { method: 'DELETE' }),
  getEntry: (id) => _request(`/mis/${id}`),
  getSummary: () => _request('/mis/summary'),
  getAllUsers: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v != null && v !== '')).toString();
    return _request(`/mis/admin/all${q ? '?'+q : ''}`);
  },
  getAdminAnalytics: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v != null && v !== '')).toString();
    return _request(`/mis/admin/analytics${q ? '?'+q : ''}`);
  },
  getUserDetails: (userId, params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v != null && v !== '')).toString();
    return _request(`/mis/admin/user/${userId}${q ? '?'+q : ''}`);
  },
};

export const noteAPI = {
  getNotes: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v != null && v !== '')).toString();
    return _request(`/notes${q ? '?'+q : ''}`);
  },
  getNote: (id) => _request(`/notes/${id}`),
  createNote: (data) => _request('/notes', { method: 'POST', body: data }),
  updateNote: (id, data) => _request(`/notes/${id}`, { method: 'PUT', body: data }),
  deleteNote: (id) => _request(`/notes/${id}`, { method: 'DELETE' }),
  restoreNote: (id) => _request(`/notes/${id}/restore`, { method: 'PUT' }),
  permanentDelete: (id) => _request(`/notes/${id}/permanent`, { method: 'DELETE' }),
  shareNote: (id, data) => _request(`/notes/${id}/share`, { method: 'POST', body: data }),
  removeShare: (noteId, userId) => _request(`/notes/${noteId}/share/${userId}`, { method: 'DELETE' }),
  getSummary: () => _request('/notes/summary'),
  searchUsers: (q) => _request(`/notes/search-users?q=${encodeURIComponent(q)}`),
  getNoteActiveUsers: (id) => _request(`/notes/${id}/active-users`),
};

export const securityReportAPI = {
  getReports:     async ()                                  => normalizeList(await _request('/security-reports')),
  uploadReport:   (formData)                          => _request('/security-reports', { method: 'POST', body: formData }),
  downloadReport: async (id) => {
    const token = authStorage.getAccessToken();
    const baseUrl = API_BASE.replace(/\/api\/?$/, '');
    const url = `${baseUrl}/api/security-reports/${id}/download`;
    const response = await fetch(url, {
      credentials: API_BASE.startsWith('http') ? 'include' : 'same-origin',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Download failed' }));
      throw new Error(err.message || 'Download failed');
    }
    return { data: await response.blob() };
  },
  deleteReport:   (id)                                    => _request(`/security-reports/${id}`, { method: 'DELETE' }),
};

export const vaptCalendarAPI = {
  getList:     (params)           => _request(`/vapt-calendar?${new URLSearchParams(params)}`),
  getById:     (id)               => _request(`/vapt-calendar/${id}`),
  create:      (data)             => _request('/vapt-calendar', { method: 'POST', body: data }),
  update:      (id, data)         => _request(`/vapt-calendar/${id}`, { method: 'PUT', body: data }),
  delete:      (id)               => _request(`/vapt-calendar/${id}`, { method: 'DELETE' }),
  getStats:    ()                 => _request('/vapt-calendar/stats'),
  recalculate: ()                 => _request('/vapt-calendar/recalculate', { method: 'POST' }),
};

export const apiKeyAPI = {
  getApiKeys:    ()               => _request('/api-keys'),
  createApiKey:  (data)           => _request('/api-keys', { method: 'POST', body: data }),
  deleteApiKey:  (id)             => _request(`/api-keys/${id}`, { method: 'DELETE' }),
  revokeApiKey:  (id)             => _request(`/api-keys/${id}/revoke`, { method: 'PATCH' }),
};
