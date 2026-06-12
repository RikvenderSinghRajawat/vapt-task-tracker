import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Chip, Grid, Typography, Divider, List, ListItem, ListItemText, ListItemAvatar, Avatar, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Edit as EditIcon, Delete as DeleteIcon, CheckCircle as CheckIcon, AssignmentInd as ReassignIcon, Sync as ChangeStatusIcon, Comment as CommentIcon, Send as SendIcon, Replay as ReplayIcon, Close as CloseIcon } from '@mui/icons-material';
import { findingAPI, userAPI } from '../services/api';
import { MiniSkeleton } from '../components/SkeletonLoader';
import { colors, typography, borderRadius, shadows } from '../theme/designSystem';
import { glassStyles, gradients, premiumColors } from '../theme/premiumTheme';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const FindingDetails = () => {
  const { projectId, id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast, showConfirm } = useToast();
  const [finding, setFinding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', severity: '', status: '', category: '', cvssScore: '' });
  const [cvssPreviewSeverity, setCvssPreviewSeverity] = useState('');

  const getSeverityFromCvss = (score) => {
    const s = parseFloat(score);
    if (isNaN(s) || s < 0 || s > 10) return '';
    if (s === 0) return 'info';
    if (s <= 3.9) return 'low';
    if (s <= 6.9) return 'medium';
    if (s <= 8.9) return 'high';
    return 'critical';
  };

  const severityColors = {
    critical: { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.15)' },
    high: { color: '#ea580c', bg: 'rgba(234, 88, 12, 0.15)' },
    medium: { color: '#ca8a04', bg: 'rgba(202, 138, 4, 0.15)' },
    low: { color: '#16a34a', bg: 'rgba(22, 163, 74, 0.15)' },
    info: { color: '#0891b2', bg: 'rgba(8, 145, 178, 0.15)' },
  };

  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [reassignUserId, setReassignUserId] = useState('');

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  const [retestDialogOpen, setRetestDialogOpen] = useState(false);
  const [retestForm, setRetestForm] = useState({ status: '', notes: '' });

  const handleRetest = (status) => {
    setRetestForm({ status, notes: '' });
    setRetestDialogOpen(true);
  };

  const handleRetestSave = async () => {
    try {
      await findingAPI.updateFinding(projectId, id, {
        status: retestForm.status,
        retestNotes: retestForm.notes,
        retestedBy: user._id,
        retestedAt: new Date()
      });
      showToast(`Retest ${retestForm.status === 'retest_passed' ? 'passed' : 'failed'}`, 'success');
      setRetestDialogOpen(false);
      fetchFinding();
    } catch (error) {
      showToast('Failed to save retest results', 'error');
    }
  };

  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [expandedCommentIdx, setExpandedCommentIdx] = useState(null);

  useEffect(() => {
    fetchFinding();
    fetchUsers();
  }, [projectId, id]);

  const fetchFinding = async () => {
    try {
      if (!projectId) return;
      const f = await findingAPI.getFinding(projectId, id);
      setFinding(f);
    } catch (error) {
      console.error('Error fetching finding:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const allUsers = await userAPI.getUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleEdit = () => {
    if (!finding) return;
    setEditForm({
      title: finding.title || '',
      description: finding.description || '',
      severity: finding.severity || 'medium',
      status: finding.status || 'open',
      category: finding.category || 'other',
      cvssScore: finding.cvssScore?.toString() || ''
    });
    const sev = getSeverityFromCvss(finding.cvssScore);
    setCvssPreviewSeverity(sev || finding.severity);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    try {
      await findingAPI.updateFinding(projectId, id, editForm);
      showToast('Finding updated', 'success');
      setEditDialogOpen(false);
      fetchFinding();
    } catch (error) {
      showToast(error.message || 'Update failed', 'error');
    }
  };

  const handleDelete = async () => {
    const confirmed = await showConfirm({
      title: 'Delete Finding',
      message: `Are you sure you want to delete "${finding?.title}"?`,
      severity: 'warning',
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;
    try {
      await findingAPI.deleteFinding(projectId, id);
      showToast('Finding deleted', 'success');
      navigate(`/projects/${projectId}/findings`);
    } catch (error) {
      showToast(error.message || 'Delete failed', 'error');
    }
  };

  const handleReassign = () => {
    setReassignUserId(finding?.assignee?._id || finding?.assignee || '');
    setReassignDialogOpen(true);
  };

  const handleReassignSave = async () => {
    try {
      await findingAPI.updateFinding(projectId, id, { assignee: reassignUserId || undefined });
      showToast('Finding reassigned', 'success');
      setReassignDialogOpen(false);
      fetchFinding();
    } catch (error) {
      showToast(error.message || 'Reassign failed', 'error');
    }
  };

  const handleChangeStatus = () => {
    setNewStatus(finding?.status || 'open');
    setStatusDialogOpen(true);
  };

  const handleChangeStatusSave = async () => {
    try {
      await findingAPI.updateFinding(projectId, id, { status: newStatus });
      showToast('Status updated', 'success');
      setStatusDialogOpen(false);
      fetchFinding();
    } catch (error) {
      showToast(error.message || 'Status update failed', 'error');
    }
  };

  const handleMarkFixed = async () => {
    try {
      await findingAPI.updateFinding(projectId, id, { status: 'resolved' });
      showToast('Finding marked as fixed', 'success');
      fetchFinding();
    } catch (error) {
      showToast(error.message || 'Failed to mark as fixed', 'error');
    }
  };

  const handleReopen = async () => {
    try {
      await findingAPI.reopenFinding(projectId, id);
      showToast('Finding reopened successfully', 'success');
      fetchFinding();
    } catch (error) {
      showToast(error.message || 'Failed to reopen finding', 'error');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || addingComment) return;
    setAddingComment(true);
    try {
      await findingAPI.addComment(projectId, id, { text: commentText.trim() });
      setCommentText('');
      fetchFinding();
    } catch (error) {
      showToast(error.message || 'Failed to add comment', 'error');
    } finally {
      setAddingComment(false);
    }
  };

  if (loading) return <MiniSkeleton />;

  if (!finding) {
    return (
      <Box sx={{ minHeight: '100vh', background: colors.background.primary, p: 3 }}>
        <Typography sx={{ color: colors.text.secondary }}>Finding not found</Typography>
      </Box>
    );
  }

  const getSeverityColor = (severity) => {
    const c = { critical: 'error', high: 'warning', medium: 'info', low: 'default', info: 'default' };
    return c[severity] || 'default';
  };

  const canUseAdminActions = user?.role === 'admin' || user?.role === 'vapt_analyst';
  const canUseDeveloperActions = user?.role === 'developer';
  const isViewOnly = !canUseAdminActions && !canUseDeveloperActions;
  const assignableUsers = users.filter(u => u.isActive && u.role !== 'admin' && u.role !== 'super_admin');

  return (
    <Box sx={{ minHeight: '100vh', background: colors.background.primary, p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/projects/${projectId}/findings`)}
          sx={{ color: colors.text.secondary, textTransform: 'none', '&:hover': { color: colors.primary[400] } }}>
          Back to Findings
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card sx={{ background: colors.background.secondary, border: `1px solid ${colors.border.subtle}`, borderRadius: borderRadius.xl }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h4" sx={{ color: colors.text.primary, fontWeight: typography.weight.bold }}>
                  {finding.title}
                </Typography>
                <Chip label={finding.severity} size="small"
                  sx={{ background: finding.severity === 'critical' ? colors.severity.critical : finding.severity === 'high' ? colors.severity.high : finding.severity === 'medium' ? colors.severity.medium : colors.severity.low, color: '#fff', fontWeight: typography.weight.semibold, textTransform: 'uppercase' }} />
              </Box>
              <Typography variant="body1" gutterBottom sx={{ color: colors.text.secondary, fontFamily: 'monospace' }}>
                {finding.findingId}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Chip label={finding.status.replace('_', ' ')} size="small" sx={{ mr: 1, background: colors.primary[600], color: '#fff', fontWeight: typography.weight.medium }} />
                <Chip label={finding.category} size="small" sx={{ background: colors.info, color: '#fff', fontWeight: typography.weight.medium }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ background: colors.background.secondary, border: `1px solid ${colors.border.subtle}`, borderRadius: borderRadius.xl }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>Actions</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {canUseAdminActions && (
                  <>
                    <Button variant="contained" startIcon={<EditIcon />} onClick={handleEdit}
                      sx={{ background: colors.primary[600], color: '#fff', '&:hover': { background: colors.primary[500] } }}>Edit</Button>
                    <Button variant="contained" startIcon={<DeleteIcon />} onClick={handleDelete}
                      sx={{ background: colors.severity.critical, color: '#fff', '&:hover': { background: '#b91c1c' } }}>Delete</Button>
                    {finding.status === 'fixed' && (
                      <>
                        <Button variant="contained" startIcon={<CheckIcon />} onClick={() => handleRetest('retest_passed')}
                          sx={{ background: colors.severity.low, color: '#fff', '&:hover': { background: '#16a34a' } }}>Retest Passed</Button>
                        <Button variant="contained" startIcon={<CloseIcon />} onClick={() => handleRetest('retest_failed')}
                          sx={{ background: colors.severity.critical, color: '#fff', '&:hover': { background: '#dc2626' } }}>Retest Failed</Button>
                      </>
                    )}
                    <Button variant="contained" startIcon={<ReassignIcon />} onClick={handleReassign}
                      sx={{ background: colors.info, color: '#fff', '&:hover': { background: '#0891b2' } }}>Reassign</Button>
                    <Button variant="contained" startIcon={<ChangeStatusIcon />} onClick={handleChangeStatus}
                      sx={{ background: colors.severity.high, color: '#fff', '&:hover': { background: '#ea580c' } }}>Change Status</Button>
                    {['closed', 'resolved', 'verified', 'retest_passed'].includes(finding.status) && (
                      <Button variant="contained" startIcon={<ReplayIcon />} onClick={handleReopen}
                        sx={{ background: colors.severity.medium, color: '#fff', '&:hover': { background: '#ca8a04' } }}>Reopen</Button>
                    )}
                  </>
                )}
                {canUseDeveloperActions && (
                  <>
                    {['open', 'in_progress', 'retest_failed'].includes(finding.status) && (
                      <Button variant="contained" startIcon={<CheckIcon />} onClick={() => handleMarkFixed()}
                        sx={{ background: colors.severity.low, color: '#fff', '&:hover': { background: '#16a34a' } }}>Mark as Fixed</Button>
                    )}
                    <Button variant="contained" startIcon={<CommentIcon />} onClick={() => setCommentText('')}
                      sx={{ background: colors.primary[600], color: '#fff', '&:hover': { background: colors.primary[500] } }}>Add Comment</Button>
                  </>
                )}
                {isViewOnly && (
                  <Typography variant="body2" sx={{ color: colors.text.tertiary, fontStyle: 'italic' }}>
                    View-only access - No actions available
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ background: colors.background.secondary, border: `1px solid ${colors.border.subtle}`, borderRadius: borderRadius.xl, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>Description</Typography>
              <Typography variant="body1" sx={{ color: colors.text.secondary, lineHeight: 1.6 }}>
                {finding.description || 'No description provided'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ background: colors.background.secondary, border: `1px solid ${colors.border.subtle}`, borderRadius: borderRadius.xl, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>Details</Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ color: colors.text.tertiary }}>Project</Typography>
                <Typography variant="body1" gutterBottom sx={{ color: colors.primary[500], fontWeight: 600 }}>{finding.project?.name || 'N/A'} ({finding.project?.code || ''})</Typography>
                <Typography variant="body2" sx={{ color: colors.text.tertiary }}>Severity Score</Typography>
                <Typography variant="body1" gutterBottom sx={{ color: colors.text.secondary }}>{finding.severityScore || 'N/A'}</Typography>
                <Typography variant="body2" sx={{ color: colors.text.tertiary }}>Likelihood</Typography>
                <Typography variant="body1" gutterBottom sx={{ color: colors.text.secondary }}>{finding.likelihood || 'N/A'}</Typography>
                <Typography variant="body2" sx={{ color: colors.text.tertiary }}>Risk Level</Typography>
                <Typography variant="body1" gutterBottom sx={{ color: colors.text.secondary }}>{finding.risk || 'N/A'}</Typography>
                <Typography variant="body2" sx={{ color: colors.text.tertiary }}>Due Date</Typography>
                <Typography variant="body1" sx={{ color: colors.text.secondary }}>{finding.dueDate ? new Date(finding.dueDate).toLocaleDateString() : 'Not set'}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ background: colors.background.secondary, border: `1px solid ${colors.border.subtle}`, borderRadius: borderRadius.xl }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>Remediation</Typography>
              <Typography variant="body1" sx={{ color: colors.text.secondary, lineHeight: 1.6 }}>
                {finding.remediation || 'No remediation provided'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ background: colors.background.secondary, border: `1px solid ${colors.border.subtle}`, borderRadius: borderRadius.xl }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>
                Comments ({finding.comments?.length || 0})
              </Typography>
              <Divider sx={{ borderColor: colors.border.subtle, my: 2 }} />
              <Box sx={{ maxHeight: 220, overflowY: 'auto' }}>
                {finding.comments?.length > 0 ? (
                  <List sx={{ pt: 0 }}>
                    {[...finding.comments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((comment, index) => {
                      const isLong = comment.text?.length > 150;
                      const showFull = expandedCommentIdx === index;
                      return (
                        <React.Fragment key={index}>
                          <ListItem sx={{ px: 0, alignItems: 'flex-start' }}>
                            <ListItemAvatar sx={{ mt: 0.5 }}>
                              <Avatar src={comment.user?.avatar} sx={{ width: 32, height: 32, fontSize: '0.75rem', backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', fontWeight: 600 }}>
                                {comment.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" sx={{ color: colors.text.primary, fontWeight: typography.weight.medium }}>
                                      {comment.user?.name || 'Unknown'}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: colors.text.tertiary }}>
                                      {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}
                                    </Typography>
                                  </Box>
                                  {comment.user?.role && (
                                    <Chip label={comment.user.role.replace('_', ' ')} size="small"
                                      sx={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', fontWeight: 500, fontSize: '0.65rem', height: 20, '& .MuiChip-label': { px: 0.75 } }} />
                                  )}
                                </Box>
                              }
                              secondary={
                                <>
                                  <Typography component="span" variant="body2" sx={{ color: colors.text.secondary, mt: 0.25, wordBreak: 'break-word' }}>
                                    {isLong && !showFull ? comment.text.slice(0, 150) + '...' : comment.text}
                                  </Typography>
                                  {isLong && (
                                    <Typography component="span" variant="caption" onClick={() => setExpandedCommentIdx(showFull ? null : index)}
                                      sx={{ color: '#06b6d4', cursor: 'pointer', display: 'block', mt: 0.5, '&:hover': { textDecoration: 'underline' } }}>
                                      {showFull ? 'Show less' : 'Show more'}
                                    </Typography>
                                  )}
                                </>
                              }
                              secondaryTypographyProps={{ component: 'div' }} />
                          </ListItem>
                          {index < finding.comments.length - 1 && <Divider sx={{ borderColor: colors.border.subtle }} />}
                        </React.Fragment>
                      );
                    })}
                  </List>
                ) : (
                  <Typography variant="body2" sx={{ color: colors.text.tertiary, py: 2, textAlign: 'center' }}>No comments yet</Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: borderRadius.lg,
                      background: 'rgba(15, 23, 42, 0.6)',
                      color: colors.text.primary,
                      '& fieldset': { borderColor: colors.border.subtle },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                      '&.Mui-focused fieldset': { borderColor: 'rgba(6, 182, 212, 0.5)' },
                    },
                    '& .MuiInputBase-input::placeholder': { color: colors.text.tertiary },
                  }}
                />
                <IconButton
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || addingComment}
                  sx={{
                    background: commentText.trim() ? gradients.primary : 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    borderRadius: borderRadius.lg,
                    width: 40,
                    height: 40,
                    '&:hover': { boxShadow: shadows.glow.lg, transform: 'translateY(-1px)' },
                    '&.Mui-disabled': { background: 'rgba(255,255,255,0.05)', color: colors.text.tertiary },
                  }}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ background: colors.background.secondary, border: `1px solid ${colors.border.subtle}`, borderRadius: borderRadius.xl }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>History</Typography>
              {finding.history?.length > 0 ? (
                <List>
                  {[...finding.history].sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt)).map((entry, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemText primary={entry.action} secondary={`${new Date(entry.performedAt).toLocaleString()} by ${entry.performedBy}`}
                          primaryTypographyProps={{ sx: { color: colors.text.primary } }}
                          secondaryTypographyProps={{ sx: { color: colors.text.tertiary } }} />
                      </ListItem>
                      {index < finding.history.length - 1 && <Divider sx={{ borderColor: colors.border.subtle }} />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" sx={{ color: colors.text.tertiary }}>No history available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { background: colors.background.secondary, border: `1px solid ${colors.border.subtle}` } }}>
        <DialogTitle sx={{ color: colors.text.primary }}>Edit Finding</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Title" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} fullWidth size="small"
              sx={{ '& input': { color: colors.text.primary }, '& label': { color: colors.text.tertiary } }} />
            <TextField label="Description" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} multiline rows={3} fullWidth size="small"
              sx={{ '& textarea': { color: colors.text.primary }, '& label': { color: colors.text.tertiary } }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField label="CVSS Score (0-10)" type="number" value={editForm.cvssScore}
                onChange={e => {
                  const val = e.target.value;
                  setEditForm({ ...editForm, cvssScore: val });
                  const sev = getSeverityFromCvss(val);
                  if (sev) {
                    setCvssPreviewSeverity(sev);
                    setEditForm(prev => ({ ...prev, severity: sev }));
                  }
                }}
                inputProps={{ min: 0, max: 10, step: 0.1 }}
                fullWidth size="small"
                sx={{ '& input': { color: colors.text.primary }, '& label': { color: colors.text.tertiary } }} />
              {editForm.cvssScore && getSeverityFromCvss(editForm.cvssScore) && (
                <Chip
                  label={`Auto: ${getSeverityFromCvss(editForm.cvssScore)}`}
                  size="small"
                  sx={{
                    mt: 1,
                    fontWeight: 600,
                    backgroundColor: severityColors[getSeverityFromCvss(editForm.cvssScore)]?.bg || 'rgba(100, 116, 139, 0.15)',
                    color: severityColors[getSeverityFromCvss(editForm.cvssScore)]?.color || '#64748b',
                  }}
                />
              )}
            </Box>
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ color: colors.text.tertiary }}>Severity (Auto from CVSS)</InputLabel>
              <Select value={editForm.severity} onChange={e => setEditForm({ ...editForm, severity: e.target.value })} label="Severity"
                sx={{ color: colors.text.primary, '& .MuiSvgIcon-root': { color: colors.text.tertiary } }}>
                {['critical', 'high', 'medium', 'low', 'info'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ color: colors.text.tertiary }}>Status</InputLabel>
              <Select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} label="Status"
                sx={{ color: colors.text.primary, '& .MuiSvgIcon-root': { color: colors.text.tertiary } }}>
                {['open', 'in_progress', 'under_review', 'resolved', 'closed', 'reopened', 'duplicate', 'accepted_risk'].map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} sx={{ color: colors.text.secondary }}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained" sx={{ background: colors.primary[600], color: '#fff' }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={reassignDialogOpen} onClose={() => setReassignDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { background: colors.background.secondary, border: `1px solid ${colors.border.subtle}` } }}>
        <DialogTitle sx={{ color: colors.text.primary }}>Reassign Finding</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel sx={{ color: colors.text.tertiary }}>Assign To</InputLabel>
            <Select value={reassignUserId} onChange={e => setReassignUserId(e.target.value)} label="Assign To"
              sx={{ color: colors.text.primary, '& .MuiSvgIcon-root': { color: colors.text.tertiary } }}>
              <MenuItem value="">Unassign</MenuItem>
              {assignableUsers.map(u => <MenuItem key={u._id} value={u._id}>{u.name} ({u.role.replace('_', ' ')})</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReassignDialogOpen(false)} sx={{ color: colors.text.secondary }}>Cancel</Button>
          <Button onClick={handleReassignSave} variant="contained" sx={{ background: colors.info, color: '#fff' }}>Reassign</Button>
        </DialogActions>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { background: colors.background.secondary, border: `1px solid ${colors.border.subtle}` } }}>
        <DialogTitle sx={{ color: colors.text.primary }}>Change Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel sx={{ color: colors.text.tertiary }}>Status</InputLabel>
            <Select value={newStatus} onChange={e => setNewStatus(e.target.value)} label="Status"
              sx={{ color: colors.text.primary, '& .MuiSvgIcon-root': { color: colors.text.tertiary } }}>
              {['open', 'in_progress', 'under_review', 'resolved', 'closed', 'reopened', 'duplicate', 'accepted_risk', 'rejected', 'deferred'].map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)} sx={{ color: colors.text.secondary }}>Cancel</Button>
          <Button onClick={handleChangeStatusSave} variant="contained" sx={{ background: colors.severity.high, color: '#fff' }}>Update</Button>
        </DialogActions>
      </Dialog>

      {/* Retest Dialog */}
      <Dialog open={retestDialogOpen} onClose={() => setRetestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: colors.text.primary, fontWeight: 700 }}>
          {retestForm.status === 'retest_passed' ? 'Retest Passed' : 'Retest Failed'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ mb: 2, color: colors.text.secondary }}>
              Add notes about the retest results and any evidence found.
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Retest Notes"
              value={retestForm.notes}
              onChange={(e) => setRetestForm({ ...retestForm, notes: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: borderRadius.md } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setRetestDialogOpen(false)} sx={{ color: colors.text.secondary }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleRetestSave}
            sx={{ 
              background: retestForm.status === 'retest_passed' ? colors.severity.low : colors.severity.critical, 
              color: '#fff',
              fontWeight: 700,
              px: 3
            }}
          >
            Confirm {retestForm.status === 'retest_passed' ? 'Pass' : 'Fail'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FindingDetails;
