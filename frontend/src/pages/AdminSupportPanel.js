import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Select, FormControl, InputLabel,
  CircularProgress, Tooltip, TablePagination, InputAdornment, Grid, Avatar, Divider
} from '@mui/material';
import {
  Search as SearchIcon, Refresh as RefreshIcon, ChevronRight as ChevronRightIcon,
  Assignment as AssignmentIcon, CheckCircle, CheckCircleOutline, BugReport, Feedback, Lightbulb,
  ReportProblem, AccountCircle, HelpOutline, History, Send, ArrowBack, AttachFile, Close as CloseIcon
} from '@mui/icons-material';
import { supportAPI } from '../services/supportService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { colors, typography, shadows, borderRadius, componentStyles } from '../theme/designSystem';

const CATEGORIES = [
  { value: 'bug_report', label: 'Bug Report', icon: <BugReport fontSize="small" />, color: '#ef4444' },
  { value: 'complaint', label: 'Complaint', icon: <ReportProblem fontSize="small" />, color: '#f59e0b' },
  { value: 'suggestion', label: 'Suggestion', icon: <Lightbulb fontSize="small" />, color: '#8b5cf6' },
  { value: 'feature_request', label: 'Feature Request', icon: <Feedback fontSize="small" />, color: '#3b82f6' },
  { value: 'account_issue', label: 'Account Issue', icon: <AccountCircle fontSize="small" />, color: '#06b6d4' },
  { value: 'other', label: 'Other', icon: <HelpOutline fontSize="small" />, color: '#6b7280' }
];

const STATUS_COLORS = {
  open: { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', label: 'Open' },
  in_progress: { bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', label: 'In Progress' },
  resolved: { bg: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', label: 'Resolved' },
  closed: { bg: 'rgba(107, 114, 128, 0.12)', color: '#6b7280', label: 'Closed' },
  reopened: { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', label: 'Reopened' }
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0][0].toUpperCase();
};

const AdminSupportPanel = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [summary, setSummary] = useState(null);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [adminComment, setAdminComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, limit: rowsPerPage };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      const result = await supportAPI.getAllRequests(params);
      setRequests(result.data || result);
      if (result.pagination) setPagination(result.pagination);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, statusFilter, categoryFilter, showToast]);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await supportAPI.getSummary();
      setSummary(data);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchRequests(); fetchSummary(); }, [fetchRequests, fetchSummary]);

  const handleOpenDetail = async (req) => {
    try {
      const data = await supportAPI.getRequestDetail(req._id);
      setSelectedRequest(data);
      setDetailOpen(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAdminComment = async () => {
    if (!adminComment.trim() || !selectedRequest) return;
    setSubmitting(true);
    try {
      const data = await supportAPI.addAdminComment(selectedRequest._id, adminComment.trim());
      setSelectedRequest(data);
      setAdminComment('');
      fetchRequests();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAssign = async () => {
    try {
      const users = await supportAPI.getAdminUsers();
      setAdminUsers(users);
      setSelectedAssignee(selectedRequest?.assignedTo?._id || '');
      setAssignDialogOpen(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAssign = async () => {
    if (!selectedAssignee || !selectedRequest) return;
    try {
      const data = await supportAPI.assignRequest(selectedRequest._id, selectedAssignee);
      setSelectedRequest(data);
      setAssignDialogOpen(false);
      fetchRequests();
      showToast('Request assigned', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenStatus = (presetStatus) => {
    setNewStatus(presetStatus || selectedRequest?.status || '');
    setResolutionNotes('');
    setStatusDialogOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || !selectedRequest) return;
    try {
      const data = await supportAPI.updateStatus(selectedRequest._id, newStatus, resolutionNotes);
      setSelectedRequest(data);
      setStatusDialogOpen(false);
      fetchRequests();
      showToast(`Status changed to ${newStatus}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: colors.text.primary, fontWeight: typography.weight.bold }}>
            Support Center Admin
          </Typography>
          <Typography sx={{ color: colors.text.tertiary, mt: 0.5 }}>
            Manage and resolve support requests from all users
          </Typography>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Open', value: summary?.open || 0, color: '#ef4444' },
          { label: 'In Progress', value: summary?.inProgress || 0, color: '#3b82f6' },
          { label: 'Resolved', value: summary?.resolved || 0, color: '#8b5cf6' },
          { label: 'Unassigned', value: summary?.unassigned || 0, color: '#f59e0b' },
          { label: 'Total', value: summary?.total || 0, color: colors.text.primary }
        ].map(s => (
          <Grid item xs={12} sm={6} md={2.4} key={s.label}>
            <Paper sx={{ p: 2, textAlign: 'center', background: colors.background.secondary, border: `1px solid ${colors.border.default}`, borderRadius: borderRadius.xl }}>
              <Typography sx={{ color: s.color, fontSize: typography.size['2xl'], fontWeight: typography.weight.bold }}>{s.value}</Typography>
              <Typography sx={{ color: colors.text.tertiary, fontSize: typography.size.xs }}>{s.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, background: colors.background.secondary, border: `1px solid ${colors.border.default}`, borderRadius: borderRadius.xl }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField size="small" placeholder="Search..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: colors.text.tertiary, fontSize: 20 }} /></InputAdornment> }}
            sx={{ minWidth: 250, '& .MuiOutlinedInput-root': { borderRadius: borderRadius.lg, background: colors.background.tertiary } }} />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel sx={{ color: colors.text.tertiary }}>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              sx={{ borderRadius: borderRadius.lg, background: colors.background.tertiary }}>
              <MenuItem value="">All</MenuItem>
              {Object.entries(STATUS_COLORS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel sx={{ color: colors.text.tertiary }}>Category</InputLabel>
            <Select value={categoryFilter} label="Category" onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
              sx={{ borderRadius: borderRadius.lg, background: colors.background.tertiary }}>
              <MenuItem value="">All</MenuItem>
              {CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={() => { fetchRequests(); fetchSummary(); }} sx={{ color: colors.text.secondary }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Table */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress sx={{ color: colors.primary[500] }} /></Box>
      ) : (
        <Paper sx={{ background: colors.background.secondary, border: `1px solid ${colors.border.default}`, borderRadius: borderRadius.xl, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { color: colors.text.tertiary, fontWeight: typography.weight.semibold, fontSize: typography.size.xs, textTransform: 'uppercase', letterSpacing: typography.tracking.wide, borderBottom: `1px solid ${colors.border.subtle}` } }}>
                  <TableCell>ID</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>From</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Assigned</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map((req) => {
                  const catMeta = CATEGORIES.find(c => c.value === req.category) || CATEGORIES[5];
                  const st = STATUS_COLORS[req.status] || STATUS_COLORS.open;
                  return (
                    <TableRow key={req._id} hover sx={{ cursor: 'pointer', '& td': { borderBottom: `1px solid ${colors.border.subtle}` } }}
                      onClick={() => handleOpenDetail(req)}>
                      <TableCell><Chip label={req.requestId} size="small" sx={{ background: 'rgba(6,182,212,0.1)', color: colors.primary[400], fontWeight: typography.weight.semibold, fontSize: typography.size.xs }} /></TableCell>
                      <TableCell>
                        <Typography sx={{ color: colors.text.primary, fontWeight: typography.weight.medium, fontSize: typography.size.sm }}>{req.title}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: colors.text.secondary, fontSize: typography.size.xs }}>{req.createdBy?.name || req.createdBy?.email || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {catMeta.icon}
                          <Typography sx={{ color: colors.text.secondary, fontSize: typography.size.xs }}>{catMeta.label}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={st.label} size="small" sx={{ background: st.bg, color: st.color, fontWeight: typography.weight.semibold, fontSize: typography.size.xs }} />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: colors.text.tertiary, fontSize: typography.size.xs }}>
                          {req.assignedTo?.name || req.assignedTo?.email || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: colors.text.tertiary, fontSize: typography.size.xs }}>
                          {new Date(req.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" sx={{ color: colors.text.secondary }}>
                          <ChevronRightIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={pagination.total} page={page} onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 20, 50]} sx={{ color: colors.text.secondary, borderTop: `1px solid ${colors.border.subtle}` }} />
        </Paper>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { background: colors.background.secondary, border: `1px solid ${colors.border.default}`, borderRadius: borderRadius['2xl'], maxHeight: '90vh' } }}>
        {selectedRequest && (
          <>
            <DialogTitle sx={{ borderBottom: `1px solid ${colors.border.subtle}`, px: 4, py: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip label={selectedRequest.requestId} sx={{ background: 'rgba(6,182,212,0.1)', color: colors.primary[400], fontWeight: typography.weight.bold }} />
                  <Chip label={STATUS_COLORS[selectedRequest.status]?.label} size="small"
                    sx={{ background: STATUS_COLORS[selectedRequest.status]?.bg, color: STATUS_COLORS[selectedRequest.status]?.color, fontWeight: typography.weight.semibold }} />
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  {selectedRequest?.status !== 'closed' && selectedRequest?.status !== 'resolved' && (
                    <>
                      <Button size="small" startIcon={<CheckCircleOutline />} onClick={() => handleOpenStatus('resolved')}
                        sx={{ ...componentStyles.button.ghost, py: 0.5, px: 1.5, fontSize: typography.size.xs, color: '#8b5cf6', '&:hover': { background: 'rgba(139, 92, 246, 0.12)' } }}>
                        Resolve
                      </Button>
                      <Button size="small" startIcon={<CloseIcon />} onClick={() => handleOpenStatus('closed')}
                        sx={{ ...componentStyles.button.ghost, py: 0.5, px: 1.5, fontSize: typography.size.xs, color: '#6b7280', '&:hover': { background: 'rgba(107, 114, 128, 0.12)' } }}>
                        Close
                      </Button>
                    </>
                  )}
                  <Button size="small" startIcon={<AssignmentIcon />} onClick={handleOpenAssign}
                    sx={{ ...componentStyles.button.ghost, py: 0.5, px: 1.5, fontSize: typography.size.xs }}>
                    Assign
                  </Button>
                  <Button size="small" startIcon={<CheckCircle />} onClick={() => handleOpenStatus()}
                    sx={{ ...componentStyles.button.ghost, py: 0.5, px: 1.5, fontSize: typography.size.xs }}>
                    Status
                  </Button>
                  <IconButton size="small" onClick={() => setDetailOpen(false)} sx={{ color: colors.text.tertiary, ml: 1, '&:hover': { color: colors.text.primary, background: 'rgba(148, 163, 184, 0.1)' } }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ px: 4, py: 3, overflowY: 'auto' }}>
              <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: typography.weight.bold, mb: 2 }}>
                {selectedRequest.title}
              </Typography>
              <Typography sx={{ color: colors.text.secondary, whiteSpace: 'pre-wrap', mb: 2 }}>
                {selectedRequest.description}
              </Typography>

              <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography sx={{ color: colors.text.tertiary, fontSize: typography.size.xs }}>From</Typography>
                  <Typography sx={{ color: colors.text.primary, fontSize: typography.size.sm, fontWeight: typography.weight.medium }}>
                    {selectedRequest.createdBy?.name || selectedRequest.createdBy?.email}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: colors.text.tertiary, fontSize: typography.size.xs }}>Assigned</Typography>
                  <Typography sx={{ color: colors.text.primary, fontSize: typography.size.sm }}>
                    {selectedRequest.assignedTo?.name || selectedRequest.assignedTo?.email || 'Unassigned'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: colors.text.tertiary, fontSize: typography.size.xs }}>Category</Typography>
                  <Typography sx={{ color: colors.text.primary, fontSize: typography.size.sm }}>
                    {CATEGORIES.find(c => c.value === selectedRequest.category)?.label || selectedRequest.category}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: colors.text.tertiary, fontSize: typography.size.xs }}>Date</Typography>
                  <Typography sx={{ color: colors.text.primary, fontSize: typography.size.sm }}>
                    {new Date(selectedRequest.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>

              {selectedRequest.attachments?.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {selectedRequest.attachments.map((att, i) => (
                    <Chip key={i} icon={<AttachFile />} label={att.originalname} onClick={() => window.open(att.url, '_blank')}
                      sx={{ background: colors.background.tertiary, color: colors.text.secondary }} />
                  ))}
                </Box>
              )}

              <Divider sx={{ borderColor: colors.border.subtle, my: 2 }} />

              {/* Timeline */}
              {selectedRequest.timeline?.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <History sx={{ fontSize: 18 }} /> Timeline
                  </Typography>
                  <Box sx={{ pl: 2, borderLeft: `2px solid ${colors.border.subtle}` }}>
                    {selectedRequest.timeline.map((entry, i) => (
                      <Box key={i} sx={{ mb: 1.5 }}>
                        <Typography sx={{ color: colors.text.tertiary, fontSize: typography.size.xs }}>
                          {new Date(entry.timestamp).toLocaleString()} — <strong>{entry.user?.name || entry.user?.email || 'System'}</strong>
                        </Typography>
                        <Typography sx={{ color: colors.text.secondary, fontSize: typography.size.sm }}>
                          {entry.action === 'created' && 'Created request'}
                          {entry.action === 'comment' && `Commented${entry.details?.isInternal ? ' (internal)' : ''}`}
                          {entry.action === 'status_change' && `Changed status: ${entry.details?.from} → ${entry.details?.to}`}
                          {entry.action === 'assigned' && `Assigned: ${entry.details?.from} → ${entry.details?.to}`}
                          {entry.action === 'attachment' && `Uploaded ${entry.details?.filename}`}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              <Divider sx={{ borderColor: colors.border.subtle, my: 2 }} />

              {/* Comments */}
              <Typography sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold, mb: 2 }}>
                Comments ({selectedRequest.comments?.length || 0})
              </Typography>
              {selectedRequest.comments?.length > 0 ? (
                <Box sx={{ mb: 2 }}>
                  {selectedRequest.comments.map((c, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 1.5, p: 1.5, background: colors.background.tertiary, borderRadius: borderRadius.lg }}>
                      <Avatar sx={{ width: 28, height: 28, background: `linear-gradient(135deg, ${colors.primary[600]}, ${colors.secondary[600]})`, fontSize: '11px', fontWeight: typography.weight.bold }}>
                        {getInitials(c.user?.name || c.user?.email)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold, fontSize: typography.size.xs }}>
                            {c.user?.name || c.user?.email}
                          </Typography>
                          {c.isInternal && <Chip label="Internal" size="small" sx={{ height: 18, fontSize: '10px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }} />}
                          <Typography sx={{ color: colors.text.tertiary, fontSize: '10px', ml: 'auto' }}>
                            {new Date(c.createdAt).toLocaleString()}
                          </Typography>
                        </Box>
                        <Typography sx={{ color: colors.text.secondary, fontSize: typography.size.xs, whiteSpace: 'pre-wrap' }}>
                          {c.text}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ color: colors.text.tertiary, textAlign: 'center', py: 2, fontSize: typography.size.sm }}>
                  No comments
                </Typography>
              )}

              {selectedRequest.status !== 'closed' && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField fullWidth size="small" placeholder="Add a comment..." value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: borderRadius.lg, background: colors.background.tertiary } }} />
                  <Button variant="contained" onClick={handleAdminComment} disabled={submitting || !adminComment.trim()}
                    sx={{ ...componentStyles.button.primary, minWidth: 80 }}>
                    {submitting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <Send sx={{ fontSize: 18 }} />}
                  </Button>
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { background: colors.background.secondary, borderRadius: borderRadius['2xl'] } }}>
        <DialogTitle sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold, borderBottom: `1px solid ${colors.border.subtle}` }}>
          Assign Request
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Assign to</InputLabel>
            <Select value={selectedAssignee} label="Assign to" onChange={(e) => setSelectedAssignee(e.target.value)}
              sx={{ borderRadius: borderRadius.lg }}>
              {adminUsers.map(u => (
                <MenuItem key={u._id} value={u._id}>{u.name || u.email} ({u.role?.replace('_', ' ')})</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setAssignDialogOpen(false)} sx={{ ...componentStyles.button.ghost }}>Cancel</Button>
          <Button onClick={handleAssign} variant="contained" sx={{ ...componentStyles.button.primary }}>Assign</Button>
        </DialogActions>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { background: colors.background.secondary, borderRadius: borderRadius['2xl'] } }}>
        <DialogTitle sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold, borderBottom: `1px solid ${colors.border.subtle}` }}>
          Update Status
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select value={newStatus} label="Status" onChange={(e) => setNewStatus(e.target.value)}
              sx={{ borderRadius: borderRadius.lg }}>
              {Object.entries(STATUS_COLORS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
            </Select>
          </FormControl>
          {(newStatus === 'resolved' || newStatus === 'closed') && (
            <TextField fullWidth label="Resolution Notes" multiline rows={3} value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: borderRadius.lg } }} />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setStatusDialogOpen(false)} sx={{ ...componentStyles.button.ghost }}>Cancel</Button>
          <Button onClick={handleStatusUpdate} variant="contained" sx={{ ...componentStyles.button.primary }}>Update</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminSupportPanel;
