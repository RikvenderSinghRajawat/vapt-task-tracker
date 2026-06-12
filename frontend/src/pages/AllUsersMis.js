import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Button, IconButton, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Avatar, TablePagination, LinearProgress, Divider, Stack,
  Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import {
  Search as SearchIcon, Close as CloseIcon,
  ArrowBack as ArrowBackIcon, Schedule as ScheduleIcon,
  People as PeopleIcon, Work as WorkIcon,
  AccessTime as AccessTimeIcon, Category as CategoryIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { misAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { colors, typography, borderRadius, shadows } from '../theme/designSystem';
import { glassStyles, gradients, premiumColors } from '../theme/premiumTheme';

const ACTIVITY_TYPES = [
  'Development', 'VAPT', 'Code Review', 'Documentation', 'Meeting',
  'Testing', 'Research', 'Deployment', 'Bug Fix', 'Remediation',
  'Analysis', 'Support', 'Training', 'Other'
];

const ROLES = ['admin', 'vapt_analyst', 'project_manager', 'developer', 'business_analyst', 'read_only'];

const StatCard = ({ label, value, icon, color, subtitle }) => (
  <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
    <Card sx={{ ...glassStyles.card, height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', top: -10, right: -10, width: 80, height: 80, borderRadius: '50%', background: `${color}10`, filter: 'blur(20px)' }} />
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Avatar sx={{ bgcolor: `${color}15`, color, width: 40, height: 40 }}>{icon}</Avatar>
          <Box>
            <Typography variant="h4" sx={{ color: colors.text.primary, fontWeight: 800, lineHeight: 1, mb: 0.5 }}>{value}</Typography>
            <Typography variant="caption" sx={{ color: colors.text.tertiary, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
          </Box>
        </Box>
        {subtitle && <Typography variant="caption" sx={{ color: colors.text.tertiary, display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>{subtitle}</Typography>}
      </CardContent>
    </Card>
  </motion.div>
);

const AllUsersMis = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [userEntries, setUserEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [filters, setFilters] = useState({ search: '', role: '', department: '' });
  const [userDetailFilters, setUserDetailFilters] = useState({ startDate: '', endDate: '', activityType: '' });

  const fetchAll = useCallback(async () => {
    try {
      const [usersList, analyticsData] = await Promise.all([
        misAPI.getAllUsers(),
        misAPI.getAdminAnalytics(),
      ]);
      setUsers(Array.isArray(usersList) ? usersList : []);
      setAnalytics(analyticsData || null);
    } catch (err) {
      showToast('Failed to load admin MIS data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleUserClick = async (uid) => {
    setSelectedUserId(uid);
    try {
      const params = {};
      if (userDetailFilters.startDate) params.startDate = userDetailFilters.startDate;
      if (userDetailFilters.endDate) params.endDate = userDetailFilters.endDate;
      if (userDetailFilters.activityType) params.activityType = userDetailFilters.activityType;
      const data = await misAPI.getUserDetails(uid, params);
      setUserDetails(data || {});
      setUserEntries(Array.isArray(data?.entries) ? data.entries : []);
    } catch (err) {
      showToast('Failed to load user details', 'error');
    }
  };

  const handleBack = () => {
    setSelectedUserId(null);
    setUserDetails(null);
    setUserEntries([]);
    setUserDetailFilters({ startDate: '', endDate: '', activityType: '' });
  };

  const handleEntryClick = (entry) => {
    setSelectedEntry(entry);
    setEntryDialogOpen(true);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!u.name?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) return false;
      }
      if (filters.role && u.role !== filters.role) return false;
      if (filters.department && u.department !== filters.department) return false;
      return true;
    });
  }, [users, filters]);

  const summaryStats = useMemo(() => {
    if (!analytics) return null;
    const totalHours = analytics.hoursByUser?.reduce((s, u) => s + (u.hours || 0), 0) || 0;
    const activeUsers = analytics.hoursByUser?.length || 0;
    const topProject = analytics.hoursByProject?.[0]?.project || 'N/A';
    const totalEntries = analytics.activityDistribution?.reduce((s, a) => s + (a.hours || 0), 0) || 0;
    return { totalHours, activeUsers, topProject, totalEntries };
  }, [analytics]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', background: colors.background.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <LinearProgress sx={{ width: 200, borderRadius: 1 }} />
          <Typography sx={{ color: colors.text.tertiary, fontWeight: 500 }}>Loading Admin Dashboard...</Typography>
        </Stack>
      </Box>
    );
  }

  // ====== USER DETAIL VIEW ======
  if (selectedUserId && userDetails) {
    return (
      <Box sx={{ minHeight: '100vh', background: colors.background.primary, p: { xs: 2, sm: 3, md: 4 } }}>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack}
          sx={{ color: colors.text.secondary, mb: 3, '&:hover': { color: colors.primary[400] }, textTransform: 'none', fontWeight: 600 }}>
          ← Back to All Users
        </Button>

        <Card sx={{ ...glassStyles.card, mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={2} sx={{ textAlign: 'center' }}>
                <Avatar src={userDetails.avatar} sx={{ width: 100, height: 100, mx: 'auto', border: `3px solid ${colors.primary[500]}`, boxShadow: `0 0 20px ${colors.primary[500]}30` }}>
                  {userDetails.name?.charAt(0)}
                </Avatar>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h5" sx={{ color: colors.text.primary, fontWeight: 700 }}>{userDetails.name}</Typography>
                <Typography variant="body2" sx={{ color: colors.text.tertiary, mb: 1 }}>{userDetails.email}</Typography>
                <Stack direction="row" spacing={1}>
                  <Chip label={userDetails.role} size="small" sx={{ bgcolor: `${colors.primary[500]}15`, color: colors.primary[400], fontWeight: 600 }} />
                  {userDetails.department && <Chip label={userDetails.department} size="small" sx={{ bgcolor: `${colors.secondary[500]}15`, color: colors.secondary[400], fontWeight: 600 }} />}
                </Stack>
              </Grid>
              <Grid item xs={6} md={2} sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: colors.primary[400], fontWeight: 800 }}>{userDetails.totalEntries}</Typography>
                <Typography variant="caption" sx={{ color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Entries</Typography>
              </Grid>
              <Grid item xs={6} md={2} sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: colors.severity.low, fontWeight: 800 }}>{userDetails.totalHours}h</Typography>
                <Typography variant="caption" sx={{ color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Hours</Typography>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button fullWidth variant="outlined" onClick={handleBack} sx={{ borderColor: colors.border.default, color: colors.text.primary, textTransform: 'none' }}>Back</Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ ...glassStyles.card, mb: 4 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" label="From" type="date" value={userDetailFilters.startDate}
                  onChange={e => setUserDetailFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }} sx={{ '& input': { color: colors.text.primary }, '& label': { color: colors.text.tertiary } }} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" label="To" type="date" value={userDetailFilters.endDate}
                  onChange={e => setUserDetailFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }} sx={{ '& input': { color: colors.text.primary }, '& label': { color: colors.text.tertiary } }} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: colors.text.tertiary }}>Activity</InputLabel>
                  <Select label="Activity" value={userDetailFilters.activityType}
                    onChange={e => setUserDetailFilters(prev => ({ ...prev, activityType: e.target.value }))}
                    sx={{ color: colors.text.primary, borderRadius: borderRadius.lg }}>
                    <MenuItem value="">All</MenuItem>
                    {ACTIVITY_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Button fullWidth variant="contained" onClick={() => handleUserClick(selectedUserId)}
                  sx={{ background: gradients.primary, fontWeight: 600, textTransform: 'none', height: 40 }}>
                  Apply Filters
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ ...glassStyles.card }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 3, borderBottom: `1px solid ${colors.border.subtle}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: 700 }}>Activity History</Typography>
              <Chip label={`${userEntries.length} entries`} size="small" sx={{ bgcolor: `${colors.primary[500]}15`, color: colors.primary[400], fontWeight: 600 }} />
            </Box>
            {userEntries.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', color: colors.text.tertiary }}>
                <ScheduleIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                <Typography>No activity records found.</Typography>
              </Box>
            ) : (
              <Box sx={{ maxHeight: 600, overflow: 'auto', p: 2 }}>
                <AnimatePresence>
                  {userEntries.map((entry, idx) => (
                    <motion.div key={entry._id || entry.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}>
                      <Box onClick={() => handleEntryClick(entry)} sx={{ p: 2.5, mb: 1.5, borderRadius: 2, cursor: 'pointer', transition: 'all 0.15s', bgcolor: 'rgba(255,255,255,0.02)', border: `1px solid ${colors.border.subtle}`, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: `${colors.primary[500]}40`, transform: 'translateX(4px)' } }}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" sx={{ color: colors.text.primary, fontWeight: 600, fontSize: '0.85rem' }}>{entry.title}</Typography>
                          </Grid>
                          <Grid item xs={4} sm={3}>
                            <Typography variant="caption" sx={{ color: colors.text.tertiary }}>{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Typography>
                          </Grid>
                          <Grid item xs={4} sm={3}>
                            <Typography variant="caption" sx={{ color: colors.text.secondary }}>{entry.project?.name || '—'}</Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </Box>
            )}
          </CardContent>
        </Card>

        <Dialog open={entryDialogOpen} onClose={() => setEntryDialogOpen(false)} maxWidth="sm" fullWidth
          PaperProps={{ sx: { ...glassStyles.card, backgroundImage: 'none', bgcolor: premiumColors.background.secondary, border: `1px solid ${colors.border.subtle}` } }}>
          <DialogTitle sx={{ color: colors.text.primary, fontWeight: 700 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Entry Details
              <IconButton onClick={() => setEntryDialogOpen(false)} size="small" sx={{ color: colors.text.tertiary }}><CloseIcon /></IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedEntry && (
              <Stack spacing={2.5} sx={{ py: 1, maxHeight: '60vh', overflow: 'auto' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: colors.text.tertiary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Title</Typography>
                  <Typography variant="body1" sx={{ color: colors.text.primary, fontWeight: 600, mt: 0.5 }}>{selectedEntry.title}</Typography>
                </Box>
                {selectedEntry.description && (
                  <Box>
                    <Typography variant="caption" sx={{ color: colors.text.tertiary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Description</Typography>
                    <Typography variant="body2" sx={{ color: colors.text.secondary, mt: 0.5, whiteSpace: 'pre-wrap' }}>{selectedEntry.description}</Typography>
                  </Box>
                )}
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: colors.text.tertiary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Date</Typography>
                    <Typography variant="body2" sx={{ color: colors.text.primary, mt: 0.5 }}>{new Date(selectedEntry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: colors.text.tertiary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Activity Type</Typography>
                    <Typography variant="body2" sx={{ color: colors.text.primary, mt: 0.5 }}>{selectedEntry.activityType || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: colors.text.tertiary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Project</Typography>
                    <Typography variant="body2" sx={{ color: colors.primary[400], mt: 0.5 }}>{selectedEntry.project?.name || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: colors.text.tertiary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Progress</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <LinearProgress variant="determinate" value={selectedEntry.progress || 0} sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: `${colors.primary[500]}10` }} />
                      <Typography variant="caption" sx={{ color: colors.text.primary }}>{selectedEntry.progress || 0}%</Typography>
                    </Box>
                  </Grid>
                  {selectedEntry.blockers && (
                    <Grid item xs={12}>
                      <Typography variant="caption" sx={{ color: colors.text.tertiary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Blockers</Typography>
                      <Typography variant="body2" sx={{ color: colors.text.secondary, mt: 0.5 }}>{selectedEntry.blockers}</Typography>
                    </Grid>
                  )}
                </Grid>
                {selectedEntry.tags?.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ color: colors.text.tertiary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>Tags</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {selectedEntry.tags.map((tag, i) => (
                        <Chip key={i} label={tag} size="small" variant="outlined" sx={{ color: colors.text.secondary, borderColor: colors.border.subtle }} />
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${colors.border.subtle}` }}>
            <Button onClick={() => setEntryDialogOpen(false)} variant="outlined" sx={{ borderColor: colors.border.default, color: colors.text.secondary, textTransform: 'none', fontWeight: 600 }}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // ====== MAIN ADMIN DASHBOARD ======
  return (
    <Box sx={{ minHeight: '100vh', background: colors.background.primary, p: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ color: colors.text.primary, fontWeight: 800, letterSpacing: -0.5 }}>All Users MIS</Typography>
          <Typography variant="body2" sx={{ color: colors.text.tertiary, fontWeight: 500 }}>Monitor team productivity, activity distribution, and workload analytics</Typography>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Total Hours Logged" value={`${summaryStats?.totalHours?.toFixed(1) || 0}h`} icon={<AccessTimeIcon />} color={colors.primary[500]} subtitle="Across all projects" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Active Users" value={summaryStats?.activeUsers || 0} icon={<PeopleIcon />} color={colors.secondary[500]} subtitle="Users with logged hours" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Top Project" value={summaryStats?.topProject || 'N/A'} icon={<WorkIcon />} color={colors.severity.low} subtitle="Most hours logged" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Activity Types" value={analytics?.activityDistribution?.length || 0} icon={<CategoryIcon />} color={colors.severity.high} subtitle="Different work categories" />
        </Grid>
      </Grid>

      <Card sx={{ ...glassStyles.card }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, borderBottom: `1px solid ${colors.border.subtle}` }}>
            <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: 700 }}>Team Productivity Overview</Typography>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
              <TextField size="small" placeholder="Search user..." value={filters.search}
                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                InputProps={{ startAdornment: <SearchIcon sx={{ color: colors.text.tertiary, mr: 1, fontSize: 18 }} /> }}
                sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.md, minWidth: 160, '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }} />
              <FormControl size="small" sx={{ minWidth: 110 }}>
                <Select value={filters.role} onChange={e => setFilters(prev => ({ ...prev, role: e.target.value }))} displayEmpty
                  sx={{ color: colors.text.secondary, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.md, height: 40, '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}>
                  <MenuItem value="">All Roles</MenuItem>
                  {ROLES.map(r => <MenuItem key={r} value={r}>{r.replace('_', ' ')}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
          </Box>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                <TableRow>
                  <TableCell sx={{ color: colors.text.tertiary, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }}>User</TableCell>
                  <TableCell sx={{ color: colors.text.tertiary, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }}>Role</TableCell>
                  <TableCell sx={{ color: colors.text.tertiary, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }}>Department</TableCell>
                  <TableCell sx={{ color: colors.text.tertiary, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }} align="center">Today</TableCell>
                  <TableCell sx={{ color: colors.text.tertiary, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }} align="center">Week</TableCell>
                  <TableCell sx={{ color: colors.text.tertiary, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }} align="center">Hours</TableCell>
                  <TableCell sx={{ color: colors.text.tertiary, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }} align="center">Active</TableCell>
                  <TableCell sx={{ color: colors.text.tertiary, fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((u) => (
                  <TableRow key={u.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar src={u.avatar} sx={{ width: 36, height: 36, bgcolor: colors.primary[500], fontSize: '0.85rem', fontWeight: 700 }}>{u.name?.charAt(0)}</Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ color: colors.text.primary, fontWeight: 600 }}>{u.name}</Typography>
                          <Typography variant="caption" sx={{ color: colors.text.tertiary }}>{u.email}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={u.role?.replace('_', ' ')} size="small" sx={{ fontSize: '0.65rem', fontWeight: 600, bgcolor: u.role === 'admin' ? `${colors.severity.high}15` : `${colors.primary[500]}15`, color: u.role === 'admin' ? colors.severity.high : colors.primary[400], textTransform: 'capitalize' }} />
                    </TableCell>
                    <TableCell><Typography variant="body2" sx={{ color: colors.text.secondary, fontSize: '0.8rem' }}>{u.department || '—'}</Typography></TableCell>
                    <TableCell align="center"><Chip label={u.todayEntries} size="small" sx={{ minWidth: 28, fontWeight: 700, bgcolor: u.todayEntries > 0 ? `${colors.severity.low}15` : 'transparent', color: u.todayEntries > 0 ? colors.severity.low : colors.text.tertiary }} /></TableCell>
                    <TableCell align="center"><Typography variant="body2" sx={{ color: colors.text.primary, fontWeight: 600 }}>{u.weekEntries}</Typography></TableCell>
                    <TableCell align="center"><Typography variant="body2" sx={{ color: colors.primary[400], fontWeight: 700 }}>{u.totalHours}h</Typography></TableCell>
                    <TableCell align="center"><Typography variant="caption" sx={{ color: colors.text.tertiary, fontSize: '0.7rem' }}>{u.lastUpdate ? new Date(u.lastUpdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</Typography></TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" onClick={() => handleUserClick(u.id)}
                        sx={{ borderColor: colors.border.default, color: colors.text.primary, borderRadius: borderRadius.md, textTransform: 'none', fontSize: '0.75rem', fontWeight: 600, '&:hover': { borderColor: colors.primary[400], color: colors.primary[400] } }}>
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 6, color: colors.text.tertiary }}>
                      <SearchIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                      <Typography>No users match the current filters</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={filteredUsers.length} page={page}
            onPageChange={(e, np) => setPage(np)} rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => setRowsPerPage(parseInt(e.target.value, 10))}
            sx={{ color: colors.text.secondary, borderTop: `1px solid ${colors.border.subtle}`, '& .MuiTablePagination-selectIcon': { color: colors.text.tertiary }, '& .MuiTablePagination-actions button': { color: colors.text.primary } }} />
        </CardContent>
      </Card>
    </Box>
  );
};

export default AllUsersMis;