import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Select, FormControl, InputLabel,
  CircularProgress, Tooltip, TablePagination, InputAdornment
} from '@mui/material';
import {
  Add as AddIcon, Search as SearchIcon, Refresh as RefreshIcon,
  ChevronRight as ChevronRightIcon, BugReport, Feedback, Lightbulb,
  ReportProblem, AccountCircle, HelpOutline
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supportAPI } from '../services/supportService';
import { useToast } from '../context/ToastContext';
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

const LoadingSkeleton = () => (
  <Box sx={{ p: 4, textAlign: 'center' }}>
    <CircularProgress sx={{ color: colors.primary[500] }} />
    <Typography sx={{ color: colors.text.tertiary, mt: 2 }}>Loading support requests...</Typography>
  </Box>
);

const BetaInfoBanner = () => (
  <Box sx={{
    position: 'relative',
    overflow: 'hidden',
    background: 'rgba(22, 27, 34, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: `1px solid rgba(6, 182, 212, 0.15)`,
    borderRadius: borderRadius['2xl'],
    p: { xs: 2.5, sm: 3 },
    mb: 3,
    '@keyframes bannerFadeIn': {
      from: { opacity: 0, transform: 'translateY(6px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    animation: 'bannerFadeIn 0.4s ease-out',
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      background: `linear-gradient(135deg, ${colors.primary[500]}08 0%, transparent 60%)`,
      pointerEvents: 'none',
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: '3px',
      background: `linear-gradient(180deg, ${colors.primary[400]} 0%, ${colors.primary[600]} 100%)`,
      borderRadius: '0 3px 3px 0',
      boxShadow: `0 0 8px ${colors.primary[500]}40`,
    },
  }}>
    <Box sx={{ display: 'flex', gap: { xs: 2, sm: 2.5 }, position: 'relative', zIndex: 1 }}>
      <Box sx={{
        flexShrink: 0,
        width: { xs: 36, sm: 40 },
        height: { xs: 36, sm: 40 },
        borderRadius: borderRadius.lg,
        background: `linear-gradient(135deg, ${colors.primary[500]}20 0%, ${colors.primary[700]}10 100%)`,
        border: `1px solid ${colors.primary[500]}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: { xs: 18, sm: 20 },
        mt: 0.3,
      }}>
        ⚠
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{
          color: colors.text.primary,
          fontWeight: typography.weight.semibold,
          fontSize: { xs: '0.95rem', sm: '1.05rem' },
          mb: 1.5,
        }}>
          eKavach Beta Information
        </Typography>
        <Typography sx={{
          color: colors.text.secondary,
          fontSize: { xs: '0.8125rem', sm: '0.875rem' },
          lineHeight: 1.7,
          mb: 2,
        }}>
          This software is currently running in BETA mode and is continuously undergoing security validation and testing.
        </Typography>
        <Typography sx={{
          color: colors.text.secondary,
          fontSize: { xs: '0.8125rem', sm: '0.875rem' },
          lineHeight: 1.7,
          mb: 2,
        }}>
          If you experience any issues related to software functionality, encounter unexpected behavior, or have suggestions for new features and improvements, please contact the Penetration Tester Team (developers of this software).
        </Typography>
        <Box sx={{
          background: `${colors.background.tertiary}80`,
          borderRadius: borderRadius.lg,
          p: { xs: 2, sm: 2.5 },
          border: `1px solid ${colors.border.subtle}`,
        }}>
          <Typography sx={{
            color: colors.text.secondary,
            fontSize: { xs: '0.8125rem', sm: '0.875rem' },
            fontWeight: typography.weight.semibold,
            mb: 1.5,
          }}>
            Development Team:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1.5, sm: 4 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: colors.primary[500],
                boxShadow: `0 0 6px ${colors.primary[500]}60`,
                flexShrink: 0,
              }} />
              <Typography sx={{ color: colors.text.secondary, fontSize: { xs: '0.8rem', sm: '0.85rem' } }}>
                Your Name —{' '}
                <Box component="a" href="mailto:support@example.com"
                  sx={{ color: colors.primary[400], textDecoration: 'none', '&:hover': { textDecoration: 'underline', color: colors.primary[300] } }}>
                  support@example.com
                </Box>
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: colors.primary[500],
                boxShadow: `0 0 6px ${colors.primary[500]}60`,
                flexShrink: 0,
              }} />
              <Typography sx={{ color: colors.text.secondary, fontSize: { xs: '0.8rem', sm: '0.85rem' } }}>
                Team Member —{' '}
                <Box component="a" href="mailto:team@example.com"
                  sx={{ color: colors.primary[400], textDecoration: 'none', '&:hover': { textDecoration: 'underline', color: colors.primary[300] } }}>
                  team@example.com
                </Box>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  </Box>
);

const EmptyState = ({ onCreate }) => (
  <Box sx={{ textAlign: 'center', py: 8 }}>
    <HelpOutline sx={{ fontSize: 64, color: colors.text.tertiary, mb: 2 }} />
    <Typography variant="h6" sx={{ color: colors.text.secondary, mb: 1 }}>No support requests yet</Typography>
    <Typography sx={{ color: colors.text.tertiary, mb: 3 }}>
      Create a support request to report a bug, make a suggestion, or ask for help
    </Typography>
    <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}
      sx={{ ...componentStyles.button.primary, px: 4 }}>
      Create Request
    </Button>
  </Box>
);

const SupportList = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'other' });
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, limit: rowsPerPage };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      const result = await supportAPI.getMyRequests(params);
      setRequests(result.data || result);
      if (result.pagination) setPagination(result.pagination);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, statusFilter, categoryFilter, showToast]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      showToast('Title and description are required', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await supportAPI.createRequest(form, files);
      showToast('Support request created successfully', 'success');
      setDialogOpen(false);
      setForm({ title: '', description: '', category: 'other' });
      setFiles([]);
      setPage(0);
      fetchRequests();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryMeta = (val) => CATEGORIES.find(c => c.value === val) || CATEGORIES[5];

  return (
    <Box>
      <BetaInfoBanner />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: colors.text.primary, fontWeight: typography.weight.bold }}>
            Support Center
          </Typography>
          <Typography sx={{ color: colors.text.tertiary, mt: 0.5 }}>
            Submit and track your support requests
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}
          sx={{ ...componentStyles.button.primary, px: 3, py: 1.2 }}>
          New Request
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3, background: colors.background.secondary, border: `1px solid ${colors.border.default}`, borderRadius: borderRadius.xl }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField size="small" placeholder="Search requests..." value={search}
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
            <IconButton onClick={fetchRequests} sx={{ color: colors.text.secondary }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {loading ? <LoadingSkeleton /> : requests.length === 0 ? <EmptyState onCreate={() => setDialogOpen(true)} /> : (
        <Paper sx={{ background: colors.background.secondary, border: `1px solid ${colors.border.default}`, borderRadius: borderRadius.xl, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { color: colors.text.tertiary, fontWeight: typography.weight.semibold, fontSize: typography.size.xs, textTransform: 'uppercase', letterSpacing: typography.tracking.wide, borderBottom: `1px solid ${colors.border.subtle}` } }}>
                  <TableCell>ID</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map((req) => {
                  const catMeta = getCategoryMeta(req.category);
                  const st = STATUS_COLORS[req.status] || STATUS_COLORS.open;
                  return (
                    <TableRow key={req._id} hover sx={{ cursor: 'pointer', '& td': { borderBottom: `1px solid ${colors.border.subtle}` } }}
                      onClick={() => navigate(`/support/${req._id}`)}>
                      <TableCell><Chip label={req.requestId} size="small" sx={{ background: 'rgba(6,182,212,0.1)', color: colors.primary[400], fontWeight: typography.weight.semibold, fontSize: typography.size.xs }} /></TableCell>
                      <TableCell>
                        <Typography sx={{ color: colors.text.primary, fontWeight: typography.weight.medium, fontSize: typography.size.sm }}>{req.title}</Typography>
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

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { background: colors.background.secondary, border: `1px solid ${colors.border.default}`, borderRadius: borderRadius['2xl'] } }}>
        <DialogTitle sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold, borderBottom: `1px solid ${colors.border.subtle}`, px: 4, py: 3 }}>
          Create Support Request
        </DialogTitle>
        <DialogContent sx={{ px: 4, py: 3 }}>
          <TextField fullWidth label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: borderRadius.lg, background: colors.background.tertiary } }}
            required placeholder="Brief title of your issue" />
          <TextField fullWidth label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            multiline rows={5} sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: borderRadius.lg, background: colors.background.tertiary } }}
            required placeholder="Describe your issue, suggestion, or feedback in detail" />
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel sx={{ color: colors.text.tertiary }}>Category</InputLabel>
            <Select value={form.category} label="Category" onChange={(e) => setForm({ ...form, category: e.target.value })}
              sx={{ borderRadius: borderRadius.lg, background: colors.background.tertiary }}>
              {CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{c.icon}{c.label}</Box>
              </MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="outlined" component="label" sx={{ borderColor: colors.border.default, color: colors.text.secondary, borderRadius: borderRadius.lg }}>
            Attach Files (max 5)
            <input type="file" hidden multiple onChange={(e) => setFiles(Array.from(e.target.files))} />
          </Button>
          {files.length > 0 && (
            <Typography sx={{ color: colors.text.tertiary, fontSize: typography.size.xs, mt: 1 }}>
              {files.length} file(s) selected
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 4, py: 3, borderTop: `1px solid ${colors.border.subtle}`, gap: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ ...componentStyles.button.ghost, py: 1, px: 3 }}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={submitting}
            sx={{ ...componentStyles.button.primary, py: 1, px: 3 }}>
            {submitting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SupportList;
