import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  IconButton,
  Badge,
  Menu,
  Typography,
  Divider,
  Avatar,
  Chip,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  Reply as ReplyIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  MarkEmailRead as MarkEmailReadIcon,
  ArrowForward as ArrowForwardIcon,
  Flag as FlagIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';
import { notificationAPI } from '../services/api';
import { colors } from '../theme/designSystem';

const typeIcons = {
  finding_assigned: <ErrorIcon sx={{ color: '#ef4444', fontSize: 20 }} />,
  finding_updated: <WarningIcon sx={{ color: '#f59e0b', fontSize: 20 }} />,
  task_assigned: <CheckCircleOutlineIcon sx={{ color: colors.primary[500], fontSize: 20 }} />,
  task_updated: <InfoIcon sx={{ color: colors.primary[500], fontSize: 20 }} />,
  task_completed: <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 20 }} />,
  task_escalated: <FlagIcon sx={{ color: '#ef4444', fontSize: 20 }} />,
  comment_added: <ReplyIcon sx={{ color: '#8b5cf6', fontSize: 20 }} />,
  mention: <WarningIcon sx={{ color: '#f59e0b', fontSize: 20 }} />,
  system: <InfoIcon sx={{ color: '#64748b', fontSize: 20 }} />,
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

const ProfessionalNotificationBar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadList, setUnreadList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const listRef = useRef(unreadList);
  listRef.current = unreadList;

  const open = Boolean(anchorEl);

  useEffect(() => {
    if (!user) return;
    notificationService.init(user._id || user.id);

    const unsubCount = notificationService.on('unread', (count) => {
      setUnreadCount(count);
    });

    const unsubNew = notificationService.on('new', (notif) => {
      setUnreadList(prev => {
        const exists = prev.some(n => (n._id || n.id) === (notif._id || notif.id));
        if (exists) return prev;
        return [notif, ...prev].slice(0, 10);
      });
    });

    const unsubDelete = notificationService.on('delete', (id) => {
      setUnreadList(prev => prev.filter(n => (n._id || n.id) !== id));
    });

    const unsubRead = notificationService.on('read', (id) => {
      setUnreadList(prev => prev.filter(n => (n._id || n.id) !== id));
    });

    return () => {
      unsubCount();
      unsubNew();
      unsubDelete();
      unsubRead();
      notificationService.destroy();
    };
  }, [user]);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await notificationService.fetchUnreadNotifications();
      setUnreadList(list);
      setUnreadCount(notificationService.getUnreadCount());
    } catch (e) {
      //
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    fetchUnread();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notif) => {
    const nid = notif._id || notif.id;
    const url = notif.redirectUrl;

    if (!url) return;

    if (!notif.isRead) {
      await notificationService.markAsRead(nid);
      setUnreadList(prev => prev.filter(n => (n._id || n.id) !== nid));
    } else {
      setUnreadList(prev => prev.filter(n => (n._id || n.id) !== nid));
    }

    setAnchorEl(null);
    navigate(url);
  };

  const handleMarkRead = async (e, notif) => {
    e.stopPropagation();
    e.preventDefault();
    const nid = notif._id || notif.id;
    try {
      await notificationService.markAsRead(nid);
    } catch (_) {}
    setUnreadList(prev => prev.filter(n => (n._id || n.id) !== nid));
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
    } catch (_) {}
    setUnreadList([]);
    setUnreadCount(0);
    setAnchorEl(null);
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

  return (
    <>
      <Tooltip title={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`}>
        <IconButton
          onClick={handleClick}
          sx={{
            color: unreadCount > 0 ? colors.primary[500] : '#94a3b8',
            transition: 'all 0.2s',
            '&:hover': { color: colors.primary[500], backgroundColor: 'rgba(6, 182, 212, 0.1)' },
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', height: 18, minWidth: 18 } }}
          >
            {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 420,
            maxHeight: 560,
            background: '#0f172a',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: 3,
            mt: 1,
            overflow: 'visible',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -6,
              right: 20,
              width: 12,
              height: 12,
              background: '#0f172a',
              borderTop: '1px solid rgba(148, 163, 184, 0.2)',
              borderLeft: '1px solid rgba(148, 163, 184, 0.2)',
              transform: 'rotate(45deg)',
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
          <Typography sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '1rem' }}>
            Notifications {unreadCount > 0 && `(${unreadCount})`}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {unreadCount > 0 && (
              <Tooltip title="Mark all as read">
                <IconButton size="small" onClick={markAllAsRead} sx={{ color: '#94a3b8', '&:hover': { color: colors.primary[500] } }}>
                  <MarkEmailReadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Close">
              <IconButton size="small" onClick={handleClose} sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' } }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ maxHeight: 390, overflow: 'auto' }}>
          {loading && unreadList.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={24} sx={{ color: colors.primary[500] }} />
            </Box>
          )}

          {!loading && unreadList.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Box sx={{
                width: 56, height: 56, mx: 'auto', mb: 1.5,
                borderRadius: '50%',
                background: 'rgba(6, 182, 212, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircleIcon sx={{ fontSize: 32, color: colors.primary[500] }} />
              </Box>
              <Typography sx={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.95rem', mb: 0.3 }}>
                You're all caught up
              </Typography>
              <Typography sx={{ color: '#64748b', fontSize: '0.82rem' }}>
                No unread notifications
              </Typography>
            </Box>
          )}

          {unreadList.map((notif) => {
            const nid = notif._id || notif.id;
            const icon = typeIcons[notif.type] || <InfoIcon sx={{ color: '#64748b', fontSize: 20 }} />;
            const bgColor = typeBgColors[notif.type] || 'rgba(100, 116, 139, 0.1)';
            const redirectUrl = notif.redirectUrl;

            return (
              <Box
                key={nid}
                onClick={() => handleNotificationClick(notif)}
                sx={{
                  p: 1.5,
                  borderBottom: '1px solid rgba(148, 163, 184, 0.06)',
                  backgroundColor: 'rgba(6, 182, 212, 0.04)',
                  cursor: redirectUrl ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                  '&:hover': { backgroundColor: 'rgba(6, 182, 212, 0.1)' },
                }}
              >
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Box sx={{
                    width: 34, height: 34, borderRadius: 1.5, flexShrink: 0,
                    background: bgColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    mt: 0.3,
                  }}>
                    {icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0 }}>
                        <Typography sx={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {notif.title}
                        </Typography>
                        <Box sx={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: colors.primary[500],
                          boxShadow: `0 0 6px ${colors.primary[500]}80`,
                          flexShrink: 0,
                        }} />
                      </Box>
                      <Typography sx={{ color: '#64748b', fontSize: '0.65rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {formatTime(notif.createdAt)}
                      </Typography>
                    </Box>
                    <Typography sx={{
                      color: '#94a3b8', fontSize: '0.75rem', mb: 0.8,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4,
                    }}>
                      {notif.message}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                      {notif.priority === 'urgent' && (
                        <Chip label="URGENT" size="small" sx={{
                          height: 18, fontSize: '0.55rem', fontWeight: 700,
                          backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: 0.8,
                        }} />
                      )}
                      <Box sx={{ flex: 1 }} />
                      <Tooltip title="Mark as read">
                        <IconButton size="small" onClick={(e) => handleMarkRead(e, notif)} sx={{ color: '#64748b', '&:hover': { color: '#22c55e' }, p: 0.3 }}>
                          <MarkEmailReadIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    {notif.sender?.name && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 12, color: '#64748b' }} />
                        <Typography sx={{ color: '#64748b', fontSize: '0.65rem' }}>{notif.sender.name}</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>

        <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.1)' }} />

        <Box
          onClick={() => { setAnchorEl(null); navigate('/notifications'); }}
          sx={{
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.8,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            '&:hover': { backgroundColor: 'rgba(6, 182, 212, 0.08)' },
          }}
        >
          <Typography sx={{ color: colors.primary[500], fontWeight: 600, fontSize: '0.82rem' }}>
            View All Notifications
          </Typography>
          <ArrowForwardIcon sx={{ color: colors.primary[500], fontSize: 16 }} />
        </Box>
      </Menu>
    </>
  );
};

export default ProfessionalNotificationBar;
