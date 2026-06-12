import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Button, IconButton, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl,
  InputLabel, Slider, Avatar, Tooltip, Divider, TablePagination, LinearProgress,
  Stack, Badge, Paper
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Schedule as ScheduleIcon,
  Today as TodayIcon, DateRange as DateRangeIcon, AccessTime as AccessTimeIcon,
  Close as CloseIcon, Save as SaveIcon, LocationOn as LocationIcon,
  Flag as PriorityIcon, Speed as ProgressIcon, Assignment as ProjectIcon,
  BugReport as FindingIcon, Task as TaskIcon, MoreHoriz as MoreIcon,
  FilterList as FilterIcon, Search as SearchIcon, Sort as SortIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { misAPI, projectAPI, taskAPI, findingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { colors, typography, borderRadius, shadows } from '../theme/designSystem';
import { glassStyles, gradients, premiumColors } from '../theme/premiumTheme';

const ACTIVITY_TYPES = [
  'Development', 'VAPT', 'Code Review', 'Documentation', 'Meeting', 
  'Testing', 'Research', 'Deployment', 'Bug Fix', 'Remediation', 
  'Analysis', 'Support', 'Training', 'Other'
];

const initialForm = {
  title: '', project: '', relatedFinding: '', relatedTask: '',
  activityType: 'Development', workCategory: '', description: '',
  progress: 0,
  blockers: '', dependencies: '', notes: '',
  tags: '', date: new Date().toISOString().slice(0, 10),
};

const SummaryCard = ({ label, value, icon, color, trend }) => (
  <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
    <Card sx={{ 
      ...glassStyles.card,
      background: `linear-gradient(135deg, ${premiumColors.background.card} 0%, rgba(30, 41, 59, 0.4) 100%)`,
      position: 'relative',
      overflow: 'hidden',
      height: '100%'
    }}>
      <Box sx={{ 
        position: 'absolute', 
        top: -10, 
        right: -10, 
        width: 80, 
        height: 80, 
        borderRadius: '50%', 
        background: `${color}10`,
        filter: 'blur(20px)'
      }} />
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Avatar sx={{ 
            bgcolor: `${color}15`, 
            color, 
            width: 42, 
            height: 42,
            boxShadow: `0 0 15px ${color}20`
          }}>
            {icon}
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ 
              color: colors.text.primary, 
              fontWeight: 800, 
              lineHeight: 1,
              mb: 0.5,
              overflowWrap: 'break-word',
              wordBreak: 'break-word'
            }}>
              {value}
            </Typography>
            <Typography variant="caption" sx={{ color: colors.text.tertiary, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'normal', overflowWrap: 'break-word' }}>
              {label}
            </Typography>
          </Box>
        </Box>
        {trend && (
          <Typography variant="caption" sx={{ color: trend > 0 ? colors.severity.low : colors.text.tertiary, display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
            {trend > 0 ? `+${trend}% from last week` : 'No change from last week'}
          </Typography>
        )}
      </CardContent>
    </Card>
  </motion.div>
);

const MyMis = () => {
  const { user } = useAuth();
  const { showToast, showConfirm } = useToast();
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [filters, setFilters] = useState({
    search: '',
    project: '',
    activityType: '',
    tags: '',
    startDate: '',
    endDate: '',
    sortBy: 'newest'
  });
  const [groupBy, setGroupBy] = useState('day');

  const fetchData = useCallback(async () => {
    try {
      const [entriesData, summaryData, projectsData] = await Promise.all([
        misAPI.getEntries({ ...filters, page: page + 1, limit: rowsPerPage }),
        misAPI.getSummary(),
        projectAPI.getProjects(),
      ]);
      setEntries(entriesData?.entries || []);
      setPagination(entriesData?.pagination || { total: 0, pages: 1 });
      setSummary(summaryData);
      setProjects(projectsData || []);
    } catch (err) {
      console.error('Error fetching MIS data:', err);
      showToast('Failed to load MIS data', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, page, rowsPerPage, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load findings/tasks when project changes in form
  useEffect(() => {
    if (form.project) {
      Promise.all([
        findingAPI.getFindings(form.project),
        taskAPI.getTasks({ project: form.project })
      ]).then(([fData, tData]) => {
        setFindings(fData || []);
        setTasks(tData || []);
      }).catch(err => console.error('Error loading related data:', err));
    } else {
      setFindings([]);
      setTasks([]);
    }
  }, [form.project]);

  const handleOpenNew = () => {
    setEditingId(null);
    setForm({ ...initialForm, date: new Date().toISOString().slice(0, 10) });
    setDialogOpen(true);
  };

  const handleEdit = (entry) => {
    setEditingId(entry._id || entry.id);
    setForm({
      title: entry.title || '',
      project: entry.project?._id || entry.project?.id || entry.project || '',
      relatedFinding: entry.relatedFinding?._id || entry.relatedFinding?.id || entry.relatedFinding || '',
      relatedTask: entry.relatedTask?._id || entry.relatedTask?.id || entry.relatedTask || '',
      activityType: entry.activityType || 'Other',
      workCategory: entry.workCategory || '',
      description: entry.description || '',
      progress: entry.progress || 0,
      blockers: entry.blockers || '',
      dependencies: entry.dependencies || '',
      notes: entry.notes || '',
      tags: Array.isArray(entry.tags) ? entry.tags.join(', ') : entry.tags || '',
      date: entry.date ? new Date(entry.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) {
      showToast('Title is required', 'error');
      return;
    }

    try {
      const payload = { ...form };
      payload.tags = typeof payload.tags === 'string' ? payload.tags.split(',').map(t => t.trim()).filter(Boolean) : payload.tags;
      if (!payload.project) delete payload.project;
      if (!payload.relatedFinding) delete payload.relatedFinding;
      if (!payload.relatedTask) delete payload.relatedTask;
      
      if (editingId) {
        await misAPI.updateEntry(editingId, payload);
        showToast('MIS entry updated successfully', 'success');
      } else {
        await misAPI.createEntry(payload);
        showToast('MIS entry created successfully', 'success');
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to save MIS entry', 'error');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: 'Delete MIS Entry',
      message: 'Are you sure you want to delete this activity log? This action cannot be undone.',
      severity: 'warning',
      confirmLabel: 'Delete'
    });

    if (!confirmed) return;

    try {
      await misAPI.deleteEntry(id);
      showToast('MIS entry deleted', 'success');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete entry', 'error');
    }
  };

  const handleViewDetail = (entry) => {
    setDetailEntry(entry);
    setDetailOpen(true);
  };

  const sortedEntries = useMemo(() => {
    let result = [...entries];
    if (filters.sortBy === 'oldest') result.sort((a, b) => new Date(a.date) - new Date(b.date));
    else result.sort((a, b) => new Date(b.date) - new Date(a.date));
    return result;
  }, [entries, filters.sortBy]);

  const groupedEntries = useMemo(() => {
    const groups = {};
    sortedEntries.forEach(e => {
      const d = new Date(e.date || e.createdAt);
      let key;
      if (groupBy === 'week') {
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay());
        key = `Week of ${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else if (groupBy === 'month') {
        key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      } else {
        key = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return groups;
  }, [sortedEntries, groupBy]);

  const updateFilter = (field, value) => {
    setPage(0);
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', background: colors.background.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <LinearProgress sx={{ width: 200, borderRadius: 1 }} />
          <Typography sx={{ color: colors.text.tertiary, fontWeight: 500 }}>Loading Activity Logs...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: colors.background.primary, p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ color: colors.text.primary, fontWeight: 800, letterSpacing: -0.5 }}>
            My MIS
          </Typography>
          <Typography variant="body2" sx={{ color: colors.text.tertiary, fontWeight: 500 }}>
            Daily Work Tracker & Productivity Registry
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={handleOpenNew}
          sx={{ 
            background: gradients.primary, 
            fontWeight: 700, 
            borderRadius: borderRadius.lg, 
            px: 3,
            py: 1,
            boxShadow: `0 8px 20px ${colors.primary[500]}40`,
            '&:hover': {
              boxShadow: `0 12px 25px ${colors.primary[500]}60`,
              transform: 'translateY(-2px)'
            },
            transition: 'all 0.2s ease'
          }}
        >
          Add MIS Entry
        </Button>
      </Box>

      {/* Dashboard Summary */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 5 }}>
        <Box sx={{ flex: '1 1 180px', minWidth: 160 }}>
          <SummaryCard label="Today's Entries" value={summary?.today?.entries || 0} icon={<TodayIcon />} color={colors.primary[500]} />
        </Box>
        <Box sx={{ flex: '1 1 180px', minWidth: 160 }}>
          <SummaryCard label="Weekly Entries" value={summary?.week?.entries || 0} icon={<DateRangeIcon />} color={colors.secondary[500]} />
        </Box>
        <Box sx={{ flex: '1 1 180px', minWidth: 160 }}>
          <SummaryCard label="Hours This Week" value={`${summary?.week?.hours || 0}h`} icon={<AccessTimeIcon />} color={colors.severity.low} />
        </Box>
        <Box sx={{ flex: '1 1 180px', minWidth: 160 }}>
          <SummaryCard label="Active Projects" value={summary?.activeProjects || 0} icon={<ProjectIcon />} color={colors.severity.medium} />
        </Box>
        <Box sx={{ flex: '1 1 180px', minWidth: 160 }}>
          <SummaryCard label="Top Category" value={summary?.topCategory || 'N/A'} icon={<TaskIcon />} color={colors.severity.high} />
        </Box>
        <Box sx={{ flex: '1 1 180px', minWidth: 160 }}>
          <SummaryCard label="Productivity" value={`${summary?.productivityScore || 0}%`} icon={<ProgressIcon />} color={colors.severity.info} trend={summary?.productivityScore > 70 ? 12 : 0} />
        </Box>
        <Box sx={{ flex: '1 1 180px', minWidth: 160 }}>
          <SummaryCard label="Last Update" value={summary?.lastUpdate ? new Date(summary.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'} icon={<ScheduleIcon />} color={colors.primary[400]} />
        </Box>
      </Box>

      {/* Filters & Tools */}
      <Card sx={{ ...glassStyles.card, mb: 4, border: `1px solid ${colors.border.subtle}` }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search title, notes, blockers, tags..."
                value={filters.search}
                onChange={e => updateFilter('search', e.target.value)}
                InputProps={{ startAdornment: <SearchIcon sx={{ color: colors.text.tertiary, mr: 1, fontSize: 18 }} /> }}
                sx={{ '& input': { color: colors.text.primary }, '& fieldset': { borderColor: colors.border.subtle } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: colors.text.tertiary }}>Project</InputLabel>
                <Select 
                  label="Project"
                  value={filters.project} 
                  onChange={e => updateFilter('project', e.target.value)}
                  sx={{ color: colors.text.primary, borderRadius: borderRadius.lg }}
                >
                  <MenuItem value="">All Projects</MenuItem>
                  {projects.map(p => <MenuItem key={p._id || p.id} value={p._id || p.id}>{p.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: colors.text.tertiary }}>Activity Type</InputLabel>
                <Select 
                  label="Activity Type"
                  value={filters.activityType} 
                  onChange={e => updateFilter('activityType', e.target.value)}
                  sx={{ color: colors.text.primary, borderRadius: borderRadius.lg }}
                >
                  <MenuItem value="">All Activities</MenuItem>
                  {ACTIVITY_TYPES.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: colors.text.tertiary }}>Sort By</InputLabel>
                <Select 
                  label="Sort By"
                  value={filters.sortBy} 
                  onChange={e => updateFilter('sortBy', e.target.value)}
                  sx={{ color: colors.text.primary, borderRadius: borderRadius.lg }}
                >
                  <MenuItem value="newest">Newest First</MenuItem>
                  <MenuItem value="oldest">Oldest First</MenuItem>
                  <MenuItem value="project">Project</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: colors.text.tertiary }}>Group By</InputLabel>
                <Select 
                  label="Group By"
                  value={groupBy} 
                  onChange={e => setGroupBy(e.target.value)}
                  sx={{ color: colors.text.primary, borderRadius: borderRadius.lg }}
                >
                  <MenuItem value="day">Day</MenuItem>
                  <MenuItem value="week">Week</MenuItem>
                  <MenuItem value="month">Month</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField fullWidth size="small" label="From" type="date" value={filters.startDate}
                onChange={e => updateFilter('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }} sx={{ '& input': { color: colors.text.primary }, '& label': { color: colors.text.tertiary } }} />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField fullWidth size="small" label="To" type="date" value={filters.endDate}
                onChange={e => updateFilter('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }} sx={{ '& input': { color: colors.text.primary }, '& label': { color: colors.text.tertiary } }} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth size="small" label="Tags" placeholder="api, retest" value={filters.tags}
                onChange={e => updateFilter('tags', e.target.value)}
                sx={{ '& input': { color: colors.text.primary }, '& label': { color: colors.text.tertiary } }} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Timeline View */}
      <AnimatePresence mode="popLayout">
        {Object.entries(groupedEntries).length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10, ...glassStyles.card }}>
            <MoreIcon sx={{ fontSize: 64, color: colors.text.tertiary, mb: 2, opacity: 0.3 }} />
            <Typography variant="h6" sx={{ color: colors.text.secondary }}>No entries found</Typography>
            <Typography variant="body2" sx={{ color: colors.text.tertiary }}>Try adjusting your filters or add a new MIS entry.</Typography>
          </Box>
        ) : (
          Object.entries(groupedEntries).map(([groupKey, groupEntries], groupIdx) => (
            <Box key={groupKey} component={motion.div} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: groupIdx * 0.1 }} sx={{ mb: 6, position: 'relative' }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2, 
                mb: 3, 
                position: 'sticky', 
                top: 80, 
                zIndex: 10,
                background: `${colors.background.primary}ee`,
                backdropFilter: 'blur(10px)',
                py: 1,
                borderRadius: borderRadius.md
              }}>
                <Avatar sx={{ bgcolor: colors.primary[500], width: 32, height: 32 }}>
                  <TodayIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: 700 }}>
                  {groupKey}
                </Typography>
                <Chip 
                  label={`${groupEntries.length} entries`} 
                  size="small" 
                  sx={{ bgcolor: `${colors.primary[500]}15`, color: colors.primary[400], fontWeight: 600 }} 
                />
                <Box sx={{ flex: 1, height: '1px', background: `linear-gradient(90deg, ${colors.border.subtle}, transparent)` }} />
              </Box>

              <Grid container spacing={3}>
                {groupEntries.map((entry, idx) => (
                  <Grid item xs={12} md={6} lg={4} key={entry._id || entry.id}>
                    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                      <Card
                        onClick={() => handleViewDetail(entry)}
                        sx={{ 
                          ...glassStyles.card, 
                          cursor: 'pointer', 
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          border: `1px solid ${colors.border.subtle}`,
                          '&:hover': {
                            ...glassStyles.cardHover,
                            borderColor: colors.primary[500],
                            boxShadow: `0 12px 30px ${colors.primary[500]}20`
                          }
                        }}
                      >
                        <CardContent sx={{ p: 2.5, flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <Chip 
                                label={entry.activityType} 
                                size="small" 
                                sx={{ 
                                  bgcolor: `${colors.secondary[500]}15`, 
                                  color: colors.secondary[400], 
                                  fontWeight: 700,
                                  fontSize: '0.65rem',
                                  textTransform: 'uppercase'
                                }} 
                              />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEdit(entry); }} sx={{ color: colors.text.tertiary, '&:hover': { color: colors.primary[400], bgcolor: `${colors.primary[500]}15` } }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(entry._id || entry.id); }} sx={{ color: colors.text.tertiary, '&:hover': { color: colors.severity.critical, bgcolor: `${colors.severity.critical}15` } }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>

                          <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: 700, mb: 1, lineHeight: 1.3 }}>
                            {entry.title}
                          </Typography>

                          {entry.project && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                              <ProjectIcon sx={{ fontSize: 14, color: colors.primary[400] }} />
                              <Typography variant="caption" sx={{ color: colors.primary[400], fontWeight: 600 }}>
                                {entry.project?.name || 'Private Project'}
                              </Typography>
                            </Box>
                          )}

                          <Typography variant="body2" sx={{ 
                            color: colors.text.secondary, 
                            mb: 2, 
                            display: '-webkit-box', 
                            WebkitLineClamp: 2, 
                            WebkitBoxOrient: 'vertical', 
                            overflow: 'hidden',
                            minHeight: '3em'
                          }}>
                            {entry.description || 'No description provided.'}
                          </Typography>

                          <Divider sx={{ my: 1.5, borderColor: colors.border.subtle }} />

                          {entry.tags?.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                              {entry.tags.slice(0, 3).map(tag => (
                                <Chip key={tag} label={tag} size="small"
                                  sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, bgcolor: `${colors.text.tertiary}15`, color: colors.text.tertiary }} />
                              ))}
                              {entry.tags.length > 3 && (
                                <Typography variant="caption" sx={{ color: colors.text.tertiary, alignSelf: 'center' }}>+{entry.tags.length - 3}</Typography>
                              )}
                            </Box>
                          )}
                        </CardContent>
                        {entry.progress > 0 && (
                          <LinearProgress 
                            variant="determinate" 
                            value={entry.progress} 
                            sx={{ 
                              height: 3, 
                              bgcolor: `${colors.primary[500]}10`,
                              '& .MuiLinearProgress-bar': {
                                background: gradients.primary
                              }
                            }} 
                          />
                        )}
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))
        )}
      </AnimatePresence>

      {/* Entry Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            ...glassStyles.card,
            backgroundImage: 'none',
            bgcolor: premiumColors.background.secondary,
            border: `1px solid ${colors.border.subtle}`
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.border.subtle}`, pb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: colors.text.primary }}>
            {editingId ? 'Edit MIS Entry' : 'New MIS Entry'}
          </Typography>
          <IconButton onClick={() => setDialogOpen(false)} sx={{ color: colors.text.tertiary }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Activity Title"
                placeholder="e.g., VAPT assessment of Login Module"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
                variant="outlined"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: borderRadius.md } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Project</InputLabel>
                <Select
                  label="Project"
                  value={form.project}
                  onChange={e => setForm({ ...form, project: e.target.value })}
                  sx={{ borderRadius: borderRadius.md }}
                >
                  <MenuItem value="">None / General</MenuItem>
                  {projects.map(p => <MenuItem key={p._id || p.id} value={p._id || p.id}>{p.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Activity Type</InputLabel>
                <Select
                  label="Activity Type"
                  value={form.activityType}
                  onChange={e => setForm({ ...form, activityType: e.target.value })}
                  sx={{ borderRadius: borderRadius.md }}
                >
                  {ACTIVITY_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            
            {form.project && (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Related Finding</InputLabel>
                    <Select
                      label="Related Finding"
                      value={form.relatedFinding}
                      onChange={e => setForm({ ...form, relatedFinding: e.target.value })}
                      sx={{ borderRadius: borderRadius.md }}
                    >
                      <MenuItem value="">None</MenuItem>
                      {findings.map(f => <MenuItem key={f._id || f.id} value={f._id || f.id}>{f.title}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Related Task</InputLabel>
                    <Select
                      label="Related Task"
                      value={form.relatedTask}
                      onChange={e => setForm({ ...form, relatedTask: e.target.value })}
                      sx={{ borderRadius: borderRadius.md }}
                    >
                      <MenuItem value="">None</MenuItem>
                      {tasks.map(t => <MenuItem key={t._id || t.id} value={t._id || t.id}>{t.title}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}





            <Grid item xs={12}>
              <Box sx={{ px: 1 }}>
                <Typography variant="caption" sx={{ color: colors.text.tertiary, mb: 1, display: 'block' }}>
                  Progress: {form.progress}%
                </Typography>
                <Slider
                  value={form.progress}
                  onChange={(e, val) => setForm({ ...form, progress: val })}
                  valueLabelDisplay="auto"
                  sx={{ color: colors.primary[500] }}
                />
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: borderRadius.md } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Work Category" placeholder="e.g., Security Testing, Feature Dev"
                value={form.workCategory} onChange={e => setForm({ ...form, workCategory: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: borderRadius.md } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="date" label="Date" InputLabelProps={{ shrink: true }}
                value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: borderRadius.md } }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Blockers"
                placeholder="What's holding you back?"
                value={form.blockers}
                onChange={e => setForm({ ...form, blockers: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: borderRadius.md } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Dependencies"
                placeholder="What does this depend on?"
                value={form.dependencies}
                onChange={e => setForm({ ...form, dependencies: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: borderRadius.md } }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes"
                placeholder="Additional notes..."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: borderRadius.md } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Blockers"
                placeholder="What's holding you back?"
                value={form.blockers}
                onChange={e => setForm({ ...form, blockers: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: borderRadius.md } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tags"
                placeholder="Comma separated: vapt, critical, meeting"
                value={form.tags}
                onChange={e => setForm({ ...form, tags: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: borderRadius.md } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: `1px solid ${colors.border.subtle}` }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: colors.text.secondary }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSave}
            sx={{ 
              background: gradients.primary, 
              fontWeight: 700, 
              borderRadius: borderRadius.md,
              px: 4
            }}
          >
            {editingId ? 'Update Entry' : 'Create Entry'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog 
        open={detailOpen} 
        onClose={() => setDetailOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            ...glassStyles.card,
            backgroundImage: 'none',
            bgcolor: premiumColors.background.secondary,
            border: `1px solid ${colors.border.subtle}`
          }
        }}
      >
        {detailEntry && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: colors.text.primary }}>
                Activity Details
              </Typography>
              <IconButton onClick={() => setDetailOpen(false)} sx={{ color: colors.text.tertiary }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip label={detailEntry.activityType} size="small" sx={{ bgcolor: `${colors.secondary[500]}15`, color: colors.secondary[400], fontWeight: 700 }} />
                </Box>
                <Typography variant="h5" sx={{ color: colors.text.primary, fontWeight: 800, mb: 1 }}>
                  {detailEntry.title}
                </Typography>
                <Typography variant="body2" sx={{ color: colors.text.secondary, mb: 3, whiteSpace: 'pre-wrap' }}>
                  {detailEntry.description || 'No description provided.'}
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Stack spacing={1}>
                      <Typography variant="caption" sx={{ color: colors.text.tertiary, textTransform: 'uppercase', fontWeight: 600 }}>Project</Typography>
                      <Typography variant="body2" sx={{ color: colors.text.primary }}>{detailEntry.project?.name || 'N/A'}</Typography>
                    </Stack>
                  </Grid>
                  <Grid item xs={6}>
                    <Stack spacing={1}>
                      <Typography variant="caption" sx={{ color: colors.text.tertiary, textTransform: 'uppercase', fontWeight: 600 }}>Progress</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={detailEntry.progress} sx={{ flex: 1, height: 4, borderRadius: 2 }} />
                        <Typography variant="caption" sx={{ color: colors.text.primary }}>{detailEntry.progress}%</Typography>
                      </Box>
                    </Stack>
                  </Grid>
                </Grid>
              </Box>

              {detailEntry.blockers && (
                <Box sx={{ p: 2, bgcolor: `${colors.severity.critical}10`, borderRadius: borderRadius.md, mb: 2, border: `1px solid ${colors.severity.critical}20` }}>
                  <Typography variant="caption" sx={{ color: colors.severity.critical, fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <PriorityIcon sx={{ fontSize: 14 }} /> Blockers
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.text.primary }}>{detailEntry.blockers}</Typography>
                </Box>
              )}

              {detailEntry.tags?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" sx={{ color: colors.text.tertiary, textTransform: 'uppercase', fontWeight: 600, mb: 1, display: 'block' }}>Tags</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {detailEntry.tags.map(tag => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ color: colors.text.secondary, borderColor: colors.border.subtle }} />
                    ))}
                  </Box>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setDetailOpen(false)} sx={{ color: colors.text.secondary }}>Close</Button>
              <Button 
                variant="outlined" 
                startIcon={<EditIcon />}
                onClick={() => {
                  setDetailOpen(false);
                  handleEdit(detailEntry);
                }}
                sx={{ borderColor: colors.border.default, color: colors.text.primary }}
              >
                Edit Entry
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default MyMis;
