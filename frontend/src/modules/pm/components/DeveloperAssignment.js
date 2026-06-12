import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  IconButton,
  Checkbox,
  Alert,
  CircularProgress,
  Tooltip,
  Divider,
  Paper
} from '@mui/material';
import {
  PersonAdd as AssignIcon,
  PersonRemove as RemoveIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon
} from '@mui/icons-material';
import { colors, typography, borderRadius } from '../../../theme/designSystem';
import {
  getAvailableDevelopers,
  getPMAssignmentSummary,
  assignDeveloperToProject,
  removeDeveloperFromProject,
  batchAssignDeveloper
} from '../../../services/projectAllocation';

/**
 * DeveloperAssignment - PM component to assign/remove developers from projects
 * PM can only manage projects they are allocated to
 */
const DeveloperAssignment = ({ pmUser, onRefresh }) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedDevelopers, setSelectedDevelopers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('assign'); // 'assign' or 'remove'
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load assignment summary
  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPMAssignmentSummary(pmUser);
      setSummary(data);
    } catch (err) {
      setError('Failed to load assignment data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [pmUser]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Open assignment dialog
  const openAssignDialog = (project) => {
    setSelectedProject(project);
    setSelectedDevelopers([]);
    setDialogMode('assign');
    setDialogOpen(true);
    setError(null);
    setSuccess(null);
  };

  // Open removal dialog
  const openRemoveDialog = (project) => {
    setSelectedProject(project);
    setSelectedDevelopers([]);
    setDialogMode('remove');
    setDialogOpen(true);
    setError(null);
    setSuccess(null);
  };

  // Toggle developer selection
  const toggleDeveloper = (devId) => {
    setSelectedDevelopers(prev => 
      prev.includes(devId)
        ? prev.filter(id => id !== devId)
        : [...prev, devId]
    );
  };

  // Handle assignment
  const handleAssign = async () => {
    if (selectedDevelopers.length === 0) return;
    
    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const results = await Promise.all(
        selectedDevelopers.map(devId => 
          assignDeveloperToProject(pmUser, devId, selectedProject.project.id)
        )
      );

      const successCount = results.filter(r => r.success).length;
      setSuccess(`Successfully assigned ${successCount} developer(s) to ${selectedProject.project.name}`);
      
      // Refresh data
      await loadSummary();
      onRefresh?.();
      
      // Close dialog after short delay
      setTimeout(() => {
        setDialogOpen(false);
        setSuccess(null);
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Handle removal
  const handleRemove = async () => {
    if (selectedDevelopers.length === 0) return;
    
    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const results = await Promise.all(
        selectedDevelopers.map(devId => 
          removeDeveloperFromProject(pmUser, devId, selectedProject.project.id)
        )
      );

      const successCount = results.filter(r => r.success).length;
      setSuccess(`Successfully removed ${successCount} developer(s) from ${selectedProject.project.name}`);
      
      // Refresh data
      await loadSummary();
      onRefresh?.();
      
      setTimeout(() => {
        setDialogOpen(false);
        setSuccess(null);
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (!summary || summary.totalProjects === 0) {
    return (
      <Alert severity="info" sx={{ backgroundColor: colors.background.tertiary }}>
        You are not allocated to any projects yet. Contact an admin to be assigned to projects.
      </Alert>
    );
  }

  const availableDevelopersForAssignment = summary.unassignedDevelopers;
  const currentAssignedDevelopers = selectedProject?.assignedDevelopers || [];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ color: colors.text.primary, mb: 1 }}>
          Developer Assignment
        </Typography>
        <Typography variant="body2" sx={{ color: colors.text.secondary }}>
          You can assign developers to {summary.totalProjects} project(s) you manage.
        </Typography>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Paper sx={{ flex: 1, p: 2, backgroundColor: colors.background.tertiary }}>
          <Typography variant="h4" sx={{ color: colors.primary[400], fontWeight: 'bold' }}>
            {summary.totalDevelopers}
          </Typography>
          <Typography variant="body2" sx={{ color: colors.text.secondary }}>
            Total Developers
          </Typography>
        </Paper>
        <Paper sx={{ flex: 1, p: 2, backgroundColor: colors.background.tertiary }}>
          <Typography variant="h4" sx={{ color: colors.severity.low, fontWeight: 'bold' }}>
            {summary.assignedCount}
          </Typography>
          <Typography variant="body2" sx={{ color: colors.text.secondary }}>
            Assigned
          </Typography>
        </Paper>
        <Paper sx={{ flex: 1, p: 2, backgroundColor: colors.background.tertiary }}>
          <Typography variant="h4" sx={{ color: colors.severity.medium, fontWeight: 'bold' }}>
            {summary.unassignedDevelopers.length}
          </Typography>
          <Typography variant="body2" sx={{ color: colors.text.secondary }}>
            Unassigned
          </Typography>
        </Paper>
      </Box>

      {/* Projects List */}
      <Typography variant="subtitle1" sx={{ color: colors.text.primary, mb: 2, fontWeight: 600 }}>
        Your Projects
      </Typography>

      <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {summary.projects.map(({ project, assignedDevelopers, count }) => (
          <Paper
            key={project.id}
            sx={{
              backgroundColor: colors.background.tertiary,
              border: `1px solid ${colors.border.subtle}`,
              borderRadius: borderRadius.lg,
              overflow: 'hidden'
            }}
          >
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: 600 }}>
                    {project.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                    {project.description?.substring(0, 100)}...
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={`${count} developer${count !== 1 ? 's' : ''}`}
                  sx={{
                    backgroundColor: count > 0 ? `${colors.primary[500]}20` : colors.background.secondary,
                    color: count > 0 ? colors.primary[400] : colors.text.tertiary
                  }}
                />
              </Box>

              {/* Assigned Developers */}
              {assignedDevelopers.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: colors.text.tertiary, display: 'block', mb: 1 }}>
                    Assigned Developers:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {assignedDevelopers.map(dev => (
                      <Chip
                        key={dev.id}
                        avatar={<Avatar sx={{ width: 20, height: 20 }}>{dev.name?.charAt(0).toUpperCase()}</Avatar>}
                        label={dev.name || dev.email}
                        size="small"
                        sx={{
                          backgroundColor: colors.background.secondary,
                          color: colors.text.secondary
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AssignIcon />}
                  onClick={() => openAssignDialog({ project, assignedDevelopers })}
                  disabled={summary.unassignedDevelopers.length === 0}
                >
                  Assign Developers
                </Button>
                
                {assignedDevelopers.length > 0 && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<RemoveIcon />}
                    onClick={() => openRemoveDialog({ project, assignedDevelopers })}
                  >
                    Remove
                  </Button>
                )}
              </Box>
            </Box>
          </Paper>
        ))}
      </List>

      {/* Assignment Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => !processing && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: colors.background.secondary }
        }}
      >
        <DialogTitle sx={{ color: colors.text.primary }}>
          {dialogMode === 'assign' ? 'Assign Developers' : 'Remove Developers'}
          <Typography variant="body2" sx={{ color: colors.text.secondary, mt: 0.5 }}>
            {selectedProject?.project.name}
          </Typography>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2, backgroundColor: `${colors.severity.critical}15` }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2, backgroundColor: `${colors.severity.low}15` }}>
              {success}
            </Alert>
          )}

          <Typography variant="body2" sx={{ color: colors.text.secondary, mb: 2 }}>
            {dialogMode === 'assign'
              ? `Select developers to assign to ${selectedProject?.project.name}:`
              : `Select developers to remove from ${selectedProject?.project.name}:`}
          </Typography>

          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {(dialogMode === 'assign' ? availableDevelopersForAssignment : currentAssignedDevelopers).map((dev) => (
              <ListItem
                key={dev.id}
                dense
                button
                onClick={() => toggleDeveloper(dev.id)}
                selected={selectedDevelopers.includes(dev.id)}
                sx={{
                  borderRadius: borderRadius.md,
                  mb: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: `${colors.primary[500]}20`
                  }
                }}
              >
                <Checkbox
                  edge="start"
                  checked={selectedDevelopers.includes(dev.id)}
                  tabIndex={-1}
                  disableRipple
                />
                <ListItemAvatar>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {dev.name?.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={dev.name || dev.email}
                  secondary={dev.email}
                  primaryTypographyProps={{ color: colors.text.primary }}
                  secondaryTypographyProps={{ color: colors.text.tertiary, fontSize: '0.75rem' }}
                />
              </ListItem>
            ))}
          </List>

          {dialogMode === 'assign' && availableDevelopersForAssignment.length === 0 && (
            <Typography variant="body2" sx={{ color: colors.text.tertiary, textAlign: 'center', py: 4 }}>
              All developers are already assigned to this project or other projects.
            </Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={processing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={dialogMode === 'assign' ? handleAssign : handleRemove}
            disabled={selectedDevelopers.length === 0 || processing}
            startIcon={processing ? <CircularProgress size={16} /> : null}
          >
            {processing ? 'Processing...' : dialogMode === 'assign' ? 'Assign' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeveloperAssignment;
