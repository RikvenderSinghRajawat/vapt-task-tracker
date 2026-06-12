import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  FormControl, InputLabel, Select, CircularProgress, Alert, Tooltip,
  TableSortLabel, ToggleButtonGroup, ToggleButton, Fade, LinearProgress,
  InputAdornment, Divider
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Refresh as RefreshIcon, CalendarMonth as MonthViewIcon,
  ViewWeek as WeekViewIcon, List as ListViewIcon,
  ArrowBack as ArrowBackIcon, ArrowForward as ArrowForwardIcon,
  Search as SearchIcon, FilterList as FilterIcon,
  EventNote as EventNoteIcon, Schedule as ScheduleIcon,
  Warning as WarningIcon, Error as ErrorIcon,
  CheckCircle as CheckCircleIcon, Info as InfoIcon,
  Close as CloseIcon, Save as SaveIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { vaptCalendarAPI } from '../services/api';
import { colors, typography, spacing, shadows, borderRadius, transitions, componentStyles } from '../theme/designSystem';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const FREQUENCIES = ['monthly','quarterly','half_yearly','yearly','custom'];
const PROJECT_TYPES = ['Web Application','Mobile Application','Network','Cloud','API','Social Engineering','Physical','Other'];

const statusConfig = {
  overdue:  { color: colors.severity.critical, bg: 'rgba(215, 58, 73, 0.15)', icon: <ErrorIcon />, label: 'Overdue' },
  due_soon: { color: colors.severity.high, bg: 'rgba(240, 136, 62, 0.15)', icon: <WarningIcon />, label: 'Due Soon' },
  upcoming: { color: colors.severity.info, bg: 'rgba(88, 166, 255, 0.15)', icon: <InfoIcon />, label: 'Upcoming' },
  completed: { color: colors.severity.low, bg: 'rgba(63, 185, 80, 0.15)', icon: <CheckCircleIcon />, label: 'Completed' }
};

const defaultForm = {
  projectName: '', projectType: 'Web Application', assessmentType: 'external',
  lastVaptDate: '', nextVaptDueDate: '', assessmentFrequency: 'yearly', notes: ''
};

const AnimatedCounter = ({ value, duration = 1.2 }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === undefined || value === null) return;
    let start = 0;
    const end = parseInt(value) || 0;
    const step = Math.max(1, Math.floor(end / 30));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(start);
    }, duration * 1000 / 30);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{display}</>;
};

const SeverityGauge = ({ value, total, color, delay = 0 }) => {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <Box sx={{ position: 'relative', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke={colors.background.tertiary} strokeWidth="4" />
        <motion.circle
          cx="36" cy="36" r={r}
          fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] }}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '36px 36px', filter: `drop-shadow(0 0 4px ${color}60)` }}
        />
      </svg>
      <Typography sx={{ position: 'absolute', fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.text.primary }}>
        {value}
      </Typography>
    </Box>
  );
};

const dialogInputSx = {
  '& .MuiInputBase-input': { color: colors.text.primary },
  '& .MuiInputLabel-root': { color: colors.text.secondary },
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: colors.border.default },
    '&:hover fieldset': { borderColor: colors.primary[400] },
    '&.Mui-focused fieldset': { borderColor: colors.primary[500] }
  }
};

const VaptCalendar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast, showConfirm } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('list');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ status: '', frequency: '', search: '' });
  const [sortBy, setSortBy] = useState('nextVaptDueDate');
  const [sortOrder, setSortOrder] = useState('asc');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [stats, setStats] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.frequency && filters.frequency !== 'all') params.frequency = filters.frequency;
      if (filters.search) params.search = filters.search;
      params.sortBy = sortBy;
      params.order = sortOrder;
      const data = await vaptCalendarAPI.getList(params);
      setItems(data);
    } catch (err) {
      setError('Failed to load VAPT Calendar data');
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy, sortOrder]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await vaptCalendarAPI.getStats();
      setStats(res);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchData(); fetchStats(); }, [fetchData, fetchStats]);

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
  };

  const openCreate = () => {
    setEditing(null); setForm(defaultForm); setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item.id);
    setForm({
      projectName: item.projectName || '',
      projectType: item.projectType || 'Web Application',
      assessmentType: item.assessmentType || 'external',
      lastVaptDate: item.lastVaptDate ? item.lastVaptDate.slice(0,10) : '',
      nextVaptDueDate: item.nextVaptDueDate ? item.nextVaptDueDate.slice(0,10) : '',
      assessmentFrequency: item.assessmentFrequency || 'yearly',
      notes: item.notes || ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.lastVaptDate) delete payload.lastVaptDate;
      if (!payload.nextVaptDueDate) delete payload.nextVaptDueDate;
      if (editing) {
        await vaptCalendarAPI.update(editing, payload);
        showToast('Assessment updated successfully');
      } else {
        await vaptCalendarAPI.create(payload);
        showToast('Assessment created successfully');
      }
      setDialogOpen(false);
      fetchData(); fetchStats();
    } catch (err) {
      showToast(err.message || 'Failed to save', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = (id, name) => {
    showConfirm(`Delete assessment for "${name}"? This action cannot be undone.`, async () => {
      try {
        await vaptCalendarAPI.delete(id);
        showToast('Assessment deleted');
        fetchData(); fetchStats();
      } catch (err) {
        showToast(err.message || 'Delete failed', 'error');
      }
    });
  };

  const dayEntry = (day) => {
    if (!day) return null;
    const ds = day.toISOString().slice(0,10);
    return items.find(i => i.nextVaptDueDate && i.nextVaptDueDate.slice(0,10) === ds) || null;
  };

  const renderMonthGrid = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = first.getDay();
    const daysInMonth = last.getDate();
    const weeks = [];
    let cells = [];

    for (let i = 0; i < startPad; i++) {
      cells.push(<Box key={`pad-${i}`} sx={{ height: 95, border: `1px solid ${colors.border.subtle}`, bgcolor: colors.background.primary, borderRadius: '4px' }} />);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const entry = dayEntry(date);
      const isToday = date.toDateString() === new Date().toDateString();
      const multiple = items.filter(i => i.nextVaptDueDate && i.nextVaptDueDate.slice(0,10) === date.toISOString().slice(0,10));

      cells.push(
        <Box key={d} sx={{
          height: 95, border: `1px solid ${colors.border.subtle}`,
          p: 0.5, position: 'relative', borderRadius: '4px',
          bgcolor: isToday ? `${colors.primary[500]}10` : colors.background.secondary,
          overflow: 'hidden', cursor: multiple.length > 0 ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          '&:hover': { bgcolor: colors.background.tertiary, borderColor: colors.border.default }
        }}>
          <Typography variant="caption" sx={{
            fontWeight: isToday ? 700 : 500, fontSize: '0.75rem',
            color: isToday ? colors.primary[400] : colors.text.secondary
          }}>{d}</Typography>
          {multiple.slice(0, 2).map((entry, ei) => (
            <Tooltip key={ei} title={`${entry.projectName} - ${entry.status}`}>
              <Box sx={{
                mt: 0.3, py: 0.1, px: 0.5, borderRadius: '3px', fontSize: '0.6rem', lineHeight: 1.3,
                bgcolor: statusConfig[entry.status]?.bg || 'transparent',
                color: statusConfig[entry.status]?.color || colors.text.secondary,
                fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                cursor: 'pointer'
              }} onClick={() => openEdit(entry)}>
                {entry.projectName}
              </Box>
            </Tooltip>
          ))}
          {multiple.length > 2 && (
            <Typography variant="caption" sx={{ fontSize: '0.6rem', color: colors.text.tertiary, display: 'block', mt: 0.2 }}>
              +{multiple.length - 2} more
            </Typography>
          )}
        </Box>
      );
      if ((startPad + d) % 7 === 0 || d === daysInMonth) {
        weeks.push(
          <Box key={`w-${d}`} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
            {cells}
          </Box>
        );
        cells = [];
      }
    }
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
            sx={{ color: colors.text.secondary, '&:hover': { color: colors.text.primary } }}>Prev</Button>
          <Typography variant="h6" sx={{ fontWeight: typography.weight.semibold, color: colors.text.primary }}>
            {MONTHS[month]} {year}
          </Typography>
          <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
            sx={{ color: colors.text.secondary, '&:hover': { color: colors.text.primary } }}>Next</Button>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', mb: 0.5, gap: '2px' }}>
          {DAYS.map(d => (
            <Typography key={d} variant="caption" align="center" sx={{ fontWeight: 600, color: colors.text.tertiary, fontSize: '0.7rem', py: 0.5 }}>
              {d}
            </Typography>
          ))}
        </Box>
        {weeks}
      </motion.div>
    );
  };

  const renderWeekView = () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        {days.map((day, idx) => {
          const ds = day.toISOString().slice(0,10);
          const dayItems = items.filter(i => i.nextVaptDueDate && i.nextVaptDueDate.slice(0,10) === ds);
          const isToday = day.toDateString() === today.toDateString();
          return (
            <motion.div key={ds} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
              <Paper sx={{
                p: 1.5, mb: 1, display: 'flex', alignItems: 'center', gap: 2,
                bgcolor: isToday ? `${colors.primary[500]}08` : colors.background.secondary,
                border: `1px solid ${isToday ? colors.primary[500] : colors.border.subtle}`,
                borderRadius: borderRadius.lg,
                transition: 'all 0.2s ease',
                '&:hover': { borderColor: colors.border.default, bgcolor: colors.background.tertiary }
              }}>
                <Box sx={{ minWidth: 100, textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: isToday ? colors.primary[400] : colors.text.tertiary, fontWeight: isToday ? 600 : 400 }}>
                    {day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Typography>
                </Box>
                {dayItems.length === 0 ? (
                  <Typography variant="body2" sx={{ color: colors.text.tertiary }}>No assessments due</Typography>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {dayItems.map(item => (
                      <Chip key={item.id}
                        label={`${item.projectName}${item.daysRemaining !== null && item.daysRemaining !== undefined ? ` (${item.daysRemaining >= 0 ? `${item.daysRemaining}d` : 'Overdue'})` : ''}`}
                        sx={{
                          bgcolor: statusConfig[item.status]?.bg || 'transparent',
                          color: statusConfig[item.status]?.color || colors.text.secondary,
                          fontWeight: 500, fontSize: typography.size.xs, cursor: 'pointer'
                        }}
                        size="small" onClick={() => openEdit(item)}
                      />
                    ))}
                  </Box>
                )}
              </Paper>
            </motion.div>
          );
        })}
      </motion.div>
    );
  };

  const renderListView = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <TableContainer component={Paper} sx={{
        bgcolor: 'transparent', border: `1px solid ${colors.border.subtle}`,
        borderRadius: borderRadius.xl, overflow: 'hidden'
      }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: colors.background.tertiary }}>
              {['Project', 'Type', 'Frequency', 'Last VAPT', 'Next Due', 'Status', ''].map((h, i) => {
                const sortFields = ['projectName', null, null, 'lastVaptDate', 'nextVaptDueDate', null];
                const sf = sortFields[i];
                return (
                  <TableCell key={h} sx={{ borderBottom: `1px solid ${colors.border.subtle}`, color: colors.text.secondary, fontWeight: 600, fontSize: typography.size.xs }}>
                    {sf ? (
                      <TableSortLabel
                        active={sortBy === sf}
                        direction={sortBy === sf ? sortOrder : 'asc'}
                        onClick={() => handleSort(sf)}
                        sx={{ color: 'inherit !important', '&.Mui-active': { color: `${colors.primary[400]} !important` } }}
                      >
                        {h}
                      </TableSortLabel>
                    ) : h}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            <AnimatePresence>
              {items.map((item, idx) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => openEdit(item)}
                  style={{ cursor: 'pointer', background: colors.background.secondary, borderBottom: `1px solid ${colors.border.subtle}` }}
                  onMouseEnter={e => { e.currentTarget.style.background = colors.background.tertiary; }}
                  onMouseLeave={e => { e.currentTarget.style.background = colors.background.secondary; }}
                >
                  <TableCell sx={{ borderBottom: `1px solid ${colors.border.subtle}`, color: colors.text.primary }}>
                    <Typography fontWeight={500} fontSize={typography.size.sm}>{item.projectName}</Typography>
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                    <Chip label={item.assessmentType || '-'} size="small"
                      sx={{
                        bgcolor: item.assessmentType === 'internal' ? 'rgba(88,166,255,0.15)' : 'rgba(240,136,62,0.15)',
                        color: item.assessmentType === 'internal' ? colors.severity.info : colors.severity.high,
                        fontWeight: 600, fontSize: typography.size.xs, textTransform: 'capitalize'
                      }} />
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                    <Chip label={item.assessmentFrequency} size="small" variant="outlined"
                      sx={{ borderColor: colors.border.default, color: colors.text.secondary, fontSize: typography.size.xs }} />
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${colors.border.subtle}`, color: colors.text.secondary, fontSize: typography.size.sm }}>
                    {item.lastVaptDate ? new Date(item.lastVaptDate).toLocaleDateString('en-GB') : '-'}
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography fontSize={typography.size.sm} sx={{
                        color: item.daysRemaining < 0 ? colors.severity.critical : item.daysRemaining <= 30 ? colors.severity.high : colors.text.primary
                      }}>
                        {item.nextVaptDueDate ? new Date(item.nextVaptDueDate).toLocaleDateString('en-GB') : '-'}
                      </Typography>
                      {item.daysRemaining !== null && item.daysRemaining !== undefined && (
                        <Chip label={item.daysRemaining >= 0 ? `${item.daysRemaining}d` : 'Overdue'}
                          size="small"
                          sx={{
                            height: 18, fontSize: '0.6rem',
                            bgcolor: item.daysRemaining < 0 ? 'rgba(215,58,73,0.2)' : item.daysRemaining <= 30 ? 'rgba(240,136,62,0.2)' : 'transparent',
                            color: item.daysRemaining < 0 ? colors.severity.critical : item.daysRemaining <= 30 ? colors.severity.high : colors.text.tertiary,
                            fontWeight: 600
                          }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                    <Chip label={item.status} size="small"
                      sx={{
                        bgcolor: statusConfig[item.status]?.bg || 'transparent',
                        color: statusConfig[item.status]?.color || colors.text.secondary,
                        fontWeight: 600, fontSize: typography.size.xs
                      }} />
                  </TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${colors.border.subtle}` }} onClick={e => e.stopPropagation()}>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(item)}
                        sx={{ color: colors.text.secondary, '&:hover': { color: colors.primary[400], bgcolor: `${colors.primary[500]}15` } }}>
                        <EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" onClick={() => handleDelete(item.id, item.projectName)}
                        sx={{ color: colors.text.secondary, '&:hover': { color: colors.severity.critical, bgcolor: `${colors.severity.critical}15` } }}>
                        <DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </Box>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
            {items.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ borderBottom: 'none', py: 6 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <EventNoteIcon sx={{ fontSize: 48, color: colors.text.tertiary, mb: 1 }} />
                    <Typography color="text.secondary" mb={2}>No assessments found</Typography>
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreate}
                      sx={{ borderColor: colors.border.default, color: colors.text.secondary }}>Add Assessment</Button>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </motion.div>
  );

  const totalForStats = stats ? (stats.total || 1) : 1;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Box sx={{
          display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 4, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 }
        }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <EventNoteIcon sx={{ fontSize: 28, color: colors.primary[400] }} />
              <Typography variant="h4" sx={{
                fontWeight: typography.weight.bold, color: colors.text.primary,
                fontSize: { xs: typography.size.xl, sm: typography.size['2xl'] },
                letterSpacing: typography.tracking.tight
              }}>VAPT Assessment Calendar</Typography>
            </Box>
            <Typography variant="body1" sx={{ color: colors.text.tertiary, fontSize: typography.size.sm }}>
              Track, manage, and monitor penetration testing schedules across all projects
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={() => { fetchData(); fetchStats(); }}
              sx={{ borderColor: colors.border.default, color: colors.text.secondary, '&:hover': { borderColor: colors.primary[500], color: colors.primary[400] } }}>
              Refresh
            </Button>
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openCreate}
              sx={{
                background: `linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[700]} 100%)`,
                '&:hover': { background: `linear-gradient(135deg, ${colors.primary[500]} 0%, ${colors.primary[600]} 100%)` }
              }}>
              Add Assessment
            </Button>
          </Box>
        </Box>
      </motion.div>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: borderRadius.lg, bgcolor: `${colors.severity.critical}15`, color: colors.severity.critical, border: `1px solid ${colors.severity.critical}30` }}>{error}</Alert>}

      {/* Premium Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Assessments', value: stats?.total || 0, max: totalForStats, color: colors.primary[400], icon: <EventNoteIcon />, gradient: `linear-gradient(145deg, rgba(6,182,212,0.1) 0%, ${colors.background.secondary} 100%)` },
          { label: 'Upcoming (>30d)', value: stats?.upcoming || 0, max: totalForStats, color: colors.severity.info, icon: <InfoIcon />, gradient: `linear-gradient(145deg, rgba(88,166,255,0.1) 0%, ${colors.background.secondary} 100%)` },
          { label: 'Due Within 30 Days', value: stats?.dueSoon || 0, max: totalForStats, color: colors.severity.high, icon: <WarningIcon />, gradient: `linear-gradient(145deg, rgba(240,136,62,0.1) 0%, ${colors.background.secondary} 100%)` },
          { label: 'Overdue', value: stats?.overdue || 0, max: totalForStats, color: colors.severity.critical, icon: <ErrorIcon />, gradient: `linear-gradient(145deg, rgba(215,58,73,0.1) 0%, ${colors.background.secondary} 100%)` }
        ].map((s, i) => (
          <Grid item xs={6} sm={3} key={s.label}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
              <Card sx={{
                background: s.gradient,
                border: `1px solid ${colors.border.subtle}`,
                borderRadius: borderRadius.xl,
                position: 'relative', overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px rgba(0,0,0,0.2)`, borderColor: `${s.color}40` }
              }} elevation={0}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${s.color}, transparent)`, opacity: 0.8 }} />
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: borderRadius.lg,
                    bgcolor: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {React.cloneElement(s.icon, { sx: { fontSize: 22, color: s.color } })}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h4" sx={{
                      fontWeight: typography.weight.bold, color: colors.text.primary,
                      fontFamily: typography.fontFamily.mono, lineHeight: 1.2,
                      fontSize: { xs: '1.3rem', sm: '1.5rem' }
                    }}>
                      <AnimatedCounter value={s.value} />
                    </Typography>
                    <Typography variant="caption" sx={{
                      color: colors.text.secondary, fontWeight: typography.weight.medium,
                      fontSize: typography.size.xs, textTransform: 'uppercase', letterSpacing: typography.tracking.wide
                    }}>
                      {s.label}
                    </Typography>
                  </Box>
                  <SeverityGauge value={s.value} total={totalForStats} color={s.color} delay={i * 0.1} />
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Filter Bar */}
      <Card sx={{
        mb: 3, borderRadius: borderRadius.xl,
        background: colors.background.secondary,
        border: `1px solid ${colors.border.subtle}`,
      }} elevation={0}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField fullWidth size="small" placeholder="Search project or client..."
                value={filters.search}
                onChange={e => setFilters(f => ({...f, search: e.target.value}))}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: colors.text.tertiary }} /></InputAdornment>,
                  sx: {
                    bgcolor: colors.background.tertiary, borderRadius: borderRadius.lg,
                    border: `1px solid ${colors.border.subtle}`, color: colors.text.primary,
                    fontSize: typography.size.sm,
                    '&:hover': { borderColor: colors.border.default },
                    '&.Mui-focused': { borderColor: colors.primary[500] }
                  }
                }}
                sx={{ '& fieldset': { border: 'none' } }}
              />
            </Grid>
            <Grid item xs={6} sm={2}>
              <FormControl fullWidth size="small">
                <Select value={filters.status} displayEmpty
                  onChange={e => setFilters(f => ({...f, status: e.target.value}))}
                  sx={{
                    bgcolor: colors.background.tertiary, borderRadius: borderRadius.lg, color: colors.text.primary,
                    fontSize: typography.size.sm, border: `1px solid ${colors.border.subtle}`,
                    '& fieldset': { border: 'none' }
                  }}>
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="upcoming">Upcoming</MenuItem>
                  <MenuItem value="due_soon">Due Soon</MenuItem>
                  <MenuItem value="overdue">Overdue</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={2}>
              <FormControl fullWidth size="small">
                <Select value={filters.frequency} displayEmpty
                  onChange={e => setFilters(f => ({...f, frequency: e.target.value}))}
                  sx={{
                    bgcolor: colors.background.tertiary, borderRadius: borderRadius.lg, color: colors.text.primary,
                    fontSize: typography.size.sm, border: `1px solid ${colors.border.subtle}`,
                    '& fieldset': { border: 'none' }
                  }}>
                  <MenuItem value="all">All Frequencies</MenuItem>
                  {FREQUENCIES.map(f => <MenuItem key={f} value={f}>{f.replace('_',' ')}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={5}>
              <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setView(v)} size="small"
                  sx={{
                    bgcolor: colors.background.tertiary, borderRadius: borderRadius.lg,
                    '& .MuiToggleButton-root': {
                      borderColor: colors.border.subtle, color: colors.text.tertiary, px: 2, py: 0.5,
                      fontSize: typography.size.xs, textTransform: 'none',
                      '&.Mui-selected': { bgcolor: `${colors.primary[500]}20`, color: colors.primary[400] }
                    }
                  }}>
                  <ToggleButton value="month"><MonthViewIcon sx={{ fontSize: 16, mr: 0.5 }} /> Month</ToggleButton>
                  <ToggleButton value="week"><WeekViewIcon sx={{ fontSize: 16, mr: 0.5 }} /> Week</ToggleButton>
                  <ToggleButton value="list"><ListViewIcon sx={{ fontSize: 16, mr: 0.5 }} /> List</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card sx={{ borderRadius: borderRadius.xl, bgcolor: colors.background.secondary, border: `1px solid ${colors.border.subtle}` }} elevation={0}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6, flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <CircularProgress size={40} sx={{ color: colors.primary[500] }} />
                  <Typography sx={{ color: colors.text.tertiary }}>Loading assessments...</Typography>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <Card sx={{
              borderRadius: borderRadius.xl,
              bgcolor: colors.background.secondary,
              border: `1px solid ${colors.border.subtle}`,
              position: 'relative', overflow: 'hidden',
              '&::before': {
                content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                background: `linear-gradient(90deg, ${colors.primary[500]} 0%, ${colors.secondary[500]} 100%)`
              }
            }} elevation={0}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                {view === 'month' && renderMonthGrid()}
                {view === 'week' && renderWeekView()}
                {view === 'list' && renderListView()}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: colors.background.secondary, borderRadius: borderRadius.xl, backgroundImage: 'none' } }}>
        <DialogTitle sx={{ borderBottom: `1px solid ${colors.border.subtle}`, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1, borderRadius: borderRadius.lg, bgcolor: `${colors.primary[500]}15`, display: 'flex' }}>
                {editing ? <EditIcon sx={{ color: colors.primary[400], fontSize: 20 }} /> : <AddIcon sx={{ color: colors.primary[400], fontSize: 20 }} />}
              </Box>
              <Typography sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold, fontSize: typography.size.lg }}>
                {editing ? 'Edit Assessment' : 'New Assessment'}
              </Typography>
            </Box>
            <IconButton onClick={() => setDialogOpen(false)} sx={{ color: colors.text.tertiary, '&:hover': { color: colors.text.primary } }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField fullWidth label="Project Name" value={form.projectName}
            onChange={e => setForm(f => ({...f, projectName: e.target.value}))} required sx={dialogInputSx} />

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField fullWidth select label="Project Type" value={form.projectType}
                onChange={e => setForm(f => ({...f, projectType: e.target.value}))} sx={dialogInputSx}>
                {PROJECT_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth select label="Assessment Type" value={form.assessmentType}
                onChange={e => setForm(f => ({...f, assessmentType: e.target.value}))} sx={dialogInputSx}>
                <MenuItem value="external">External</MenuItem>
                <MenuItem value="internal">Internal</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth select label="Frequency" value={form.assessmentFrequency}
                onChange={e => setForm(f => ({...f, assessmentFrequency: e.target.value}))} sx={dialogInputSx}>
                {FREQUENCIES.map(f => <MenuItem key={f} value={f}>{f.replace('_',' ')}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={3}>
              <TextField fullWidth type="date" label="Last VAPT Date" value={form.lastVaptDate}
                InputLabelProps={{ shrink: true }} sx={dialogInputSx}
                onChange={e => setForm(f => ({...f, lastVaptDate: e.target.value}))} />
            </Grid>
            <Grid item xs={3}>
              <TextField fullWidth type="date" label="Next Due Date" value={form.nextVaptDueDate}
                InputLabelProps={{ shrink: true }} sx={dialogInputSx}
                onChange={e => setForm(f => ({...f, nextVaptDueDate: e.target.value}))} />
            </Grid>
          </Grid>

          <TextField fullWidth label="Notes" multiline rows={2} value={form.notes}
            onChange={e => setForm(f => ({...f, notes: e.target.value}))} sx={dialogInputSx} />
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${colors.border.subtle}`, p: 2, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)}
            sx={{ color: colors.text.secondary, '&:hover': { bgcolor: colors.background.tertiary } }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.projectName.trim()}
            startIcon={saving ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <SaveIcon />}
            sx={{
              background: `linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[700]} 100%)`,
              '&:hover': { background: `linear-gradient(135deg, ${colors.primary[500]} 0%, ${colors.primary[600]} 100%)` }
            }}>
            {editing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VaptCalendar;
