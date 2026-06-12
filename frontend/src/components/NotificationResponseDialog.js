import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Avatar,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Paper,
  Stack,
  Fade
} from '@mui/material';
import {
  Send as SendIcon,
  Close as CloseIcon,
  Reply as ReplyIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { colors, typography, spacing, shadows, borderRadius, transitions } from '../theme/designSystem';

// Fallback values in case design system doesn't load properly
const fallbackColors = {
  primary: { 500: '#06B6D4', 600: '#0891B2', 700: '#0E7490' },
  secondary: { 500: '#8B5CF6', 600: '#7C3AED', 700: '#6D28D9' },
  background: { primary: '#0D1117', secondary: '#161B22', tertiary: '#1C2128', elevated: '#21262D' },
  text: { primary: '#E6EDF3', secondary: '#9CA3AF', tertiary: '#6E7681' },
  border: { subtle: '#30363D', default: '#484F58' },
  severity: { critical: '#D73A49', high: '#F0883E', medium: '#DBAB09', low: '#3FB950' },
  status: { success: '#3FB950', error: '#D73A49', warning: '#DBAB09', info: '#58A6FF' },
  gray: { 50: '#FAFAFA' },
  // Add separate color properties for icon usage
  warning: { main: '#DBAB09' },
  success: { main: '#3FB950' },
  error: { main: '#D73A49' },
  info: { main: '#58A6FF' }
};

const safeColors = {
  ...fallbackColors,
  ...(colors || {}),
  warning: colors?.warning || fallbackColors.warning,
  success: colors?.success || fallbackColors.success,
  error: colors?.error || fallbackColors.error,
  info: colors?.info || fallbackColors.info
};

const NotificationResponseDialog = ({ 
  open, 
  notification, 
  onClose, 
  onResponseSubmit,
  user 
}) => {
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!response.trim()) return;
    
    setSubmitting(true);
    try {
      await onResponseSubmit({
        notificationId: notification.id,
        message: response.trim(),
        respondedBy: user.name || user.email,
        respondedById: user.id
      });
      setResponse('');
      onClose();
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'request_approval':
        return <ScheduleIcon sx={{ color: safeColors.warning.main }} />;
      case 'request_approved':
        return <CheckCircleIcon sx={{ color: safeColors.success.main }} />;
      case 'request_rejected':
        return <ErrorIcon sx={{ color: safeColors.error.main }} />;
      default:
        return <InfoIcon sx={{ color: safeColors.info.main }} />;
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      TransitionComponent={Fade}
      PaperProps={{
        sx: {
          backgroundColor: safeColors.background.secondary,
          border: `1px solid ${safeColors.border.subtle}`,
          borderRadius: borderRadius.xl,
          boxShadow: shadows.xl,
        }
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ 
        p: 3, 
        borderBottom: `1px solid ${safeColors.border.subtle}`,
        backgroundColor: safeColors.background.elevated
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flex: 1 }}>
            <Box sx={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mt: 0.5
            }}>
              {getNotificationIcon(notification?.type)}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" sx={{ 
                color: safeColors.text.primary,
                fontWeight: typography.weight.semibold,
                fontSize: typography.size.lg,
                mb: 0.5
              }}>
                {notification?.title}
              </Typography>
              <Typography variant="body2" sx={{ 
                color: safeColors.text.secondary,
                fontSize: typography.size.sm
              }}>
                {notification?.message}
              </Typography>
              <Typography variant="caption" sx={{ 
                color: safeColors.text.tertiary,
                fontSize: typography.size.xs,
                display: 'block',
                mt: 0.5
              }}>
                {notification?.createdAt && formatTimestamp(notification.createdAt)}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} sx={{ color: safeColors.text.secondary }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Existing Responses */}
        {notification?.responses && notification.responses.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ 
              color: safeColors.text.primary,
              fontWeight: typography.weight.semibold,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <ReplyIcon sx={{ fontSize: 20 }} />
              Previous Responses
            </Typography>
            
            <Stack spacing={2}>
              {notification.responses.map((resp, index) => (
                <Paper
                  key={index}
                  sx={{
                    p: 2,
                    backgroundColor: safeColors.background.tertiary,
                    border: `1px solid ${safeColors.border.subtle}`,
                    borderRadius: borderRadius.lg,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
                      {resp.respondedBy?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ 
                          color: safeColors.text.primary,
                          fontWeight: typography.weight.semibold,
                          fontSize: typography.size.sm
                        }}>
                          {resp.respondedBy}
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          color: safeColors.text.tertiary,
                          fontSize: typography.size.xs
                        }}>
                          {formatTimestamp(resp.timestamp)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ 
                        color: safeColors.text.secondary,
                        fontSize: typography.size.sm,
                        lineHeight: 1.5
                      }}>
                        {resp.message}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Stack>
            
            <Divider sx={{ my: 2 }} />
          </Box>
        )}

        {/* Response Form */}
        <Box>
          <Typography variant="subtitle2" sx={{ 
            color: safeColors.text.primary,
            fontWeight: typography.weight.semibold,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <ReplyIcon sx={{ fontSize: 20 }} />
            Add Your Response
          </Typography>
          
          <TextField
            multiline
            rows={4}
            fullWidth
            placeholder="Type your response here..."
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: safeColors.background.tertiary,
                borderRadius: borderRadius.lg,
                '& fieldset': {
                  borderColor: safeColors.border.subtle,
                },
                '&:hover fieldset': {
                  borderColor: safeColors.border.default,
                },
                '&.Mui-focused fieldset': {
                  borderColor: safeColors.primary[500],
                },
              },
              '& .MuiInputBase-input': {
                color: safeColors.text.primary,
                fontSize: typography.size.sm,
              },
              '& .MuiInputBase-input::placeholder': {
                color: safeColors.text.tertiary,
              },
            }}
          />
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mt: 2 
          }}>
            <Typography variant="caption" sx={{ 
              color: safeColors.text.tertiary,
              fontSize: typography.size.xs
            }}>
              Your response will be visible to all users who can see this notification
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                onClick={onClose}
                sx={{
                  color: safeColors.text.secondary,
                  borderColor: safeColors.border.subtle,
                  borderRadius: borderRadius.lg,
                  textTransform: 'none',
                  fontWeight: typography.weight.medium,
                  fontSize: typography.size.sm,
                  px: 3,
                  py: 1,
                  '&:hover': {
                    backgroundColor: safeColors.background.tertiary,
                    borderColor: safeColors.border.default,
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={handleSubmit}
                disabled={!response.trim() || submitting}
                sx={{
                  background: `linear-gradient(135deg, ${safeColors.primary[600]} 0%, ${safeColors.primary[700]} 100%)`,
                  color: safeColors.gray[50],
                  borderRadius: borderRadius.lg,
                  textTransform: 'none',
                  fontWeight: typography.weight.semibold,
                  fontSize: typography.size.sm,
                  px: 3,
                  py: 1,
                  boxShadow: `0 4px 12px rgba(6, 182, 212, 0.3)`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${safeColors.primary[500]} 0%, ${safeColors.primary[600]} 100%)`,
                  },
                  '&:disabled': {
                    background: safeColors.background.tertiary,
                    color: safeColors.text.tertiary,
                    boxShadow: 'none',
                  }
                }}
              >
                {submitting ? 'Sending...' : 'Send Response'}
              </Button>
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationResponseDialog;
