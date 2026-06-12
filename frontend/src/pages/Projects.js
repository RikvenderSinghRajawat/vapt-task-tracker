import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { DashboardHeader } from '../components/branding';
import {
  Box, Button, Typography, Card, CardContent, Chip, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, CircularProgress,
  Alert, Snackbar, Tooltip, IconButton, Avatar
} from '@mui/material';
import {
  Menu as MenuIcon,
  Add as AddIcon,
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Folder as FolderIcon, 
  BugReport as BugReportIcon,
  Security as SecurityIcon,
  CalendarToday as CalendarIcon,
  Business as BusinessIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { projectAPI } from '../services/api';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { colors, typography, shadows, borderRadius, transitions, componentStyles, getStatusColor, getStatusBg } from '../theme/designSystem';

const Projects = () => {
  const navigate = useNavigate();
  const { user, hasFullAccess, filterProjectsByAllocation } = useAuth();
  const { showToast, showConfirm } = useToast();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]); // For manager dropdown

  // Only admin and VAPT analyst can add/edit/delete projects
  const canManageProjects = hasFullAccess();
  const isProjectManager = user?.role === 'project_manager';
  const [open, setOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    assessmentType: 'PenTest',
    description: '',
    status: 'received',
    startDate: new Date().toISOString().split('T')[0],
    manager: user?.id || ''
  });

  // Load projects with visibility logic - developers and PMs only see allocated projects
  const fetchProjects = useCallback(async () => {
    try {
      // Use cache=true for faster loading (30 second cache)
      const allProjects = await projectAPI.getProjects(true);
      
      // Use AuthContext helper for consistent role-based filtering
      const visibleProjects = filterProjectsByAllocation(allProjects);
      
      setProjects(visibleProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  }, [user, filterProjectsByAllocation]);

  // Load users for manager dropdown
  const fetchUsers = useCallback(async () => {
    if (hasFullAccess()) {
      try {
        const allUsers = await userAPI.getUsers();
        setUsers(allUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    }
  }, [hasFullAccess]);

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, [fetchProjects, fetchUsers]);

  const handleOpen = () => {
    setEditingProject(null);
    setFormErrors({});
    setFormData({
      name: '',
      organization: '',
      assessmentType: 'PenTest',
      description: '',
      status: 'received',
      startDate: '',
      manager: user?.id || ''
    });
    setOpen(true);
  };

  const handleClose = () => {
    setFormErrors({});
    setOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = 'Project name is required';
    if (!formData.organization?.trim()) errors.organization = 'Organization is required';
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      if (editingProject) {
        await projectAPI.updateProject(editingProject.id, formData);
      } else {
        await projectAPI.createProject(formData);
      }
      handleClose();
      fetchProjects();
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      organization: project.organization,
      assessmentType: project.assessmentType,
      description: project.description,
      status: project.status,
      startDate: project.startDate?.split('T')[0] || '',
      manager: project.manager || user?.id || ''
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!await showConfirm({
      title: 'Delete Project',
      message: 'Are you sure you want to delete this project?\n\nIt will be moved to the Recycle Bin for 15 days before permanent deletion.',
      severity: 'warning',
      confirmLabel: 'Move to Recycle Bin',
    })) {
      return;
    }
    try {
      await projectAPI.deleteProject(id, user?.name || user?.email);
      fetchProjects();
      showToast('Project moved to Recycle Bin. You can restore it within 15 days.', 'success');
    } catch (error) {
      console.error('Error deleting project:', error);
      showToast('Error deleting project: ' + error.message, 'error');
    }
  };

  const _getStatusColor = getStatusColor;
  const _getStatusBg = getStatusBg;

  return (
    <Box sx={{ minHeight: '100vh', background: colors.background.primary, p: 3 }}>
      <DashboardHeader
        title="Project Management"
        subtitle="Manage your VAPT assessment projects"
        actions={canManageProjects ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpen}
              sx={componentStyles.button.primary}
            >
            New Project
          </Button>
        ) : null}
      />

      <Grid container spacing={3}>
        {projects.map((project, index) => (
          <Grid item xs={12} md={6} lg={4} key={project.id}>
            <Card 
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: colors.background.secondary,
                border: `1px solid ${colors.border.subtle}`,
                borderRadius: borderRadius.xl,
                overflow: 'hidden',
                position: 'relative',
                transition: transitions.premium,
                animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
                '@keyframes fadeInUp': {
                  from: { opacity: 0, transform: 'translateY(20px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: shadows.elevated,
                  borderColor: `${colors.primary[500]}20`,
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: _getStatusColor(project.status),
                  boxShadow: `0 0 12px ${_getStatusColor(project.status)}60`,
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1, p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography 
                    variant="body1" 
                    gutterBottom
                    sx={{ 
                      fontWeight: 600,
                      lineHeight: 1.3,
                      color: colors.text.primary
                    }}
                  >
                    {project.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {canManageProjects && (
                      <>
                        <IconButton 
                          size="small" 
                          onClick={() => handleEdit(project)}
                          sx={{ 
                            color: colors.primary[500],
                            transition: 'all 0.2s ease',
                            '&:hover': { 
                              backgroundColor: 'rgba(0, 255, 136, 0.1)',
                              transform: 'scale(1.1)'
                            }
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDelete(project.id)}
                          sx={{ 
                            color: '#dc2626',
                            transition: 'all 0.2s ease',
                            '&:hover': { 
                              backgroundColor: 'rgba(220, 38, 38, 0.1)',
                              transform: 'scale(1.1)'
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </Box>
                </Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: colors.text.tertiary,
                    fontWeight: 500,
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <FolderIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                  {project.code} • {project.organization}
                </Typography>
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Chip
                    label={project.status.replace('_', ' ')}
                    size="small"
                    sx={{ 
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 2,
                      backgroundColor: _getStatusBg(project.status),
                      color: _getStatusColor(project.status),
                      border: `1px solid ${_getStatusColor(project.status)}40`,
                    }}
                  />
                </Box>
                <Box 
                  sx={{ 
                    mt: 2, 
                    p: 2, 
                    backgroundColor: 'rgba(15, 23, 42, 0.5)',
                    borderRadius: 2,
                    border: '1px solid rgba(148, 163, 184, 0.2)'
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 500 }}>
                    <BugReportIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle', color: colors.primary[500] }} />
                    {project.statistics?.totalFindings || 0} findings
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      size="small" 
                      label={`Critical: ${project.statistics?.criticalFindings || 0}`}
                      sx={{ 
                        backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                        color: '#dc2626',
                        fontWeight: 500,
                        fontSize: '0.75rem'
                      }} 
                    />
                    <Chip 
                      size="small" 
                      label={`High: ${project.statistics?.highFindings || 0}`}
                      sx={{ 
                        backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                        color: '#d97706',
                        fontWeight: 500,
                        fontSize: '0.75rem'
                      }} 
                    />
                  </Box>
                </Box>
              </CardContent>
              <Box sx={{ p: 3, pt: 0 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => navigate(`/projects/${project.id}`)}
                  sx={{
                    borderRadius: 2,
                    py: 1,
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    letterSpacing: '1px',
                    borderColor: colors.primary[500],
                    color: colors.primary[500],
                    background: 'transparent',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'rgba(0, 255, 136, 0.1)',
                      borderColor: colors.primary[500],
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 20px rgba(0, 255, 136, 0.2)',
                    }
                  }}
                >
                  View Details
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

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
          {editingProject ? 'Edit Project' : 'New Project'}
        </DialogTitle>
        <DialogContent sx={{ color: colors.text.secondary }}>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Project Name"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleChange}
            error={!!formErrors.name}
            helperText={formErrors.name}
            FormHelperTextProps={{ sx: { color: '#ef4444', ml: 0 } }}
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: '#f1f5f9',
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                '& fieldset': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(0, 255, 136, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: colors.primary[500] },
              },
              '& .MuiInputLabel-root': { color: '#94a3b8' },
              '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[500] },
              '& input:-webkit-autofill': {
                WebkitBoxShadow: '0 0 0 30px #0f172a inset !important',
                WebkitTextFillColor: '#f1f5f9 !important',
              },
            }}
          />
          <TextField
            margin="dense"
            name="organization"
            label="Organization"
            fullWidth
            variant="outlined"
            value={formData.organization}
            onChange={handleChange}
            error={!!formErrors.organization}
            helperText={formErrors.organization}
            FormHelperTextProps={{ sx: { color: '#ef4444', ml: 0 } }}
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: '#f1f5f9',
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                '& fieldset': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(0, 255, 136, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: colors.primary[500] },
              },
              '& .MuiInputLabel-root': { color: '#94a3b8' },
              '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[500] },
              '& input:-webkit-autofill': {
                WebkitBoxShadow: '0 0 0 30px #0f172a inset !important',
                WebkitTextFillColor: '#f1f5f9 !important',
              },
            }}
          />
          <FormControl 
            fullWidth 
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: '#f1f5f9',
                '& fieldset': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(0, 255, 136, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: colors.primary[500] },
              },
              '& .MuiInputLabel-root': { color: '#94a3b8' },
              '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[500] },
            }}
          >
            <InputLabel>Assessment Type</InputLabel>
            <Select
              name="assessmentType"
              value={formData.assessmentType}
              label="Assessment Type"
              onChange={handleChange}
              sx={{ color: '#f1f5f9' }}
            >
              <MenuItem value="PenTest">Penetration Test</MenuItem>
              <MenuItem value="SAST">SAST</MenuItem>
              <MenuItem value="DAST">DAST</MenuItem>
              <MenuItem value="Code Review">Code Review</MenuItem>
              <MenuItem value="VAPT">VAPT</MenuItem>
              <MenuItem value="Red Teaming">Red Teaming</MenuItem>
              <MenuItem value="Blue Teaming">Blue Teaming</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
          <FormControl 
            fullWidth 
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: '#f1f5f9',
                '& fieldset': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(0, 255, 136, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: colors.primary[500] },
              },
              '& .MuiInputLabel-root': { color: '#94a3b8' },
              '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[500] },
            }}
          >
            <InputLabel>Project Manager</InputLabel>
            <Select
              name="manager"
              value={formData.manager}
              label="Project Manager"
              onChange={handleChange}
              sx={{ color: '#f1f5f9' }}
            >
              {users.map(user => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl 
            fullWidth 
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: '#f1f5f9',
                '& fieldset': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(0, 255, 136, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: colors.primary[500] },
              },
              '& .MuiInputLabel-root': { color: '#94a3b8' },
              '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[500] },
            }}
          >
            <InputLabel>Status</InputLabel>
            <Select
              name="status"
              value={formData.status}
              label="Status"
              onChange={handleChange}
              sx={{ color: '#f1f5f9' }}
            >
              <MenuItem value="planning">Planning</MenuItem>
              <MenuItem value="received">Received</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="remediation">Remediation</MenuItem>
              <MenuItem value="retest">Retest</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            name="startDate"
            label="Start Date"
            type="date"
            fullWidth
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            value={formData.startDate}
            onChange={handleChange}
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: '#f1f5f9',
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                '& fieldset': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(0, 255, 136, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: colors.primary[500] },
              },
              '& .MuiInputLabel-root': { color: '#94a3b8' },
              '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[500] },
            }}
          />
          <TextField
            margin="dense"
            name="description"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={formData.description}
            onChange={handleChange}
            sx={{ 
              '& .MuiOutlinedInput-root': {
                color: '#f1f5f9',
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                '& fieldset': { borderColor: 'rgba(148, 163, 184, 0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(0, 255, 136, 0.5)' },
                '&.Mui-focused fieldset': { borderColor: colors.primary[500] },
              },
              '& .MuiInputLabel-root': { color: '#94a3b8' },
              '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[500] },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleClose}
            sx={{ 
              color: '#94a3b8',
              '&:hover': { color: '#f1f5f9' }
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
              borderRadius: borderRadius.lg,
              px: 3,
              '&:hover': {
                background: colors.primary[500],
              }
            }}
          >
            {editingProject ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Projects;