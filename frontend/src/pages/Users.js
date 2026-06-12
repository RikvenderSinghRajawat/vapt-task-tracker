import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  IconButton,
  Tabs,
  Tab,
  Alert,
  InputAdornment,
  Tooltip,
  Badge
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Person as PersonIcon, 
  LockReset as LockResetIcon, 
  Key as KeyIcon, 
  Email as EmailIcon, 
  Send as SendIcon, 
  Save as SaveIcon, 
  Folder as FolderIcon, 
  OpenInNew as OpenInNewIcon, 
  Close as CloseIcon,
  WorkspacePremium as CrownIcon 
} from '@mui/icons-material';
import { userAPI, projectAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { colors, typography, shadows, borderRadius } from '../theme/designSystem';

// Helper to get initials (First + Last)
const getInitials = (user) => {
  // For super admin, always return 'SA'
  if (user?.role === 'super_admin') {
    return 'SA';
  }
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

const Users = () => {
  const { user: currentUser, hasFullAccess } = useAuth();
  const { showToast, showConfirm } = useToast();
  const [users, setUsers] = useState([]);

  // Filters
  const [roleFilter, setRoleFilter] = useState('all'); // admin, vapt_analyst, project_manager, developer, all
  const [searchText, setSearchText] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [userForAllocation, setUserForAllocation] = useState(null);
  const [projectPopup, setProjectPopup] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  
  // Project allocation states
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'developer',
    department: '',
    phone: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [adminPasswordDialog, setAdminPasswordDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  
  // New password management states
  const [passwordTab, setPasswordTab] = useState(0);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');

  useEffect(() => {
    fetchUsers();
    // Also fetch projects to ensure availableProjects is populated
    const fetchProjectsForChips = async () => {
      try {
        const projects = await projectAPI.getProjects();
        setAvailableProjects(projects);
      } catch (error) {
        console.error('Error fetching projects for chips:', error);
      }
    };
    fetchProjectsForChips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // re-filter on changes
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, searchText]);

  const fetchUsers = async () => {
    try {
      // NOTE: current frontend userAPI uses REST and filters client-side.
      // We'll apply role/search filtering client-side for now.
      const allUsers = await userAPI.getUsers();

      const filtered = allUsers.filter((u) => {
        const roleOk = roleFilter === 'all' ? true : u.role === roleFilter;
        const search = searchText.trim().toLowerCase();
        const searchOk = !search
          ? true
          : `${u.name || ''} ${u.email || ''}`.toLowerCase().includes(search);
        return roleOk && searchOk;
      });

      setUsers(filtered);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleOpen = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'developer',
      department: '',
      phone: ''
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        await userAPI.updateUser(editingUser.id, formData);
        handleClose();
        fetchUsers();
      } else {
        // Create new user using REST API (doesn't affect admin session)
        await userAPI.createUser(formData);
        handleClose();
        fetchUsers();
        showToast('User created successfully!', 'success');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      showToast('Error: ' + error.message, 'error');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || '',
      phone: user.phone || ''
    });
    setOpen(true);
  };

  const handleDelete = async (user) => {
    // Check if trying to delete super user
    if (user.email === 'admin@example.com') {
      showToast('Cannot delete Super Administrator', 'error');
      return;
    }
    
    if (await showConfirm({
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? They will be deactivated and moved to the recycle bin.',
      severity: 'error',
      confirmLabel: 'Delete Permanently',
    })) {
      try {
        await userAPI.deleteUser(user.id);
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Error deleting user: ' + error.message, 'error');
      }
    }
  };

  const handlePasswordReset = async (user) => {
    setSelectedUser(user);
    setResetDialogOpen(true);
  };

  const confirmPasswordReset = async () => {
    if (!selectedUser) return;
    try {
      await userAPI.resetPassword(selectedUser.email);
      setResetDialogOpen(false);
      setPasswordTab(0);
      showToast(`Password reset email sent to ${selectedUser.email}`, 'success');
    } catch (error) {
      console.error('Error resetting password:', error);
      showToast('Error resetting password: ' + error.message, 'error');
    }
  };

  const handleAdminSetPassword = async () => {
    if (!selectedUser || !adminNewPassword) return;
    if (adminNewPassword !== adminConfirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (adminNewPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'warning');
      return;
    }
    try {
      // Use the admin password change API
      await userAPI.adminSetPasswordDirect(selectedUser.email, adminNewPassword);
      setResetDialogOpen(false);
      setPasswordTab(0);
      setAdminNewPassword('');
      setAdminConfirmPassword('');
      showToast(`Password for ${selectedUser.email} has been updated. Please inform the user of their new password.`, 'success');
    } catch (error) {
      console.error('Error setting password:', error);
      showToast('Error setting password: ' + error.message, 'error');
    }
  };

  // Project Allocation handlers
  const handleOpenAllocation = async (user) => {
    setUserForAllocation(user);
    setSelectedProjects(user.allocatedProjects || []);
    
    try {
      const projects = await projectAPI.getProjects();
      setAvailableProjects(projects);
      setAllocationDialogOpen(true);
    } catch (error) {
      console.error('Error fetching projects:', error);
      showToast('Error loading projects', 'error');
    }
  };

  const handleProjectChipClick = (projectId) => {
    const project = availableProjects.find(p => p.id === projectId);
    if (!project) return;
    
    // Show cool popup with project information
    setProjectPopup(project);
  };

  const closeProjectPopup = () => {
    setProjectPopup(null);
  };

  const handleToggleProject = (projectId) => {
    setSelectedProjects(prev => {
      if (prev.includes(projectId)) {
        return prev.filter(id => id !== projectId);
      }
      return [...prev, projectId];
    });
  };

  const handleSaveAllocation = async () => {
    if (!userForAllocation) return;
    try {
      await userAPI.allocateProjects(userForAllocation.id, selectedProjects);
      setAllocationDialogOpen(false);
      setUserForAllocation(null);
      setSelectedProjects([]);
      fetchUsers(); // Refresh users list
      showToast(`Projects allocated to ${userForAllocation.name} successfully`, 'success');
    } catch (error) {
      console.error('Error allocating projects:', error);
      showToast('Error allocating projects: ' + error.message, 'error');
    }
  };

  const handlePasswordChange = async (user) => {
    setSelectedUser(user);
    setPasswordDialogOpen(true);
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

  const currentUserRole = currentUser?.role;

  const canEditUser = (targetUser) => {
    if (currentUserRole === 'admin' || currentUserRole === 'super_admin') return true;
    if (currentUserRole === 'vapt_analyst' || currentUserRole === 'vapt_tl') {
      return targetUser?.role !== 'admin' && targetUser?.role !== 'super_admin';
    }
    return false;
  };

  const canDeleteUser = (targetUser) => {
    if (currentUserRole === 'admin' || currentUserRole === 'super_admin') return true;
    if (currentUserRole === 'vapt_analyst' || currentUserRole === 'vapt_tl') {
      return targetUser?.role !== 'admin' && targetUser?.role !== 'super_admin';
    }
    return false;
  };

  const ALLOWED_ROLES = currentUserRole === 'admin' || currentUserRole === 'super_admin'
    ? ['admin', 'vapt_analyst', 'vapt_tl', 'project_manager', 'developer', 'business_analyst', 'read_only']
    : ['vapt_analyst', 'vapt_tl', 'project_manager', 'developer', 'business_analyst', 'read_only'];

  const getRoleColor = (role) => {
    const colors = {
      admin: '#dc2626',
      super_admin: '#7c3aed',
      vapt_analyst: '#ea580c',
      vapt_tl: '#d97706',
      project_manager: '#3b82f6',
      developer: '#16a34a',
      business_analyst: '#8b5cf6',
      read_only: '#64748b'
    };
    return colors[role] || '#64748b';
  };

  const getRoleBgColor = (role) => {
    const colors = {
      admin: 'rgba(220, 38, 38, 0.15)',
      super_admin: 'rgba(124, 58, 237, 0.15)',
      vapt_analyst: 'rgba(234, 88, 12, 0.15)',
      vapt_tl: 'rgba(217, 119, 6, 0.15)',
      project_manager: 'rgba(59, 130, 246, 0.15)',
      developer: 'rgba(22, 163, 74, 0.15)',
      business_analyst: 'rgba(139, 92, 246, 0.15)',
      read_only: 'rgba(100, 116, 139, 0.15)'
    };
    return colors[role] || 'rgba(100, 116, 139, 0.15)';
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Admin',
      super_admin: 'Super Admin',
      vapt_analyst: 'VAPT Analyst',
      vapt_tl: 'VAPT Team Lead',
      project_manager: 'Project Manager',
      developer: 'Developer',
      business_analyst: 'Business Analyst',
      read_only: 'Read Only User'
    };
    return labels[role] || role.replace('_', ' ');
  };

  return (
    <Box sx={{ minHeight: '100vh', background: colors.background.primary, p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700, 
              color: colors.text.primary,
            }}
          >
            User Management
          </Typography>
          <Typography variant="body1" sx={{ color: colors.text.secondary, mt: 0.5 }}>
            Manage team members and their roles
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={handleOpen}
          sx={{ 
            background: colors.primary[600],
            color: '#fff',
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: borderRadius.lg,
            px: 3,
            '&:hover': {
              background: colors.primary[500],
            }
          }}
        >
          New User
        </Button>
      </Box>

      {/* Filters */}
      <Box
        sx={{
          mb: 3,
          p: 2,
          borderRadius: borderRadius.lg,
          background: colors.background.tertiary,
          border: `1px solid ${colors.border.subtle}`,
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="role-filter-label">Role</InputLabel>
              <Select
                labelId="role-filter-label"
                value={roleFilter}
                label="Role"
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="vapt_analyst">VAPT Analyst</MenuItem>
                <MenuItem value="vapt_tl">VAPT Team Lead</MenuItem>
                <MenuItem value="project_manager">Project Manager</MenuItem>
                <MenuItem value="developer">Developer</MenuItem>
                <MenuItem value="business_analyst">Business Analyst</MenuItem>
                <MenuItem value="read_only">Read Only User</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              size="small"
              fullWidth
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by name or email"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => {
                setRoleFilter('all');
                setSearchText('');
              }}
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={3}>
        {users.map((user, index) => (
          <Grid item xs={12} md={6} lg={4} key={user.id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 28px rgba(0,0,0,0.15)',
                },
                background: colors.background.secondary,
                border: `1px solid ${colors.border.subtle}`,
                borderRadius: borderRadius.xl,
                overflow: 'hidden',
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: user.isActive 
                    ? (getRoleColor(user.role) === 'error' ? '#ef4444' : 
                       getRoleColor(user.role) === 'warning' ? '#f59e0b' : 
                       getRoleColor(user.role) === 'info' ? '#3b82f6' : 
                       getRoleColor(user.role) === 'success' ? '#22c55e' : '#64748b')
                    : '#94a3b8',
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1, p: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    badgeContent={isAdminOrSuper(user) ? <CrownIcon sx={{ fontSize: 16, color: '#fbbf24' }} /> : null}
                  >
                    <Avatar 
                      sx={{ 
                        width: 48,
                        height: 48,
                        bgcolor: user.isActive ? 'primary.main' : 'grey.400',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                      }} 
                      src={user.avatar}
                    >
                      {getInitials(user)}
                    </Avatar>
                  </Badge>
                  <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
                    <Tooltip
                      title={
                        <Box>
                          <Typography sx={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.8125rem' }}>{user.name}</Typography>
                          <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem', mt: 0.25 }}>{user.email}</Typography>
                        </Box>
                      }
                      arrow
                      placement="top"
                    >
                      <Typography 
                        variant="h6"
                        sx={{ 
                          lineHeight: 1.3,
                          fontWeight: 600,
                          color: colors.text.primary,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {user.name}
                      </Typography>
                    </Tooltip>
                    <Typography 
                      variant="body2"
                      sx={{ 
                        fontSize: '0.75rem',
                        lineHeight: 1.3,
                        color: colors.text.tertiary,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        mt: 0.25
                      }}
                    >
                      {user.email}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'flex-start', flexShrink: 0 }}>
                    {canEditUser(user) && (
                      <IconButton 
                        size="small" 
                        onClick={() => handleEdit(user)} 
                        sx={{ p: 0.5, '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.12)' } }}
                      >
                        <EditIcon sx={{ fontSize: 18 }} color="primary" />
                      </IconButton>
                    )}
                    {['project_manager', 'developer'].includes(user.role) && (
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenAllocation(user)} 
                        title="Allocate Projects" 
                        sx={{ p: 0.5, '&:hover': { backgroundColor: 'rgba(99, 102, 241, 0.12)' } }}
                      >
                        <FolderIcon sx={{ fontSize: 18 }} color="info" />
                      </IconButton>
                    )}
                    <IconButton 
                      size="small" 
                      onClick={() => handlePasswordReset(user)} 
                      title="Password Options" 
                      sx={{ p: 0.5, '&:hover': { backgroundColor: 'rgba(245, 158, 11, 0.12)' } }}
                    >
                      <LockResetIcon sx={{ fontSize: 18 }} color="warning" />
                    </IconButton>
                    {canDeleteUser(user) && (
                      <IconButton 
                        size="small" 
                        onClick={() => handleDelete(user)} 
                        sx={{ p: 0.5, '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.12)' } }}
                      >
                        <DeleteIcon sx={{ fontSize: 18 }} color="error" />
                      </IconButton>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5 }}>
                  <Chip
                    label={getRoleLabel(user.role)}
                    size="small"
                    sx={{ 
                      fontWeight: 600,
                      height: 26,
                      fontSize: '0.75rem',
                      borderRadius: 1.5,
                      backgroundColor: getRoleBgColor(user.role),
                      color: getRoleColor(user.role),
                      border: `1px solid ${getRoleColor(user.role)}30`,
                    }}
                  />
                  <Chip
                    label={user.isActive ? 'Active' : 'Inactive'}
                    size="small"
                    sx={{ 
                      fontWeight: 600,
                      height: 26,
                      fontSize: '0.75rem',
                      borderRadius: 1.5,
                      backgroundColor: user.isActive ? 'rgba(22, 163, 74, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                      color: user.isActive ? '#16a34a' : '#64748b',
                      border: `1px solid ${user.isActive ? '#16a34a' : '#64748b'}30`,
                    }}
                  />
                </Box>
                {user.department && (
                  <Typography 
                    variant="body2" 
                    sx={{ color: '#94a3b8', fontSize: '0.8125rem', mb: 1, pb: 1, borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {user.department}
                  </Typography>
                )}
                {user.allocatedProjects && user.allocatedProjects.length > 0 && (
                  <Box>
                    <Typography 
                      variant="body2" 
                      sx={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px' }}
                    >
                      Projects
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {user.allocatedProjects.map((projectId) => {
                        const project = availableProjects.find(p => p.id === projectId);
                        if (!project) return null;
                        const maxDisplayLength = 22;
                        const displayName = project.name.length > maxDisplayLength 
                          ? project.name.substring(0, maxDisplayLength) + '…' 
                          : project.name;
                        return (
                          <Chip
                            key={projectId}
                            label={displayName}
                            size="small"
                            onClick={() => handleProjectChipClick(projectId)}
                            sx={{
                              height: 24,
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              background: 'rgba(6, 182, 212, 0.08)',
                              color: '#22d3ee',
                              border: '1px solid rgba(6, 182, 212, 0.15)',
                              cursor: 'pointer',
                              '&:hover': { background: 'rgba(6, 182, 212, 0.16)' }
                            }}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Project Info Popup */}
      {projectPopup && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(20px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.3s ease-out'
          }}
          onClick={closeProjectPopup}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              background: colors.background.secondary,
              border: `1px solid ${colors.border.subtle}`,
              borderRadius: borderRadius.xl,
              boxShadow: shadows.xl,
              p: 4,
              minWidth: '500px',
              maxWidth: '600px',
              width: '90%',
              position: 'relative',
              overflow: 'hidden',
              animation: 'slideUp 0.4s ease-out',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: `linear-gradient(90deg, ${colors.primary[400]}, ${colors.primary[600]})`,
                zIndex: 1
              }
            }}
          >
            {/* Header Section */}
            <Box sx={{ position: 'relative', zIndex: 2, mb: 3 }}>
              <IconButton
                onClick={closeProjectPopup}
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  backgroundColor: colors.background.tertiary,
                  color: colors.text.secondary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: '50%',
                  boxShadow: shadows.md,
                  '&:hover': {
                    backgroundColor: colors.border.hover,
                    color: colors.text.primary,
                  },
                }}
              >
                <CloseIcon sx={{ fontSize: '1.125rem' }} />
              </IconButton>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: borderRadius.lg,
                    background: `linear-gradient(135deg, ${colors.primary[600]}, ${colors.primary[700]})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: shadows.md
                  }}
                >
                  <FolderIcon sx={{ fontSize: '32px', color: '#fff' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: typography.weight.semibold,
                      color: colors.text.primary,
                      mb: 0.5,
                      lineHeight: 1.2
                    }}
                  >
                    {projectPopup.name}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: colors.text.tertiary,
                      lineHeight: 1.4
                    }}
                  >
                    {projectPopup.description || 'No description available'}
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            {/* Project Details Grid */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
              gap: 3, 
              mb: 4,
              position: 'relative',
              zIndex: 2
            }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: colors.text.tertiary, mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</Typography>
                <Typography variant="body1" sx={{ color: colors.text.primary, fontWeight: typography.weight.medium }}>
                  {projectPopup.assessmentType === 'PenTest' ? 'Penetration Test' : 
                   projectPopup.assessmentType === 'SAST' ? 'SAST' : 
                   projectPopup.assessmentType === 'DAST' ? 'DAST' : 
                   projectPopup.assessmentType === 'Code Review' ? 'Code Review' : 
                   projectPopup.assessmentType || 'General Assessment'}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: colors.text.tertiary, mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</Typography>
                <Chip
                  label={projectPopup.status || 'Active'}
                  size="small"
                  sx={{
                    background: projectPopup.status === 'Active' ? 'rgba(63, 185, 80, 0.15)' : 'rgba(219, 171, 9, 0.15)',
                    color: projectPopup.status === 'Active' ? colors.status.success : colors.status.warning,
                    fontWeight: typography.weight.medium,
                    fontSize: '0.75rem'
                  }}
                />
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: colors.text.tertiary, mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Created</Typography>
                <Typography variant="body1" sx={{ color: colors.text.primary, fontWeight: typography.weight.medium }}>
                  {projectPopup.createdAt ? new Date(projectPopup.createdAt).toLocaleDateString() : 'Unknown'}
                </Typography>
              </Box>
            </Box>
            
            {/* Action Buttons */}
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              justifyContent: 'flex-end',
              position: 'relative',
              zIndex: 2
            }}>
              <Button
                onClick={closeProjectPopup}
                variant="outlined"
                sx={{
                  borderColor: colors.border.default,
                  color: colors.text.secondary,
                  fontWeight: typography.weight.medium,
                  px: 3,
                  py: 1.5,
                  borderRadius: borderRadius.lg,
                  '&:hover': {
                    borderColor: colors.border.hover,
                    backgroundColor: colors.background.tertiary
                  }
                }}
              >
                Close
              </Button>
              <Button 
                onClick={() => window.open(`/projects/${projectPopup.id}`, '_blank')}
                variant="contained"
                sx={{ 
                  background: `linear-gradient(135deg, ${colors.primary[500]}, ${colors.primary[700]})`,
                  color: '#fff',
                  fontWeight: typography.weight.semibold,
                  px: 4,
                  py: 1.5,
                  borderRadius: borderRadius.lg,
                  boxShadow: shadows.md,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${colors.primary[600]}, ${colors.primary[800]})`,
                    boxShadow: shadows.lg
                  },
                }}
              >
                Open Project
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            background: colors.background.secondary,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ color: colors.text.primary, fontWeight: 600 }}>
          {editingUser ? 'Edit User' : 'New User'}
        </DialogTitle>
        <DialogContent sx={{ color: colors.text.secondary }}>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Full Name"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleChange}
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: colors.text.primary,
                background: colors.background.tertiary,
                borderRadius: borderRadius.lg,
                '& fieldset': { borderColor: colors.border.default },
                '&:hover fieldset': { borderColor: colors.border.hover },
                '&.Mui-focused fieldset': { borderColor: colors.primary[400] },
                '& input': {
                  background: colors.background.tertiary,
                  '&:-webkit-autofill': {
                    WebkitBoxShadow: `0 0 0 100px ${colors.background.tertiary} inset`,
                    WebkitTextFillColor: colors.text.primary,
                  },
                },
              },
              '& .MuiInputLabel-root': { color: colors.text.tertiary },
              '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[400] },
            }}
          />
          <TextField
            margin="dense"
            name="email"
            label="Email"
            fullWidth
            variant="outlined"
            value={formData.email}
            onChange={handleChange}
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: colors.text.primary,
                background: colors.background.tertiary,
                borderRadius: borderRadius.lg,
                '& fieldset': { borderColor: colors.border.default },
                '&:hover fieldset': { borderColor: colors.border.hover },
                '&.Mui-focused fieldset': { borderColor: colors.primary[400] },
                '& input': {
                  background: colors.background.tertiary,
                  '&:-webkit-autofill': {
                    WebkitBoxShadow: `0 0 0 100px ${colors.background.tertiary} inset`,
                    WebkitTextFillColor: colors.text.primary,
                  },
                },
              },
              '& .MuiInputLabel-root': { color: colors.text.tertiary },
              '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[400] },
            }}
          />
          {!editingUser && (
            <TextField
              margin="dense"
              name="password"
              label="Password"
              type="password"
              fullWidth
              variant="outlined"
              value={formData.password}
              onChange={handleChange}
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  color: colors.text.primary,
                  background: colors.background.tertiary,
                  borderRadius: borderRadius.lg,
                  '& fieldset': { borderColor: colors.border.default },
                  '&:hover fieldset': { borderColor: colors.border.hover },
                  '&.Mui-focused fieldset': { borderColor: colors.primary[400] },
                  '& input': {
                    background: colors.background.tertiary,
                    '&:-webkit-autofill': {
                      WebkitBoxShadow: `0 0 0 100px ${colors.background.tertiary} inset`,
                      WebkitTextFillColor: colors.text.primary,
                    },
                  },
                },
                '& .MuiInputLabel-root': { color: colors.text.tertiary },
                '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[400] },
                '& .MuiFormHelperText-root': { color: colors.text.tertiary },
              }}
              helperText="Minimum 6 characters"
            />
          )}
          <FormControl 
            fullWidth 
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: colors.text.primary,
                background: colors.background.tertiary,
                borderRadius: borderRadius.lg,
                '& fieldset': { borderColor: colors.border.default },
                '&:hover fieldset': { borderColor: colors.border.hover },
                '&.Mui-focused fieldset': { borderColor: colors.primary[400] },
              },
              '& .MuiInputLabel-root': { color: colors.text.tertiary },
              '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[400] },
            }}
          >
            <InputLabel>Role</InputLabel>
            <Select
              name="role"
              value={formData.role}
              label="Role"
              onChange={handleChange}
              sx={{ color: colors.text.primary }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: colors.background.secondary,
                    border: `1px solid ${colors.border.default}`,
                    '& .MuiMenuItem-root': {
                      color: colors.text.primary,
                      '&:hover': {
                        backgroundColor: colors.background.tertiary,
                      },
                      '&.Mui-selected': {
                        backgroundColor: colors.background.tertiary,
                      },
                    },
                  },
                },
              }}
            >
              {ALLOWED_ROLES.map(role => (
                <MenuItem key={role} value={role}>{getRoleLabel(role)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            name="department"
            label="Department"
            fullWidth
            variant="outlined"
            value={formData.department}
            onChange={handleChange}
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: colors.text.primary,
                background: colors.background.tertiary,
                borderRadius: borderRadius.lg,
                '& fieldset': { borderColor: colors.border.default },
                '&:hover fieldset': { borderColor: colors.border.hover },
                '&.Mui-focused fieldset': { borderColor: colors.primary[400] },
                '& input': {
                  background: colors.background.tertiary,
                  '&:-webkit-autofill': {
                    WebkitBoxShadow: `0 0 0 100px ${colors.background.tertiary} inset`,
                    WebkitTextFillColor: colors.text.primary,
                  },
                },
              },
              '& .MuiInputLabel-root': { color: colors.text.tertiary },
              '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[400] },
            }}
          />
          <TextField
            margin="dense"
            name="phone"
            label="Phone"
            fullWidth
            variant="outlined"
            value={formData.phone}
            onChange={handleChange}
            sx={{ 
              '& .MuiOutlinedInput-root': {
                color: colors.text.primary,
                background: colors.background.tertiary,
                borderRadius: borderRadius.lg,
                '& fieldset': { borderColor: colors.border.default },
                '&:hover fieldset': { borderColor: colors.border.hover },
                '&.Mui-focused fieldset': { borderColor: colors.primary[400] },
                '& input': {
                  background: colors.background.tertiary,
                  '&:-webkit-autofill': {
                    WebkitBoxShadow: `0 0 0 100px ${colors.background.tertiary} inset`,
                    WebkitTextFillColor: colors.text.primary,
                  },
                },
              },
              '& .MuiInputLabel-root': { color: colors.text.tertiary },
              '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[400] },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleClose}
            sx={{ 
              color: colors.text.secondary,
              textTransform: 'none',
              '&:hover': { color: colors.text.primary }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            sx={{ 
              background: colors.primary[600],
              color: '#fff',
              fontWeight: 600,
              '&:hover': {
                background: colors.primary[500],
              }
            }}
          >
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unified Password Management Dialog */}
      <Dialog 
        open={resetDialogOpen} 
        onClose={() => setResetDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: 'hidden' }
        }}
      >
        <Box sx={{ 
          background: colors.background.tertiary,
          borderBottom: `1px solid ${colors.border.subtle}`,
          color: colors.text.primary,
          p: 3,
          textAlign: 'center'
        }}>
          <LockResetIcon sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold">
            Password Management
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
            {selectedUser?.name || selectedUser?.email}
          </Typography>
        </Box>

        <Tabs 
          value={passwordTab} 
          onChange={(e, newValue) => setPasswordTab(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<EmailIcon />} 
            label="Send Reset Email" 
            iconPosition="start"
          />
          <Tab 
            icon={<KeyIcon />} 
            label="Set New Password" 
            iconPosition="start"
          />
        </Tabs>

        <DialogContent sx={{ p: 3, minHeight: 250 }}>
          {passwordTab === 0 ? (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <EmailIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2, opacity: 0.8 }} />
              <Typography variant="h6" gutterBottom>
                Send Password Reset Email
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                User will receive an email with a secure link to reset their password.
              </Typography>
              <Alert severity="info" sx={{ textAlign: 'left' }}>
                <Typography variant="body2">
                  <strong>Email:</strong> {selectedUser?.email}
                </Typography>
                <Typography variant="body2">
                  <strong>Effect:</strong> User must click link to set new password
                </Typography>
              </Alert>
            </Box>
          ) : (
            <Box>
              <Typography variant="h6" gutterBottom align="center">
                Set New Password Directly
              </Typography>
              <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
                Enter a new password. User will be notified of the change.
              </Typography>
              
              <TextField
                fullWidth
                label="New Password"
                type="password"
                value={adminNewPassword}
                onChange={(e) => setAdminNewPassword(e.target.value)}
                margin="normal"
                variant="outlined"
                helperText="Minimum 6 characters recommended"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: colors.text.primary,
                    background: colors.background.tertiary,
                    borderRadius: borderRadius.lg,
                    '& fieldset': { borderColor: colors.border.default },
                    '&:hover fieldset': { borderColor: colors.border.hover },
                    '&.Mui-focused fieldset': { borderColor: colors.primary[400] },
                    '& input': {
                      background: colors.background.tertiary,
                      '&:-webkit-autofill': {
                        WebkitBoxShadow: `0 0 0 100px ${colors.background.tertiary} inset`,
                        WebkitTextFillColor: colors.text.primary,
                      },
                    },
                  },
                  '& .MuiInputLabel-root': { color: colors.text.tertiary },
                  '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[400] },
                  '& .MuiFormHelperText-root': { color: colors.text.tertiary },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <KeyIcon sx={{ color: colors.text.tertiary }} />
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                value={adminConfirmPassword}
                onChange={(e) => setAdminConfirmPassword(e.target.value)}
                margin="normal"
                variant="outlined"
                error={adminNewPassword !== adminConfirmPassword && adminConfirmPassword !== ''}
                helperText={
                  adminNewPassword !== adminConfirmPassword && adminConfirmPassword !== ''
                    ? "Passwords do not match"
                    : ""
                }
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: colors.text.primary,
                    background: colors.background.tertiary,
                    borderRadius: borderRadius.lg,
                    '& fieldset': { 
                      borderColor: adminNewPassword !== adminConfirmPassword && adminConfirmPassword !== '' 
                        ? colors.severity.critical 
                        : colors.border.default 
                    },
                    '&:hover fieldset': { borderColor: colors.border.hover },
                    '&.Mui-focused fieldset': { borderColor: colors.primary[400] },
                    '& input': {
                      background: colors.background.tertiary,
                      '&:-webkit-autofill': {
                        WebkitBoxShadow: `0 0 0 100px ${colors.background.tertiary} inset`,
                        WebkitTextFillColor: colors.text.primary,
                      },
                    },
                  },
                  '& .MuiInputLabel-root': { color: colors.text.tertiary },
                  '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[400] },
                  '& .MuiFormHelperText-root': { 
                    color: adminNewPassword !== adminConfirmPassword && adminConfirmPassword !== '' 
                      ? colors.severity.critical 
                      : colors.text.tertiary 
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <KeyIcon sx={{ color: colors.text.tertiary }} />
                    </InputAdornment>
                  ),
                }}
              />

              <Alert 
                severity="warning" 
                sx={{ 
                  mt: 2,
                  background: 'rgba(219, 171, 9, 0.1)',
                  color: colors.status.warning,
                  border: `1px solid ${colors.status.warning}40`,
                  borderRadius: borderRadius.lg,
                  '& .MuiAlert-icon': { color: colors.status.warning }
                }}
              >
                <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                  <strong style={{ color: colors.status.warning }}>Note:</strong> This immediately changes the password. Inform the user of their new password.
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={() => setResetDialogOpen(false)}
            variant="outlined"
          >
            Cancel
          </Button>
          {passwordTab === 0 ? (
            <Button 
              onClick={confirmPasswordReset} 
              variant="contained" 
              color="primary"
              startIcon={<SendIcon />}
            >
              Send Reset Email
            </Button>
          ) : (
            <Button 
              onClick={handleAdminSetPassword}
              variant="contained" 
              color="primary"
              startIcon={<SaveIcon />}
              disabled={!adminNewPassword || adminNewPassword !== adminConfirmPassword}
            >
              Set Password
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Project Allocation Dialog */}
      <Dialog 
        open={allocationDialogOpen} 
        onClose={() => setAllocationDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: 'hidden' }
        }}
      >
        <Box sx={{ 
          background: colors.background.tertiary,
          borderBottom: `1px solid ${colors.border.subtle}`,
          color: colors.text.primary,
          p: 3,
          textAlign: 'center'
        }}>
          <FolderIcon sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold">
            Allocate Projects
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
            {userForAllocation?.name || userForAllocation?.email}
          </Typography>
        </Box>

        <DialogContent sx={{ p: 3, minHeight: 300 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Select projects to allocate to this user. They will only be able to access these projects.
          </Typography>
          
          {availableProjects.length === 0 ? (
            <Alert severity="info">
              No projects available for allocation.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {availableProjects.map((project) => (
                <Grid item xs={12} sm={6} key={project.id}>
                  <Card 
                    variant={selectedProjects.includes(project.id) ? 'elevation' : 'outlined'}
                    elevation={selectedProjects.includes(project.id) ? 4 : 0}
                    sx={{ 
                      cursor: 'pointer',
                      borderColor: selectedProjects.includes(project.id) ? 'primary.main' : 'divider',
                      backgroundColor: selectedProjects.includes(project.id) ? 'primary.50' : 'background.paper'
                    }}
                    onClick={() => handleToggleProject(project.id)}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FolderIcon 
                          color={selectedProjects.includes(project.id) ? 'primary' : 'action'} 
                          fontSize="small"
                        />
                        <Typography 
                          variant="body2" 
                          fontWeight={selectedProjects.includes(project.id) ? 'bold' : 'normal'}
                        >
                          {project.name}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="textSecondary" sx={{ ml: 3 }}>
                        {project.code || project.clientName}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mr: 'auto' }}>
            {selectedProjects.length} project(s) selected
          </Typography>
          <Button 
            onClick={() => setAllocationDialogOpen(false)}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveAllocation}
            variant="contained" 
            color="primary"
            startIcon={<SaveIcon />}
            disabled={availableProjects.length === 0}
          >
            Save Allocation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;
