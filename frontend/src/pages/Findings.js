import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  IconButton,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  CheckCircle as CheckCircleIcon, 
  Replay as ReplayIcon,
  BugReport as BugReportIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { findingAPI, requestAPI, projectAPI } from '../services/api';
import { BulkActionBar } from '../shared/components';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FindingsSkeleton } from '../components/SkeletonLoader';
import { colors, typography, spacing, shadows, borderRadius, transitions, componentStyles } from '../theme/designSystem';
import { sortFindingsByStatusAndSeverity, sortFindingsBySeverity } from '../utils/sortingUtils';
import { glassStyles, gradients } from '../theme/premiumTheme';

const Findings = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, hasFullAccess, canAccessProject } = useAuth();
  const { showToast, showConfirm } = useToast();

  const [findings, setFindings] = useState([]);
  const [projects, setProjects] = useState([]); // For project name filtering
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [projectFilter, setProjectFilter] = useState(''); // Project name filter
  const bulkUploadInputRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkUpdating, setBulkUpdating] = useState(false);
  
  const handleSelectOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredFindings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFindings.map(f => f.id)));
    }
  };

  const handleBulkUpdate = async (updates) => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      await findingAPI.bulkUpdateStatus([...selectedIds], updates.status, updates.severity, updates.assignee, updates.comment, updates.isDuplicate);
      showToast(`Updated ${selectedIds.size} findings successfully`, 'success');
      setSelectedIds(new Set());
      setBulkStatus('');
      fetchFindings();
    } catch (error) {
      showToast(error.message || 'Bulk update failed', 'error');
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await showConfirm({
      title: 'Delete Multiple Findings',
      message: `Are you sure you want to delete ${selectedIds.size} findings?`,
      severity: 'warning',
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;
    
    setBulkUpdating(true);
    try {
      await Promise.all([...selectedIds].map(id => findingAPI.deleteFinding(projectId, id)));
      showToast(`Deleted ${selectedIds.size} findings`, 'success');
      setSelectedIds(new Set());
      fetchFindings();
    } catch (error) {
      showToast('Some findings could not be deleted', 'error');
    } finally {
      setBulkUpdating(false);
    }
  };

  // Only admin and VAPT analyst can add/edit/delete/close findings directly
  const canManageFindings = hasFullAccess();
  const canBulkUploadFindings = hasFullAccess() || user?.role === 'project_manager';
  // Developer can view and request changes
  const canRequestChanges = user?.role === 'developer';
  // Project Manager can view, request changes, and assign findings to developers
  const isProjectManager = user?.role === 'project_manager';
  const canAssignFindings = isProjectManager;
  const [open, setOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium',
    status: 'open',
    category: 'other',
    cvssScore: '',
    remediation: ''
  });
  
  const [statusFilter, setStatusFilter] = useState('all');
  const filteredFindings = useMemo(() => {
    const filtered = findings.filter(f => {
      const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
      const pid = f.project?.id || f.project?._id || f.project || f.projectId;
      return matchesStatus && (projectFilter === '' || pid === projectFilter || f.project === projectFilter);
    });
    return sortFindingsByStatusAndSeverity(filtered);
  }, [findings, statusFilter, projectFilter]);

  useEffect(() => {
    // Check if user can access this project
    if (!canAccessProject(projectId)) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }
    fetchFindings();
  }, [projectId]);

  const fetchFindings = async () => {
    try {
      setLoading(true);
      
      // Fetch findings and projects in parallel
      const [findings, allProjects] = await Promise.all([
        findingAPI.getFindings(projectId),
        projectAPI.getProjects()
      ]);
      
      // Store projects for filtering
      setProjects(allProjects);
      setFindings(findings);
    } catch (error) {
      console.error('Error fetching findings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setEditingFinding(null);
    setFormErrors({});
    setFormData({
      title: '',
      description: '',
      severity: 'medium',
      status: 'open',
      category: 'other',
      cvssScore: '',
      remediation: ''
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
    if (!formData.title?.trim()) errors.title = 'Finding title is required';
    if (!formData.description?.trim()) errors.description = 'Description is required';
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      if (editingFinding) {
        await findingAPI.updateFinding(projectId, editingFinding.id, formData);
      } else {
        await findingAPI.createFinding(projectId, formData);
      }
      handleClose();
      fetchFindings();
    } catch (error) {
      console.error('Error saving finding:', error);
    }
  };

  const handleEdit = (finding) => {
    setEditingFinding(finding);
    setFormData({
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      status: finding.status,
      category: finding.category,
      cvssScore: finding.cvssScore || '',
      remediation: finding.remediation || ''
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: 'Delete Finding',
      message: 'Are you sure you want to delete this finding?',
      severity: 'warning',
      confirmLabel: 'Delete',
    });

    if (!confirmed) return;

    try {
      await findingAPI.deleteFinding(projectId, id);
      setFindings(prev => prev.filter(f => (f._id || f.id) !== id));
      showToast('Finding deleted successfully', 'success');
    } catch (error) {
      if (error.status === 404 || error.message?.includes('not found')) {
        setFindings(prev => prev.filter(f => (f._id || f.id) !== id));
        showToast('Finding removed from view', 'success');
      } else {
        console.error('Error deleting finding:', error);
        showToast('Error deleting finding: ' + (error?.message || 'Unknown error'), 'error');
      }
    }
  };

  const handleCloseFinding = async (id) => {
    try {
      await findingAPI.closeFinding(projectId, id, 'Finding closed via UI');
      setFindings(prev => prev.map(f =>
        (f._id || f.id) === id ? { ...f, status: 'closed' } : f
      ));
      showToast('Finding closed', 'success');
    } catch (error) {
      console.error('Error closing finding:', error);
      showToast('Error closing finding: ' + (error?.message || 'Unknown error'), 'error');
    }
  };

  const handleBulkUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      const result = await findingAPI.bulkUpload(formData);
      showToast(`Bulk upload complete. Inserted: ${result.totalInserted || 0}. Failed: ${result.failedRows?.length || 0}.`, 'success');
      fetchFindings();
    } catch (error) {
      console.error('Error bulk uploading:', error);
      showToast(`Bulk upload failed: ${error.message}`, 'error');
    } finally {
      event.target.value = '';
    }
  };

  const downloadBulkTemplate = () => {
    const template = [{
      projectId,
      vulnerabilityName: 'Example Vulnerability',
      severity: 'high',
      description: 'Describe the vulnerability and affected component.',
      remediation: 'Describe the remediation steps.'
    }];
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'finding-bulk-template.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleReopenFinding = async (id) => {
    try {
      await findingAPI.reopenFinding(projectId, id);
      setFindings(prev => prev.map(f =>
        (f._id || f.id) === id ? { ...f, status: 'reopened' } : f
      ));
      showToast('Finding reopened', 'success');
    } catch (error) {
      console.error('Error reopening finding:', error);
      showToast('Error reopening finding: ' + (error?.message || 'Unknown error'), 'error');
    }
  };

  // Request handlers for Developer/PM
  const handleRequestClose = async (id) => {
    try {
      await requestAPI.requestCloseFinding(projectId, id, user.name || user.email, '');
      setFindings(prev => prev.map(f =>
        (f._id || f.id) === id ? { ...f, status: 'under_review' } : f
      ));
      showToast('Request to close finding has been sent to admin/VAPT analyst for approval.', 'success');
    } catch (error) {
      console.error('Error requesting close:', error);
      showToast('Error sending request: ' + error.message, 'error');
    }
  };

  const handleRequestReopen = async (id) => {
    try {
      await requestAPI.requestReopenFinding(projectId, id, user.name || user.email, '');
      setFindings(prev => prev.map(f =>
        (f._id || f.id) === id ? { ...f, status: 'reopened' } : f
      ));
      showToast('Request to reopen finding has been sent to admin/VAPT analyst for approval.', 'success');
    } catch (error) {
      console.error('Error requesting reopen:', error);
      showToast('Error sending request: ' + error.message, 'error');
    }
  };

  const getSeverityColor = (severity) => {
    const map = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#ca8a04',
      low: '#16a34a',
      info: '#0891b2'
    };
    return map[severity] || '#64748b';
  };

  const getSeverityBgColor = (severity) => {
    const map = {
      critical: 'rgba(220, 38, 38, 0.15)',
      high: 'rgba(234, 88, 12, 0.15)',
      medium: 'rgba(202, 138, 4, 0.15)',
      low: 'rgba(22, 163, 74, 0.15)',
      info: 'rgba(8, 145, 178, 0.15)'
    };
    return map[severity] || 'rgba(100, 116, 139, 0.15)';
  };

  const getStatusColor = (status) => {
    const map = {
      open: '#dc2626',
      in_progress: '#ca8a04',
      resolved: colors.primary[500],
      partial: '#ca8a04',
      closed: '#16a34a',
      false_positive: '#64748b',
      duplicate: '#64748b'
    };
    return map[status] || '#64748b';
  };

  const getStatusBgColor = (status) => {
    const map = {
      open: 'rgba(220, 38, 38, 0.15)',
      in_progress: 'rgba(202, 138, 4, 0.15)',
      resolved: `${colors.primary[500]}26`,
      partial: 'rgba(202, 138, 4, 0.15)',
      closed: 'rgba(22, 163, 74, 0.15)',
      false_positive: 'rgba(100, 116, 139, 0.15)',
      duplicate: 'rgba(100, 116, 139, 0.15)'
    };
    return map[status] || 'rgba(100, 116, 139, 0.15)';
  };

  if (loading) {
    return <FindingsSkeleton />;
  }

  if (unauthorized) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h4" sx={{ color: colors.severity.critical, mb: 2 }}>
          Access Denied
        </Typography>
        <Typography variant="body1" sx={{ color: colors.text.secondary }}>
          You are not authorized to view findings for this project.
        </Typography>
        <Button 
          variant="contained" 
          sx={{ mt: 3 }}
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: colors.background.primary,
        p: 3
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 4,
          gap: 2
        }}
      >
        <Box
          sx={{
            minWidth: 260
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              color: colors.text.primary,
              mb: 0.75,
              letterSpacing: '-0.02em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            Kavach Administrator
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: colors.text.primary,
              lineHeight: 1.1
            }}
          >
            Vulnerability Findings
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: colors.text.secondary,
              mt: 1
            }}
          >
            Manage security vulnerabilities and remediation status
          </Typography>
        </Box>

        {(canManageFindings || canBulkUploadFindings) && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <input
              ref={bulkUploadInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={handleBulkUpload}
            />
            {canBulkUploadFindings && (
              <>
                <Button variant="outlined" onClick={downloadBulkTemplate} sx={{ fontWeight: 700, borderRadius: borderRadius.lg }}>
                  JSON Template
                </Button>
                <Button variant="outlined" onClick={() => bulkUploadInputRef.current?.click()} sx={{ fontWeight: 700, borderRadius: borderRadius.lg }}>
                  Bulk Upload
                </Button>
              </>
            )}
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => findingAPI.exportCSV(projectId)}
              sx={{ fontWeight: 700, borderRadius: borderRadius.lg }}
            >
              CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => findingAPI.exportExcel(projectId)}
              sx={{ fontWeight: 700, borderRadius: borderRadius.lg }}
            >
              Excel
            </Button>
            {canManageFindings && <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpen}
              sx={{
                background: colors.severity.critical,
                color: '#fff',
                fontWeight: 700,
                borderRadius: borderRadius.lg,
                px: 3,
                whiteSpace: 'nowrap',
                boxShadow: '0 12px 30px rgba(220, 38, 38, 0.25)',
                '&:hover': {
                  background: '#B91C1C',
                  boxShadow: '0 16px 38px rgba(220, 38, 38, 0.32)'
                }
              }}
            >
              Report Finding
            </Button>}
          </Box>
        )}
      </Box>

      {/* Bulk Action Bar */}
      {canManageFindings && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalCount={filteredFindings.length}
          onSelectAll={handleSelectAll}
          onClearSelection={() => setSelectedIds(new Set())}
          onDelete={handleBulkDelete}
          onChangeStatus={(status) => handleBulkUpdate({ status })}
          onChangeSeverity={(severity) => handleBulkUpdate({ severity })}
          onAssign={(assignee) => handleBulkUpdate({ assignee })}
          onDuplicate={() => handleBulkUpdate({ isDuplicate: true })}
          disabled={bulkUpdating}
        />
      )}

      {/* Enhanced Filter Section */}
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            backgroundColor: 'rgba(2, 6, 23, 0.35)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: 3,
            p: 2
          }}
        >
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} md={6}>
              <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1, fontWeight: 700 }}>
                Filter by Project
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  label="All Projects"
                  onClick={() => setProjectFilter('')}
                  sx={{
                    backgroundColor: projectFilter === '' ? '#06B6D4' : 'rgba(15, 23, 42, 0.6)',
                    color: projectFilter === '' ? '#0f172a' : '#94a3b8',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: projectFilter === '' ? '#0891b2' : 'rgba(6, 182, 212, 0.1)'
                    }
                  }}
                />
                {projects.map(project => (
                  <Chip
                    key={project.id}
                    label={project.name}
                    onClick={() => setProjectFilter(project.id)}
                    sx={{
                      backgroundColor: projectFilter === project.id ? '#06B6D4' : 'rgba(15, 23, 42, 0.6)',
                      color: projectFilter === project.id ? '#0f172a' : '#94a3b8',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: projectFilter === project.id ? '#0891b2' : 'rgba(6, 182, 212, 0.1)'
                      }
                    }}
                  />
                ))}
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1, fontWeight: 700 }}>
                Filter by Status
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  label="All Findings"
                  onClick={() => setStatusFilter('all')}
                  sx={{
                    backgroundColor: statusFilter === 'all' ? '#06B6D4' : 'rgba(15, 23, 42, 0.6)',
                    color: statusFilter === 'all' ? '#0f172a' : '#94a3b8',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: statusFilter === 'all' ? '#0891b2' : 'rgba(6, 182, 212, 0.1)'
                    }
                  }}
                />
                <Chip
                  label={`Open (${findings.filter(f => f.status === 'open').length})`}
                  onClick={() => setStatusFilter('open')}
                  sx={{
                    backgroundColor: statusFilter === 'open' ? '#dc2626' : 'rgba(15, 23, 42, 0.6)',
                    color: statusFilter === 'open' ? '#fff' : '#94a3b8',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: statusFilter === 'open' ? '#b91c1c' : 'rgba(220, 38, 38, 0.1)'
                    }
                  }}
                />
                <Chip
                  label={`In Progress (${findings.filter(f => f.status === 'in_progress').length})`}
                  onClick={() => setStatusFilter('in_progress')}
                  sx={{
                    backgroundColor: statusFilter === 'in_progress' ? '#ca8a04' : 'rgba(15, 23, 42, 0.6)',
                    color: statusFilter === 'in_progress' ? '#fff' : '#94a3b8',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                />
                <Chip
                  label={`Under Review (${findings.filter(f => f.status === 'under_review').length})`}
                  onClick={() => setStatusFilter('under_review')}
                  sx={{
                    backgroundColor: statusFilter === 'under_review' ? '#f59e0b' : 'rgba(15, 23, 42, 0.6)',
                    color: statusFilter === 'under_review' ? '#fff' : '#94a3b8',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                />
                <Chip
                  label={`Resolved (${findings.filter(f => f.status === 'resolved').length})`}
                  onClick={() => setStatusFilter('resolved')}
                  sx={{
                    backgroundColor: statusFilter === 'resolved' ? colors.primary[500] : 'rgba(15, 23, 42, 0.6)',
                    color: statusFilter === 'resolved' ? '#0f172a' : '#94a3b8',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: statusFilter === 'resolved' ? '#0891b2' : 'rgba(6, 182, 212, 0.1)'
                    }
                  }}
                />
                <Chip
                  label={`Closed (${findings.filter(f => f.status === 'closed').length})`}
                  onClick={() => setStatusFilter('closed')}
                  sx={{
                    backgroundColor: statusFilter === 'closed' ? '#16a34a' : 'rgba(15, 23, 42, 0.6)',
                    color: statusFilter === 'closed' ? '#fff' : '#94a3b8',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: statusFilter === 'closed' ? '#15803d' : 'rgba(22, 163, 74, 0.1)'
                    }
                  }}
                />
                <Chip
                  label={`Duplicate (${findings.filter(f => f.status === 'duplicate').length})`}
                  onClick={() => setStatusFilter('duplicate')}
                  sx={{
                    backgroundColor: statusFilter === 'duplicate' ? '#64748b' : 'rgba(15, 23, 42, 0.6)',
                    color: statusFilter === 'duplicate' ? '#fff' : '#94a3b8',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                />
                <Chip
                  label={`Accepted Risk (${findings.filter(f => f.status === 'accepted_risk').length})`}
                  onClick={() => setStatusFilter('accepted_risk')}
                  sx={{
                    backgroundColor: statusFilter === 'accepted_risk' ? '#8b5cf6' : 'rgba(15, 23, 42, 0.6)',
                    color: statusFilter === 'accepted_risk' ? '#fff' : '#94a3b8',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>
      {canManageFindings && filteredFindings.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Checkbox
            checked={selectedIds.size === filteredFindings.length && filteredFindings.length > 0}
            indeterminate={selectedIds.size > 0 && selectedIds.size < filteredFindings.length}
            onChange={handleSelectAll}
            sx={{ color: colors.text.tertiary, '&.Mui-checked': { color: colors.primary[500] }, '&.MuiCheckbox-indeterminate': { color: colors.primary[500] } }}
          />
          <Typography variant="body2" sx={{ color: colors.text.secondary }}>
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
          </Typography>
        </Box>
      )}
      <Grid container spacing={3}>
        {filteredFindings.map((finding, index) => (
          <Grid item xs={12} md={6} lg={4} key={finding.id}>
            <Card 
              onClick={() => navigate(`/projects/${projectId}/findings/${finding.id}`)}
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
                '@keyframes fadeInUp': {
                  from: { opacity: 0, transform: 'translateY(20px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
                '&:hover': {
                  transform: 'translateY(-6px) scale(1.02)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
                  cursor: 'pointer',
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
                  background: getSeverityColor(finding.severity),
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1, p: 3 }}>
                {canManageFindings && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Checkbox
                      checked={selectedIds.has(finding.id)}
                      onChange={(e) => { e.stopPropagation(); handleSelectOne(finding.id); }}
                      onClick={(e) => e.stopPropagation()}
                      sx={{ color: colors.text.tertiary, p: 0, '&.Mui-checked': { color: colors.primary[500] } }}
                    />
                  </Box>
                )}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ mb: 1.5 }}>
                    <Typography 
                      variant="h6" 
                      gutterBottom
                      sx={{ 
                        fontWeight: 700,
                        fontSize: '1.2rem',
                        lineHeight: 1.3,
                        color: colors.text.primary,
                        mb: 1
                      }}
                    >
                      {finding.title || finding.name || 'Untitled Finding'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: colors.primary[500], fontWeight: 600, mb: 0.5 }}>
                      {finding.project?.name || projects.find(p => p.id === finding.projectId || p._id === finding.project)?.name || 'Unknown'}
                    </Typography>
                    {finding.project?.code && (
                      <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace', display: 'block', mb: 0.25 }}>
                        Code: {finding.project.code}
                      </Typography>
                    )}
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: colors.text.tertiary,
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        fontWeight: 500
                      }}
                    >
                      ID: {finding.findingId || `Vuln_${String(finding.id?.slice(-6) || '000000').padStart(7, '0')}`}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {canManageFindings && (
                      <>
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(finding);
                          }}
                          sx={{ 
                            transition: 'all 0.2s ease',
                            '&:hover': { 
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              transform: 'scale(1.1)'
                            }
                          }}
                        >
                          <EditIcon fontSize="small" color="primary" />
                        </IconButton>
                        {finding.status === 'open' || finding.status === 'partial' ? (
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloseFinding(finding.id);
                            }} 
                            title="Close Finding"
                            sx={{ 
                              transition: 'all 0.2s ease',
                              '&:hover': { transform: 'scale(1.1)' }
                            }}
                          >
                            <CheckCircleIcon fontSize="small" color="success" />
                          </IconButton>
                        ) : (
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReopenFinding(finding.id || finding._id);
                            }}
                            title="Reopen Finding"
                            sx={{ 
                              transition: 'all 0.2s ease',
                              '&:hover': { transform: 'scale(1.1)' }
                            }}
                          >
                            <ReplayIcon fontSize="small" color="info" />
                          </IconButton>
                        )}
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(finding.id);
                          }}
                          sx={{ 
                            transition: 'all 0.2s ease',
                            '&:hover': { 
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              transform: 'scale(1.1)'
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                      </>
                    )}
                    {canRequestChanges && (
                      <>
                        {finding.status === 'open' || finding.status === 'partial' ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRequestClose(finding.id);
                            }}
                            sx={{
                              minWidth: 'auto',
                              px: 1.5,
                              py: 0.5,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textTransform: 'none',
                              borderColor: 'warning.main',
                              color: 'warning.main',
                              '&:hover': {
                                borderColor: 'warning.dark',
                                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                              }
                            }}
                          >
                            Request Close
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRequestReopen(finding.id);
                            }}
                            sx={{
                              minWidth: 'auto',
                              px: 1.5,
                              py: 0.5,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textTransform: 'none',
                              borderColor: 'info.main',
                              color: 'info.main',
                              '&:hover': {
                                borderColor: 'info.dark',
                                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                              }
                            }}
                          >
                            Request Reopen
                          </Button>
                        )}
                      </>
                    )}
                  </Box>
                </Box>
                                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip
                    label={finding.severity}
                    size="small"
                    sx={{ 
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      px: 1,
                      py: 0.5,
                      borderRadius: 2,
                      letterSpacing: '0.5px',
                      backgroundColor: getSeverityBgColor(finding.severity),
                      color: getSeverityColor(finding.severity),
                      border: `1px solid ${getSeverityColor(finding.severity)}40`,
                    }}
                  />
                  <Chip
                    label={finding.status.replace('_', ' ')}
                    size="small"
                    sx={{ 
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      px: 1,
                      py: 0.5,
                      borderRadius: 2,
                      backgroundColor: getStatusBgColor(finding.status),
                      color: getStatusColor(finding.status),
                      border: `1px solid ${getStatusColor(finding.status)}40`,
                    }}
                  />
                </Box>
                <Box 
                  sx={{ 
                    p: 2, 
                    backgroundColor: 'rgba(15, 23, 42, 0.5)',
                    borderRadius: 2,
                    border: '1px solid rgba(148, 163, 184, 0.2)'
                  }}
                >
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#94a3b8', 
                      fontWeight: 400,
                      lineHeight: 1.6,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {finding.description}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {!loading && filteredFindings.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <BugReportIcon sx={{ fontSize: 64, color: 'rgba(148, 163, 184, 0.3)', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#94a3b8', fontWeight: 600, mb: 1 }}>
            No Findings Found
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', maxWidth: 400, mx: 'auto' }}>
            {findings.length === 0
              ? 'No findings have been reported for this project yet. Click "Report Finding" to add the first one.'
              : 'No findings match your current filters. Try adjusting the filters above.'}
          </Typography>
        </Box>
      )}

      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="md" 
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
          {editingFinding ? 'Edit Finding' : 'New Finding'}
        </DialogTitle>
        <DialogContent sx={{ color: colors.text.secondary }}>
          <TextField
            autoFocus
            margin="dense"
            name="title"
            label="Finding Title"
            fullWidth
            variant="outlined"
            value={formData.title}
            onChange={handleChange}
            error={!!formErrors.title}
            helperText={formErrors.title}
            FormHelperTextProps={{ sx: { color: '#ef4444', ml: 0 } }}
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
          />
          <TextField
            margin="dense"
            name="description"
            label="Description"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={formData.description}
            onChange={handleChange}
            error={!!formErrors.description}
            helperText={formErrors.description}
            FormHelperTextProps={{ sx: { color: '#ef4444', ml: 0 } }}
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
            <InputLabel>Severity</InputLabel>
            <Select
              name="severity"
              value={formData.severity}
              label="Severity"
              onChange={handleChange}
              sx={{ color: '#f1f5f9' }}
            >
              <MenuItem value="critical" sx={{ color: colors.text.primary }}>Critical</MenuItem>
              <MenuItem value="high" sx={{ color: colors.text.primary }}>High</MenuItem>
              <MenuItem value="medium" sx={{ color: colors.text.primary }}>Medium</MenuItem>
              <MenuItem value="low" sx={{ color: colors.text.primary }}>Low</MenuItem>
              <MenuItem value="info" sx={{ color: colors.text.primary }}>Info</MenuItem>
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
              <MenuItem value="open" sx={{ color: colors.text.primary }}>Open</MenuItem>
              <MenuItem value="in_progress" sx={{ color: colors.text.primary }}>In Progress</MenuItem>
              <MenuItem value="resolved" sx={{ color: colors.text.primary }}>Resolved</MenuItem>
              <MenuItem value="verified" sx={{ color: colors.text.primary }}>Verified</MenuItem>
              <MenuItem value="closed" sx={{ color: colors.text.primary }}>Closed</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            name="cvssScore"
            label="CVSS Score (0.0 - 10.0)"
            type="number"
            fullWidth
            variant="outlined"
            value={formData.cvssScore}
            onChange={handleChange}
            inputProps={{ min: 0, max: 10, step: 0.1 }}
            placeholder="e.g., 7.5"
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
          />
          <FormControl 
            fullWidth
            sx={{
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
            <InputLabel>Category</InputLabel>
            <Select
              name="category"
              value={formData.category}
              label="Category"
              onChange={handleChange}
              sx={{ color: '#f1f5f9' }}
            >
              <MenuItem value="injection" sx={{ color: colors.text.primary }}>Injection</MenuItem>
              <MenuItem value="broken_auth" sx={{ color: colors.text.primary }}>Broken Authentication</MenuItem>
              <MenuItem value="sensitive_data" sx={{ color: colors.text.primary }}>Sensitive Data Exposure</MenuItem>
              <MenuItem value="xml_external" sx={{ color: colors.text.primary }}>XML External Entities</MenuItem>
              <MenuItem value="broken_access" sx={{ color: colors.text.primary }}>Broken Access Control</MenuItem>
              <MenuItem value="security_misconfig" sx={{ color: colors.text.primary }}>Security Misconfiguration</MenuItem>
              <MenuItem value="xss" sx={{ color: colors.text.primary }}>XSS</MenuItem>
              <MenuItem value="insecure_deserialization" sx={{ color: colors.text.primary }}>Insecure Deserialization</MenuItem>
              <MenuItem value="using_components" sx={{ color: colors.text.primary }}>Using Components with Known Vulnerabilities</MenuItem>
              <MenuItem value="logging" sx={{ color: colors.text.primary }}>Insufficient Logging</MenuItem>
              <MenuItem value="other" sx={{ color: colors.text.primary }}>Other</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            name="remediation"
            label="Remediation (optional)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={formData.remediation}
            onChange={handleChange}
            placeholder="Describe the remediation steps..."
            sx={{
              mt: 2,
              '& .MuiOutlinedInput-root': {
                color: '#f1f5f9',
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
              '&:hover': {
                background: colors.primary[500],
              }
            }}
          >
            {editingFinding ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Findings;
