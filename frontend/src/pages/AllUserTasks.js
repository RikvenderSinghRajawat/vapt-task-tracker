import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TableSortLabel, TablePagination, Chip, IconButton,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Tooltip, FormControl, InputLabel, Select, MenuItem, Grid, Skeleton,
  Stack, Divider
} from '@mui/material';
import {
  CheckCircle as CheckIcon, Schedule as ClockIcon, Warning as WarningIcon,
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Search as SearchIcon, Clear as ClearIcon, FilterList as FilterIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { taskAPI, userAPI, projectAPI } from '../services/api';
import { premiumColors, glassStyles } from '../theme/premiumTheme';
import SeverityBadge from '../shared/components/SeverityBadge';
import GlassCard from '../components/premium/GlassCard';

const statusIcons = {
  open: <WarningIcon sx={{ fontSize: 16 }} />,
  'in-progress': <ClockIcon sx={{ fontSize: 16 }} />,
  in_progress: <ClockIcon sx={{ fontSize: 16 }} />,
  todo: <ClockIcon sx={{ fontSize: 16 }} />,
  review: <ClockIcon sx={{ fontSize: 16 }} />,
  done: <CheckIcon sx={{ fontSize: 16 }} />,
  completed: <CheckIcon sx={{ fontSize: 16 }} />,
  'fix-verification': <CheckIcon sx={{ fontSize: 16 }} />,
  closed: <CheckIcon sx={{ fontSize: 16 }} />,
  pending: <ClockIcon sx={{ fontSize: 16, color: '#64748b' }} />,
  queued: <ClockIcon sx={{ fontSize: 16, color: '#94a3b8' }} />,
};

const STATUS_OPTIONS = ['pending', 'queued', 'in_progress', 'review', 'completed', 'closed', 'cancelled'];
const PRIORITY_OPTIONS = ['critical', 'high', 'medium', 'low', 'informational'];
const TASK_TYPE_OPTIONS = ['assessment', 'remediation', 'review', 'audit', 'documentation', 'compliance', 'infrastructure', 'research', 'client_activity', 'internal', 'meeting', 'testing', 'reporting', 'miscellaneous'];
const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, informational: 4 };
const QUICK_FILTERS = [
  { key: '', label: 'All' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'self-created', label: 'Self Created' },
  { key: 'recently-updated', label: 'Recently Updated' },
];

const AllUserTasks = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '', description: '', assignedTo: '',
    taskType: 'miscellaneous', priority: 'medium',
    status: 'pending', startDate: '', dueDate: '', tags: ''
  });
  const [newTaskErrors, setNewTaskErrors] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: '', status: [], priority: [], taskType: [],
    assignedTo: '', assignedBy: '', createdBy: '', project: '',
    dueDateStart: '', dueDateEnd: '', createdDateStart: '', createdDateEnd: '',
    quickFilter: '',
  });

  const [searchInput, setSearchInput] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  useEffect(() => {
    userAPI.getUsers().then(setUsers).catch(console.error);
    projectAPI.getProjects().then(setProjects).catch(console.error);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }));
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const apiTasks = await taskAPI.getTasks({ limit: 1000 });
      const mapped = (apiTasks || []).map(task => ({
        ...task,
        id: task.id || task._id,
        taskCode: task.taskCode || '',
        title: task.title || 'Untitled Task',
        projectName: task.project?.name || '',
        status: task.status === 'done' ? 'closed' : task.status,
        taskType: task.taskType || 'miscellaneous',
        priority: task.priority || 'medium',
        severity: task.severity || task.priority || 'medium',
      }));
      setTasks(mapped);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      showToast('Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const assignableUsers = useMemo(() => {
    if (!users || !users.length) return [];
    const r = user?.role;
    if (r === 'admin' || r === 'super_admin' || r === 'vapt_analyst' || r === 'vapt_tl') return users.filter(u => u.isActive && u.role !== 'admin' && u.role !== 'super_admin');
    if (r === 'project_manager') return users.filter(u => u.isActive && u.role === 'developer');
    return [];
  }, [users, user?.role]);

  const allActiveUsers = useMemo(() => users.filter(u => u.isActive !== false), [users]);

  const getUserId = (obj) => String(obj?._id || obj?.id || obj || '');

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(t =>
        (t.title || '').toLowerCase().includes(s) ||
        (t.taskCode || '').toLowerCase().includes(s) ||
        (t.description || '').toLowerCase().includes(s)
      );
    }

    if (filters.status.length > 0) {
      result = result.filter(t => filters.status.includes(t.status));
    }

    if (filters.priority.length > 0) {
      result = result.filter(t => filters.priority.includes(t.priority));
    }

    if (filters.taskType.length > 0) {
      result = result.filter(t => filters.taskType.includes(t.taskType));
    }

    if (filters.assignedTo) {
      result = result.filter(t => getUserId(t.assignedTo) === filters.assignedTo);
    }

    if (filters.assignedBy) {
      result = result.filter(t => getUserId(t.assignedBy) === filters.assignedBy);
    }

    if (filters.createdBy) {
      result = result.filter(t => getUserId(t.createdBy) === filters.createdBy);
    }

    if (filters.project) {
      result = result.filter(t => getUserId(t.project) === filters.project);
    }

    if (filters.dueDateStart) {
      const start = new Date(filters.dueDateStart);
      result = result.filter(t => {
        const d = t.dueDate ? new Date(t.dueDate) : null;
        return d && d >= start;
      });
    }
    if (filters.dueDateEnd) {
      const end = new Date(filters.dueDateEnd);
      end.setHours(23, 59, 59, 999);
      result = result.filter(t => {
        const d = t.dueDate ? new Date(t.dueDate) : null;
        return d && d <= end;
      });
    }

    if (filters.createdDateStart) {
      const start = new Date(filters.createdDateStart);
      result = result.filter(t => {
        const d = t.createdAt ? new Date(t.createdAt) : null;
        return d && d >= start;
      });
    }
    if (filters.createdDateEnd) {
      const end = new Date(filters.createdDateEnd);
      end.setHours(23, 59, 59, 999);
      result = result.filter(t => {
        const d = t.createdAt ? new Date(t.createdAt) : null;
        return d && d <= end;
      });
    }

    if (filters.quickFilter === 'overdue') {
      result = result.filter(t => t.slaStatus?.isBreached);
    } else if (filters.quickFilter === 'pending') {
      result = result.filter(t => ['pending', 'queued'].includes(t.status));
    } else if (filters.quickFilter === 'completed') {
      result = result.filter(t => ['completed', 'closed'].includes(t.status));
    } else if (filters.quickFilter === 'self-created') {
      const uid = getUserId(user);
      result = result.filter(t => getUserId(t.createdBy) === uid);
    } else if (filters.quickFilter === 'recently-updated') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      result = result.filter(t => {
        const u = t.updatedAt ? new Date(t.updatedAt) : null;
        return u && u >= sevenDaysAgo;
      });
    }

    return result;
  }, [tasks, filters, user]);

  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks];
    const { key, direction } = sortConfig;
    if (!key) return sorted;

    sorted.sort((a, b) => {
      let aVal, bVal;
      switch (key) {
        case 'title':
          aVal = (a.title || '').toLowerCase();
          bVal = (b.title || '').toLowerCase();
          break;
        case 'taskCode':
          aVal = a.taskCode || '';
          bVal = b.taskCode || '';
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'priority':
          aVal = PRIORITY_ORDER[a.priority] ?? 99;
          bVal = PRIORITY_ORDER[b.priority] ?? 99;
          break;
        case 'project':
          aVal = (a.project?.name || '').toLowerCase();
          bVal = (b.project?.name || '').toLowerCase();
          break;
        case 'assignedTo':
          aVal = (a.assignedTo?.name || '').toLowerCase();
          bVal = (b.assignedTo?.name || '').toLowerCase();
          break;
        case 'assignedBy':
          aVal = (a.assignedBy?.name || '').toLowerCase();
          bVal = (b.assignedBy?.name || '').toLowerCase();
          break;
        case 'createdBy':
          aVal = (a.createdBy?.name || '').toLowerCase();
          bVal = (b.createdBy?.name || '').toLowerCase();
          break;
        case 'createdAt':
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case 'dueDate':
          aVal = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          bVal = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          break;
        case 'updatedAt':
          aVal = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          bVal = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          break;
        default:
          aVal = a[key];
          bVal = b[key];
      }
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredTasks, sortConfig]);

  const paginatedTasks = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedTasks.slice(start, start + rowsPerPage);
  }, [sortedTasks, page, rowsPerPage]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleFilterChange = (field) => (e) => {
    setFilters(prev => ({ ...prev, [field]: e.target.value }));
    setPage(0);
  };

  const handleMultiFilterChange = (field) => (e) => {
    setFilters(prev => ({ ...prev, [field]: e.target.value }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({
      search: '', status: [], priority: [], taskType: [],
      assignedTo: '', assignedBy: '', createdBy: '', project: '',
      dueDateStart: '', dueDateEnd: '', createdDateStart: '', createdDateEnd: '',
      quickFilter: '',
    });
    setSearchInput('');
    setPage(0);
  };

  const hasActiveFilters = useMemo(() => {
    return filters.status.length > 0 || filters.priority.length > 0 || filters.taskType.length > 0 ||
      filters.assignedTo || filters.assignedBy || filters.createdBy || filters.project ||
      filters.dueDateStart || filters.dueDateEnd || filters.createdDateStart || filters.createdDateEnd ||
      filters.quickFilter || filters.search;
  }, [filters]);

  const calculateDeadline = (task) => {
    if (task.slaDeadline) return new Date(task.slaDeadline);
    if (task.dueDate) return new Date(task.dueDate);
    if (!task.createdAt) return null;
    const createdDate = new Date(task.createdAt);
    const severity = task.severity?.toLowerCase();
    let daysToAdd;
    switch (severity) {
      case 'critical': daysToAdd = 3; break;
      case 'high': daysToAdd = 7; break;
      case 'medium': daysToAdd = 15; break;
      case 'low': return null;
      default: return null;
    }
    const deadline = new Date(createdDate);
    deadline.setDate(deadline.getDate() + daysToAdd);
    return deadline;
  };

  const formatDeadline = (task) => {
    const deadline = calculateDeadline(task);
    if (!deadline) return 'No deadline';
    return deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return '—'; }
  };

  const isCreator = (task) => {
    const uid = getUserId(user);
    return getUserId(task.assignedBy) === uid || getUserId(task.createdBy) === uid;
  };

  const getStatusTransitions = (currentStatus) => {
    const n = (currentStatus || 'pending').toLowerCase().replace(/\s+/g, '_');
    const m = {
      pending: ['pending', 'queued', 'in_progress', 'cancelled'],
      queued: ['pending', 'queued', 'in_progress', 'cancelled'],
      in_progress: ['in_progress', 'under_review', 'blocked', 'waiting_dependency', 'completed', 'cancelled'],
      under_review: ['in_progress', 'under_review', 'completed', 'reopened', 'cancelled'],
      blocked: ['blocked', 'in_progress', 'cancelled'],
      waiting_dependency: ['waiting_dependency', 'in_progress', 'cancelled'],
      completed: ['completed', 'closed'],
      closed: ['closed', 'reopened'],
      reopened: ['reopened', 'in_progress', 'under_review', 'blocked', 'completed', 'cancelled'],
      cancelled: ['cancelled'],
    };
    return m[n] || ['pending', 'queued', 'in_progress', 'under_review', 'blocked', 'completed', 'closed', 'cancelled'];
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setEditingTask(false);
    setTaskDetailOpen(true);
  };

  const closeTaskDetails = () => {
    setEditingTask(false);
    setSelectedTask(null);
    setTaskDetailOpen(false);
  };

  const handleEditTask = () => {
    setTaskForm({
      title: selectedTask?.title || '',
      description: selectedTask?.description || '',
      status: selectedTask?.status || 'pending',
      priority: selectedTask?.priority || 'medium',
      dueDate: selectedTask?.dueDate ? new Date(selectedTask.dueDate).toISOString().split('T')[0] : '',
    });
    setEditingTask(true);
  };

  const handleSaveTask = async () => {
    if (!selectedTask) return;
    try {
      const cleanForm = Object.fromEntries(Object.entries(taskForm).filter(([, v]) => v !== ''));
      await taskAPI.updateTask(selectedTask.id || selectedTask._id, cleanForm);
      showToast('Task updated successfully', 'success');
      setEditingTask(false);
      setSelectedTask(prev => ({ ...prev, ...taskForm }));
      fetchTasks();
    } catch (error) {
      showToast('Failed to update task: ' + (error.message || error), 'error');
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await taskAPI.deleteTask(selectedTask.id || selectedTask._id);
      showToast('Task deleted successfully', 'success');
      closeTaskDetails();
      fetchTasks();
    } catch (error) {
      showToast('Failed to delete task: ' + (error.message || error), 'error');
    }
  };

  const handleCreateTask = async () => {
    const errors = {};
    if (!newTask.title?.trim()) errors.title = 'Task title is required';
    setNewTaskErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      const payload = {
        title: newTask.title.trim(),
        description: newTask.description?.trim() || undefined,
        assignedTo: newTask.assignedTo || undefined,
        taskType: newTask.taskType.toLowerCase().replace(/\s+/g, '_'),
        priority: newTask.priority.toLowerCase(),
        status: newTask.status.toLowerCase().replace(/\s+/g, '_'),
        startDate: newTask.startDate || undefined,
        dueDate: newTask.dueDate || undefined,
        tags: newTask.tags?.trim() ? newTask.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      };
      const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined && v !== '' && v !== null));
      await taskAPI.createTask(cleanPayload);
      showToast('Task created successfully', 'success');
      setShowCreateModal(false);
      setNewTaskErrors({});
      setNewTask({ title: '', description: '', assignedTo: '', taskType: 'miscellaneous', priority: 'medium', status: 'pending', startDate: '', dueDate: '', tags: '' });
      fetchTasks();
    } catch (error) {
      showToast(error.message || 'Failed to create task', 'error');
    }
  };

  const handleTaskFormChange = (field) => (e) => {
    setTaskForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const SkeletonRow = () => (
    <TableRow>
      {Array.from({ length: 12 }).map((_, i) => (
        <TableCell key={i}><Skeleton variant="text" sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} /></TableCell>
      ))}
    </TableRow>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: '#f8fafc', fontWeight: 700, mb: 1 }}>
            All User Tasks
          </Typography>
          <Typography variant="body1" sx={{ color: '#94a3b8', fontSize: '0.8125rem' }}>
            View and manage tasks across all users
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant={showFilters ? 'contained' : 'outlined'}
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
            sx={showFilters ? {
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)'
            } : { color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)' }}
          >
            Filters
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateModal(true)}
            sx={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)'
            }}
          >
            Create Task
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <GlassCard>
          <Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 700 }}>{tasks.length}</Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>Total Tasks</Typography>
        </GlassCard>
        <GlassCard>
          <Typography variant="body2" sx={{ color: '#ef4444', fontWeight: 700 }}>
            {tasks.filter(t => t.slaStatus?.isBreached).length}
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>Overdue</Typography>
        </GlassCard>
        <GlassCard>
          <Typography variant="body2" sx={{ color: '#f97316', fontWeight: 700 }}>
            {tasks.filter(t => t.slaStatus?.isAtRisk).length}
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>At Risk</Typography>
        </GlassCard>
        <GlassCard>
          <Typography variant="body2" sx={{ color: premiumColors.severity.critical, fontWeight: 700 }}>
            {tasks.filter(t => t.severity?.toLowerCase() === 'critical').length}
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>Critical</Typography>
        </GlassCard>
      </Box>

      {/* Quick Filters */}
      <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
        {QUICK_FILTERS.map(qf => (
          <Chip
            key={qf.key}
            label={qf.label}
            onClick={() => {
              setFilters(prev => ({ ...prev, quickFilter: prev.quickFilter === qf.key ? '' : qf.key }));
              setPage(0);
            }}
            variant={filters.quickFilter === qf.key ? 'filled' : 'outlined'}
            sx={{
              color: filters.quickFilter === qf.key ? '#fff' : '#94a3b8',
              bgcolor: filters.quickFilter === qf.key ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
              borderColor: filters.quickFilter === qf.key ? '#06b6d4' : 'rgba(255,255,255,0.1)',
              '&:hover': { borderColor: '#06b6d4' }
            }}
          />
        ))}
      </Stack>

      {/* Advanced Filters */}
      {showFilters && (
        <Paper sx={{ ...glassStyles.card, mb: 2, p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth size="small" placeholder="Search by title, code, description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: '#64748b', mr: 1, fontSize: 18 }} />,
                  endAdornment: searchInput ? (
                    <IconButton size="small" onClick={() => setSearchInput('')} sx={{ color: '#64748b' }}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  ) : null
                }}
                sx={{ '& input': { color: '#f8fafc', fontSize: '0.875rem' }, '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small" sx={{ '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiSelect-select': { color: '#f8fafc' }, '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }}>
                <InputLabel>Status</InputLabel>
                <Select multiple value={filters.status} label="Status" onChange={handleMultiFilterChange('status')}
                  renderValue={(selected) => selected.length === 0 ? (
                    <Typography sx={{ color: '#64748b', fontSize: '0.875rem' }}>All</Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                      {selected.map(v => <Chip key={v} label={v.replace(/_/g, ' ')} size="small" sx={{ height: 20, fontSize: '0.6875rem', color: '#94a3b8' }} />)}
                    </Box>
                  )}>
                  {STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small" sx={{ '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiSelect-select': { color: '#f8fafc' }, '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }}>
                <InputLabel>Project</InputLabel>
                <Select value={filters.project} label="Project" onChange={handleFilterChange('project')}>
                  <MenuItem value="">All Projects</MenuItem>
                  {projects.filter(p => !p.archived).map(p => (
                    <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small" sx={{ '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiSelect-select': { color: '#f8fafc' }, '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }}>
                <InputLabel>Assigned To</InputLabel>
                <Select value={filters.assignedTo} label="Assigned To" onChange={handleFilterChange('assignedTo')}>
                  <MenuItem value="">All Users</MenuItem>
                  {allActiveUsers.map(u => (
                    <MenuItem key={u._id} value={u._id}>{u.name || u.email}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small" sx={{ '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiSelect-select': { color: '#f8fafc' }, '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }}>
                <InputLabel>Assigned By</InputLabel>
                <Select value={filters.assignedBy} label="Assigned By" onChange={handleFilterChange('assignedBy')}>
                  <MenuItem value="">All Users</MenuItem>
                  {allActiveUsers.map(u => (
                    <MenuItem key={u._id} value={u._id}>{u.name || u.email}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small" sx={{ '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiSelect-select': { color: '#f8fafc' }, '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }}>
                <InputLabel>Created By</InputLabel>
                <Select value={filters.createdBy} label="Created By" onChange={handleFilterChange('createdBy')}>
                  <MenuItem value="">All Users</MenuItem>
                  {allActiveUsers.map(u => (
                    <MenuItem key={u._id} value={u._id}>{u.name || u.email}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth size="small" type="date" label="Due Date From"
                InputLabelProps={{ shrink: true }}
                value={filters.dueDateStart}
                onChange={(e) => { setFilters(prev => ({ ...prev, dueDateStart: e.target.value })); setPage(0); }}
                sx={{ '& input': { color: '#f8fafc' }, '& label': { color: '#94a3b8' }, '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth size="small" type="date" label="Due Date To"
                InputLabelProps={{ shrink: true }}
                value={filters.dueDateEnd}
                onChange={(e) => { setFilters(prev => ({ ...prev, dueDateEnd: e.target.value })); setPage(0); }}
                sx={{ '& input': { color: '#f8fafc' }, '& label': { color: '#94a3b8' }, '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth size="small" type="date" label="Created From"
                InputLabelProps={{ shrink: true }}
                value={filters.createdDateStart}
                onChange={(e) => { setFilters(prev => ({ ...prev, createdDateStart: e.target.value })); setPage(0); }}
                sx={{ '& input': { color: '#f8fafc' }, '& label': { color: '#94a3b8' }, '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth size="small" type="date" label="Created To"
                InputLabelProps={{ shrink: true }}
                value={filters.createdDateEnd}
                onChange={(e) => { setFilters(prev => ({ ...prev, createdDateEnd: e.target.value })); setPage(0); }}
                sx={{ '& input': { color: '#f8fafc' }, '& label': { color: '#94a3b8' }, '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }}
              />
            </Grid>
            <Grid item xs={12} sm={12} md={3} sx={{ display: 'flex', alignItems: 'center' }}>
              <Button
                variant="outlined"
                onClick={clearFilters}
                startIcon={<ClearIcon />}
                disabled={!hasActiveFilters}
                fullWidth
                sx={{ color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)', height: 40 }}
              >
                Clear All Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Table */}
      <Paper sx={{ ...glassStyles.card, overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 220px)' }}>
          <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: 0.3, px: 0.5 } }}>
            <TableHead>
              <TableRow>
                {[
                  { key: 'taskCode', label: 'Task ID', width: '10%' },
                  { key: 'title', label: 'Title', width: '18%' },
                  { key: 'project', label: 'Project', width: '10%' },
                  { key: 'assignedBy', label: 'Assigned By', width: '8%' },
                  { key: 'assignedTo', label: 'Assigned To', width: '8%' },
                  { key: 'createdBy', label: 'Created By', width: '8%' },
                  { key: 'priority', label: 'Priority', width: '6%' },
                  { key: 'status', label: 'Status', width: '8%' },
                  { key: 'createdAt', label: 'Created', width: '8%' },
                  { key: 'dueDate', label: 'Due Date', width: '8%' },
                  { key: 'updatedAt', label: 'Updated', width: '8%' },
                  { key: null, label: 'Actions', width: '6%' },
                ].map(col => (
                  <TableCell key={col.key || 'actions'} sx={{
                    color: '#94a3b8', fontWeight: 600, fontSize: '0.7rem',
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                    width: col.width, bgcolor: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    whiteSpace: 'nowrap'
                  }}>
                    {col.key ? (
                      <TableSortLabel
                        active={sortConfig.key === col.key}
                        direction={sortConfig.key === col.key ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort(col.key)}
                        sx={{ color: '#94a3b8 !important', '&.Mui-active': { color: '#06b6d4 !important' } }}
                      >
                        {col.label}
                      </TableSortLabel>
                    ) : col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : paginatedTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} sx={{ textAlign: 'center', py: 6, color: '#94a3b8' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" sx={{ color: '#64748b' }}>No tasks found</Typography>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        {hasActiveFilters ? 'Try adjusting your filters' : 'No tasks have been created yet'}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTasks.map((task) => (
                  <TableRow
                    key={task.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'rgba(6, 182, 212, 0.08) !important' },
                      '& td': { borderBottom: '1px solid rgba(255,255,255,0.03)' }
                    }}
                    onClick={() => handleTaskClick(task)}
                  >
                    <TableCell>
                      <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {task.taskCode || `#${String(task.id).slice(-6).toUpperCase()}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 500, lineHeight: 1.3, fontSize: '0.8125rem' }}>
                        {task.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                        {task.project?.name || task.projectName || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                        {task.assignedBy?.name || task.assignedBy?.email || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 500 }}>
                        {task.assignedTo?.name || task.assignedTo?.email || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                        {task.createdBy?.name || task.createdBy?.email || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={task.severity} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={statusIcons[task.status?.toLowerCase()]}
                        label={task.status?.replace(/_/g, ' ')}
                        size="small"
                        sx={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8', textTransform: 'capitalize', height: 22, fontSize: '0.6875rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                        {formatDate(task.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                        {formatDate(task.dueDate)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                        {formatDate(task.updatedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Complete Task" arrow placement="top">
                          <IconButton
                            size="small"
                            onClick={async () => {
                              try {
                                await taskAPI.completeTask(task.id || task._id);
                                showToast('Task completed successfully', 'success');
                                fetchTasks();
                              } catch (error) {
                                showToast(error.message || 'Failed to complete task', 'error');
                              }
                            }}
                            sx={{ color: '#22c55e', '&:hover': { color: '#16a34a' }, p: 0.5 }}
                          >
                            <CheckIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {!loading && (
          <TablePagination
            component="div"
            count={sortedTasks.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{ color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.05)', '& .MuiTablePagination-selectIcon': { color: '#94a3b8' } }}
          />
        )}
      </Paper>

      {/* Create Task Modal */}
      <Dialog open={showCreateModal} onClose={() => { setShowCreateModal(false); setNewTaskErrors({}); }} maxWidth="sm" fullWidth
        PaperProps={{ sx: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' } }}>
        <DialogTitle sx={{ color: '#f8fafc' }}>Create Task</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField fullWidth label="Task Title *" value={newTask.title}
              onChange={(e) => { setNewTask({...newTask, title: e.target.value}); if (newTaskErrors.title) setNewTaskErrors({}); }}
              error={!!newTaskErrors.title} helperText={newTaskErrors.title}
              FormHelperTextProps={{ sx: { color: '#ef4444', ml: 0 } }}
              sx={{ '& input': { color: '#fff' }, '& label': { color: '#94a3b8' } }} />
            <TextField fullWidth multiline rows={2} label="Description" value={newTask.description} onChange={(e) => setNewTask({...newTask, description: e.target.value})} sx={{ '& textarea': { color: '#fff' }, '& label': { color: '#94a3b8' } }} />
            <FormControl fullWidth sx={{ '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiSelect-select': { color: '#fff' } }}>
              <InputLabel>Status</InputLabel>
              <Select value={newTask.status} label="Status" onChange={(e) => setNewTask({...newTask, status: e.target.value})}>
                {['pending', 'in_progress', 'blocked', 'review', 'completed'].map(s => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
              </Select>
            </FormControl>
            {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'vapt_analyst' || user?.role === 'vapt_tl' || user?.role === 'project_manager') ? (
              assignableUsers.length > 0 ? (
                <FormControl fullWidth sx={{ '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiSelect-select': { color: '#fff' } }}>
                  <InputLabel>Assigned To</InputLabel>
                  <Select value={newTask.assignedTo} label="Assigned To" onChange={(e) => setNewTask({...newTask, assignedTo: e.target.value})}>
                    <MenuItem value="">Self</MenuItem>
                    {assignableUsers.map(u => <MenuItem key={u._id} value={u._id}>{u.name} ({u.role.replace(/_/g, ' ')})</MenuItem>)}
                  </Select>
                </FormControl>
              ) : (
                <TextField fullWidth disabled label="Assigned To" value="Self" sx={{ '& input': { color: '#94a3b8' } }} />
              )
            ) : null}
            <FormControl fullWidth sx={{ '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiSelect-select': { color: '#fff' } }}>
              <InputLabel>Task Type</InputLabel>
              <Select value={newTask.taskType} label="Task Type" onChange={(e) => setNewTask({...newTask, taskType: e.target.value})}>
                {TASK_TYPE_OPTIONS.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiSelect-select': { color: '#fff' } }}>
              <InputLabel>Priority</InputLabel>
              <Select value={newTask.priority} label="Priority" onChange={(e) => setNewTask({...newTask, priority: e.target.value})}>
                {PRIORITY_OPTIONS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField fullWidth type="date" label="Start Date" InputLabelProps={{ shrink: true }} value={newTask.startDate} onChange={(e) => setNewTask({...newTask, startDate: e.target.value})} sx={{ '& input': { color: '#fff' }, '& label': { color: '#94a3b8' } }} />
            <TextField fullWidth type="date" label="Due Date" InputLabelProps={{ shrink: true }} value={newTask.dueDate} onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})} sx={{ '& input': { color: '#fff' }, '& label': { color: '#94a3b8' } }} />
            <TextField fullWidth label="Tags (comma separated)" value={newTask.tags} onChange={(e) => setNewTask({...newTask, tags: e.target.value})} sx={{ '& input': { color: '#fff' }, '& label': { color: '#94a3b8' } }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)} sx={{ color: '#94a3b8' }}>Cancel</Button>
          <Button onClick={handleCreateTask} variant="contained" sx={{ background: '#06b6d4' }}>Create Task</Button>
        </DialogActions>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog
        open={taskDetailOpen}
        onClose={closeTaskDetails}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)' } }}
      >
        <DialogTitle sx={{ color: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingTask ? 'Edit Task' : 'Task Details'}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!editingTask && selectedTask && isCreator(selectedTask) && (
              <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDeleteTask}
                sx={{ borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444', textTransform: 'none' }}>
                Delete
              </Button>
            )}
            {!editingTask && (
              <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={handleEditTask}
                sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#94a3b8', textTransform: 'none' }}>
                Edit
              </Button>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedTask ? (
            <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
              {editingTask ? (
                <>
                  <TextField label="Title" value={taskForm.title} onChange={handleTaskFormChange('title')}
                    fullWidth size="small" sx={{ input: { color: '#f8fafc' }, label: { color: '#94a3b8' } }} />
                  <TextField label="Description" value={taskForm.description} onChange={handleTaskFormChange('description')}
                    multiline rows={3} fullWidth size="small"
                    sx={{ textarea: { color: '#f8fafc' }, label: { color: '#94a3b8' } }} />
                  <FormControl size="small" fullWidth>
                    <InputLabel sx={{ color: '#94a3b8' }}>Status</InputLabel>
                    <Select value={taskForm.status} onChange={handleTaskFormChange('status')} label="Status"
                      sx={{ color: '#f8fafc', '& .MuiSvgIcon-root': { color: '#94a3b8' } }}>
                      {getStatusTransitions(selectedTask?.status).map(s => (
                        <MenuItem key={s} value={s} sx={{ color: '#f8fafc' }}>{s.replace(/_/g, ' ')}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField label="Due Date" type="date" value={taskForm.dueDate} onChange={handleTaskFormChange('dueDate')}
                    fullWidth size="small" InputLabelProps={{ shrink: true }}
                    sx={{ input: { color: '#f8fafc' }, label: { color: '#94a3b8' } }} />
                </>
              ) : (
                <>
                  <Typography sx={{ color: '#94a3b8' }}><strong>Title:</strong> {selectedTask.title}</Typography>
                  <Typography sx={{ color: '#94a3b8' }}><strong>Status:</strong> {selectedTask.status || 'N/A'}</Typography>
                  <Typography sx={{ color: '#94a3b8' }}><strong>Assigned By:</strong> {selectedTask.assignedBy?.name || selectedTask.assignedBy?.email || 'N/A'}</Typography>
                  <Typography sx={{ color: '#94a3b8' }}><strong>Assigned To:</strong> {selectedTask.assignedTo?.name || selectedTask.assignedTo?.email || 'Unassigned'}</Typography>
                  <Typography sx={{ color: '#94a3b8' }}><strong>Priority:</strong> {selectedTask.priority || selectedTask.severity || 'Medium'}</Typography>
                  <Typography sx={{ color: '#94a3b8' }}><strong>Due:</strong> {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'None'}</Typography>
                  <Typography sx={{ color: '#94a3b8' }}><strong>Task Type:</strong> {selectedTask.taskType || 'N/A'}</Typography>
                  <Typography sx={{ color: '#94a3b8' }}><strong>Description:</strong></Typography>
                  <Typography sx={{ color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>{selectedTask.description || 'No description provided.'}</Typography>
                </>
              )}
            </Box>
          ) : (
            <Typography sx={{ color: '#94a3b8' }}>Loading task details...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          {editingTask ? (
            <>
              <Button onClick={() => setEditingTask(false)} sx={{ color: '#94a3b8' }}>Cancel</Button>
              <Button onClick={handleSaveTask} variant="contained" sx={{ background: '#06b6d4', color: '#fff' }}>Save</Button>
            </>
          ) : (
            <Button onClick={closeTaskDetails} sx={{ color: '#94a3b8' }}>Close</Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AllUserTasks;
