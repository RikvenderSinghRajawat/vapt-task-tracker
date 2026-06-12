import React from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Comment as CommentIcon,
  AssignmentInd as AssignIcon,
  Update as UpdateIcon,
  AttachFile as AttachIcon,
  MergeType as MergeIcon,
  ContentCopy as CopyIcon,
  Block as BlockIcon
} from '@mui/icons-material';
import { colors, typography, borderRadius } from '../../../theme/designSystem';
import { formatDate, formatRelativeTime } from '../../utils/formatters';
import { getStatusConfig, getSeverityConfig } from '../../constants';

/**
 * History event types and their configurations
 */
const EVENT_TYPES = {
  CREATED: {
    icon: AddIcon,
    color: colors.severity.low,
    label: 'Created'
  },
  UPDATED: {
    icon: EditIcon,
    color: colors.primary[500],
    label: 'Updated'
  },
  DELETED: {
    icon: DeleteIcon,
    color: colors.severity.critical,
    label: 'Deleted'
  },
  STATUS_CHANGED: {
    icon: UpdateIcon,
    color: colors.primary[500],
    label: 'Status Changed'
  },
  SEVERITY_CHANGED: {
    icon: ErrorIcon,
    color: colors.severity.critical,
    label: 'Severity Changed'
  },
  ASSIGNED: {
    icon: AssignIcon,
    color: colors.primary[500],
    label: 'Assigned'
  },
  COMMENT_ADDED: {
    icon: CommentIcon,
    color: colors.primary[500],
    label: 'Comment Added'
  },
  EVIDENCE_ADDED: {
    icon: AttachIcon,
    color: colors.severity.medium,
    label: 'Evidence Added'
  },
  EVIDENCE_REMOVED: {
    icon: DeleteIcon,
    color: colors.severity.medium,
    label: 'Evidence Removed'
  },
  MERGED: {
    icon: MergeIcon,
    color: colors.primary[500],
    label: 'Merged'
  },
  DUPLICATED: {
    icon: CopyIcon,
    color: colors.primary[500],
    label: 'Duplicated'
  },
  MARKED_FALSE_POSITIVE: {
    icon: BlockIcon,
    color: colors.text.tertiary,
    label: 'False Positive'
  },
  CLOSED: {
    icon: CheckIcon,
    color: colors.severity.low,
    label: 'Closed'
  },
  REOPENED: {
    icon: UpdateIcon,
    color: colors.severity.high,
    label: 'Reopened'
  }
};

/**
 * TimelineEvent - Individual timeline event
 */
const TimelineEvent = ({ event, isLast = false }) => {
  const config = EVENT_TYPES[event.type] || EVENT_TYPES.UPDATED;
  const Icon = config.icon;

  const renderChangeDetails = () => {
    if (!event.changes) return null;

    return (
      <Box sx={{ mt: 1.5, ml: 4 }}>
        {Object.entries(event.changes).map(([field, change]) => (
          <Box
            key={field}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 0.5,
              fontSize: typography.size.xs
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: colors.text.tertiary,
                textTransform: 'capitalize',
                minWidth: 80
              }}
            >
              {field.replace(/([A-Z])/g, ' $1').trim()}:
            </Typography>
            
            {change.oldValue !== undefined && (
              <Chip
                size="small"
                label={change.oldValue}
                sx={{
                  height: 20,
                  fontSize: '0.625rem',
                  backgroundColor: colors.background.tertiary,
                  color: colors.text.tertiary,
                  textDecoration: 'line-through'
                }}
              />
            )}
            
            <Typography variant="caption" sx={{ color: colors.text.tertiary }}>
              →
            </Typography>
            
            <Chip
              size="small"
              label={change.newValue}
              sx={{
                height: 20,
                fontSize: '0.625rem',
                backgroundColor: `${config.color}20`,
                color: config.color,
                fontWeight: typography.weight.medium
              }}
            />
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', position: 'relative' }}>
      {/* Timeline Line */}
      {!isLast && (
        <Box
          sx={{
            position: 'absolute',
            left: 16,
            top: 40,
            bottom: -20,
            width: 2,
            backgroundColor: colors.border.subtle
          }}
        />
      )}

      {/* Icon */}
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: `${config.color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `2px solid ${config.color}30`,
          flexShrink: 0,
          zIndex: 1
        }}
      >
        <Icon sx={{ fontSize: 16, color: config.color }} />
      </Box>

      {/* Content */}
      <Box sx={{ ml: 2, flex: 1, pb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: typography.weight.semibold,
              color: colors.text.primary
            }}
          >
            {config.label}
          </Typography>
          
          {event.userName && (
            <Typography
              variant="body2"
              sx={{ color: colors.text.secondary }}
            >
              by {event.userName}
            </Typography>
          )}
        </Box>

        {event.description && (
          <Typography
            variant="body2"
            sx={{
              color: colors.text.secondary,
              mt: 0.5,
              fontSize: typography.size.sm,
              lineHeight: 1.5
            }}
          >
            {event.description}
          </Typography>
        )}

        {renderChangeDetails()}

        <Tooltip title={formatDate(event.timestamp, { format: 'long', includeTime: true })}>
          <Typography
            variant="caption"
            sx={{
              color: colors.text.tertiary,
              fontSize: typography.size.xs,
              mt: 0.5,
              display: 'inline-block',
              cursor: 'help'
            }}
          >
            {formatRelativeTime(event.timestamp)}
          </Typography>
        </Tooltip>
      </Box>
    </Box>
  );
};

/**
 * HistoryTimeline - Complete timeline component
 */
const HistoryTimeline = ({ 
  events = [],
  emptyMessage = "No history available",
  maxEvents = null,
  onLoadMore,
  hasMore = false,
  loading = false
}) => {
  const displayEvents = maxEvents ? events.slice(0, maxEvents) : events;
  const sortedEvents = [...displayEvents].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  if (events.length === 0) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 4,
          color: colors.text.tertiary
        }}
      >
        <UpdateIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
        <Typography variant="body2">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 2 }}>
      {sortedEvents.map((event, index) => (
        <TimelineEvent
          key={event.id || index}
          event={event}
          isLast={index === sortedEvents.length - 1}
        />
      ))}

      {hasMore && onLoadMore && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography
            variant="body2"
            onClick={onLoadMore}
            sx={{
              color: colors.primary[400],
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            {loading ? 'Loading...' : 'Load more history'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

/**
 * Create history event helper
 */
export const createHistoryEvent = (type, user, description = null, changes = null) => {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    userId: user?.uid,
    userName: user?.name || user?.displayName || user?.email,
    userAvatar: user?.photoURL,
    description,
    changes,
    timestamp: new Date().toISOString()
  };
};

/**
 * Create change object helper
 */
export const createChange = (oldValue, newValue) => ({
  oldValue: oldValue || null,
  newValue: newValue || null
});

export default HistoryTimeline;
