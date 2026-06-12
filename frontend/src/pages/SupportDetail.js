import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Chip, Paper, Avatar, IconButton,
  CircularProgress, Divider, Tooltip, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import {
  ArrowBack, Send, AttachFile, Download, History, Close as CloseIcon,
  BugReport, Feedback, Lightbulb, ReportProblem, AccountCircle, HelpOutline
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { supportAPI } from '../services/supportService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { colors, typography, shadows, borderRadius, componentStyles } from '../theme/designSystem';

const CATEGORIES = [
  { value: 'bug_report', label: 'Bug Report', icon: <BugReport fontSize="small" />, color: '#ef4444' },
  { value: 'complaint', label: 'Complaint', icon: <ReportProblem fontSize="small" />, color: '#f59e0b' },
  { value: 'suggestion', label: 'Suggestion', icon: <Lightbulb fontSize="small" />, color: '#8b5cf6' },
  { value: 'feature_request', label: 'Feature Request', icon: <Feedback fontSize="small" />, color: '#3b82f6' },
  { value: 'account_issue', label: 'Account Issue', icon: <AccountCircle fontSize="small" />, color: '#06b6d4' },
  { value: 'other', label: 'Other', icon: <HelpOutline fontSize="small" />, color: '#6b7280' }
];

const STATUS_COLORS = {
  open: { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', label: 'Open' },
  in_progress: { bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', label: 'In Progress' },
  resolved: { bg: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', label: 'Resolved' },
  closed: { bg: 'rgba(107, 114, 128, 0.12)', color: '#6b7280', label: 'Closed' },
  reopened: { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', label: 'Reopened' }
};

const isAdmin = (user) => ['admin', 'super_admin', 'vapt_analyst', 'vapt_tl'].includes(user?.role);

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0][0].toUpperCase();
};

const SupportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequest = async () => {
    setLoading(true);
    try {
      const data = await supportAPI.getRequest(id);
      setRequest(data);
    } catch (err) {
      showToast(err.message, 'error');
      navigate('/support');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequest(); }, [id]);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const data = await supportAPI.addComment(id, commentText.trim());
      setRequest(data);
      setCommentText('');
      showToast('Comment added', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: colors.primary[500] }} />
      </Box>
    );
  }

  if (!request) return null;

  const catMeta = CATEGORIES.find(c => c.value === request.category) || CATEGORIES[5];
  const st = STATUS_COLORS[request.status] || STATUS_COLORS.open;
  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/support')}
        sx={{ color: colors.text.secondary, mb: 2, '&:hover': { color: colors.text.primary } }}>
        Back to Support
      </Button>

      <Paper sx={{ p: 3, mb: 3, background: colors.background.secondary, border: `1px solid ${colors.border.default}`, borderRadius: borderRadius.xl }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Chip label={request.requestId} sx={{ background: 'rgba(6,182,212,0.1)', color: colors.primary[400], fontWeight: typography.weight.bold }} />
              <Chip label={st.label} size="small" sx={{ background: st.bg, color: st.color, fontWeight: typography.weight.semibold }} />
            </Box>
            <Typography variant="h5" sx={{ color: colors.text.primary, fontWeight: typography.weight.bold }}>
              {request.title}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {catMeta.icon}
            <Typography sx={{ color: colors.text.secondary, fontWeight: typography.weight.medium }}>{catMeta.label}</Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: colors.border.subtle, my: 2 }} />

        <Typography sx={{ color: colors.text.secondary, lineHeight: 1.7, whiteSpace: 'pre-wrap', mb: 2 }}>
          {request.description}
        </Typography>

        {request.attachments?.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {request.attachments.map((att, i) => (
              <Chip key={i} icon={<AttachFile />} label={att.originalname}
                onDelete={() => {}}
                deleteIcon={<Download fontSize="small" />}
                onClick={() => window.open(att.url, '_blank')}
                sx={{ background: colors.background.tertiary, color: colors.text.secondary }} />
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ color: colors.text.tertiary, fontSize: typography.size.xs }}>Submitted by</Typography>
            <Typography sx={{ color: colors.text.primary, fontSize: typography.size.sm, fontWeight: typography.weight.medium }}>
              {request.createdBy?.name || request.createdBy?.email || 'Unknown'}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ color: colors.text.tertiary, fontSize: typography.size.xs }}>Date</Typography>
            <Typography sx={{ color: colors.text.primary, fontSize: typography.size.sm }}>
              {new Date(request.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
          </Box>
          {request.assignedTo && (
            <Box>
              <Typography sx={{ color: colors.text.tertiary, fontSize: typography.size.xs }}>Assigned to</Typography>
              <Typography sx={{ color: colors.text.primary, fontSize: typography.size.sm, fontWeight: typography.weight.medium }}>
                {request.assignedTo.name || request.assignedTo.email}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Timeline */}
      {request.timeline?.length > 0 && (
        <Paper sx={{ p: 3, mb: 3, background: colors.background.secondary, border: `1px solid ${colors.border.default}`, borderRadius: borderRadius.xl }}>
          <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <History sx={{ fontSize: 20 }} /> Activity Timeline
          </Typography>
          <Box sx={{ position: 'relative', pl: 3, '&::before': { content: '""', position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: colors.border.subtle } }}>
            {request.timeline.map((entry, i) => (
              <Box key={i} sx={{ position: 'relative', pb: 2.5, '&::before': { content: '""', position: 'absolute', left: -19, top: 6, width: 10, height: 10, borderRadius: '50%', background: colors.primary[500], border: `2px solid ${colors.background.secondary}` } }}>
                <Typography sx={{ color: colors.text.tertiary, fontSize: typography.size.xs }}>
                  {new Date(entry.timestamp).toLocaleString()}
                </Typography>
                <Typography sx={{ color: colors.text.primary, fontSize: typography.size.sm }}>
                  <strong>{entry.user?.name || entry.user?.email || 'System'}</strong>
                  {' '}
                  {entry.action === 'created' && 'created this request'}
                  {entry.action === 'comment' && 'added a comment'}
                  {entry.action === 'status_change' && `changed status from ${entry.details?.from} to ${entry.details?.to}`}
                  {entry.action === 'assigned' && `assigned from ${entry.details?.from} to ${entry.details?.to}`}
                  {entry.action === 'attachment' && `uploaded ${entry.details?.filename}`}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Comments */}
      <Paper sx={{ p: 3, mb: 3, background: colors.background.secondary, border: `1px solid ${colors.border.default}`, borderRadius: borderRadius.xl }}>
        <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold, mb: 3 }}>
          Comments ({request.comments?.length || 0})
        </Typography>

        {request.comments?.length > 0 ? (
          <Box sx={{ mb: 3 }}>
            {request.comments.map((c, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 2, mb: 2, p: 2, background: colors.background.tertiary, borderRadius: borderRadius.lg }}>
                <Avatar sx={{ width: 32, height: 32, background: `linear-gradient(135deg, ${colors.primary[600]}, ${colors.secondary[600]})`, fontSize: typography.size.xs, fontWeight: typography.weight.bold }}>
                  {getInitials(c.user?.name || c.user?.email)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold, fontSize: typography.size.sm }}>
                      {c.user?.name || c.user?.email || 'Unknown'}
                    </Typography>
                    {c.isInternal && (
                      <Chip label="Internal" size="small" sx={{ height: 20, fontSize: '10px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }} />
                    )}
                    <Typography sx={{ color: colors.text.tertiary, fontSize: typography.size.xs, ml: 'auto' }}>
                      {new Date(c.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography sx={{ color: colors.text.secondary, fontSize: typography.size.sm, whiteSpace: 'pre-wrap' }}>
                    {c.text}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography sx={{ color: colors.text.tertiary, textAlign: 'center', py: 3 }}>
            No comments yet. Be the first to respond.
          </Typography>
        )}

        {request.status !== 'closed' && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField fullWidth multiline rows={2} placeholder="Write a comment..."
              value={commentText} onChange={(e) => setCommentText(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: borderRadius.lg, background: colors.background.tertiary } }} />
            <Button variant="contained" onClick={handleAddComment} disabled={submitting || !commentText.trim()}
              sx={{ ...componentStyles.button.primary, alignSelf: 'flex-end', minWidth: 100 }}>
              {submitting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <><Send sx={{ fontSize: 18, mr: 0.5 }} /> Send</>}
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default SupportDetail;
