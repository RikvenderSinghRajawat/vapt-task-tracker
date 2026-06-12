import { request } from './restService';

const normalizeList = (resp) => (Array.isArray(resp) ? resp : Array.isArray(resp?.data) ? resp.data : []);

export const supportAPI = {
  getMyRequests: async (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v != null && v !== '')).toString();
    return normalizeList(await request(`/support/my${q ? '?'+q : ''}`));
  },
  createRequest: (data, files) => {
    if (files && files.length > 0) {
      const fd = new FormData();
      fd.append('title', data.title);
      fd.append('description', data.description);
      fd.append('category', data.category || 'other');
      Array.from(files).forEach(f => fd.append('attachments', f));
      return request('/support', { method: 'POST', body: fd });
    }
    return request('/support', { method: 'POST', body: data });
  },
  getRequest: (id) => request(`/support/${id}`),
  addComment: (id, text, isInternal = false) =>
    request(`/support/${id}/comments`, { method: 'POST', body: { text, isInternal } }),

  getAllRequests: async (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v != null && v !== '')).toString();
    return normalizeList(await request(`/support/admin/all${q ? '?'+q : ''}`));
  },
  getSummary: () => request('/support/admin/summary'),
  getAdminUsers: async () => normalizeList(await request('/support/admin/users')),
  getRequestDetail: (id) => request(`/support/admin/${id}`),
  assignRequest: (id, assignedTo) =>
    request(`/support/admin/${id}/assign`, { method: 'PUT', body: { assignedTo } }),
  updateStatus: (id, status, resolutionNotes) =>
    request(`/support/admin/${id}/status`, { method: 'PUT', body: { status, resolutionNotes } }),
  addAdminComment: (id, text, isInternal = false) =>
    request(`/support/admin/${id}/comments`, { method: 'POST', body: { text, isInternal } }),
  uploadAttachment: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request(`/support/admin/${id}/attachments`, { method: 'POST', body: fd });
  },
  deleteAttachment: (id, attachmentId) =>
    request(`/support/admin/${id}/attachments/${attachmentId}`, { method: 'DELETE' }),
};
