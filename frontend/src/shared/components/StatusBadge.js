import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { getStatusConfig } from '../constants/status';

/**
 * StatusBadge - Unified status display component
 * 
 * @param {string} status - Status level
 * @param {string} size - Badge size ('small' | 'medium')
 * @param {boolean} showIcon - Whether to show status icon
 * @param {boolean} showTooltip - Whether to show tooltip with description
 * @param {object} sx - Additional MUI sx styles
 */
const StatusBadge = ({ 
  status, 
  size = 'small',
  showIcon = false,
  showTooltip = true,
  sx = {} 
}) => {
  const config = getStatusConfig(status);
  
  const badge = (
    <Chip
      size={size}
      label={config.label}
      icon={showIcon ? <span style={{ fontSize: '0.875rem' }}>{config.icon}</span> : undefined}
      sx={{
        backgroundColor: config.bgColor,
        color: config.color,
        border: `1px solid ${config.borderColor}`,
        fontWeight: 600,
        fontSize: size === 'small' ? '0.75rem' : '0.875rem',
        letterSpacing: '0.025em',
        height: size === 'small' ? '24px' : '28px',
        ...sx
      }}
    />
  );

  if (showTooltip) {
    return (
      <Tooltip 
        title={config.description}
        arrow
        placement="top"
      >
        {badge}
      </Tooltip>
    );
  }

  return badge;
};

/**
 * Status dot indicator
 */
export const StatusDot = ({ status, size = 8, pulsate = false, sx = {} }) => {
  const config = getStatusConfig(status);
  
  return (
    <Tooltip title={config.label} arrow>
      <span
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: config.color,
          boxShadow: `0 0 4px ${config.color}40`,
          animation: pulsate ? 'pulse 2s infinite' : undefined,
          ...sx
        }}
      />
    </Tooltip>
  );
};

/**
 * Status with progress indicator
 */
export const StatusWithProgress = ({ 
  status,
  progress = 0,
  size = 'small',
  sx = {} 
}) => {
  const config = getStatusConfig(status);
  
  return (
    <Tooltip title={`${config.label} - ${progress}% complete`} arrow>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...sx }}>
        <StatusDot status={status} />
        <Chip
          size={size}
          label={`${config.label} (${progress}%)`}
          sx={{
            backgroundColor: config.bgColor,
            color: config.color,
            border: `1px solid ${config.borderColor}`,
            fontWeight: 600,
            fontSize: size === 'small' ? '0.75rem' : '0.875rem'
          }}
        />
      </div>
    </Tooltip>
  );
};

/**
 * Status filter chips for filtering UI
 */
export const StatusFilterChips = ({ 
  selected = [],
  onChange,
  multiple = true,
  size = 'small'
}) => {
  const statuses = ['open', 'in_progress', 'fixed', 'closed', 'reopened'];
  
  const handleClick = (status) => {
    if (multiple) {
      const newSelected = selected.includes(status)
        ? selected.filter(s => s !== status)
        : [...selected, status];
      onChange?.(newSelected);
    } else {
      onChange?.(selected.includes(status) ? [] : [status]);
    }
  };
  
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {statuses.map(status => {
        const config = getStatusConfig(status);
        const isSelected = selected.includes(status);
        
        return (
          <Chip
            key={status}
            size={size}
            label={config.label}
            onClick={() => handleClick(status)}
            sx={{
              cursor: 'pointer',
              backgroundColor: isSelected ? config.bgColor : 'transparent',
              color: isSelected ? config.color : '#9CA3AF',
              border: `1px solid ${isSelected ? config.borderColor : 'rgba(110, 118, 129, 0.3)'}`,
              fontWeight: isSelected ? 600 : 400,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: config.bgColor,
                borderColor: config.borderColor
              }
            }}
          />
        );
      })}
    </div>
  );
};

export default StatusBadge;
