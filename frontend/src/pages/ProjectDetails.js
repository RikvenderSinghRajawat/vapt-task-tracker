import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Alert,
  Divider,
  IconButton,
  TextField
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Person as PersonIcon, Block as BlockIcon, Send as SendIcon } from '@mui/icons-material';
import { projectAPI } from '../services/api';
import { ProjectListSkeleton } from '../components/SkeletonLoader';
import { useAuth } from '../context/AuthContext';
import { colors, typography, shadows, borderRadius } from '../theme/designSystem';
import { glassStyles, gradients, premiumColors } from '../theme/premiumTheme';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, canAccessProject, hasFullAccess } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [expandedCommentIdx, setExpandedCommentIdx] = useState(null);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const project = await projectAPI.getProject(id);

      if (!hasFullAccess() && !canAccessProject(id)) {
        setAccessDenied(true);
        return;
      }

      setProject(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      setAccessDenied(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || addingComment) return;
    setAddingComment(true);
    try {
      const res = await projectAPI.addComment(id, { text: commentText.trim() });
      const data = res.data || res;
      if (data.comments) {
        setProject(prev => ({ ...prev, comments: data.comments }));
      }
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setAddingComment(false);
    }
  };

  if (loading) {
    return <ProjectListSkeleton />;
  }

  if (accessDenied || !project) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          icon={<BlockIcon />}
          sx={{ mb: 2 }}
        >
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
            Access Denied
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            You don't have permission to access this project.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.role === 'developer' && 'Developers can only view projects they are assigned to.'}
            {user?.role === 'project_manager' && 'Project Managers can only view projects they are allocated to.'}
            {!user && 'Please log in to access projects.'}
          </Typography>
        </Alert>
        <Button 
          variant="contained" 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/projects')}
          sx={{ mt: 2 }}
        >
          Back to Projects
        </Button>
      </Box>
    );
  }

  const getStatusColor = (status) => {
    const map = {
      planning: '#64748b',
      received: '#0891b2',
      in_progress: colors.primary[500],
      remediation: '#ca8a04',
      retest: '#8b5cf6',
      paused: '#64748b',
      completed: '#16a34a',
      closed: '#475569'
    };
    return map[status] || '#64748b';
  };

  const getStatusBgColor = (status) => {
    const map = {
      planning: 'rgba(100, 116, 139, 0.15)',
      received: 'rgba(8, 145, 178, 0.15)',
      in_progress: 'rgba(0, 255, 136, 0.15)',
      remediation: 'rgba(202, 138, 4, 0.15)',
      retest: 'rgba(139, 92, 246, 0.15)',
      paused: 'rgba(100, 116, 139, 0.15)',
      completed: 'rgba(22, 163, 74, 0.15)',
      closed: 'rgba(71, 85, 105, 0.15)'
    };
    return map[status] || 'rgba(100, 116, 139, 0.15)';
  };

  const getPriorityColor = (priority) => {
    const map = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#ca8a04',
      low: '#16a34a'
    };
    return map[priority] || '#64748b';
  };

  const getPriorityBgColor = (priority) => {
    const map = {
      critical: 'rgba(220, 38, 38, 0.15)',
      high: 'rgba(234, 88, 12, 0.15)',
      medium: 'rgba(202, 138, 4, 0.15)',
      low: 'rgba(22, 163, 74, 0.15)'
    };
    return map[priority] || 'rgba(100, 116, 139, 0.15)';
  };

  const sortedComments = project.comments
    ? [...project.comments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : [];

  return (
    <Box sx={{ minHeight: '100vh', background: colors.background.primary, p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/projects')}
          sx={{ 
            color: colors.text.secondary,
            '&:hover': { color: colors.primary[400] }
          }}
        >
          Back to Projects
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card sx={{ 
            background: colors.background.secondary,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: borderRadius.xl,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: getStatusColor(project.status)
            }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h4" gutterBottom sx={{ color: colors.text.primary, fontWeight: 700 }}>
                    {project.name}
                  </Typography>
                  <Typography variant="body1" sx={{ color: colors.text.secondary, mb: 2 }}>
                    {project.code} • {project.organization}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={project.status.replace('_', ' ')}
                      size="small"
                      sx={{ 
                        backgroundColor: getStatusBgColor(project.status),
                        color: getStatusColor(project.status),
                        border: `1px solid ${getStatusColor(project.status)}40`,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    />
                    <Chip
                      label={project.assessmentType}
                      size="small"
                      sx={{ 
                        backgroundColor: 'rgba(8, 145, 178, 0.15)',
                        color: '#0891b2',
                        border: '1px solid rgba(8, 145, 178, 0.3)',
                        fontWeight: 600
                      }}
                    />
                    <Chip
                      label={project.priority}
                      size="small"
                      sx={{
                        backgroundColor: getPriorityBgColor(project.priority),
                        color: getPriorityColor(project.priority),
                        border: `1px solid ${getPriorityColor(project.priority)}40`,
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}
                    />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0, alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    onClick={() => navigate(`/projects/${id}/findings`)}
                    sx={{
                      background: gradients.primary,
                      color: '#fff',
                      fontWeight: 600,
                      borderRadius: borderRadius.lg,
                      px: 2.5,
                      py: 1,
                      minWidth: 130,
                      boxShadow: shadows.glow,
                      '&:hover': {
                        boxShadow: shadows.glowStrong,
                        transform: 'translateY(-1px)',
                      }
                    }}
                  >
                    View Findings
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate(`/projects/${id}/reports`)}
                    sx={{
                      ...glassStyles.button,
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: colors.text.secondary,
                      fontWeight: 600,
                      borderRadius: borderRadius.lg,
                      px: 2.5,
                      py: 1,
                      minWidth: 130,
                      '&:hover': {
                        borderColor: premiumColors.accent.primary,
                        color: premiumColors.accent.primary,
                        boxShadow: `0 0 15px ${premiumColors.severity.info.glow}`,
                        transform: 'translateY(-1px)',
                      }
                    }}
                  >
                    View Reports
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate(`/projects/${id}/milestones`)}
                    sx={{
                      ...glassStyles.button,
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: colors.text.secondary,
                      fontWeight: 600,
                      borderRadius: borderRadius.lg,
                      px: 2.5,
                      py: 1,
                      minWidth: 130,
                      '&:hover': {
                        borderColor: premiumColors.accent.primary,
                        color: premiumColors.accent.primary,
                        boxShadow: `0 0 15px ${premiumColors.severity.info.glow}`,
                        transform: 'translateY(-1px)',
                      }
                    }}
                  >
                    View Milestones
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ 
            background: colors.background.secondary,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: borderRadius.xl,
            height: '100%'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: colors.text.primary, fontWeight: 600 }}>
                Project Information
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ color: colors.text.tertiary, mb: 0.5 }}>
                  Assessment Type
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ color: colors.text.secondary }}>
                  {project.assessmentType}
                </Typography>
                <Typography variant="body2" sx={{ color: colors.text.tertiary, mb: 0.5, mt: 1.5 }}>
                  Status
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ color: colors.text.secondary }}>
                  {project.status.replace('_', ' ')}
                </Typography>
                <Typography variant="body2" sx={{ color: colors.text.tertiary, mb: 0.5, mt: 1.5 }}>
                  Start Date
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ color: colors.text.secondary }}>
                  {new Date(project.startDate).toLocaleDateString()}
                </Typography>
                <Typography variant="body2" sx={{ color: colors.text.tertiary, mb: 0.5, mt: 1.5 }}>
                  Progress
                </Typography>
                <Typography variant="body1" sx={{ color: colors.status.success, fontWeight: 600 }}>
                  {project.progress}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ 
            background: colors.background.secondary,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: borderRadius.xl,
            height: '100%'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: colors.text.primary, fontWeight: 600 }}>
                Findings Progress
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ color: colors.text.tertiary }}>
                  Total Findings
                </Typography>
                <Typography variant="h4" gutterBottom sx={{ color: colors.text.primary, fontWeight: 700 }}>
                  {project.statistics?.totalFindings || 0}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                  <Chip 
                    label={`${(project.statistics?.totalFindings || 0) - (project.statistics?.closedFindings || 0)} Open`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(220, 38, 38, 0.15)',
                      color: '#dc2626',
                      border: '1px solid rgba(220, 38, 38, 0.3)',
                      fontWeight: 600
                    }}
                  />
                  <Chip 
                    label={`${project.statistics?.closedFindings || 0} Closed`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(22, 163, 74, 0.15)',
                      color: '#16a34a',
                      border: '1px solid rgba(22, 163, 74, 0.3)',
                      fontWeight: 600
                    }}
                  />
                </Box>
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" sx={{ color: colors.text.tertiary, mb: 1 }}>
                    Severity Breakdown
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      label={`Critical: ${project.statistics?.criticalFindings || 0}`} 
                      size="small" 
                      sx={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', border: '1px solid rgba(220, 38, 38, 0.2)' }}
                    />
                    <Chip 
                      label={`High: ${project.statistics?.highFindings || 0}`} 
                      size="small" 
                      sx={{ backgroundColor: 'rgba(234, 88, 12, 0.1)', color: '#ea580c', border: '1px solid rgba(234, 88, 12, 0.2)' }}
                    />
                    <Chip 
                      label={`Medium: ${project.statistics?.mediumFindings || 0}`} 
                      size="small" 
                      sx={{ backgroundColor: 'rgba(202, 138, 4, 0.1)', color: '#ca8a04', border: '1px solid rgba(202, 138, 4, 0.2)' }}
                    />
                    <Chip 
                      label={`Low: ${project.statistics?.lowFindings || 0}`} 
                      size="small" 
                      sx={{ backgroundColor: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', border: '1px solid rgba(22, 163, 74, 0.2)' }}
                    />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ 
            background: colors.background.secondary,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: borderRadius.xl,
            height: '100%'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: colors.text.primary, fontWeight: 600 }}>
                Description
              </Typography>
              <Typography variant="body1" sx={{ color: colors.text.secondary, lineHeight: 1.6 }}>
                {project.description || 'No description provided'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ 
            background: colors.background.secondary,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: borderRadius.xl,
            height: '100%'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: colors.text.primary, fontWeight: 600 }}>
                Team Members
              </Typography>
              <List sx={{ pt: 0 }}>
                {project.teamMembers?.map((member) => {
                  const userName = member.user?.name || member.user?.email || member.user || 'Unknown';
                  const userAvatar = member.user?.avatar;
                  return (
                    <ListItem key={member.user?._id || member.user} sx={{ px: 0, py: 1 }}>
                      <ListItemAvatar>
                        <Avatar src={userAvatar} sx={{ backgroundColor: 'rgba(88, 166, 255, 0.1)', color: colors.info }}>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={userName}
                        secondary={member.role}
                        primaryTypographyProps={{ sx: { color: colors.text.primary } }}
                        secondaryTypographyProps={{ sx: { color: colors.text.tertiary } }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{
            background: colors.background.secondary,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: borderRadius.xl,
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: 600 }}>
                Comments ({sortedComments.length})
              </Typography>
              <Divider sx={{ borderColor: colors.border.subtle, my: 2 }} />
              <Box sx={{ maxHeight: 220, overflowY: 'auto' }}>
                {sortedComments.length > 0 ? (
                  <List sx={{ pt: 0 }}>
                    {sortedComments.map((comment, index) => {
                      const isLong = comment.text?.length > 150;
                      const showFull = expandedCommentIdx === index;
                      return (
                        <React.Fragment key={index}>
                          <ListItem sx={{ px: 0, py: 1.5, alignItems: 'flex-start' }}>
                            <ListItemAvatar sx={{ mt: 0.5 }}>
                              <Avatar src={comment.user?.avatar} sx={{ width: 36, height: 36, fontSize: '0.875rem', backgroundColor: 'rgba(6, 182, 212, 0.15)', color: premiumColors.accent.primary, fontWeight: 600 }}>
                                {comment.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" sx={{ color: colors.text.primary, fontWeight: 600 }}>
                                      {comment.user?.name || comment.user?.email || 'Unknown'}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: colors.text.tertiary }}>
                                      {new Date(comment.createdAt).toLocaleString()}
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
                                  <Typography component="span" variant="body2" sx={{ color: colors.text.secondary, wordBreak: 'break-word' }}>
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
                          {index < sortedComments.length - 1 && <Divider sx={{ borderColor: colors.border.subtle }} />}
                        </React.Fragment>
                      );
                    })}
                  </List>
                ) : (
                  <Typography variant="body2" sx={{ color: colors.text.tertiary, mb: 2, py: 2, textAlign: 'center' }}>
                    No comments yet. Start a conversation.
                  </Typography>
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
      </Grid>
    </Box>
  );
};

export default ProjectDetails;
