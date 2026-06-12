import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  LinearProgress,
  FormControl,
  InputLabel,
  Divider,
  Select,
  Fab,
  MenuItem,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Schedule as ClockIcon,
  Warning as WarningIcon,
  Help as HelpIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  BugReport as BugReportIcon,
  Folder as FolderIcon,
  Description as DescriptionIcon,
  CalendarToday as CalendarIcon,
  Timeline as TimelineIcon,
  ViewWeek as KanbanIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { taskAPI, requestAPI, userAPI, projectAPI } from '../services/api';
import socketService from '../services/socketService';

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
  'fix-verification': <CheckIcon sx={{ fontSize: 16 }} />,
  closed: <CheckIcon sx={{ fontSize: 16 }} />,
  pending: <ClockIcon sx={{ fontSize: 16, color: '#64748b' }} />,
  queued: <ClockIcon sx={{ fontSize: 16, color: '#94a3b8' }} />,
};

const MyTasks = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'kanban'
  const [tasks, setTasks] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [closeNotes, setCloseNotes] = useState('');
  const [newTask, setNewTask] = useState({
    title: '', description: '', assignedTo: '',
    taskType: 'miscellaneous', priority: 'medium',
    status: 'pending', startDate: '', dueDate: '', tags: ''
  });
  const [newTaskErrors, setNewTaskErrors] = useState({});

  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);
  const [editingTask, setEditingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({});

  useEffect(() => {
    userAPI.getUsers().then(setUsers).catch(console.error);
  }, []);

  const [checklistItems, setChecklistItems] = useState({
    identified: false,
    fixed: false,
    tested: false,
    documented: false,
  });
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');

   const assignableUsers = useMemo(() => {
     if (!users || !users.length) return [];
     const currentUserRole = user?.role;
     
     if (currentUserRole === 'admin' || currentUserRole === 'super_admin') {
       return users.filter(u => u.isActive && u.role !== 'admin' && u.role !== 'super_admin');
     }
      if (currentUserRole === 'vapt_analyst' || currentUserRole === 'vapt_tl') {
        return users.filter(u => u.isActive && u.role !== 'admin' && u.role !== 'super_admin');
      }
     if (currentUserRole === 'project_manager') {
       return users.filter(u => u.isActive && u.role === 'developer');
     }
     return [];
   }, [users, user?.role]);

  const closeTaskDetails = () => {
    setEditingTask(false);
    setSelectedTaskDetails(null);
    setTaskDetailOpen(false);
    const params = new URLSearchParams(location.search);
    params.delete('taskId');
    navigate({ pathname: '/my-tasks', search: params.toString() ? `?${params.toString()}` : '' }, { replace: true });
  };

  const handleEditTask = () => {
    setTaskForm({
      title: selectedTaskDetails?.title || '',
      description: selectedTaskDetails?.description || '',
      status: selectedTaskDetails?.status || 'pending',
      priority: selectedTaskDetails?.priority || 'medium',
      dueDate: selectedTaskDetails?.dueDate ? new Date(selectedTaskDetails.dueDate).toISOString().split('T')[0] : '',
    });
    setEditingTask(true);
  };

  const handleSaveTask = async () => {
    if (!selectedTaskDetails) return;
    try {
      const cleanForm = Object.fromEntries(Object.entries(taskForm).filter(([, v]) => v !== ''));
      await taskAPI.updateTask(selectedTaskDetails.id || selectedTaskDetails._id, cleanForm);
      showToast('Task updated successfully', 'success');
      setEditingTask(false);
      setSelectedTaskDetails(prev => ({ ...prev, ...taskForm }));
      fetchMyTasks();
    } catch (error) {
      showToast('Failed to update task: ' + (error.message || error), 'error');
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTaskDetails) return;
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await taskAPI.deleteTask(selectedTaskDetails.id || selectedTaskDetails._id);
      showToast('Task deleted successfully', 'success');
      closeTaskDetails();
      fetchMyTasks();
    } catch (error) {
      showToast('Failed to delete task: ' + (error.message || error), 'error');
    }
  };

  const handleTaskFormChange = (field) => (e) => {
    setTaskForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  useEffect(() => {
    const taskId = new URLSearchParams(location.search).get('taskId');
    if (!taskId) return;

    const matchedTask = tasks.find(t => String(t.id || t._id) === taskId);
    if (matchedTask) {
      setSelectedTaskDetails(matchedTask);
      return;
    }

    let cancelled = false;
    const loadTask = async () => {
      try {
        const task = await taskAPI.getTask(taskId);
        if (!cancelled && task) {
          setSelectedTaskDetails({ ...task, id: task.id || task._id });
        }
      } catch (error) {
        console.error('Unable to load task from notification', error);
      }
    };

    loadTask();

    return () => { cancelled = true; };
  }, [location.search, tasks]);

  const fixChecklist = [
    { key: 'identified', label: 'Root cause identified' },
    { key: 'fixed', label: 'Fix implemented' },
    { key: 'tested', label: 'Fix tested locally' },
    { key: 'documented', label: 'Changes documented' },
  ];

  const fetchMyTasks = useCallback(async () => {
    setLoading(true);
    try {
      const apiTasks = await taskAPI.getMyTasks();
      const myTasks = (apiTasks || []).map(task => ({
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

      // For admin users, filter to only show tasks relevant to them
      const currentUserId = user?.uid || user?.id || user?._id;
      if (user?.role === 'admin' || user?.role === 'super_admin') {
        setTasks(myTasks.filter(task => {
          const tId = String(currentUserId);
          const aTo = String(task?.assignedTo?._id || task?.assignedTo?.id || task?.assignedTo || '');
          const cBy = String(task?.createdBy?._id || task?.createdBy?.id || task?.createdBy || '');
          const aBy = String(task?.assignedBy?._id || task?.assignedBy?.id || task?.assignedBy || '');
          return aTo === tId || cBy === tId || aBy === tId;
        }));
      } else {
        setTasks(myTasks);
      }

      // Auto-rotate oldest completed tasks → queued when limit is exceeded
      taskAPI.rotateCompleted().catch(() => {});
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Real-time listeners for task updates - DISABLED to prevent ID changes
  const setupRealtimeListeners = useCallback(() => {
    if (!user) return;

    const currentUserId = user.uid || user.id || user._id;

    const handleUpdate = (data) => {
      
      // Refresh if the task is relevant to the user
      if (String(data.assignedTo) === String(currentUserId) || String(data.createdBy) === String(currentUserId)) {
        fetchMyTasks();
      }
    };

    const unsubscribeCreated = socketService.on('task_created', handleUpdate);
    const unsubscribeUpdated = socketService.on('task_updated', handleUpdate);
    const unsubscribeAssigned = socketService.on('task_assigned', handleUpdate);
    
    socketService.joinUserRoom(currentUserId);

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeAssigned();
    };
  }, [user, fetchMyTasks]);

  useEffect(() => {
    fetchMyTasks();
    
    const cleanup = setupRealtimeListeners();
    
    return cleanup;
  }, [user, setupRealtimeListeners]);

  
  const handleCloseRequest = async () => {
    if (!selectedFinding) return;
    
    try {
      // Validate closure request
      if (!closeNotes.trim()) {
        showToast('Please provide a reason for requesting to close this finding.', 'warning');
        return;
      }
      
      await requestAPI.requestCloseFinding(
        selectedFinding.projectId,
        selectedFinding.findingId || selectedFinding.id,
        user.email,
        closeNotes
      );
      
      setShowCloseDialog(false);
      setCloseNotes('');
      setChecklistItems({
        identified: false,
        fixed: false,
        tested: false,
        documented: false,
      });
      
      // Show success message
      showToast(`Closure request sent for finding: ${selectedFinding.title}. Admin will review your request.`, 'success');
      
      fetchMyTasks();
    } catch (error) {
      console.error('Failed to request close:', error);
      showToast('Failed to send closure request. Please try again.', 'error');
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
      setNewTask({ 
        title: '', description: '', assignedTo: '',
        taskType: 'miscellaneous', priority: 'medium',
        status: 'pending', startDate: '', dueDate: '', tags: ''
      });
      fetchMyTasks();
    } catch (error) {
      const errorMsg = error.message || 'Failed to create task';
      showToast(errorMsg, 'error');
    }
  };

  const handleRequestHelp = async () => {
    if (!selectedFinding || !helpMessage.trim()) return;
    try {
      await requestAPI.requestHelp(
        selectedFinding.projectId,
        selectedFinding.findingId || selectedFinding.id,
        helpMessage
      );
      showToast('Help request sent successfully', 'success');
      setShowHelpDialog(false);
      setHelpMessage('');
      fetchMyTasks();
    } catch (error) {
      console.error('Failed to request help:', error);
      showToast('Failed to send help request', 'error');
    }
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
  };

   const handleDrop = async (e, newStatus) => {
     e.preventDefault();
     const taskId = e.dataTransfer.getData('taskId');
     
     const task = tasks.find(t => String(t.id || t._id) === String(taskId));
     if (!task || task.status === newStatus) return;

    try {
      // Optimistic Local Update
      setTasks(prev => prev.map(t => 
        (t.id === taskId || t._id === taskId) ? { ...t, status: newStatus } : t
      ));

      await taskAPI.updateTask(taskId, { status: newStatus });
      showToast(`Task moved to ${newStatus}`, 'success');
      fetchMyTasks(); // Refresh to sync SLA calculations and history
    } catch (error) {
      showToast('Failed to update task status', 'error');
      fetchMyTasks(); // Revert state on failure
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleFindingClick = (task) => {
    // Navigate to finding details page - Use correct route pattern
    if (task.projectId && task.findingId) {
      navigate(`/projects/${task.projectId}/findings/${task.findingId}`);
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTaskDetails(task);
    setTaskDetailOpen(true);
  };
  
  const filteredTasks = useMemo(() => {
    if (activeTab === 0) return tasks;
    if (activeTab === 1) return tasks.filter(t => t.slaStatus?.isBreached);
    if (activeTab === 2) return tasks.filter(t => t.slaStatus?.isAtRisk);
    if (activeTab === 3) return tasks.filter(t => t.severity?.toLowerCase() === 'critical');
    if (activeTab === 4) return tasks.filter(t => ['completed', 'closed'].includes((t.status || '').toLowerCase().replace(/\s+/g, '_')));
    if (activeTab === 5) return tasks.filter(t => ['pending', 'queued'].includes((t.status || '').toLowerCase().replace(/\s+/g, '_')));
    if (activeTab === 6) return tasks.filter(t => (t.status || '').toLowerCase().replace(/\s+/g, '_') === 'in_progress');
    return tasks;
  }, [tasks, activeTab]);

  const kanbanColumns = [
    { id: 'pending', label: 'Pending', color: '#64748b' },
    { id: 'queued', label: 'Queued', color: '#94a3b8' },
    { id: 'in_progress', label: 'In Progress', color: '#06b6d4' },
    { id: 'review', label: 'Under Review', color: '#f59e0b' },
    { id: 'completed', label: 'Completed', color: '#16a34a' },
  ];

  const tasksByStatus = useMemo(() => {
    return filteredTasks.reduce((acc, task) => {
      const status = (task.status || 'pending').toLowerCase().replace(/\s+/g, '_');
      if (!acc[status]) acc[status] = [];
      acc[status].push(task);
      return acc;
    }, { pending: [], queued: [], in_progress: [], review: [], completed: [] });
  }, [filteredTasks]);

const calculateDeadline = (task) => {
    if (task.slaDeadline) return new Date(task.slaDeadline);
    if (task.dueDate) return new Date(task.dueDate);
    if (!task.createdAt) return null;
    
    const createdDate = new Date(task.createdAt);
    const severity = task.severity?.toLowerCase();
    
    let daysToAdd;
    switch (severity) {
      case 'critical':
        daysToAdd = 3;
        break;
      case 'high':
        daysToAdd = 7;
        break;
      case 'medium':
        daysToAdd = 15;
        break;
      case 'low':
        return null;
      default:
        return null;
    }
    
    const deadline = new Date(createdDate);
    deadline.setDate(deadline.getDate() + daysToAdd);
    return deadline;
  };

  const getStatusTransitions = (currentStatus) => {
    const normalizedStatus = (currentStatus || 'pending').toLowerCase().replace(/\s+/g, '_');
    const transitions = {
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
      draft: ['draft', 'pending', 'queued', 'cancelled'],
      assigned: ['assigned', 'accepted', 'in_progress', 'cancelled'],
      accepted: ['accepted', 'in_progress', 'cancelled'],
      waiting_client: ['waiting_client', 'in_progress', 'cancelled'],
      escalated: ['escalated', 'in_progress', 'under_review', 'completed', 'cancelled'],
    };
    return transitions[normalizedStatus] || ['pending', 'queued', 'in_progress', 'under_review', 'blocked', 'completed', 'closed', 'cancelled'];
  };

  const isCreatorPrivileged = (task) => {
    const creatorRole = task?.assignedBy?.role || task?.createdBy?.role;
    return ['admin', 'super_admin', 'vapt_tl', 'project_manager'].includes(creatorRole);
  };

  const isAssignedUser = (task) => {
    const currentUserId = user?.uid || user?.id || user?._id;
    return String(task?.assignedTo?._id || task?.assignedTo?.id || task?.assignedTo) === String(currentUserId);
  };

  const isCreator = (task) => {
    const currentUserId = user?.uid || user?.id || user?._id;
    return String(task?.assignedBy?._id || task?.assignedBy?.id || task?.assignedBy || task?.createdBy?._id || task?.createdBy?.id || task?.createdBy) === String(currentUserId);
  };

  const canEditFullTask = (task) => {
    if (!task) return false;
    if (isCreator(task)) return true;
    if (isAssignedUser(task) && !isCreatorPrivileged(task)) return true;
    return false;
  };

  const canOnlyEditStatus = (task) => {
    if (!task) return false;
    return isAssignedUser(task) && isCreatorPrivileged(task);
  };

  const formatDeadline = (task) => {
    const deadline = calculateDeadline(task);
    if (!deadline) return 'No deadline';
    
    return deadline.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const completedChecklistCount = Object.values(checklistItems).filter(Boolean).length;
  const checklistProgress = (completedChecklistCount / 4) * 100;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: '#f8fafc', fontWeight: 700, mb: 1 }}>
            My Tasks
          </Typography>
          <Typography variant="body1" sx={{ color: '#94a3b8', fontSize: '0.8125rem' }}>
            Enterprise workload management and productivity tracking
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, p: 0.5, display: 'flex' }}>
            <Button 
              size="small"
              variant={viewMode === 'table' ? 'contained' : 'text'} 
              onClick={() => setViewMode('table')}
              sx={{ color: viewMode === 'table' ? '#fff' : '#94a3b8', minWidth: 100 }}
            >
              Table
            </Button>
            <Button 
              size="small"
              variant={viewMode === 'kanban' ? 'contained' : 'text'} 
              onClick={() => setViewMode('kanban')}
              sx={{ color: viewMode === 'kanban' ? '#fff' : '#94a3b8', minWidth: 100 }}
            >
              Kanban
            </Button>
          </Box>
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
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
        <GlassCard>
          <Typography variant="h6" sx={{ color: '#f8fafc' }}>{tasks.length}</Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>Total Tasks</Typography>
        </GlassCard>
        <GlassCard>
          <Typography variant="h6" sx={{ color: '#ef4444' }}>
            {tasks.filter(t => t.slaStatus?.isBreached).length}
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>Overdue</Typography>
        </GlassCard>
        <GlassCard>
          <Typography variant="h6" sx={{ color: '#f97316' }}>
            {tasks.filter(t => t.slaStatus?.isAtRisk).length}
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>At Risk</Typography>
        </GlassCard>
        <GlassCard>
          <Typography variant="h6" sx={{ color: premiumColors.severity.critical }}>
            {tasks.filter(t => t.severity?.toLowerCase() === 'critical').length}
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>Critical</Typography>
        </GlassCard>
      </Box>

      {/* Tabs */}
      <Paper sx={{ ...glassStyles.card, mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            '& .MuiTab-root': { color: '#94a3b8' },
            '& .Mui-selected': { color: '#06b6d4' },
          }}
        >
          <Tab label={`All (${tasks.length})`} />
          <Tab label={`Overdue (${tasks.filter(t => t.slaStatus?.isBreached).length})`} />
          <Tab label={`At Risk (${tasks.filter(t => t.slaStatus?.isAtRisk).length})`} />
<Tab label={`Critical (${tasks.filter(t => t.severity?.toLowerCase() === 'critical').length})`} />
           <Tab label={`Completed (${tasks.filter(t => ['completed','closed'].includes((t.status || '').toLowerCase().replace(/\s+/g, '_'))).length})`} />
           <Tab label={`Pending (${tasks.filter(t => ['pending','queued'].includes((t.status || '').toLowerCase().replace(/\s+/g, '_'))).length})`} />
           <Tab label={`In Progress (${tasks.filter(t => (t.status || '').toLowerCase().replace(/\s+/g, '_') === 'in_progress').length})`} />
        </Tabs>
      </Paper>

      {viewMode === 'kanban' ? (
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, minHeight: '60vh' }}>
          {kanbanColumns.map((column) => (
            <Box 
              key={column.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              sx={{ 
                flex: 1, 
                minWidth: 320, 
                bgcolor: 'rgba(255,255,255,0.02)', 
                borderRadius: 3, 
                p: 2,
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ color: column.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: column.color, boxShadow: `0 0 10px ${column.color}` }} />
                  {column.label}
                </Typography>
                <Chip 
                  label={(tasksByStatus[column.id] || []).length} 
                  size="small" 
                  sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: '#94a3b8' }} 
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {(tasksByStatus[column.id] || []).map((task) => (
                  <Paper
                    key={task.id || task._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id || task._id)}
                    onClick={() => handleTaskClick(task)}
                    sx={{
                      p: 2,
                      bgcolor: '#1e293b',
                      borderRadius: 2,
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': { transform: 'translateY(-4px)', borderColor: column.color, boxShadow: `0 8px 24px ${column.color}30`, background: 'rgba(30, 41, 59, 0.8)' },
                      '&:active': { cursor: 'grabbing' }
                    }}
                  >
                    <Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 600, mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                      {task.title}
                        <Chip label={task.taskType} size="tiny" sx={{ fontSize: '0.6875rem', height: 18, bgcolor: 'rgba(255,255,255,0.05)', color: '#94a3b8' }} />
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace' }}>
                        {task.taskCode || task.findingCode || `ID: ${String(task.id?.slice(-6)).toUpperCase()}`}
                      </Typography>
                      <SeverityBadge severity={task.severity} size="small" />
                    </Box>
                    <Divider sx={{ my: 1.5, opacity: 0.1 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                      <Typography variant="caption" sx={{ color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.assignedTo?.name || task.assignedTo?.email || 'Unassigned'}
                      </Typography>
                      {task.slaStatus?.isBreached && (
                        <Tooltip title="SLA Breached">
                          <WarningIcon sx={{ fontSize: 14, color: '#ef4444' }} />
                        </Tooltip>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.6875rem' }}>by</Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                        {(() => {
                          const currentUserId = user?.uid || user?.id || user?._id;
                          if (task.assignedBy && (String(task.assignedBy._id) === String(currentUserId) || String(task.assignedBy.id) === String(currentUserId))) return 'Self';
                          return task.assignedBy?.name || task.assignedBy?.email || 'N/A';
                        })()}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <Paper sx={{ ...glassStyles.card, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600, width: '28%', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Task</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600, width: '14%', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Assigned To</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600, width: '14%', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Assigned By</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600, width: '12%', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Severity</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600, width: '14%', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Deadline</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600, width: '10%', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Status</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600, width: '8%', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: '#94a3b8' }}>
                    Loading tasks...
                  </TableCell>
                </TableRow>
              ) : filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: '#94a3b8' }}>
                    No tasks found in this category
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => (
                  <TableRow 
                    key={task.id} 
                    hover
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'rgba(6, 182, 212, 0.12)',
                        '& td': {
                          color: '#06b6d4'
                        }
                      }
                    }}
                    onClick={() => handleTaskClick(task)}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              color: '#f8fafc', 
                              fontWeight: 600,
                              lineHeight: 1.4,
                              mb: 0.5
                            }}
                          >
                            {task.title || task.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace' }}>
                            {task.taskCode || task.findingId || `ID: ${String(task.id?.slice(-6) || '000000').padStart(7, '0')}`}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 500 }}>
                        {task.assignedTo?.name || task.assignedTo?.email || 'Unassigned'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                        {(() => {
                          const currentUserId = user?.uid || user?.id || user?._id;
                          if (task.assignedBy && (String(task.assignedBy._id) === String(currentUserId) || String(task.assignedBy.id) === String(currentUserId))) return 'Self';
                          return task.assignedBy?.name || task.assignedBy?.email || 'N/A';
                        })()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={task.severity} size="small" />
                    </TableCell>
                    <TableCell>
                      {formatDeadline(task)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={statusIcons[task.status?.toLowerCase()]}
                        label={task.status}
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          color: '#94a3b8',
                          textTransform: 'capitalize',
                        }}
                      />
                    </TableCell>
                     <TableCell>
                       <Box sx={{ display: 'flex', gap: 1 }}>
                         <Tooltip 
                           title="Request Help"
                           arrow
                           placement="top"
                           sx={{
                             '& .MuiTooltip-tooltip': {
                               backgroundColor: 'rgba(30, 41, 59, 0.95)',
                               color: '#fff',
                               fontSize: '0.875rem',
                               padding: '8px 12px',
                               borderRadius: '4px',
                               boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                               border: '1px solid rgba(255,255,255,0.1)'
                             }
                           }}
                         >
                           <IconButton
                             size="small"
                             onClick={(event) => {
                               event.stopPropagation();
                               setSelectedFinding(task);
                               setShowHelpDialog(true);
                             }}
                             sx={{ 
                               color: '#94a3b8',
                               '&:hover': { color: '#06b6d4' },
                               '&:active': { transform: 'scale(0.95)' }
                             }}
                           >
                             <HelpIcon fontSize="18" />
                           </IconButton>
                         </Tooltip>
                         <Tooltip 
                           title="Complete Task"
                           arrow
                           placement="top"
                           sx={{
                             '& .MuiTooltip-tooltip': {
                               backgroundColor: 'rgba(30, 41, 59, 0.95)',
                               color: '#fff',
                               fontSize: '0.875rem',
                               padding: '8px 12px',
                               borderRadius: '4px',
                               boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                               border: '1px solid rgba(255,255,255,0.1)'
                             }
                           }}
                         >
                           <IconButton
                             size="small"
                             onClick={async (event) => {
                               event.stopPropagation();
                               try {
                                 await taskAPI.completeTask(task.id || task._id);
                                 showToast('Task completed successfully', 'success');
                                 fetchMyTasks();
                               } catch (error) {
                                 showToast(error.message || 'Failed to complete task', 'error');
                               }
                             }}
                             sx={{ 
                               color: '#22c55e',
                               '&:hover': { color: '#16a34a' },
                               '&:active': { transform: 'scale(0.95)' }
                             }}
                           >
                             <CheckIcon fontSize="18" />
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
      </Paper>
      )}

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
                {['assessment', 'remediation', 'review', 'audit', 'documentation', 'compliance', 'infrastructure', 'research', 'client_activity', 'internal', 'meeting', 'testing', 'reporting', 'miscellaneous'].map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiSelect-select': { color: '#fff' } }}>
              <InputLabel>Priority</InputLabel>
              <Select value={newTask.priority} label="Priority" onChange={(e) => setNewTask({...newTask, priority: e.target.value})}>
                {['critical', 'high', 'medium', 'low', 'informational'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
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

      {/* Close Request Dialog */}
      <Dialog
        open={showCloseDialog}
        onClose={() => setShowCloseDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      >
        <DialogTitle sx={{ color: '#f8fafc' }}>
          Request to Close Finding
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#94a3b8', mb: 2 }}>
            {selectedFinding?.title || selectedFinding?.name}
          </Typography>

          <Typography variant="subtitle2" sx={{ color: '#f8fafc', mb: 1 }}>
            Fix Checklist (Required)
          </Typography>
          <LinearProgress
            variant="determinate"
            value={checklistProgress}
            sx={{
              mb: 2,
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: checklistProgress === 100 ? '#22c55e' : '#06b6d4',
              },
            }}
          />

          {fixChecklist.map((item) => (
            <Box
              key={item.key}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                borderRadius: 1,
                cursor: 'pointer',
                backgroundColor: checklistItems[item.key] 
                  ? 'rgba(34, 197, 94, 0.1)' 
                  : 'rgba(255,255,255,0.05)',
                mb: 1,
                '&:hover': {
                  backgroundColor: checklistItems[item.key] 
                    ? 'rgba(34, 197, 94, 0.2)' 
                    : 'rgba(255,255,255,0.1)',
                },
              }}
              onClick={() => setChecklistItems(prev => ({
                ...prev,
                [item.key]: !prev[item.key],
              }))}
            >
              <CheckIcon
                sx={{
                  color: checklistItems[item.key] ? '#22c55e' : '#64748b',
                  fontSize: 20,
                }}
              />
              <Typography sx={{ color: checklistItems[item.key] ? '#22c55e' : '#94a3b8' }}>
                {item.label}
              </Typography>
            </Box>
          ))}

          <TextField
            fullWidth
            label="Additional Notes"
            multiline
            rows={3}
            value={closeNotes}
            onChange={(e) => setCloseNotes(e.target.value)}
            sx={{
              mt: 2,
              '& .MuiInputBase-input': { color: '#f8fafc' },
              '& .MuiInputLabel-root': { color: '#94a3b8' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowCloseDialog(false)}
            sx={{ color: '#94a3b8' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCloseRequest}
            disabled={checklistProgress < 100}
            variant="contained"
            sx={{
              background: checklistProgress === 100 ? '#22c55e' : '#64748b',
            }}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Help Request Dialog */}
      <Dialog
        open={showHelpDialog}
        onClose={() => setShowHelpDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      >
        <DialogTitle sx={{ color: '#f8fafc' }}>
          Request More Information
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#94a3b8', mb: 2 }}>
            {selectedFinding?.title || selectedFinding?.name}
          </Typography>
          <TextField
            fullWidth
            label="What do you need help with?"
            multiline
            rows={4}
            value={helpMessage}
            onChange={(e) => setHelpMessage(e.target.value)}
            placeholder="Describe what information or clarification you need to fix this finding..."
            sx={{
              '& .MuiInputBase-input': { color: '#f8fafc' },
              '& .MuiInputLabel-root': { color: '#94a3b8' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowHelpDialog(false)}
            sx={{ color: '#94a3b8' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRequestHelp}
            disabled={!helpMessage.trim()}
            variant="contained"
            sx={{ background: '#f59e0b' }}
          >
            Request Help
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Detail Dialog from notification */}
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
            {!editingTask && selectedTaskDetails && isCreator(selectedTaskDetails) && (
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
          {selectedTaskDetails ? (
            <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
              {editingTask ? (
                <>
                  {canEditFullTask(selectedTaskDetails) ? (
                    <>
                      <TextField label="Title" value={taskForm.title} onChange={handleTaskFormChange('title')}
                        fullWidth size="small" sx={{ input: { color: '#f8fafc' }, label: { color: '#94a3b8' } }} />
                      <TextField label="Description" value={taskForm.description} onChange={handleTaskFormChange('description')}
                        multiline rows={3} fullWidth size="small"
                        sx={{ textarea: { color: '#f8fafc' }, label: { color: '#94a3b8' } }} />
                    </>
                  ) : (
                    <>
                      <TextField label="Title" value={taskForm.title}
                        fullWidth size="small" disabled
                        sx={{ input: { color: '#64748b' }, label: { color: '#94a3b8' } }} />
                      <TextField label="Description" value={taskForm.description}
                        multiline rows={3} fullWidth size="small" disabled
                        sx={{ textarea: { color: '#64748b' }, label: { color: '#94a3b8' } }} />
                    </>
                  )}
                  <FormControl size="small" fullWidth>
                    <InputLabel sx={{ color: '#94a3b8' }}>Status</InputLabel>
                    <Select value={taskForm.status} onChange={handleTaskFormChange('status')} label="Status"
                      sx={{ color: '#f8fafc', '& .MuiSvgIcon-root': { color: '#94a3b8' } }}>
                      {getStatusTransitions(selectedTaskDetails?.status).map(s => (
                        <MenuItem key={s} value={s} sx={{ color: '#f8fafc' }}>{s.replace(/_/g, ' ')}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {canEditFullTask(selectedTaskDetails) ? (
                    <FormControl size="small" fullWidth>
                      <InputLabel sx={{ color: '#94a3b8' }}>Priority</InputLabel>
                      <Select value={taskForm.priority} onChange={handleTaskFormChange('priority')} label="Priority"
                        sx={{ color: '#f8fafc', '& .MuiSvgIcon-root': { color: '#94a3b8' } }}>
                        {['low', 'medium', 'high', 'critical'].map(p => (
                          <MenuItem key={p} value={p} sx={{ color: '#f8fafc' }}>{p}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <FormControl size="small" fullWidth>
                      <InputLabel sx={{ color: '#94a3b8' }}>Priority</InputLabel>
                      <Select value={taskForm.priority} label="Priority" disabled
                        sx={{ color: '#64748b', '& .MuiSvgIcon-root': { color: '#94a3b8' } }}>
                        {['low', 'medium', 'high', 'critical'].map(p => (
                          <MenuItem key={p} value={p} sx={{ color: '#f8fafc' }}>{p}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  {canEditFullTask(selectedTaskDetails) ? (
                    <TextField label="Due Date" type="date" value={taskForm.dueDate} onChange={handleTaskFormChange('dueDate')}
                      fullWidth size="small" InputLabelProps={{ shrink: true }}
                      sx={{ input: { color: '#f8fafc' }, label: { color: '#94a3b8' } }} />
                  ) : (
                    <TextField label="Due Date" type="date" value={taskForm.dueDate}
                      fullWidth size="small" InputLabelProps={{ shrink: true }} disabled
                      sx={{ input: { color: '#64748b' }, label: { color: '#94a3b8' } }} />
                  )}
                </>
              ) : (
                <>
                  <Typography sx={{ color: '#94a3b8' }}><strong>Title:</strong> {selectedTaskDetails.title}</Typography>
                  <Typography sx={{ color: '#94a3b8' }}><strong>Status:</strong> {selectedTaskDetails.status || 'N/A'}</Typography>
                  <Typography sx={{ color: '#94a3b8' }}><strong>Assigned By:</strong> {selectedTaskDetails.assignedBy?.name || selectedTaskDetails.assignedBy?.email || 'N/A'}</Typography>
                  <Typography sx={{ color: '#94a3b8' }}><strong>Assigned To:</strong> {selectedTaskDetails.assignedTo?.name || selectedTaskDetails.assignedTo?.email || 'Unassigned'}</Typography>
                  <Typography sx={{ color: '#94a3b8' }}><strong>Priority:</strong> {selectedTaskDetails.priority || selectedTaskDetails.severity || 'Medium'}</Typography>
                  <Typography sx={{ color: '#94a3b8' }}><strong>Due:</strong> {selectedTaskDetails.dueDate ? new Date(selectedTaskDetails.dueDate).toLocaleDateString() : 'None'}</Typography>
                  <Typography sx={{ color: '#94a3b8' }}><strong>Task Type:</strong> {selectedTaskDetails.taskType || 'N/A'}</Typography>
                  <Typography sx={{ color: '#94a3b8' }}><strong>Description:</strong></Typography>
                  <Typography sx={{ color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>{selectedTaskDetails.description || 'No description provided.'}</Typography>
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

export default MyTasks;
