
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Avatar,
  LinearProgress,
  Tooltip,
  IconButton,
  Divider,
  Paper,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Menu,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar,
  Backdrop,
  CircularProgress
} from '@mui/material';
import {
  Folder as FolderIcon,
  BugReport as BugReportIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Security as SecurityIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
  Shield as ShieldIcon,
  Error as ErrorIcon,
  NotificationImportant as NotificationIcon,
  MoreVert as MoreVertIcon,
  Group as GroupIcon,
  AssignmentInd as AssignmentIndIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  PriorityHigh as PriorityHighIcon,
  LowPriority as LowPriorityIcon,
  Speed as SpeedIcon,
  Analytics as AnalyticsIcon,
  Report as ReportIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Copy as CopyIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  ExpandMore as ExpandMoreIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
  Info as InfoIcon,
  Help as HelpIcon,
  Lightbulb as LightbulbIcon,
  Psychology as PsychologyIcon,
  TrackChanges as TrackChangesIcon,
  Gavel as GavelIcon,
  SecurityUpdateGood as SecurityUpdateGoodIcon,
  Update as UpdateIcon,
  History as HistoryIcon,
  AccountTree as AccountTreeIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { request, analyticsAPI, requestAPI, userAPI, projectAPI, vaptCalendarAPI } from '../services/api';
import { DeveloperAssignment } from '../modules/pm/components';
import SystemInfo from '../components/SystemInfo';
import ProfessionalNotificationBar from '../components/ProfessionalNotificationBar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import EKavachLogo from '../components/EKavachLogo';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import PremiumCharts from '../components/PremiumCharts';
import AnimatedCounter from '../components/analytics/AnimatedCounter';

import SearchDropdown from '../components/SearchDropdown';
import { colors, typography, spacing, shadows, borderRadius, transitions, componentStyles } from '../theme/designSystem';
import { sortFindingsByStatusAndSeverity, sortFindingsBySeverity } from '../utils/sortingUtils';

import { API_BASE_URL } from '../config/apiBaseResolver';

const API_BASE = API_BASE_URL;


// Professional unique ID generator for findings - Sequential Vuln_* format
const generateFindingId = () => {
  // Generate a random number for demonstration purposes
  // In production, this should be based on actual count
  const randomNum = Math.floor(Math.random() * 9999999) + 1;
  return `Vuln_${String(randomNum).padStart(7, '0')}`;
};

// Professional date/time formatter
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  return date.toLocaleString('en-GB', options);
};

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return 'N/A';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

// Sort findings by date
const sortFindingsByDate = (findings, order = 'desc') => {
  return [...findings].sort((a, b) => {
    const dateA = new Date(a.createdAt || a.createdDate || 0);
    const dateB = new Date(b.createdAt || b.createdDate || 0);
    return order === 'desc' ? dateB - dateA : dateA - dateB;
  });
};

// Severity color mapping using design system
const severityColors = {
  critical: { 
    main: colors.severity.critical, 
    light: 'rgba(220, 38, 38, 0.1)', 
    gradient: `linear-gradient(135deg, ${colors.severity.critical} 0%, #991b1b 100%)` 
  },
  high: { 
    main: colors.severity.high, 
    light: 'rgba(234, 88, 12, 0.1)', 
    gradient: `linear-gradient(135deg, ${colors.severity.high} 0%, #c2410c 100%)` 
  },
  medium: { 
    main: colors.severity.medium, 
    light: 'rgba(217, 119, 6, 0.1)', 
    gradient: `linear-gradient(135deg, ${colors.severity.medium} 0%, #a16207 100%)` 
  },
  low: { 
    main: colors.severity.low, 
    light: 'rgba(5, 150, 105, 0.1)', 
    gradient: `linear-gradient(135deg, ${colors.severity.low} 0%, #15803d 100%)` 
  },
  info: { 
    main: colors.primary[500], 
    light: 'rgba(6, 182, 212, 0.1)', 
    gradient: `linear-gradient(135deg, ${colors.primary[500]} 0%, ${colors.primary[600]} 100%)` 
  },
};

const SecurityStatCard = ({ title, value, icon, severity, onClick, index = 0, percentage, maxValue }) => {
  const severityColor = severityColors[severity] || severityColors.info;
  const pct = percentage !== undefined ? percentage : (maxValue > 0 ? (Number(value) / maxValue) * 100 : 0);
  const circumference = 2 * Math.PI * 32;
  const dashOffset = circumference - (Math.min(pct, 100) / 100) * circumference;
  const isPercentValue = typeof value === 'string' && value.includes('%');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      style={{ height: '100%' }}
    >
      <Card
        onClick={onClick}
        sx={{
          height: '100%',
          cursor: onClick ? 'pointer' : 'default',
          background: `linear-gradient(145deg, ${colors.background.secondary} 0%, ${colors.background.tertiary} 100%)`,
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: borderRadius.xl,
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': onClick ? {
            transform: 'translateY(-4px)',
            boxShadow: `0 12px 24px rgba(0,0,0,0.3), 0 0 0 1px ${severityColor.main}30`,
            borderColor: severityColor.main,
          } : {},
        }}
        elevation={0}
      >
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: severityColor.gradient, opacity: 0.8 }} />

        <CardContent sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1.5 }}>
          {/* Circular Progress */}
          <Box sx={{ position: 'relative', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke={colors.background.tertiary} strokeWidth="5" />
              <motion.circle
                cx="40" cy="40" r="32"
                fill="none"
                stroke={severityColor.main}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 1.2, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '40px 40px', filter: `drop-shadow(0 0 6px ${severityColor.main}60)` }}
              />
            </svg>
            <Box sx={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {React.cloneElement(icon, { sx: { fontSize: 22, color: severityColor.main } })}
            </Box>
          </Box>

          {/* Value */}
          <Typography
            sx={{
              color: colors.text.primary,
              fontWeight: typography.weight.bold,
              fontSize: { xs: '1.5rem', sm: '1.75rem' },
              fontFamily: typography.fontFamily.mono,
              lineHeight: 1.1,
            }}
          >
            {isPercentValue ? (
              <AnimatedCounter value={parseFloat(value)} decimals={1} suffix="%" />
            ) : (
              <AnimatedCounter value={parseInt(value) || 0} />
            )}
          </Typography>

          {/* Title */}
          <Typography
            variant="body2"
            sx={{
              color: colors.text.secondary,
              fontWeight: typography.weight.medium,
              fontSize: typography.size.xs,
              textTransform: 'uppercase',
              letterSpacing: typography.tracking.wide,
            }}
          >
            {title}
          </Typography>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const VulnerabilityBar = ({ label, value, total, color }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
        <Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 500 }}>
            {label}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color, fontWeight: 700 }}>
          {value}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 6,
          borderRadius: 3,
          backgroundColor: 'rgba(30, 41, 59, 0.5)',
          '& .MuiLinearProgress-bar': {
            backgroundColor: color,
            borderRadius: 3,
          }
        }}
      />
    </Box>
  );
};

const RecentFindingItem = ({ finding, onClick }) => {
  const severityConfig = {
    critical: { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.15)', label: 'CRITICAL' },
    high: { color: '#ea580c', bg: 'rgba(234, 88, 12, 0.15)', label: 'HIGH' },
    medium: { color: '#ca8a04', bg: 'rgba(202, 138, 4, 0.15)', label: 'MEDIUM' },
    low: { color: '#16a34a', bg: 'rgba(22, 163, 74, 0.15)', label: 'LOW' },
  };
  const config = severityConfig[finding.severity] || severityConfig.low;
  
  // Generate professional ID if not exists
  const findingId = finding.findingId || generateFindingId();
  
  return (
    <Paper
      onClick={onClick}
      sx={{
        p: 2,
        mb: 1.5,
        cursor: 'pointer',
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        borderRadius: 2,
        transition: 'all 0.3s ease',
        '&:hover': {
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.8) 100%)',
          borderColor: `${config.color}50`,
          transform: 'translateX(4px)',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body1" sx={{ color: '#f1f5f9', fontWeight: 600, mb: 0.5 }}>
            {finding.title}
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace', display: 'block', mb: 0.5 }}>
            {findingId} • {finding.projectName}
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
            Created: {formatDateTime(finding.createdAt || finding.createdDate)}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={config.label}
          sx={{
            background: config.bg,
            color: config.color,
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '0.5px',
            border: `1px solid ${config.color}40`,
          }}
        />
      </Box>
    </Paper>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, hasFullAccess, filterProjectsByAllocation } = useAuth();
  const { showToast, showConfirm } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allocatedProjects, setAllocatedProjects] = useState([]);
  
  // Premium UI State
  const [activeTab, setActiveTab] = useState(0);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState({
    severity: [],
    status: [],
    project: [],
    assignee: []
  });

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementMessage] = useState('🚀 New Premium Features Released: Advanced Analytics, Bulk Operations, and Enhanced Reporting!');
  
  // Assessment Calendar State
  const [assessmentStats, setAssessmentStats] = useState(null);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState({
    trends: [],
    performance: {},
    riskMetrics: {}
  });
  
  // Productivity State
  const [recentItems, setRecentItems] = useState([]);
  const [pinnedProjects, setPinnedProjects] = useState([]);
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved');
  
  // Enhanced audit log monitoring
  const [auditLogs, setAuditLogs] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    status: 'healthy',
    uptime: '99.9%',
    responseTime: '120ms'
  });
  const [serverMetrics, setServerMetrics] = useState(null);
  const [serverMetricsStatus, setServerMetricsStatus] = useState('loading');
  
  // Enhanced audit log fetching with user activity tracking
  const fetchAuditLogs = async () => {
    if (!isAdmin) return;
    try {
      const logs = await userAPI.getAuditLogs();
      // Enhanced audit logs with user activity tracking
      const enhancedLogs = logs.slice(0, 50).map(log => ({
        ...log,
        timestamp: new Date(log.timestamp),
        actionType: log.action,
        affectedResource: log.resource,
        userRole: log.userRole,
        ipAddress: log.ipAddress,
        sessionId: log.sessionId,
        severity: log.severity || 'info'
      }));
      setAuditLogs(enhancedLogs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };
  
  // Team Management for PMs
  const [teamMembers, setTeamMembers] = useState([]);
  const [allProjects, setAllProjects] = useState([]); // All projects for name lookup
  const [pmProjects, setPmProjects] = useState([]); // Only PM's allocated projects for assignment
  
  // Only admin and VAPT can approve requests
  const canApproveRequests = hasFullAccess();

  // Check if user is admin or VAPT analyst
  const canCreateUsers = hasFullAccess();

  // Check if user is Project Manager
  const isProjectManager = user?.role === 'project_manager';
  const isAdmin = user?.role === 'admin' || user?.role === 'vapt_analyst' || user?.role === 'vapt_tl';
  const isVaptAnalyst = user?.role === 'vapt_analyst';
  const isDeveloper = user?.role === 'developer';

  // Safe defaults for empty data
  const safeStats = useMemo(() => {
    const base = {
      projects: { total: 0, active: 0, completed: 0 },
      findings: { total: 0, critical: 0, high: 0, medium: 0, low: 0, open: 0, closed: 0, partial: 0, overdue: 0, recentCritical: [] },
      users: { total: 0, active: 0 },
      metrics: { avgResolutionTime: 0, slaBreachRate: 0 },
    };
    return {
      ...base,
      ...stats,
      projects: { ...base.projects, ...(stats?.projects || {}) },
      findings: { ...base.findings, ...(stats?.findings || {}) },
      users: { ...base.users, ...(stats?.users || {}) },
      metrics: { ...base.metrics, ...(stats?.metrics || {}) },
    };
  }, [stats]);

  
  const handleNotificationClick = useCallback((notification) => {
    const destination = notification.redirectUrl || notification.link || notification.actionUrl;
    if (destination) {
      navigate(destination);
    }
  }, [navigate]);

  const handleKeyboardShortcuts = useCallback((event) => {
    // Ctrl+K for command palette
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      setCommandPaletteOpen(true);
    }
        // Ctrl+N for quick add
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
      event.preventDefault();
      setQuickAddModalOpen(true);
    }
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const stats = await analyticsAPI.getDashboardStats();
      setStats(stats);
      
      // Fetch allocated projects for project analytics charts
      if (!hasFullAccess() && user?.allocatedProjects?.length > 0) {
        try {
          const projects = await projectAPI.getProjects();
          setAllocatedProjects(projects || []);
        } catch (_) {}
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
    try {
      const res = await vaptCalendarAPI.getStats();
      setAssessmentStats(res);
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    if (canApproveRequests) {
      fetchPendingRequests();
    }
    
    const interval = setInterval(fetchDashboardStats, 60000);
    
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
      clearInterval(interval);
    };
  }, [handleKeyboardShortcuts]);

  const fetchServerMetrics = async () => {
    const startedAt = performance.now();
    try {
      setServerMetricsStatus('loading');
      const result = await request('/system/metrics');
      const responseTime = Math.round(performance.now() - startedAt);
      setServerMetrics(result.data || result);
      setServerMetricsStatus('online');
      setSystemHealth({
        status: 'healthy',
        uptime: formatDuration((result.data || result)?.host?.uptimeSeconds || 0),
        responseTime: `${responseTime}ms`
      });
    } catch (error) {
      setServerMetricsStatus('offline');
      setSystemHealth({
        status: 'offline',
        uptime: 'N/A',
        responseTime: 'N/A'
      });
    }
  };

  const POLL_ANALYTICS_MS = 300000;
  const POLL_METRICS_MS = 60000;

  useEffect(() => {
    const intervals = [];
    if (canApproveRequests) fetchPendingRequests();
    
    const analyticsInterval = setInterval(() => {
      analyticsAPI.getAdvancedAnalytics().then(setAnalyticsData).catch(() => {});
    }, POLL_ANALYTICS_MS);
    intervals.push(analyticsInterval);

    const metricsInterval = setInterval(fetchServerMetrics, POLL_METRICS_MS);
    intervals.push(metricsInterval);
    
    return () => intervals.forEach(clearInterval);
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const requests = await requestAPI.getPendingRequests();
      setPendingRequests(requests);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  // Fetch team members (developers) for PM view
  const fetchTeamMembers = async () => {
    if (!isProjectManager) return;
    try {
      const users = await userAPI.getUsers();
      // Filter only developers
      const developers = users.filter(u => u.role === 'developer');
      setTeamMembers(developers);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  // Fetch all projects for name lookup and PM's allocated projects for assignment
  const fetchAllProjects = async () => {
    if (!isProjectManager) return;
    try {
      const allProjectsData = await projectAPI.getProjects();
      // Store all projects for name lookup (to display assigned project names)
      setAllProjects(allProjectsData);
      
      // Filter to only show projects that THIS PM is allocated to (for assignment)
      const pmAllocatedIds = user?.allocatedProjects || [];
      const pmOnlyProjects = allProjectsData.filter(p => pmAllocatedIds.includes(p.id));
      setPmProjects(pmOnlyProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };


  const handleApproveRequest = async (requestId) => {
    try {
      await requestAPI.approveRequest(requestId, user.name || user.email);
      fetchPendingRequests();
      showToast('Request approved successfully', 'success');
    } catch (error) {
      showToast('Error approving request: ' + error.message, 'error');
    }
  };

  const handleRejectRequest = async (requestId) => {
    await showConfirm({
      title: 'Reject Request',
      message: 'Please enter a reason for rejection.',
      severity: 'warning',
      confirmLabel: 'Reject',
    });
    try {
      await requestAPI.rejectRequest(requestId, user.name || user.email, '');
      fetchPendingRequests();
      showToast('Request rejected', 'success');
    } catch (error) {
      showToast('Error rejecting request: ' + error.message, 'error');
    }
  };

  
  // Fetch team members for PMs
  useEffect(() => {
    if (isProjectManager) {
      fetchTeamMembers();
      fetchAllProjects();
    }
  }, [isProjectManager]);

  // Define closed statuses for filtering
  const closedStatuses = ['closed', 'verified'];

  // Get recent critical findings for display (only open, not closed), sorted by severity
  const recentFindings = sortFindingsBySeverity(
    (safeStats.findings.recentCritical || [])
      .filter(f => 
        f.severity === 'critical' && 
        !closedStatuses.includes((f.status || 'open').toLowerCase())
      ) || []
  )?.slice(0, 5);

  const analyticsChartData = useMemo(() => {
    const findings = safeStats.findings.allFindings || [];
    const projects = safeStats.projects.allProjects || allocatedProjects || [];
    const now = new Date();
    const closedStatuses = ['closed', 'verified'];
    const statusLabels = {
      open: 'Open',
      in_progress: 'In Progress',
      partial: 'Partial',
      resolved: 'Resolved',
      verified: 'Verified',
      closed: 'Closed',
      reopened: 'Reopened'
    };
    const statusColors = {
      open: colors.severity.critical,
      in_progress: colors.severity.high,
      partial: colors.severity.medium,
      resolved: colors.primary[500],
      verified: colors.severity.low,
      closed: colors.severity.low,
      reopened: colors.secondary[500]
    };

    const parseDate = (value) => {
      const date = value ? new Date(value) : null;
      return date && !Number.isNaN(date.getTime()) ? date : null;
    };

    const dayKey = (date) => date.toISOString().slice(0, 10);
    const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      return {
        key: dayKey(date),
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        created: 0,
        closed: 0,
        updated: 0
      };
    });
    const daysByKey = lastSevenDays.reduce((acc, item) => {
      acc[item.key] = item;
      return acc;
    }, {});

    const statusCounts = {};
    const ageBuckets = [
      { bucket: '0-7d', open: 0, closed: 0 },
      { bucket: '8-15d', open: 0, closed: 0 },
      { bucket: '16-30d', open: 0, closed: 0 },
      { bucket: '31-60d', open: 0, closed: 0 },
      { bucket: '60d+', open: 0, closed: 0 }
    ];
    const projectRisk = {};
    const projectLookup = projects.reduce((acc, project) => {
      acc[project.id] = project;
      return acc;
    }, {});

    findings.forEach((finding) => {
      const severity = (finding.severity || 'low').toLowerCase();
      const status = (finding.status || 'open').toLowerCase();
      const createdDate = parseDate(finding.createdAt || finding.createdDate);
      const closedDate = parseDate(finding.closedAt || finding.resolvedAt || finding.verifiedAt);
      const updatedDate = parseDate(finding.updatedAt || finding.updatedDate);
      const isClosed = closedStatuses.includes(status);

      statusCounts[status] = (statusCounts[status] || 0) + 1;

      if (createdDate && daysByKey[dayKey(createdDate)]) {
        daysByKey[dayKey(createdDate)].created += 1;
        if (['critical', 'high', 'medium', 'low'].includes(severity)) {
          daysByKey[dayKey(createdDate)][severity] += 1;
        }
      }

      if (closedDate && daysByKey[dayKey(closedDate)]) {
        daysByKey[dayKey(closedDate)].closed += 1;
      }

      if (updatedDate && daysByKey[dayKey(updatedDate)]) {
        daysByKey[dayKey(updatedDate)].updated += 1;
      }

      const ageDays = createdDate ? Math.max(0, Math.floor((now - createdDate) / (1000 * 60 * 60 * 24))) : null;
      if (ageDays !== null) {
        const bucketIndex = ageDays <= 7 ? 0 : ageDays <= 15 ? 1 : ageDays <= 30 ? 2 : ageDays <= 60 ? 3 : 4;
        ageBuckets[bucketIndex][isClosed ? 'closed' : 'open'] += 1;
      }

      const projectId = finding.projectId || 'unknown';
      const projectName = finding.projectName || projectLookup[projectId]?.name || 'Unassigned';
      if (!projectRisk[projectId]) {
        projectRisk[projectId] = {
          name: projectName.length > 18 ? `${projectName.slice(0, 18)}...` : projectName,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          open: 0,
          closed: 0,
          overdue: 0,
          progress: 0,
          total: 0
        };
      }
      projectRisk[projectId].total += 1;
      if (['critical', 'high', 'medium', 'low'].includes(severity)) {
        projectRisk[projectId][severity] += 1;
      }
      if (isClosed) {
        projectRisk[projectId].closed += 1;
      } else {
        projectRisk[projectId].open += 1;
        if (ageDays !== null && ageDays > 30) {
          projectRisk[projectId].overdue += 1;
        }
      }
    });

    Object.values(projectRisk).forEach((project) => {
      project.progress = project.total > 0 ? Math.round((project.closed / project.total) * 100) : 0;
    });

    const topProjects = Object.values(projectRisk)
      .sort((a, b) => {
        const riskA = (a.critical * 4) + (a.high * 3) + (a.medium * 2) + a.low;
        const riskB = (b.critical * 4) + (b.high * 3) + (b.medium * 2) + b.low;
        return riskB - riskA;
      })
      .slice(0, 6);

    const projectProgress = Object.values(projectRisk)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    const performance = projectProgress.map((project) => ({
      name: project.name,
      resolved: project.closed,
      pending: project.open,
      overdue: project.overdue
    }));

    const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
      status: statusLabels[status] || status.replace(/_/g, ' '),
      count,
      color: statusColors[status] || colors.primary[500]
    }));

    return {
      trends: lastSevenDays,
      userActivity: lastSevenDays,
      statusBreakdown,
      ageBuckets,
      topProjects,
      projectProgress,
      performance,
      projectStatus: [
        { status: 'Active', count: safeStats.projects.active || 0, color: colors.severity.medium },
        { status: 'Completed', count: safeStats.projects.completed || 0, color: colors.severity.low },
        {
          status: 'Other',
          count: Math.max(0, (safeStats.projects.total || 0) - (safeStats.projects.active || 0) - (safeStats.projects.completed || 0)),
          color: colors.severity.high
        }
      ],
      slaBuckets: [
        { label: 'Open', count: safeStats.findings.open || 0, color: colors.severity.high },
        { label: 'Overdue', count: safeStats.findings.overdue || 0, color: colors.severity.critical },
        { label: 'Partial', count: safeStats.findings.partial || 0, color: colors.severity.medium },
        { label: 'Closed', count: safeStats.findings.closed || 0, color: colors.severity.low }
      ]
    };
  }, [safeStats, allocatedProjects]);

  const serverChartData = useMemo(() => {
    if (!serverMetrics) {
      return {
        serverResources: [
          { metric: 'CPU', usedPercent: 0, color: colors.text.disabled },
          { metric: 'RAM', usedPercent: 0, color: colors.text.disabled },
          { metric: 'Storage', usedPercent: 0, color: colors.text.disabled },
          { metric: 'Node Heap', usedPercent: 0, color: colors.text.disabled }
        ]
      };
    }

    const heapPercent = serverMetrics.process?.heapTotal
      ? Math.round((serverMetrics.process.heapUsed / serverMetrics.process.heapTotal) * 100)
      : 0;

    return {
      serverResources: [
        { metric: 'CPU', usedPercent: serverMetrics.cpu?.loadPercent || 0, color: colors.primary[500] },
        { metric: 'RAM', usedPercent: serverMetrics.memory?.usedPercent || 0, color: colors.secondary[500] },
        { metric: 'Storage', usedPercent: serverMetrics.disk?.usedPercent || 0, color: colors.severity.medium },
        { metric: 'Node Heap', usedPercent: heapPercent, color: colors.severity.low }
      ]
    };
  }, [serverMetrics]);

  // Calculate advanced metrics
  const securityScore = useMemo(() => {
    const total = safeStats.findings.total;
    const closed = safeStats.findings.closed;
    const criticalWeight = 4;
    const highWeight = 3;
    const mediumWeight = 2;
    const lowWeight = 1;
    
    if (total === 0) return 100;
    
    const weightedScore = (
      (safeStats.findings.critical * criticalWeight) +
      (safeStats.findings.high * highWeight) +
      (safeStats.findings.medium * mediumWeight) +
      (safeStats.findings.low * lowWeight)
    ) / (total * 4) * 100;
    
    return Math.round(100 - weightedScore);
  }, [safeStats.findings]);

  const riskLevel = useMemo(() => {
    if (securityScore >= 90) return { level: 'Low', color: colors.severity.low };
    if (securityScore >= 70) return { level: 'Medium', color: colors.severity.medium };
    if (securityScore >= 50) return { level: 'High', color: colors.severity.high };
    return { level: 'Critical', color: colors.severity.critical };
  }, [securityScore]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <Fade in={true} timeout={500}>
      <Box sx={{ minHeight: '100vh', position: 'relative' }}>
        {/* Global Announcement Banner */}
        {showAnnouncement && (
          <Box sx={{
            background: `linear-gradient(90deg, ${colors.primary[600]} 0%, ${colors.secondary[600]} 100%)`,
            color: colors.gray[50],
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: typography.size.sm,
            fontWeight: typography.weight.medium
          }}>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LightbulbIcon sx={{ fontSize: 16 }} />
              {announcementMessage}
            </Typography>
            <IconButton size="small" onClick={() => setShowAnnouncement(false)}>
              <CloseIcon sx={{ fontSize: 16, color: colors.gray[50] }} />
            </IconButton>
          </Box>
        )}
        {/* Premium Header with Enhanced Controls */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 4,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 }
        }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: typography.weight.bold,
                  color: colors.text.primary,
                  fontSize: { xs: typography.size.xl, sm: typography.size['2xl'] },
                  letterSpacing: typography.tracking.tight,
                  lineHeight: 1.2,
                }}
              >
                Security Dashboard
              </Typography>
              <Chip
                size="small"
                label={`Risk: ${riskLevel.level}`}
                sx={{
                  backgroundColor: `${riskLevel.color}20`,
                  color: riskLevel.color,
                  fontWeight: typography.weight.semibold,
                  fontSize: typography.size.xs
                }}
              />
            </Box>
            <Typography 
              variant="body1" 
              sx={{ 
                color: colors.text.tertiary,
                fontSize: typography.size.sm
              }}
            >
              Real-time Vulnerability Management & Security Intelligence
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            {/* Search Dropdown */}
            <Box sx={{ width: 280 }}>
              <SearchDropdown
                onNavigate={(type, item) => {
                  // Handle navigation based on type and item
                  switch (type) {
                    case 'findings':
                      navigate(`/findings?search=${item.title}`);
                      break;
                    case 'projects':
                      navigate(`/projects/${item.id}`);
                      break;
                    case 'users':
                      if (isAdmin) navigate('/users');
                      break;
                    case 'reports':
                      navigate('/reports');
                      break;
                  }
                }}
                user={user}
                hasFullAccess={hasFullAccess}
                allocatedProjects={allocatedProjects}
                teamMembers={teamMembers}
              />
            </Box>
            
            {/* Premium Reports */}
            <Button
              variant="contained"
              startIcon={<ReportIcon sx={{ fontSize: 18 }} />}
              onClick={() => navigate('/reports')}
              sx={{ 
                background: `linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[700]} 100%)`,
                color: colors.gray[50],
                borderRadius: borderRadius.lg,
                textTransform: 'none',
                fontWeight: typography.weight.semibold,
                fontSize: typography.size.sm,
                px: 2.5,
                py: 1,
                boxShadow: `0 4px 12px rgba(6, 182, 212, 0.3)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${colors.primary[500]} 0%, ${colors.primary[600]} 100%)`,
                  boxShadow: `0 6px 20px rgba(6, 182, 212, 0.4)`,
                }
              }}
            >
              Reports
            </Button>
          </Box>
        </Box>
        
        {/* Tab Content */}
        <Box sx={{ flex: 1 }}>
          {activeTab === 0 && (
            <>
              {/* Enhanced Security Stats Grid */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
                <Box sx={{ flex: '1 1 200px', minWidth: 180 }}>
                  <SecurityStatCard
                    title="Critical Vulnerabilities"
                    value={safeStats.findings.critical}
                    icon={<ErrorIcon />}
                    severity="critical"
                    onClick={() => navigate('/findings?severity=critical')}
                    index={0}
                    maxValue={safeStats.findings.total || 1}
                  />
                </Box>
                <Box sx={{ flex: '1 1 200px', minWidth: 180 }}>
                  <SecurityStatCard
                    title="High Risk Issues"
                    value={safeStats.findings.high}
                    icon={<WarningIcon />}
                    severity="high"
                    onClick={() => navigate('/findings?severity=high')}
                    index={1}
                    maxValue={safeStats.findings.total || 1}
                  />
                </Box>
                <Box sx={{ flex: '1 1 200px', minWidth: 180 }}>
                  <SecurityStatCard
                    title="Total Projects"
                    value={safeStats.projects.total || 0}
                    icon={<AccountTreeIcon />}
                    severity="info"
                    onClick={() => navigate('/projects')}
                    index={2}
                    maxValue={safeStats.projects.total || 1}
                  />
                </Box>
                <Box sx={{ flex: '1 1 200px', minWidth: 180 }}>
                  <SecurityStatCard
                    title="Active Projects"
                    value={safeStats.projects.active}
                    icon={<FolderIcon />}
                    severity="info"
                    onClick={() => navigate('/projects')}
                    index={3}
                    maxValue={safeStats.projects.total || 1}
                  />
                </Box>
                <Box sx={{ flex: '1 1 200px', minWidth: 180 }}>
                  <SecurityStatCard
                    title="Security Score"
                    value={`${securityScore}%`}
                    icon={<ShieldIcon />}
                    severity={securityScore >= 90 ? 'low' : securityScore >= 70 ? 'medium' : 'high'}
                    index={4}
                    percentage={securityScore}
                  />
                </Box>
                {assessmentStats && (
                  <>
                    <Box sx={{ flex: '1 1 200px', minWidth: 180 }}>
                      <SecurityStatCard
                        title="Assessments Due Soon"
                        value={assessmentStats.dueSoon}
                        icon={<ScheduleIcon />}
                        severity={assessmentStats.dueSoon > 0 ? 'high' : 'low'}
                        onClick={() => navigate('/vapt-calendar')}
                        index={5}
                        maxValue={assessmentStats.total || 1}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 200px', minWidth: 180 }}>
                      <SecurityStatCard
                        title="Overdue Assessments"
                        value={assessmentStats.overdue}
                        icon={<PriorityHighIcon />}
                        severity={assessmentStats.overdue > 0 ? 'critical' : 'low'}
                        onClick={() => navigate('/vapt-calendar')}
                        index={6}
                        maxValue={assessmentStats.total || 1}
                      />
                    </Box>
                  </>
                )}
              </Box>
            
            {/* Quick Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={8}>
                <Card sx={{ 
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: borderRadius.xl,
                  height: '100%',
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                      <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>
                        Security Overview
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<AnalyticsIcon />}
                        onClick={() => navigate('/analytics')}
                        sx={{
                          color: colors.primary[400],
                          '&:hover': {
                            backgroundColor: 'rgba(6, 182, 212, 0.1)',
                          },
                        }}
                      >
                        View Analytics
                      </Button>
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center', p: 2, backgroundColor: colors.background.tertiary, borderRadius: borderRadius.lg }}>
                          <Typography variant="h4" sx={{ color: colors.severity.critical, fontWeight: typography.weight.bold }}>
                            {safeStats.findings.overdue || 0}
                          </Typography>
                          <Typography variant="caption" sx={{ color: colors.text.primary, fontWeight: typography.weight.medium }}>
                            Overdue
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center', p: 2, backgroundColor: colors.background.tertiary, borderRadius: borderRadius.lg }}>
                          <Typography variant="h4" sx={{ color: colors.severity.medium, fontWeight: typography.weight.bold }}>
                            {safeStats.findings.partial || 0}
                          </Typography>
                          <Typography variant="caption" sx={{ color: colors.text.primary, fontWeight: typography.weight.medium }}>
                            Partial Fix
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center', p: 2, backgroundColor: colors.background.tertiary, borderRadius: borderRadius.lg }}>
                          <Typography variant="h4" sx={{ color: colors.severity.low, fontWeight: typography.weight.bold }}>
                            {safeStats.metrics.avgResolutionTime || 0}h
                          </Typography>
                          <Typography variant="caption" sx={{ color: colors.text.primary, fontWeight: typography.weight.medium }}>
                            Avg Resolution
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center', p: 2, backgroundColor: colors.background.tertiary, borderRadius: borderRadius.lg }}>
                          <Typography variant="h4" sx={{ color: colors.primary[400], fontWeight: typography.weight.bold }}>
                            {safeStats.users.active || 0}
                          </Typography>
                          <Typography variant="caption" sx={{ color: colors.text.primary, fontWeight: typography.weight.medium }}>
                            Active Users
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              
              {isAdmin && (
              <Grid item xs={12} md={4}>
                <Card sx={{ 
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: borderRadius.xl,
                  height: '100%',
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold, mb: 3 }}>
                      System Health
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: colors.text.secondary }}>Status</Typography>
                        <Chip
                          size="small"
                          label={systemHealth.status}
                          sx={{
                            backgroundColor: systemHealth.status === 'healthy' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: systemHealth.status === 'healthy' ? '#22c55e' : '#ef4444',
                            fontWeight: typography.weight.medium,
                          }}
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: colors.text.secondary }}>Uptime</Typography>
                        <Typography variant="body2" sx={{ color: colors.text.primary, fontWeight: typography.weight.medium }}>
                          {systemHealth.uptime}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: colors.text.secondary }}>Response Time</Typography>
                        <Typography variant="body2" sx={{ color: colors.text.primary, fontWeight: typography.weight.medium }}>
                          {systemHealth.responseTime}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mt: 2, p: 2, backgroundColor: `${colors.primary[500]}10`, borderRadius: borderRadius.lg, border: `1px solid ${colors.primary[500]}30` }}>
                        <Typography variant="body2" sx={{ color: colors.primary[400], fontWeight: typography.weight.semibold, textAlign: 'center' }}>
                          All Systems Operational
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              )}
            </Grid>
            
            {/* Vulnerability Summary and Recent Activity */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card sx={{ 
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: borderRadius.xl,
                  height: '100%',
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                      <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TimelineIcon sx={{ color: colors.primary[400] }} />
                        Vulnerability Distribution
                      </Typography>
                      <Chip
                        size="small"
                        label={`${safeStats.findings.total} Total`}
                        sx={{
                          backgroundColor: `${colors.primary[500]}15`,
                          color: colors.primary[400],
                          fontWeight: typography.weight.medium,
                        }}
                      />
                    </Box>
                    
                    <VulnerabilityBar 
                      label="Critical" 
                      value={safeStats.findings.critical} 
                      total={safeStats.findings.total} 
                      color={colors.severity.critical} 
                    />
                    <VulnerabilityBar 
                      label="High" 
                      value={safeStats.findings.high} 
                      total={safeStats.findings.total} 
                      color={colors.severity.high} 
                    />
                    <VulnerabilityBar 
                      label="Medium" 
                      value={safeStats.findings.medium} 
                      total={safeStats.findings.total} 
                      color={colors.severity.medium} 
                    />
                    <VulnerabilityBar 
                      label="Low" 
                      value={safeStats.findings.low} 
                      total={safeStats.findings.total} 
                      color={colors.severity.low} 
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ 
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: borderRadius.xl,
                  height: '100%',
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BugReportIcon sx={{ color: colors.severity.critical }} />
                        Recent Critical Issues
                      </Typography>
                      <Button 
                        size="small" 
                        endIcon={<ArrowForwardIcon />}
                        onClick={() => navigate('/findings?severity=critical')}
                        sx={{ color: colors.primary[400] }}
                      >
                        View All
                      </Button>
                    </Box>
                    
                    {recentFindings.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <SecurityIcon sx={{ fontSize: 48, color: colors.severity.low, mb: 2 }} />
                        <Typography variant="body1" sx={{ color: colors.severity.low, fontWeight: typography.weight.medium }}>
                          No critical vulnerabilities
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                        {recentFindings.slice(0, 2).map((finding, index) => (
                          <RecentFindingItem 
                            key={finding.id || index}
                            finding={finding}
                            onClick={() => navigate(`/findings/${finding.id}`)}
                          />
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Severity Distribution - First Chart */}
            <Grid container spacing={3} sx={{ mt: 1, mb: 4 }}>
              <Grid item xs={12} md={8}>
                <PremiumCharts 
                  data={{
                    critical: safeStats.findings.critical,
                    high: safeStats.findings.high,
                    medium: safeStats.findings.medium,
                    low: safeStats.findings.low,
                  }} 
                  type="severity" 
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ 
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: borderRadius.xl,
                  height: '100%',
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold, mb: 3 }}>
                      Resolution Metrics
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: colors.text.secondary }}>Avg Resolution Time</Typography>
                        <Typography variant="body2" sx={{ color: colors.text.primary, fontWeight: typography.weight.medium }}>
                          {safeStats.metrics.avgResolutionTime || 0}h
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: colors.text.secondary }}>SLA Breach Rate</Typography>
                        <Typography variant="body2" sx={{ color: colors.severity.high, fontWeight: typography.weight.medium }}>
                          {safeStats.metrics.slaBreachRate || 0}%
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mt: 2, p: 2, backgroundColor: `${colors.primary[500]}10`, borderRadius: borderRadius.lg, border: `1px solid ${colors.primary[500]}30` }}>
                        <Typography variant="body2" sx={{ color: colors.primary[400], fontWeight: typography.weight.semibold, textAlign: 'center' }}>
                          Security Score: {securityScore}%
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Project Analytics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <PremiumCharts 
                  data={{
                    projectStatus: [
                      { status: 'Active', count: safeStats.projects.active, color: colors.severity.medium },
                      { status: 'Completed', count: safeStats.projects.completed, color: colors.severity.low },
                      { status: 'On Hold', count: Math.max(0, (safeStats.projects.total || 0) - safeStats.projects.active - safeStats.projects.completed), color: colors.severity.high },
                    ],
                  }} 
                  type="projectStatus" 
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <PremiumCharts 
                  data={{
                    projectProgress: allocatedProjects.map(project => ({
                      name: project.name || `Project ${project.id}`,
                      open: (project.statistics?.totalFindings || 0) - (project.statistics?.closedFindings || 0),
                      closed: project.statistics?.closedFindings || 0,
                      progress: project.statistics?.completionPercentage || 0,
                    })) || [],
                  }} 
                  type="projectProgress" 
                />
              </Grid>
            </Grid>
          </>
        )}

        {/* Pending Requests - Only for Admin/VAPT */}
        {canApproveRequests && pendingRequests.length > 0 && (
          <Grid item xs={12}>
            <Card sx={{ 
              background: 'linear-gradient(145deg, rgba(220, 38, 38, 0.1) 0%, rgba(30, 41, 59, 0.8) 100%)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              borderRadius: 3,
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ color: '#dc2626', fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NotificationIcon />
                  Pending Review Requests ({pendingRequests.length})
                </Typography>
                <Grid container spacing={2}>
                  {pendingRequests.map((request) => (
                    <Grid item xs={12} md={6} key={request.id}>
                      <Paper sx={{ 
                        p: 2, 
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: 2,
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ color: '#f1f5f9', fontWeight: 600 }}>
                              {request.type === 'close_finding' ? 'Close Finding Request' : 'Reopen Finding Request'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontFamily: 'monospace' }}>
                              {request.findingId}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
                              By: {request.requestedBy}
                            </Typography>
                            {request.reason && (
                              <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
                                Reason: {request.reason}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button 
                              size="small" 
                              variant="contained"
                              onClick={() => handleApproveRequest(request.id)}
                              sx={{ 
                                background: '#16a34a',
                                '&:hover': { background: '#15803d' }
                              }}
                            >
                              Approve
                            </Button>
                            <Button 
                              size="small" 
                              variant="outlined"
                              onClick={() => handleRejectRequest(request.id)}
                              sx={{ 
                                borderColor: '#dc2626',
                                color: '#dc2626',
                                '&:hover': { background: 'rgba(220, 38, 38, 0.1)' }
                              }}
                            >
                              Reject
                            </Button>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* PM Team Management Section - Only for Project Managers */}
        {isProjectManager && (
          <Grid item xs={12}>
            <Card sx={{ 
              background: 'linear-gradient(145deg, rgba(6, 182, 212, 0.1) 0%, rgba(30, 41, 59, 0.8) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: borderRadius.xl,
              mb: 3
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ color: colors.primary[400], fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <GroupIcon />
                      My Team
                    </Typography>
                    <Typography variant="body2" sx={{ color: colors.text.secondary, mt: 0.5 }}>
                      Assign developers to your allocated projects
                    </Typography>
                  </Box>
                </Box>

                {/* Developer Assignment Component */}
                <DeveloperAssignment 
                  pmUser={user}
                  onRefresh={() => {
                    fetchTeamMembers();
                    fetchAllProjects();
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        )}
        
        {/* Analytics Tab Content */}
        {activeTab === 1 && (
          <>
            {/* Analytics Overview Stats with SLA */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: borderRadius.xl,
                  p: 3,
                  textAlign: 'center'
                }}>
                  <Typography variant="h3" sx={{ color: colors.primary[400], fontWeight: typography.weight.bold, mb: 1 }}>
                    {safeStats.findings.total}
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                    Total Findings
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: borderRadius.xl,
                  p: 3,
                  textAlign: 'center'
                }}>
                  <Typography variant="h3" sx={{ color: colors.severity.critical, fontWeight: typography.weight.bold, mb: 1 }}>
                    {safeStats.findings.critical}
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                    Critical Issues
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: borderRadius.xl,
                  p: 3,
                  textAlign: 'center'
                }}>
                  <Typography variant="h3" sx={{ color: colors.severity.low, fontWeight: typography.weight.bold, mb: 1 }}>
                    {safeStats.findings.closed}
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                    Resolved
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: borderRadius.xl,
                  p: 3,
                  textAlign: 'center'
                }}>
                  <Typography variant="h3" sx={{ color: safeStats.sla?.complianceRate >= 90 ? colors.severity.low : safeStats.sla?.complianceRate >= 70 ? colors.severity.medium : colors.severity.critical, fontWeight: typography.weight.bold, mb: 1 }}>
                    {safeStats.sla?.complianceRate || 0}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                    SLA Compliance
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            {/* SLA Compliance Detail - Admin only */}
            {isAdmin && safeStats.sla && (
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12}>
                  <Card sx={{ 
                    background: colors.background.secondary,
                    border: `1px solid ${colors.border.subtle}`,
                    borderRadius: borderRadius.xl,
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ScheduleIcon sx={{ color: colors.primary[400] }} />
                        SLA Compliance Overview
                      </Typography>
                      <Grid container spacing={3} alignItems="center">
                        <Grid item xs={12} md={8}>
                          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Box sx={{ flex: 1, minWidth: 120, p: 2, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: 2, textAlign: 'center' }}>
                              <Typography variant="h5" sx={{ color: '#22c55e', fontWeight: 700 }}>{safeStats.sla.onTrack}</Typography>
                              <Typography variant="caption" sx={{ color: colors.text.tertiary }}>On Track</Typography>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 120, p: 2, backgroundColor: 'rgba(234, 179, 8, 0.1)', borderRadius: 2, textAlign: 'center' }}>
                              <Typography variant="h5" sx={{ color: '#eab308', fontWeight: 700 }}>{safeStats.sla.atRisk}</Typography>
                              <Typography variant="caption" sx={{ color: colors.text.tertiary }}>At Risk</Typography>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 120, p: 2, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 2, textAlign: 'center' }}>
                              <Typography variant="h5" sx={{ color: '#ef4444', fontWeight: 700 }}>{safeStats.sla.breached}</Typography>
                              <Typography variant="caption" sx={{ color: colors.text.tertiary }}>Breached</Typography>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 120, p: 2, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 2, textAlign: 'center' }}>
                              <Typography variant="h5" sx={{ color: '#3b82f6', fontWeight: 700 }}>{safeStats.sla.resolved}</Typography>
                              <Typography variant="caption" sx={{ color: colors.text.tertiary }}>Resolved</Typography>
                            </Box>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                            <Box sx={{ width: 120, height: 120, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: `conic-gradient(${safeStats.sla.complianceRate >= 90 ? '#22c55e' : safeStats.sla.complianceRate >= 70 ? '#eab308' : '#ef4444'} ${safeStats.sla.complianceRate}%, rgba(30, 41, 59, 0.5) 0%)` }}>
                              <Typography variant="h4" sx={{ color: colors.text.primary, fontWeight: 700, lineHeight: 1 }}>
                                {safeStats.sla.complianceRate}%
                              </Typography>
                              <Typography variant="caption" sx={{ color: colors.text.tertiary, fontSize: '0.65rem' }}>
                                Compliant
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Server Runtime Analytics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={7}>
                <PremiumCharts 
                  data={serverChartData}
                  type="serverResources" 
                />
              </Grid>
              <Grid item xs={12} md={5}>
                <Card sx={{ 
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: borderRadius.xl,
                  height: '100%',
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                      <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>
                        Server Details
                      </Typography>
                      <Chip
                        size="small"
                        label={serverMetricsStatus === 'online' ? 'Online' : serverMetricsStatus === 'loading' ? 'Loading' : 'Unavailable'}
                        sx={{
                          backgroundColor: serverMetricsStatus === 'online' ? 'rgba(63, 185, 80, 0.12)' : 'rgba(215, 58, 73, 0.12)',
                          color: serverMetricsStatus === 'online' ? colors.severity.low : colors.severity.critical,
                          fontWeight: typography.weight.semibold
                        }}
                      />
                    </Box>

                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          {[
                            ['Host', serverMetrics?.host?.hostname || 'Backend not reachable'],
                            ['Platform', serverMetrics ? `${serverMetrics.host?.platform || 'N/A'} ${serverMetrics.host?.arch || ''}` : 'N/A'],
                            ['CPU', serverMetrics ? `${serverMetrics.cpu?.model || 'Unknown'} (${serverMetrics.host?.cpuCount || 0} cores)` : 'N/A'],
                            ['CPU Load', serverMetrics ? `${serverMetrics.cpu?.loadPercent || 0}% (${serverMetrics.cpu?.load1m || 0} 1m avg)` : 'N/A'],
                            ['RAM', serverMetrics ? `${formatBytes(serverMetrics.memory?.used || 0)} / ${formatBytes(serverMetrics.memory?.total || 0)} (${serverMetrics.memory?.usedPercent || 0}%)` : 'N/A'],
                            ['Storage', serverMetrics?.disk ? `${formatBytes(serverMetrics.disk.used)} / ${formatBytes(serverMetrics.disk.total)} (${serverMetrics.disk.usedPercent}%)` : 'Unavailable'],
                            ['Node Heap', serverMetrics ? `${formatBytes(serverMetrics.process?.heapUsed || 0)} / ${formatBytes(serverMetrics.process?.heapTotal || 0)}` : 'N/A'],
                            ['Server Uptime', serverMetrics ? formatDuration(serverMetrics.host?.uptimeSeconds || 0) : 'N/A'],
                            ['Updated', serverMetrics?.timestamp ? formatDateTime(serverMetrics.timestamp) : 'N/A']
                          ].map(([label, value]) => (
                            <TableRow key={label}>
                              <TableCell sx={{ color: colors.text.secondary, borderColor: colors.border.subtle, pl: 0 }}>
                                {label}
                              </TableCell>
                              <TableCell sx={{ color: colors.text.primary, borderColor: colors.border.subtle, fontWeight: typography.weight.medium }}>
                                {value}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {serverMetrics && (
                      <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {serverChartData.serverResources.map((metric) => (
                          <Box key={metric.metric}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" sx={{ color: colors.text.secondary }}>
                                {metric.metric}
                              </Typography>
                              <Typography variant="caption" sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>
                                {metric.usedPercent}%
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={metric.usedPercent}
                              sx={{
                                height: 8,
                                borderRadius: borderRadius.full,
                                backgroundColor: colors.background.tertiary,
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: metric.color,
                                  borderRadius: borderRadius.full
                                }
                              }}
                            />
                          </Box>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Main Analytics Charts */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={12}>
                <PremiumCharts 
                  data={analyticsChartData}
                  type="trend" 
                />
              </Grid>
            </Grid>

            {/* Finding Workflow Analytics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <PremiumCharts 
                  data={analyticsChartData}
                  type="userActivity" 
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <PremiumCharts 
                  data={analyticsChartData}
                  type="statusBreakdown" 
                />
              </Grid>
            </Grid>

            {/* Project Analytics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <PremiumCharts 
                  data={analyticsChartData}
                  type="projectStatus" 
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <PremiumCharts 
                  data={analyticsChartData}
                  type="projectProgress" 
                />
              </Grid>
            </Grid>

            {/* Risk and SLA Analytics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <PremiumCharts 
                  data={analyticsChartData}
                  type="topProjects" 
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <PremiumCharts 
                  data={analyticsChartData}
                  type="ageBuckets" 
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <PremiumCharts 
                  data={analyticsChartData}
                  type="sla" 
                />
              </Grid>
            </Grid>

            {/* Performance and Team Analytics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={8}>
                <PremiumCharts 
                  data={{
                    performance: [
                      { name: 'Team A', resolved: 15, pending: 5, overdue: 2 },
                      { name: 'Team B', resolved: 12, pending: 8, overdue: 1 },
                      { name: 'Team C', resolved: 18, pending: 3, overdue: 0 },
                      { name: 'Team D', resolved: 10, pending: 10, overdue: 3 },
                    ],
                  }} 
                  type="performance" 
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ 
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: borderRadius.xl,
                  height: '100%',
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold, mb: 3 }}>
                      Resolution Metrics
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: colors.text.secondary }}>Avg Resolution Time</Typography>
                        <Typography variant="body2" sx={{ color: colors.text.primary, fontWeight: typography.weight.medium }}>
                          {safeStats.metrics.avgResolutionTime || 0}h
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: colors.text.secondary }}>SLA Breach Rate</Typography>
                        <Typography variant="body2" sx={{ color: colors.severity.high, fontWeight: typography.weight.medium }}>
                          {safeStats.metrics.slaBreachRate || 0}%
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: colors.text.secondary }}>Resolution Rate</Typography>
                        <Typography variant="body2" sx={{ color: colors.severity.low, fontWeight: typography.weight.medium }}>
                          {safeStats.findings.total > 0 ? Math.round((safeStats.findings.closed / safeStats.findings.total) * 100) : 0}%
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mt: 2, p: 2, backgroundColor: `${colors.primary[500]}10`, borderRadius: borderRadius.lg, border: `1px solid ${colors.primary[500]}30` }}>
                        <Typography variant="body2" sx={{ color: colors.primary[400], fontWeight: typography.weight.semibold, textAlign: 'center' }}>
                          Security Score: {securityScore}%
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Audit Log Monitoring - Admin Only */}
            {isAdmin && (
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12}>
                  <Card sx={{ 
                    background: colors.background.secondary,
                    border: `1px solid ${colors.border.subtle}`,
                    borderRadius: borderRadius.xl,
                    height: '100%',
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                        <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <HistoryIcon sx={{ color: colors.primary[400] }} />
                          System Activity Monitor
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<RefreshIcon />}
                          onClick={fetchAuditLogs}
                          sx={{
                            color: colors.primary[400],
                            '&:hover': {
                              backgroundColor: 'rgba(6, 182, 212, 0.1)',
                            },
                          }}
                        >
                          Refresh
                        </Button>
                      </Box>
                      
                      <TableContainer sx={{ maxHeight: 400 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>Timestamp</TableCell>
                              <TableCell sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>User</TableCell>
                              <TableCell sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>Action</TableCell>
                              <TableCell sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>Resource</TableCell>
                              <TableCell sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>IP Address</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {auditLogs.slice(0, 10).map((log, index) => (
                              <TableRow key={index}>
                                <TableCell sx={{ color: colors.text.secondary }}>
                                  {formatDateTime(log.timestamp)}
                                </TableCell>
                                <TableCell sx={{ color: colors.text.secondary }}>
                                  {log.userName || 'Unknown'}
                                </TableCell>
                                <TableCell sx={{ color: colors.text.secondary }}>
                                  <Chip
                                    size="small"
                                    label={log.actionType}
                                    sx={{
                                      backgroundColor: log.severity === 'high' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(6, 182, 212, 0.1)',
                                      color: log.severity === 'high' ? colors.severity.critical : colors.primary[400],
                                      fontSize: '0.75rem',
                                    }}
                                  />
                                </TableCell>
                                <TableCell sx={{ color: colors.text.secondary }}>
                                  {log.affectedResource || 'N/A'}
                                </TableCell>
                                <TableCell sx={{ color: colors.text.secondary }}>
                                  {log.ipAddress || 'N/A'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Vulnerability Distribution */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card sx={{ 
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: borderRadius.xl,
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: `linear-gradient(90deg, ${colors.primary[500]} 0%, ${colors.secondary[500]} 100%)`,
                  },
                }}>
                  <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                      <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TimelineIcon sx={{ color: colors.primary[400] }} />
                        Vulnerability Distribution
                      </Typography>
                      <Chip
                        size="small"
                        label={`${safeStats.findings.total} Total`}
                        sx={{
                          backgroundColor: `${colors.primary[500]}15`,
                          color: colors.primary[400],
                          fontWeight: typography.weight.medium,
                        }}
                      />
                    </Box>
                    
                    <VulnerabilityBar 
                      label="Critical" 
                      value={safeStats.findings.critical} 
                      total={safeStats.findings.total} 
                      color={colors.severity.critical} 
                    />
                    <VulnerabilityBar 
                      label="High" 
                      value={safeStats.findings.high} 
                      total={safeStats.findings.total} 
                      color={colors.severity.high} 
                    />
                    <VulnerabilityBar 
                      label="Medium" 
                      value={safeStats.findings.medium} 
                      total={safeStats.findings.total} 
                      color={colors.severity.medium} 
                    />
                    <VulnerabilityBar 
                      label="Low" 
                      value={safeStats.findings.low} 
                      total={safeStats.findings.total} 
                      color={colors.severity.low} 
                    />
                  </CardContent>
                </Card>
              </Grid>
              
              {isAdmin && (
              <Grid item xs={12} md={6}>
                <Card sx={{ 
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: borderRadius.xl,
                  height: '100%',
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold, mb: 3 }}>
                      System Health
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: colors.text.secondary }}>Status</Typography>
                        <Chip
                          size="small"
                          label={systemHealth.status}
                          sx={{
                            backgroundColor: systemHealth.status === 'healthy' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: systemHealth.status === 'healthy' ? '#22c55e' : '#ef4444',
                            fontWeight: typography.weight.medium,
                          }}
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: colors.text.secondary }}>Uptime</Typography>
                        <Typography variant="body2" sx={{ color: colors.text.primary, fontWeight: typography.weight.medium }}>
                          {systemHealth.uptime}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ color: colors.text.secondary }}>Response Time</Typography>
                        <Typography variant="body2" sx={{ color: colors.text.primary, fontWeight: typography.weight.medium }}>
                          {systemHealth.responseTime}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mt: 2, p: 2, backgroundColor: `${colors.primary[500]}10`, borderRadius: borderRadius.lg, border: `1px solid ${colors.primary[500]}30` }}>
                        <Typography variant="body2" sx={{ color: colors.primary[400], fontWeight: typography.weight.semibold, textAlign: 'center' }}>
                          All Systems Operational
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              )}
            </Grid>
          </>
        )}
        
            
        
        </Box>
      </Box>
    </Fade>
  );
};

export default Dashboard;
