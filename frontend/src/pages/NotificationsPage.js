import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Avatar,
  Badge,
  CircularProgress,
  TextField,
  Tabs,
  Tab,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  InputAdornment,
  Divider,
  Fade,
  Select,
  MenuItem,
  FormControl,
  Pagination,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  NotificationsOff as NotificationsOffIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Reply as ReplyIcon,
  MarkEmailRead as MarkEmailReadIcon,
  MarkEmailUnread as MarkEmailUnreadIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Person as PersonIcon,
  DoneAll as DoneAllIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Flag as FlagIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';
import { colors, typography, shadows, borderRadius, transitions } from '../theme/designSystem';

const NOTIFICATION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'finding_assigned', label: 'Finding Assigned' },
  { value: 'finding_updated', label: 'Finding Updated' },
  { value: 'task_assigned', label: 'Task Assigned' },
  { value: 'task_updated', label: 'Task Updated' },
  { value: 'task_completed', label: 'Task Completed' },
  { value: 'task_escalated', label: 'Task Escalated' },
  { value: 'support_request', label: 'Support Request' },
  { value: 'support_comment', label: 'Support Comment' },
  { value: 'support_assignment', label: 'Support Assignment' },
  { value: 'support_status', label: 'Support Status' },
  { value: 'mention', label: 'Mention' },
  { value: 'review_request', label: 'Review Request' },
  { value: 'system', label: 'System' },
];

const DATE_FILTERS = [
  { value: 0, label: 'All Time' },
  { value: 1, label: 'Today' },
  { value: 7, label: 'Last 7 Days' },
  { value: 14, label: 'Last 14 Days' },
];

const typeIcons = {
  finding_assigned: <ErrorIcon sx={{ color: '#ef4444' }} />,
  finding_updated: <WarningIcon sx={{ color: '#f59e0b' }} />,
  task_assigned: <CheckCircleOutlineIcon sx={{ color: colors.primary[400] }} />,
  task_updated: <InfoIcon sx={{ color: colors.primary[400] }} />,
  task_completed: <CheckCircleIcon sx={{ color: '#22c55e' }} />,
  task_escalated: <FlagIcon sx={{ color: '#ef4444' }} />,
  comment_added: <ReplyIcon sx={{ color: '#8b5cf6' }} />,
  mention: <WarningIcon sx={{ color: '#f59e0b' }} />,
  system: <InfoIcon sx={{ color: '#64748b' }} />,
};

const typeBgColors = {
  finding_assigned: 'rgba(239, 68, 68, 0.12)',
  finding_updated: 'rgba(245, 158, 11, 0.12)',
  task_assigned: 'rgba(6, 182, 212, 0.12)',
  task_updated: 'rgba(6, 182, 212, 0.12)',
  task_completed: 'rgba(34, 197, 94, 0.12)',
  task_escalated: 'rgba(239, 68, 68, 0.12)',
  comment_added: 'rgba(139, 92, 246, 0.12)',
  mention: 'rgba(245, 158, 11, 0.12)',
  system: 'rgba(100, 116, 139, 0.12)',
};

const formatTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatDateGroup = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((startOfDay - d) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'This Week';
  if (diffDays < 30) return 'Earlier';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const groupByDate = (notifications) => {
  const groups = {};
  const order = ['Today', 'Yesterday', 'This Week', 'Earlier'];
  for (const n of notifications) {
    const key = formatDateGroup(n.createdAt);
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  }
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return Object.entries(groups).sort(([a], [b]) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return 0;
  });
};

const SkeletonNotification = () => (
  <Box sx={{ p: 3, mb: 1, background: colors.background.secondary, border: `1px solid ${colors.border.subtle}`, borderRadius: 3, overflow: 'hidden' }}>
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <Box sx={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(90deg, ${colors.background.tertiary} 25%, ${colors.background.elevated} 50%, ${colors.background.tertiary} 75%)`, backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', flexShrink: 0 }} />
      <Box sx={{ flex: 1 }}>
        <Box sx={{ width: '60%', height: 14, borderRadius: 1, mb: 1.5, background: `linear-gradient(90deg, ${colors.background.tertiary} 25%, ${colors.background.elevated} 50%, ${colors.background.tertiary} 75%)`, backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        <Box sx={{ width: '90%', height: 12, borderRadius: 1, mb: 1, background: `linear-gradient(90deg, ${colors.background.tertiary} 25%, ${colors.background.elevated} 50%, ${colors.background.tertiary} 75%)`, backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        <Box sx={{ width: '40%', height: 12, borderRadius: 1, background: `linear-gradient(90deg, ${colors.background.tertiary} 25%, ${colors.background.elevated} 50%, ${colors.background.tertiary} 75%)`, backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
      </Box>
    </Box>
  </Box>
);

const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterTab, setFilterTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [threadDialog, setThreadDialog] = useState(null);
  const [thread, setThread] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const fetchNotifications = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (filterTab === 1) params.isRead = false;
      if (filterTab === 2) params.isRead = true;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (typeFilter) params.type = typeFilter;
      if (dateFilter > 0) params.days = dateFilter;

      const result = await notificationService.fetchNotifications(params);
      const list = result?.data ?? [];
      setNotifications(list);
      setTotalCount(result?.total ?? list.length);
      setTotalPages(result?.pages ?? 1);
      setUnreadCount(notificationService.getUnreadCount());
    } finally {
      setLoading(false);
    }
  }, [filterTab, searchQuery, typeFilter, page]);

  useEffect(() => {
    if (!user) return;
    notificationService.init(user._id || user.id);
    const unsub1 = notificationService.on('unread', setUnreadCount);
    const unsub2 = notificationService.on('delete', () => {
      setUnreadCount(notificationService.getUnreadCount());
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  useEffect(() => {
    fetchNotifications(1);
    setPage(1);
  }, [filterTab, searchQuery, typeFilter]);

  useEffect(() => {
    fetchNotifications(page);
  }, [page]);

  const handleTabChange = (_, v) => {
    setFilterTab(v);
    setPage(1);
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const navigateToEntity = (notif) => {
    const url = notif.redirectUrl;
    if (url) navigate(url);
  };

  const markAsRead = async (id) => {
    await notificationService.markAsRead(id);
    setNotifications(prev => prev.map(n => (n._id === id || n.id === id) ? { ...n, isRead: true } : n));
  };

  const markAsUnread = async (id) => {
    await notificationService.markAsUnread(id);
    setNotifications(prev => prev.map(n => (n._id === id || n.id === id) ? { ...n, isRead: false } : n));
  };

  const markAllAsRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setSelectedIds(new Set());
  };

  const bulkMarkAsRead = async () => {
    for (const id of selectedIds) {
      await notificationService.markAsRead(id);
    }
    setNotifications(prev => prev.map(n => selectedIds.has(n._id || n.id) ? { ...n, isRead: true } : n));
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const bulkDelete = async () => {
    for (const id of selectedIds) {
      await notificationService.deleteNotification(id);
    }
    setNotifications(prev => prev.filter(n => !selectedIds.has(n._id || n.id)));
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const deleteNotification = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n._id !== id && n.id !== id));
      setUnreadCount(notificationService.getUnreadCount());
    } catch {}
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n._id || n.id)));
    }
  };

  const openThread = async (notif) => {
    setThreadDialog(notif);
    setReplyText('');
    setThreadLoading(true);
    try {
      const t = await notificationService.getThread(notif._id || notif.id);
      setThread(Array.isArray(t) ? t : []);
    } catch {
      setThread([]);
    } finally {
      setThreadLoading(false);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !threadDialog) return;
    setReplying(true);
    try {
      await notificationService.replyToNotification(threadDialog._id || threadDialog.id, replyText.trim());
      setReplyText('');
      const t = await notificationService.getThread(threadDialog._id || threadDialog.id);
      setThread(Array.isArray(t) ? t : []);
    } catch {
      //
    } finally {
      setReplying(false);
    }
  };

  const groupLabel = notifications.length > 0 ? groupByDate(notifications) : [];

  return (
    <Box sx={{ maxWidth: 860, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: 2.5,
            background: `linear-gradient(135deg, ${colors.primary[500]}20, ${colors.secondary[500]}20)`,
            border: `1px solid ${colors.primary[500]}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <NotificationsIcon sx={{ color: colors.primary[400], fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ color: colors.text.primary, fontWeight: 700, fontSize: '1.35rem', letterSpacing: typography.tracking.tight, lineHeight: 1.2 }}>
              Notifications
            </Typography>
            <Typography sx={{ color: colors.text.tertiary, fontSize: '0.82rem', mt: 0.3 }}>
              {unreadCount > 0
                ? <span><span style={{ color: colors.primary[400], fontWeight: 600 }}>{unreadCount}</span> unread · {totalCount} total</span>
                : 'All caught up'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {unreadCount > 0 && !selectMode && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<DoneAllIcon sx={{ fontSize: 16 }} />}
              onClick={markAllAsRead}
              sx={{
                color: colors.primary[400], borderColor: `${colors.primary[500]}40`,
                borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem',
                px: 1.5, height: 34,
                '&:hover': { borderColor: colors.primary[500], backgroundColor: 'rgba(6, 182, 212, 0.08)' },
              }}
            >
              Mark all read
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={() => fetchNotifications(page)}
            sx={{
              color: colors.text.secondary, borderColor: colors.border.subtle,
              borderRadius: 2, textTransform: 'none', fontWeight: 500, fontSize: '0.8rem',
              px: 1.5, height: 34,
              '&:hover': { borderColor: colors.text.secondary, backgroundColor: colors.background.tertiary },
            }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <Paper elevation={0} sx={{
        p: 1.5, mb: 2.5,
        background: colors.background.secondary,
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: 2.5,
        display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
      }}>
        <TextField
          placeholder="Search notifications..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: colors.text.tertiary, fontSize: 18 }} /></InputAdornment>,
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')} sx={{ color: colors.text.tertiary, p: 0.3 }}>
                  <ClearIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{
            flex: 1, minWidth: 180,
            '& .MuiOutlinedInput-root': {
              color: colors.text.primary, backgroundColor: colors.background.tertiary,
              borderRadius: 2, height: 36, fontSize: '0.82rem',
              '& fieldset': { borderColor: colors.border.subtle },
              '&:hover fieldset': { borderColor: 'rgba(6, 182, 212, 0.3)' },
              '&.Mui-focused fieldset': { borderColor: `${colors.primary[500]} !important` },
            },
            '& .MuiInputBase-input::placeholder': { color: colors.text.tertiary, opacity: 1 },
          }}
        />

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            displayEmpty
            sx={{
              color: colors.text.secondary, backgroundColor: colors.background.tertiary,
              borderRadius: 2, height: 36, fontSize: '0.78rem',
              '& fieldset': { borderColor: colors.border.subtle },
              '&:hover fieldset': { borderColor: 'rgba(6, 182, 212, 0.3)' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: `${colors.primary[500]} !important` },
            }}
          >
            {NOTIFICATION_TYPES.map(t => (
              <MenuItem key={t.value} value={t.value} sx={{ fontSize: '0.8rem' }}>{t.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            sx={{
              color: colors.text.secondary, backgroundColor: colors.background.tertiary,
              borderRadius: 2, height: 36, fontSize: '0.78rem',
              '& fieldset': { borderColor: colors.border.subtle },
              '&:hover fieldset': { borderColor: 'rgba(6, 182, 212, 0.3)' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: `${colors.primary[500]} !important` },
            }}
          >
            {DATE_FILTERS.map(d => (
              <MenuItem key={d.value} value={d.value} sx={{ fontSize: '0.8rem' }}>{d.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Tabs
          value={filterTab}
          onChange={handleTabChange}
          sx={{
            minHeight: 36,
            '& .MuiTab-root': {
              color: colors.text.tertiary, textTransform: 'none', fontWeight: 600,
              fontSize: '0.78rem', py: 0.5, px: 1.5, minHeight: 36, minWidth: 'auto',
              '&.Mui-selected': { color: colors.primary[400] },
            },
            '& .MuiTabs-indicator': { backgroundColor: colors.primary[500], height: 2, borderRadius: 1 },
            '& .MuiTabs-flexContainer': { gap: 0 },
          }}
        >
          <Tab label="All" />
          <Tab label={`Unread (${unreadCount})`} />
          <Tab label="Read" />
        </Tabs>
      </Paper>

      {selectMode && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, px: 0.5 }}>
          <Checkbox
            checked={notifications.length > 0 && selectedIds.size === notifications.length}
            indeterminate={selectedIds.size > 0 && selectedIds.size < notifications.length}
            onChange={toggleSelectAll}
            sx={{ color: colors.text.tertiary, '&.Mui-checked': { color: colors.primary[400] }, p: 0.3 }}
          />
          <Typography sx={{ color: colors.text.secondary, fontSize: '0.82rem', fontWeight: 500 }}>
            {selectedIds.size} selected
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button size="small" startIcon={<MarkEmailReadIcon sx={{ fontSize: 16 }} />} onClick={bulkMarkAsRead} disabled={selectedIds.size === 0}
            sx={{ color: colors.primary[400], textTransform: 'none', fontWeight: 600, fontSize: '0.78rem', borderRadius: 2 }}>
            Mark read
          </Button>
          <Button size="small" startIcon={<DeleteIcon sx={{ fontSize: 16 }} />} onClick={bulkDelete} disabled={selectedIds.size === 0}
            sx={{ color: '#ef4444', textTransform: 'none', fontWeight: 600, fontSize: '0.78rem', borderRadius: 2 }}>
            Delete
          </Button>
          <Button size="small" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
            sx={{ color: colors.text.tertiary, textTransform: 'none', fontWeight: 500, fontSize: '0.78rem', borderRadius: 2 }}>
            Cancel
          </Button>
        </Box>
      )}

      {loading && notifications.length === 0 ? (
        <Box>
          <SkeletonNotification />
          <SkeletonNotification />
          <SkeletonNotification />
          <SkeletonNotification />
          <SkeletonNotification />
        </Box>
      ) : notifications.length === 0 ? (
        <Fade in timeout={400}>
          <Box sx={{ textAlign: 'center', py: 12 }}>
            <Box sx={{
              width: 80, height: 80, mx: 'auto', mb: 3,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${colors.primary[500]}12, ${colors.secondary[500]}12)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {searchQuery ? (
                <SearchIcon sx={{ fontSize: 36, color: 'rgba(148, 163, 184, 0.25)' }} />
              ) : (
                <NotificationsOffIcon sx={{ fontSize: 36, color: 'rgba(148, 163, 184, 0.25)' }} />
              )}
            </Box>
            <Typography sx={{ color: colors.text.secondary, fontSize: '1rem', fontWeight: 600, mb: 0.5 }}>
              {searchQuery ? 'No results found' : filterTab === 1 ? 'No unread notifications' : filterTab === 2 ? 'No read notifications' : 'No notifications yet'}
            </Typography>
            <Typography sx={{ color: colors.text.tertiary, fontSize: '0.85rem', maxWidth: 360, mx: 'auto', lineHeight: 1.5 }}>
              {searchQuery
                ? 'Try adjusting your search terms or filters'
                : filterTab === 0
                  ? 'Notifications will appear here when something needs your attention'
                  : 'Try switching the filter tab above'}
            </Typography>
          </Box>
        </Fade>
      ) : (
        <Box>
          {groupLabel.map(([groupLabelText, groupItems]) => (
            <Box key={groupLabelText} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, px: 0.5 }}>
                <Typography sx={{ color: colors.text.tertiary, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {groupLabelText}
                </Typography>
                <Box sx={{ flex: 1, height: '1px', background: `linear-gradient(90deg, ${colors.border.subtle}, transparent)` }} />
                <Typography sx={{ color: 'rgba(148, 163, 184, 0.3)', fontSize: '0.65rem', fontWeight: 500 }}>
                  {groupItems.length}
                </Typography>
              </Box>

              {groupItems.map((notif, index) => {
                const nid = notif._id || notif.id;
                const isSelected = selectedIds.has(nid);
                const icon = typeIcons[notif.type] || <InfoIcon sx={{ color: '#64748b' }} />;
                const bgColor = typeBgColors[notif.type] || 'rgba(100, 116, 139, 0.1)';
                const hasUrl = !!notif.redirectUrl;

                return (
                  <Box key={nid} sx={{ animation: `slideIn 0.35s ease-out ${index * 0.04}s both`, mb: 1 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        background: notif.isRead
                          ? colors.background.secondary
                          : `linear-gradient(135deg, ${colors.primary[500]}04, ${colors.secondary[500]}04)`,
                        border: `1px solid ${
                          isSelected
                            ? `${colors.primary[500]}50`
                            : notif.isRead
                              ? colors.border.subtle
                              : `${colors.primary[500]}20`
                        }`,
                        borderRadius: 2.5,
                        cursor: hasUrl ? 'pointer' : 'default',
                        transition: transitions.premium,
                        position: 'relative',
                        overflow: 'hidden',
                        '&:hover': {
                          borderColor: isSelected
                            ? colors.primary[400]
                            : notif.isRead
                              ? 'rgba(148, 163, 184, 0.25)'
                              : 'rgba(6, 182, 212, 0.35)',
                          backgroundColor: notif.isRead ? colors.background.tertiary : `rgba(6, 182, 212, 0.06)`,
                          transform: 'translateY(-1px)',
                          boxShadow: shadows.md,
                        },
                        '&::before': !notif.isRead ? {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: 12,
                          bottom: 12,
                          width: 3,
                          background: `linear-gradient(180deg, ${colors.primary[500]}, ${colors.secondary[500]})`,
                          borderRadius: '0 4px 4px 0',
                          boxShadow: `0 0 8px ${colors.primary[500]}50`,
                        } : {},
                      }}
                      onClick={() => {
                        if (!selectMode) navigateToEntity(notif);
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        {selectMode && (
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleSelect(nid)}
                            onClick={(e) => e.stopPropagation()}
                            sx={{ color: colors.text.tertiary, '&.Mui-checked': { color: colors.primary[400] }, p: 0.3, mt: 2 }}
                          />
                        )}
                        <Box sx={{
                          width: 40, height: 40, borderRadius: 2, flexShrink: 0,
                          background: bgColor,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          '& .MuiSvgIcon-root': { fontSize: 20 },
                          mt: 0.3,
                        }}>
                          {icon}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                              <Typography sx={{
                                color: colors.text.primary, fontWeight: 700, fontSize: '0.88rem',
                                lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              }}>
                                {notif.title}
                              </Typography>
                              {!notif.isRead && (
                                <Box sx={{
                                  width: 7, height: 7, borderRadius: '50%',
                                  background: colors.primary[500],
                                  boxShadow: `0 0 6px ${colors.primary[500]}80`,
                                  flexShrink: 0,
                                }} />
                              )}
                            </Box>
                            <Typography sx={{ color: colors.text.tertiary, fontSize: '0.7rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                              {formatTime(notif.createdAt)}
                            </Typography>
                          </Box>
                          <Typography sx={{
                            color: colors.text.secondary, fontSize: '0.8rem', mb: 1.2,
                            lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>
                            {notif.message}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                            {notif.priority === 'urgent' && (
                              <Chip label="URGENT" size="small" sx={{
                                height: 20, fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.04em',
                                backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', borderRadius: 1,
                              }} />
                            )}
                            {notif.priority === 'high' && (
                              <Chip label="HIGH" size="small" sx={{
                                height: 20, fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.04em',
                                backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', borderRadius: 1,
                              }} />
                            )}
                            <Box sx={{ flex: 1 }} />
                            {selectMode ? null : (
                              <>
                                <Tooltip title="Reply" arrow>
                                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); openThread(notif); }}
                                    sx={{ color: 'rgba(148, 163, 184, 0.5)', '&:hover': { color: colors.primary[400], backgroundColor: 'rgba(6, 182, 212, 0.1)' }, p: 0.6 }}>
                                    <ReplyIcon sx={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                                {notif.isRead ? (
                                  <Tooltip title="Mark unread" arrow>
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); markAsUnread(nid); }}
                                      sx={{ color: 'rgba(148, 163, 184, 0.5)', '&:hover': { color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)' }, p: 0.6 }}>
                                      <MarkEmailUnreadIcon sx={{ fontSize: 15 }} />
                                    </IconButton>
                                  </Tooltip>
                                ) : (
                                  <Tooltip title="Mark read" arrow>
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); markAsRead(nid); }}
                                      sx={{ color: 'rgba(148, 163, 184, 0.5)', '&:hover': { color: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)' }, p: 0.6 }}>
                                      <MarkEmailReadIcon sx={{ fontSize: 15 }} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                <Tooltip title="Delete" arrow>
                                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteNotification(nid); }}
                                    sx={{ color: 'rgba(148, 163, 184, 0.5)', '&:hover': { color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }, p: 0.6 }}>
                                    <DeleteIcon sx={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Box>
                          {(notif.sender?.name || notif.type) && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 1.2 }}>
                              {notif.sender?.name && (
                                <>
                                  <Avatar src={notif.sender?.avatar} sx={{ width: 18, height: 18, fontSize: '0.55rem', background: `linear-gradient(135deg, ${colors.primary[600]}, ${colors.secondary[600]})` }}>
                                    {notif.sender.name[0]}
                                  </Avatar>
                                  <Typography sx={{ color: colors.text.tertiary, fontSize: '0.7rem', fontWeight: 500 }}>{notif.sender.name}</Typography>
                                </>
                              )}
                              <Typography sx={{ color: 'rgba(148, 163, 184, 0.25)', fontSize: '0.65rem' }}>·</Typography>
                              <Typography sx={{ color: 'rgba(148, 163, 184, 0.45)', fontSize: '0.65rem', textTransform: 'capitalize' }}>
                                {notif.type?.replace(/_/g, ' ')}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  </Box>
                );
              })}
            </Box>
          ))}

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, p) => setPage(p)}
                sx={{
                  '& .MuiPaginationItem-root': {
                    color: colors.text.secondary,
                    borderColor: colors.border.subtle,
                    '&.Mui-selected': {
                      background: `linear-gradient(135deg, ${colors.primary[600]}, ${colors.primary[700]})`,
                      color: '#fff',
                    },
                  },
                }}
              />
            </Box>
          )}

          {notifications.length > 0 && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography sx={{ color: 'rgba(148, 163, 184, 0.25)', fontSize: '0.75rem' }}>
                Showing {notifications.length} of {totalCount} notification{totalCount !== 1 ? 's' : ''}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      <Dialog
        open={!!threadDialog}
        onClose={() => { setThreadDialog(null); setThread([]); }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: colors.background.secondary,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: 3,
            backgroundImage: `radial-gradient(ellipse at top, ${colors.primary[500]}08 0%, transparent 70%)`,
          },
        }}
      >
        {threadDialog && (
          <>
            <DialogTitle sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{
                width: 36, height: 36, borderRadius: 2, flexShrink: 0,
                background: typeBgColors[threadDialog.type] || 'rgba(100, 116, 139, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {typeIcons[threadDialog.type] || <InfoIcon sx={{ color: '#64748b', fontSize: 18 }} />}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ color: colors.text.primary, fontWeight: 700, fontSize: '0.95rem' }}>
                  {threadDialog.title}
                </Typography>
                <Typography sx={{ color: colors.text.tertiary, fontSize: '0.7rem', mt: 0.2 }}>
                  {formatTime(threadDialog.createdAt)}
                </Typography>
              </Box>
              <IconButton onClick={() => { setThreadDialog(null); setThread([]); }} size="small" sx={{ color: colors.text.tertiary, '&:hover': { color: colors.text.primary } }}>
                <ClearIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ px: 3, py: 2 }}>
              <Paper elevation={0} sx={{
                p: 2.5, mb: 2,
                background: colors.background.tertiary,
                border: `1px solid ${colors.border.subtle}`,
                borderRadius: 2,
              }}>
                <Typography sx={{ color: colors.text.secondary, fontSize: '0.85rem', lineHeight: 1.5 }}>
                  {threadDialog.message}
                </Typography>
              </Paper>

              {threadLoading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress size={24} sx={{ color: colors.primary[500] }} />
                </Box>
              ) : (
                <Box>
                  {thread.filter(n => (n._id !== threadDialog._id && n.id !== threadDialog.id) || n.parentReplyId).length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <Typography sx={{ color: colors.text.tertiary, fontSize: '0.82rem' }}>No replies yet</Typography>
                    </Box>
                  ) : (
                    thread.filter(n => (n._id !== threadDialog._id && n.id !== threadDialog.id) || n.parentReplyId).map((reply) => (
                      <Box key={reply._id || reply.id} sx={{
                        p: 2, mb: 1.5,
                        background: colors.background.secondary,
                        border: `1px solid ${colors.border.subtle}`,
                        borderRadius: 2,
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                          <Avatar src={reply.sender?.avatar} sx={{ width: 26, height: 26, fontSize: '0.65rem', background: `linear-gradient(135deg, ${colors.primary[600]}, ${colors.secondary[600]})` }}>
                            {reply.sender?.name?.[0] || 'U'}
                          </Avatar>
                          <Typography sx={{ color: colors.primary[400], fontWeight: 600, fontSize: '0.78rem' }}>
                            {reply.sender?.name || 'Unknown'}
                          </Typography>
                          <Typography sx={{ color: colors.text.tertiary, fontSize: '0.65rem', ml: 'auto' }}>
                            {formatTime(reply.createdAt)}
                          </Typography>
                        </Box>
                        <Typography sx={{ color: colors.text.secondary, fontSize: '0.82rem', lineHeight: 1.45 }}>
                          {reply.message}
                        </Typography>
                      </Box>
                    ))
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1.5, gap: 1, flexDirection: 'column', alignItems: 'stretch' }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  size="small"
                  placeholder="Write a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: colors.text.primary, backgroundColor: colors.background.tertiary,
                      borderRadius: 2, fontSize: '0.85rem',
                      '& fieldset': { borderColor: colors.border.subtle },
                      '&:hover fieldset': { borderColor: 'rgba(6, 182, 212, 0.3)' },
                      '&.Mui-focused fieldset': { borderColor: `${colors.primary[500]} !important` },
                    },
                    '& .MuiInputBase-input::placeholder': { color: colors.text.tertiary, opacity: 1 },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={sendReply}
                  disabled={!replyText.trim() || replying}
                  sx={{
                    minWidth: 90, height: 38,
                    background: `linear-gradient(135deg, ${colors.primary[600]}, ${colors.primary[700]})`,
                    borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.82rem',
                    '&:hover': { background: `linear-gradient(135deg, ${colors.primary[500]}, ${colors.primary[700]})` },
                    '&.Mui-disabled': { background: 'rgba(6, 182, 212, 0.2)' },
                  }}
                  endIcon={replying ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <SendIcon sx={{ fontSize: 16 }} />}
                >
                  Send
                </Button>
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default NotificationsPage;
