import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Tooltip,
  Badge
} from '@mui/material';
import { SidebarBrand, BrandHeader } from './branding';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderIcon from '@mui/icons-material/Folder';
import BugReportIcon from '@mui/icons-material/BugReport';
import DescriptionIcon from '@mui/icons-material/Description';
import PeopleIcon from '@mui/icons-material/People';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import KeyIcon from '@mui/icons-material/Key';
import ShieldIcon from '@mui/icons-material/Shield';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HistoryIcon from '@mui/icons-material/History';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import ComputerIcon from '@mui/icons-material/Computer';
import CrownIcon from '@mui/icons-material/WorkspacePremium';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import GroupsIcon from '@mui/icons-material/Groups';
import SecurityIcon from '@mui/icons-material/Security';
import NotesIcon from '@mui/icons-material/StickyNote2';
import EventNoteIcon from '@mui/icons-material/EventNote';
import SupportIcon from '@mui/icons-material/LiveHelp';
import SupportAdminIcon from '@mui/icons-material/AdminPanelSettings';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ProfessionalNotificationBar from './ProfessionalNotificationBar';
import SystemInfo from './SystemInfo';
import { userAPI } from '../services/api';
import { colors, typography, shadows, borderRadius, transitions, componentStyles, spacing } from '../theme/designSystem';

const drawerWidth = 260;
const miniDrawerWidth = 72;

// Define all menu items with required roles
const allMenuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: ['admin', 'vapt_analyst', 'project_manager', 'developer', 'read_only'] },
  { text: 'Findings', icon: <BugReportIcon />, path: '/findings', roles: ['admin', 'vapt_analyst', 'project_manager', 'developer', 'read_only'] },
  { text: 'Projects', icon: <FolderIcon />, path: '/projects', roles: ['admin', 'vapt_analyst', 'project_manager', 'developer'] },
  { text: 'Reports', icon: <DescriptionIcon />, path: '/reports', roles: ['admin', 'vapt_analyst'] },
  { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics', roles: ['admin', 'vapt_analyst', 'project_manager'] },
  { text: 'Users', icon: <PeopleIcon />, path: '/users', roles: ['admin', 'vapt_analyst'] },
  { text: 'Recycle Bin', icon: <DeleteIcon />, path: '/recycle-bin', roles: ['admin', 'vapt_analyst'] },
  { text: 'Audit Logs', icon: <HistoryIcon />, path: '/audit-logs', roles: ['admin', 'vapt_analyst'] },
  { text: 'VAPT Calendar', icon: <EventNoteIcon />, path: '/vapt-calendar', roles: ['admin', 'vapt_analyst'] },
  { text: 'Compliance Vault', icon: <ShieldIcon />, path: '/quarterly-audits', roles: ['admin', 'vapt_analyst'] },
  { text: 'My Tasks', icon: <AssignmentIndIcon />, path: '/my-tasks', roles: ['admin', 'vapt_analyst', 'project_manager', 'developer', 'business_analyst'] },
  { text: 'My MIS', icon: <CalendarMonthIcon />, path: '/my-mis', roles: ['admin', 'vapt_analyst', 'project_manager', 'developer', 'business_analyst', 'read_only'] },
  { text: 'Notes', icon: <NotesIcon />, path: '/notes', roles: ['admin', 'vapt_analyst', 'project_manager', 'developer', 'business_analyst', 'read_only'] },
  { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications', roles: ['admin', 'vapt_analyst', 'project_manager', 'developer', 'business_analyst', 'read_only'] },
  { text: 'All Users MIS', icon: <GroupsIcon />, path: '/admin/mis', roles: ['admin', 'vapt_analyst', 'vapt_tl'] },
  { text: 'All User Tasks', icon: <AssignmentIndIcon />, path: '/all-user-tasks', roles: ['admin', 'super_admin', 'vapt_analyst', 'vapt_tl'] },
  { text: 'Team Workload', icon: <PeopleIcon />, path: '/team-workload', roles: ['project_manager'] },
  { text: 'Server Info', icon: <ComputerIcon />, path: '/system-info', roles: ['admin', 'vapt_analyst'] },
  { text: 'Support Center', icon: <SupportIcon />, path: '/support', roles: ['admin', 'vapt_analyst', 'vapt_tl', 'project_manager', 'developer', 'business_analyst', 'read_only'] },
  { text: 'Support Admin', icon: <SupportAdminIcon />, path: '/admin/support', roles: ['admin', 'vapt_analyst', 'vapt_tl'] },
];

// Helper to get initials (First + Last)
const getInitials = (user) => {
  const name = user?.name || user?.displayName || user?.email || '';
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Helper to check if user is admin or super admin
const isAdminOrSuper = (user) => {
  if (!user) return false;
  const role = user.role?.toLowerCase();
  const email = user.email?.toLowerCase();
  return role === 'admin' || role === 'super_admin' || email === 'admin@example.com';
};

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', department: '' });
  const [systemInfoDialogOpen, setSystemInfoDialogOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasFullAccess } = useAuth();
  const { showToast } = useToast();

  // Filter menu items based on user role
  const userRole = user?.role || 'developer';
  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSystemInfo = () => {
    setSystemInfoDialogOpen(true);
    handleMenuClose();
  };

  const handleProfile = () => {
    setProfileDialogOpen(true);
    handleMenuClose();
    // Pre-fill form with current user data
    if (user) {
      setProfileForm({
        name: user.name || user.displayName || '',
        phone: user.phone || '',
        department: user.department || ''
      });
    }
  };

  const handleProfileUpdate = async () => {
    try {
      await userAPI.updateUser(user.uid, {
        name: profileForm.name,
        phone: profileForm.phone,
        department: profileForm.department,
        updatedAt: new Date().toISOString()
      });
      setProfileDialogOpen(false);
      showToast('Profile updated successfully!', 'success');
      // Refresh user data
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Error updating profile: ' + error.message, 'error');
    }
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate('/login');
  };

  const handleChangePassword = () => {
    setPasswordDialogOpen(true);
    handleMenuClose();
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const confirmPasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'warning');
      return;
    }
    try {
      await userAPI.updatePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordDialogOpen(false);
      showToast('Password updated successfully', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error updating password:', error);
      showToast('Error updating password: ' + error.message, 'error');
    }
  };

  const drawer = (
    <Box sx={{ 
      height: '100%', 
      background: colors.background.secondary,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <SidebarBrand open={sidebarOpen} />
      
      {/* Menu Items - Premium Style */}
      <List sx={{ px: 2, pt: 3, flex: 1, overflowY: 'auto' }}>
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip title={sidebarOpen ? '' : item.text} placement="right" arrow>
              <ListItemButton
                selected={isActive}
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: borderRadius.lg,
                  py: 1.4,
                  px: 2,
                  color: isActive ? colors.primary[400] : colors.text.secondary,
                  backgroundColor: isActive ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: transitions.premium,
                  '&::before': isActive ? {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '3px',
                    height: '24px',
                    background: `linear-gradient(180deg, ${colors.primary[400]} 0%, ${colors.primary[600]} 100%)`,
                    borderRadius: '0 4px 4px 0',
                    boxShadow: `0 0 8px ${colors.primary[500]}40`,
                  } : {},
                  '&:hover': {
                    backgroundColor: isActive ? 'rgba(6, 182, 212, 0.12)' : colors.background.tertiary,
                    color: isActive ? colors.primary[300] : colors.text.primary,
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(6, 182, 212, 0.08)',
                    color: colors.primary[400],
                    '&:hover': {
                      backgroundColor: 'rgba(6, 182, 212, 0.12)',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ 
                  color: 'inherit', 
                  minWidth: 36,
                  '& .MuiSvgIcon-root': {
                    fontSize: 20
                  }
                }}>
                  {item.icon}
                </ListItemIcon>
                {sidebarOpen && (
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{ 
                      fontWeight: isActive ? typography.weight.semibold : typography.weight.medium,
                      fontSize: typography.size.sm,
                      letterSpacing: typography.tracking.tight
                    }}
                  />
                )}
                {sidebarOpen && isActive && (
                  <ChevronRightIcon sx={{ 
                    fontSize: 16, 
                    color: colors.primary[500],
                    ml: 'auto'
                  }} />
                )}
              </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>
      
      {/* Footer - User Info */}
      <Box sx={{ 
        p: sidebarOpen ? 2 : 1.5, 
        borderTop: `1px solid ${colors.border.subtle}`,
        background: colors.background.tertiary,
        flexShrink: 0
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: sidebarOpen ? 'flex-start' : 'center',
          gap: 2
        }}>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            badgeContent={isAdminOrSuper(user) ? <CrownIcon sx={{ fontSize: 14, color: '#fbbf24', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' }} /> : null}
          >
            <Avatar 
              sx={{ 
                width: 32, 
                height: 32,
                background: `linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.secondary[600]} 100%)`,
                fontSize: typography.size.sm,
                fontWeight: typography.weight.semibold
              }}
            >
              {getInitials(user)}
            </Avatar>
          </Badge>
          {sidebarOpen && (
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: colors.text.primary,
                  fontWeight: typography.weight.medium,
                  fontSize: typography.size.sm,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {user?.name || user?.email}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: colors.text.tertiary,
                  fontSize: typography.size.xs,
                  textTransform: 'capitalize'
                }}
              >
                {user?.role?.replace('_', ' ')}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
          ml: { sm: sidebarOpen ? `${drawerWidth}px` : 0 },
          background: `${colors.background.secondary}E6`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${colors.border.subtle}`,
          boxShadow: '0 1px 0 0 rgba(6, 182, 212, 0.06)',
          transition: transitions.premium,
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: -1,
            left: '10%',
            width: '80%',
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${colors.primary[500]}10, transparent)`,
            pointerEvents: 'none',
          },
        }}
      >
        <Toolbar sx={{ minHeight: '64px', px: { xs: 2, sm: 3 } }}>
          {/* Hamburger Menu - always visible */}
          <Tooltip title="Toggle sidebar">
            <IconButton
              color="inherit"
              aria-label="toggle sidebar"
              edge="start"
              onClick={handleSidebarToggle}
              sx={{ 
                mr: 2,
                color: colors.text.secondary,
                borderRadius: borderRadius.lg,
                transition: transitions.premium,
                '&:hover': {
                  backgroundColor: colors.background.tertiary,
                  color: colors.text.primary,
                }
              }}
            >
              <MenuIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          
              <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
            <BrandHeader showSubtitle />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ProfessionalNotificationBar />
            {/* User Menu - Premium Style */}
            <Tooltip title="Account settings">
              <IconButton
                onClick={handleMenuClick}
                size="small"
                aria-controls="user-menu"
                aria-haspopup="true"
                sx={{
                  p: 0.5,
                  borderRadius: borderRadius.lg,
                  border: `1px solid ${colors.border.subtle}`,
                  transition: transitions.premium,
                  '&:hover': {
                    borderColor: `rgba(6, 182, 212, 0.3)`,
                    backgroundColor: 'rgba(6, 182, 212, 0.04)',
                    boxShadow: `0 0 12px rgba(6, 182, 212, 0.06)`,
                  }
                }}
              >
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                badgeContent={isAdminOrSuper(user) ? <CrownIcon sx={{ fontSize: 14, color: '#fbbf24', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' }} /> : null}
                >
                <Avatar 
                  sx={{ 
                    width: 32, 
                    height: 32,
                    background: `linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.secondary[600]} 100%)`,
                    fontSize: typography.size.sm,
                    fontWeight: typography.weight.semibold
                  }} 
                  src={user?.avatar}
                >
                  {getInitials(user)}
                </Avatar>
              </Badge>
              </IconButton>
            </Tooltip>
            <Menu
              id="user-menu"
              anchorEl={anchorEl}
              keepMounted
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{
                sx: {
                  mt: 1.5,
                  borderRadius: borderRadius.xl,
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.default}`,
                  boxShadow: shadows.xl,
                  minWidth: 200,
                }
              }}
            >
              <Box sx={{ p: 2, borderBottom: `1px solid ${colors.border.subtle}` }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: colors.text.primary,
                    fontWeight: typography.weight.semibold,
                    fontSize: typography.size.sm
                  }}
                >
                  {user?.name || user?.email}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: colors.text.tertiary,
                    fontSize: typography.size.xs,
                    textTransform: 'capitalize'
                  }}
                >
                  {user?.role?.replace('_', ' ')}
                </Typography>
              </Box>
              <MenuItem 
                onClick={handleProfile}
                sx={{
                  py: 1.5,
                  px: 2,
                  color: colors.text.secondary,
                  '&:hover': {
                    backgroundColor: colors.background.tertiary,
                    color: colors.text.primary,
                  }
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                  <AccountCircleIcon sx={{ fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Profile" 
                  primaryTypographyProps={{ 
                    fontSize: typography.size.sm,
                    fontWeight: typography.weight.medium
                  }}
                />
              </MenuItem>
              <MenuItem 
                onClick={handleChangePassword}
                sx={{
                  py: 1.5,
                  px: 2,
                  color: colors.text.secondary,
                  '&:hover': {
                    backgroundColor: colors.background.tertiary,
                    color: colors.text.primary,
                  }
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                  <KeyIcon sx={{ fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Change Password" 
                  primaryTypographyProps={{ 
                    fontSize: typography.size.sm,
                    fontWeight: typography.weight.medium
                  }}
                />
              </MenuItem>
              <Divider sx={{ borderColor: colors.border.subtle, my: 1 }} />
              {(user?.role === 'admin' || user?.role === 'vapt_analyst') && (
                <MenuItem 
                  onClick={handleSystemInfo}
                  sx={{
                    py: 1.5,
                    px: 2,
                    color: colors.text.secondary,
                    '&:hover': {
                      backgroundColor: colors.background.tertiary,
                      color: colors.text.primary,
                    }
                  }}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                    <ComputerIcon sx={{ fontSize: 18 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="System Information" 
                    primaryTypographyProps={{ 
                      fontSize: typography.size.sm,
                      fontWeight: typography.weight.medium
                    }}
                  />
                </MenuItem>
              )}
              <MenuItem 
                onClick={handleLogout}
                sx={{
                  py: 1.5,
                  px: 2,
                  color: colors.status.error,
                  '&:hover': {
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  }
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                  <LogoutIcon sx={{ fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Logout" 
                  primaryTypographyProps={{ 
                    fontSize: typography.size.sm,
                    fontWeight: typography.weight.medium
                  }}
                />
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ 
          width: { sm: sidebarOpen ? drawerWidth : 0 }, 
          flexShrink: { sm: 0 },
          transition: transitions.premium
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              background: colors.background.secondary,
              border: 'none',
              boxShadow: shadows['2xl']
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="persistent"
          open={sidebarOpen}
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: sidebarOpen ? drawerWidth : 0,
              overflowX: 'hidden',
              background: colors.background.secondary,
              border: 'none',
              borderRight: `1px solid ${colors.border.subtle}`,
              transition: transitions.premium
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          width: { sm: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
          transition: transitions.premium,
          minHeight: '100vh',
          background: colors.background.primary
        }}
      >
        <Toolbar sx={{ minHeight: '64px' }} />
        <Box sx={{ p: { xs: 2, sm: 3, lg: 4 }, width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
          {children}
        </Box>
      </Box>

      {/* Profile Dialog - Premium Style */}
      <Dialog 
        open={profileDialogOpen} 
        onClose={() => setProfileDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            background: colors.background.secondary,
            border: `1px solid ${colors.border.default}`,
            borderRadius: borderRadius['2xl'],
            boxShadow: shadows['2xl'],
          }
        }}
      >
        <DialogTitle sx={{ 
          color: colors.text.primary, 
          fontWeight: typography.weight.semibold,
          fontSize: typography.size.xl,
          px: 4,
          py: 3,
          borderBottom: `1px solid ${colors.border.subtle}`
        }}>
          My Profile
        </DialogTitle>
        <DialogContent sx={{ px: 4, py: 3 }}>
          {/* Avatar & Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              badgeContent={isAdminOrSuper(user) ? <CrownIcon sx={{ fontSize: 32, color: '#fbbf24', filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.5))', transform: 'translate(4px, -4px)' }} /> : null}
            >
              <Avatar 
                sx={{ 
                  width: 80, 
                  height: 80,
                  background: `linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.secondary[600]} 100%)`,
                  fontSize: typography.size['2xl'],
                  fontWeight: typography.weight.bold
                }}
              >
                {getInitials(user)}
              </Avatar>
            </Badge>
            <Box>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: colors.text.primary,
                  fontWeight: typography.weight.semibold,
                  fontSize: typography.size.lg
                }}
              >
                {user?.name || 'User'}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: colors.text.tertiary,
                  fontSize: typography.size.sm
                }}
              >
                {user?.email}
              </Typography>
              <Box sx={{ 
                mt: 1, 
                px: 2, 
                py: 0.5, 
                borderRadius: borderRadius.full,
                background: 'rgba(6, 182, 212, 0.1)',
                border: `1px solid rgba(6, 182, 212, 0.2)`,
                display: 'inline-block'
              }}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: colors.primary[400],
                    fontWeight: typography.weight.semibold,
                    textTransform: 'uppercase',
                    fontSize: typography.size.xs,
                    letterSpacing: typography.tracking.wide
                  }}
                >
                  {user?.role?.replace('_', ' ') || 'User'}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ borderColor: colors.border.subtle, mb: 3 }} />
          
          {/* Email (Read-only) */}
          <TextField
            margin="dense"
            label="Email"
            fullWidth
            variant="outlined"
            value={user?.email || ''}
            InputProps={{ readOnly: true }}
            sx={{ 
              mb: 3,
              '& .MuiOutlinedInput-root': {
                background: colors.background.tertiary,
                borderRadius: borderRadius.lg,
                color: colors.text.tertiary,
                '& fieldset': { 
                  borderColor: colors.border.subtle,
                  borderStyle: 'dashed'
                },
              },
              '& .MuiInputLabel-root': { color: colors.text.tertiary },
            }}
            helperText="Email cannot be changed"
            FormHelperTextProps={{
              sx: { color: colors.text.tertiary, fontSize: typography.size.xs }
            }}
          />
          
          {/* Name */}
          <TextField
            autoFocus
            margin="dense"
            label="Full Name"
            fullWidth
            variant="outlined"
            value={profileForm.name}
            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
            sx={{ 
              mb: 3,
              '& .MuiOutlinedInput-root': {
                background: colors.background.tertiary,
                borderRadius: borderRadius.lg,
                color: colors.text.primary,
                '& fieldset': { borderColor: colors.border.default },
                '&:hover fieldset': { borderColor: colors.border.strong },
                '&.Mui-focused fieldset': { 
                  borderColor: colors.primary[500],
                  boxShadow: `0 0 0 3px rgba(6, 182, 212, 0.1)`
                },
              },
              '& .MuiInputLabel-root': { color: colors.text.tertiary },
              '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[500] },
            }}
          />
          
          {/* Phone */}
          <TextField
            margin="dense"
            label="Phone Number"
            fullWidth
            variant="outlined"
            value={profileForm.phone}
            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            sx={{ 
              mb: 3,
              '& .MuiOutlinedInput-root': {
                background: colors.background.tertiary,
                borderRadius: borderRadius.lg,
                color: colors.text.primary,
                '& fieldset': { borderColor: colors.border.default },
                '&:hover fieldset': { borderColor: colors.border.strong },
                '&.Mui-focused fieldset': { 
                  borderColor: colors.primary[500],
                  boxShadow: `0 0 0 3px rgba(6, 182, 212, 0.1)`
                },
              },
              '& .MuiInputLabel-root': { color: colors.text.tertiary },
              '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[500] },
            }}
          />
          
          {/* Department */}
          <TextField
            margin="dense"
            label="Department"
            fullWidth
            variant="outlined"
            value={profileForm.department}
            onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
            sx={{ 
              '& .MuiOutlinedInput-root': {
                background: colors.background.tertiary,
                borderRadius: borderRadius.lg,
                color: colors.text.primary,
                '& fieldset': { borderColor: colors.border.default },
                '&:hover fieldset': { borderColor: colors.border.strong },
                '&.Mui-focused fieldset': { 
                  borderColor: colors.primary[500],
                  boxShadow: `0 0 0 3px rgba(6, 182, 212, 0.1)`
                },
              },
              '& .MuiInputLabel-root': { color: colors.text.tertiary },
              '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[500] },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 4, py: 3, borderTop: `1px solid ${colors.border.subtle}`, gap: 2 }}>
          <Button 
            onClick={() => setProfileDialogOpen(false)}
            sx={{
              ...componentStyles.button.ghost,
              py: 1,
              px: 3
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleProfileUpdate} 
            variant="contained"
            sx={{
              ...componentStyles.button.primary,
              py: 1,
              px: 3
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Change Dialog - Premium Style */}
      <Dialog 
        open={passwordDialogOpen} 
        onClose={() => setPasswordDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            background: colors.background.secondary,
            border: `1px solid ${colors.border.default}`,
            borderRadius: borderRadius['2xl'],
            boxShadow: shadows['2xl'],
          }
        }}
      >
        <DialogTitle sx={{ 
          color: colors.text.primary, 
          fontWeight: typography.weight.semibold,
          fontSize: typography.size.xl,
          px: 4,
          py: 3,
          borderBottom: `1px solid ${colors.border.subtle}`
        }}>
          Change Password
        </DialogTitle>
        <DialogContent sx={{ px: 4, py: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: colors.text.secondary,
                fontSize: typography.size.sm,
                mb: 3
              }}
            >
              Update your password to keep your account secure. Password must be at least 6 characters.
            </Typography>
          </Box>
          <TextField
            autoFocus
            margin="dense"
            label="Current Password"
            type="password"
            fullWidth
            variant="outlined"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            sx={{ 
              mb: 3,
              '& .MuiOutlinedInput-root': {
                background: colors.background.tertiary,
                borderRadius: borderRadius.lg,
                color: colors.text.primary,
                '& fieldset': { borderColor: colors.border.default },
                '&:hover fieldset': { borderColor: colors.border.strong },
                '&.Mui-focused fieldset': { 
                  borderColor: colors.primary[500],
                  boxShadow: `0 0 0 3px rgba(6, 182, 212, 0.1)`
                },
              },
              '& .MuiInputLabel-root': { color: colors.text.tertiary },
              '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[500] },
            }}
          />
          <TextField
            margin="dense"
            label="New Password"
            type="password"
            fullWidth
            variant="outlined"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            sx={{ 
              mb: 3,
              '& .MuiOutlinedInput-root': {
                background: colors.background.tertiary,
                borderRadius: borderRadius.lg,
                color: colors.text.primary,
                '& fieldset': { borderColor: colors.border.default },
                '&:hover fieldset': { borderColor: colors.border.strong },
                '&.Mui-focused fieldset': { 
                  borderColor: colors.primary[500],
                  boxShadow: `0 0 0 3px rgba(6, 182, 212, 0.1)`
                },
              },
              '& .MuiInputLabel-root': { color: colors.text.tertiary },
              '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[500] },
            }}
          />
          <TextField
            margin="dense"
            label="Confirm New Password"
            type="password"
            fullWidth
            variant="outlined"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            sx={{ 
              '& .MuiOutlinedInput-root': {
                background: colors.background.tertiary,
                borderRadius: borderRadius.lg,
                color: colors.text.primary,
                '& fieldset': { borderColor: colors.border.default },
                '&:hover fieldset': { borderColor: colors.border.strong },
                '&.Mui-focused fieldset': { 
                  borderColor: colors.primary[500],
                  boxShadow: `0 0 0 3px rgba(6, 182, 212, 0.1)`
                },
              },
              '& .MuiInputLabel-root': { color: colors.text.tertiary },
              '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[500] },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 4, py: 3, borderTop: `1px solid ${colors.border.subtle}`, gap: 2 }}>
          <Button 
            onClick={() => setPasswordDialogOpen(false)}
            sx={{
              ...componentStyles.button.ghost,
              py: 1,
              px: 3
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmPasswordChange} 
            variant="contained"
            sx={{
              ...componentStyles.button.primary,
              py: 1,
              px: 3
            }}
          >
            Change Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* System Information Dialog */}
      <Dialog 
        open={systemInfoDialogOpen} 
        onClose={() => setSystemInfoDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: spacing.lg,
            backgroundColor: colors.background.secondary,
            border: `1px solid ${colors.border.default}`
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: `1px solid ${colors.border.default}`,
          px: 4, 
          py: 3,
          backgroundColor: colors.background.primary
        }}>
          System Information
        </DialogTitle>
        <DialogContent sx={{ px: 4, py: 3 }}>
          {systemInfoDialogOpen && <SystemInfo showInCard={false} />}
        </DialogContent>
        <DialogActions sx={{ px: 4, py: 3, borderTop: `1px solid ${colors.border.subtle}` }}>
          <Button 
            onClick={() => setSystemInfoDialogOpen(false)}
            sx={{
              ...componentStyles.button.primary,
              py: 1,
              px: 3
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Layout;
