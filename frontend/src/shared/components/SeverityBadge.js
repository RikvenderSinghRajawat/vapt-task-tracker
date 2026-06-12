import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { getSeverityConfig } from '../constants/severity';

/**
 * SeverityBadge - Unified severity display component
 * 
 * @param {string} severity - Severity level (critical, high, medium, low, info)
 * @param {string} size - Badge size ('small' | 'medium')
 * @param {boolean} showIcon - Whether to show severity icon
 * @param {boolean} showTooltip - Whether to show tooltip with description
 * @param {object} sx - Additional MUI sx styles
 */
const SeverityBadge = ({ 
  severity, 
  size = 'small',
  showIcon = false,
  showTooltip = true,
  sx = {} 
}) => {
  const config = getSeverityConfig(severity);
  
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
 * SeverityBadge with CVSS score
 */
export const SeverityBadgeWithCvss = ({ 
  severity, 
  cvssScore,
  size = 'small',
  sx = {} 
}) => {
  const config = getSeverityConfig(severity);
  
  return (
    <Tooltip 
      title={`CVSS: ${cvssScore || 'N/A'} - ${config.description}`}
      arrow
      placement="top"
    >
      <Chip
        size={size}
        label={`${config.label} ${cvssScore ? `(${cvssScore})` : ''}`}
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
    </Tooltip>
  );
};

/**
 * Compact severity indicator (dot only)
 */
export const SeverityDot = ({ severity, size = 8, sx = {} }) => {
  const config = getSeverityConfig(severity);
  
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
          ...sx
        }}
      />
    </Tooltip>
  );
};

/**
 * Severity bar for visual comparison
 */
export const SeverityBar = ({ 
  severities = [],
  height = 8,
  showLabels = true,
  sx = {}
}) => {
  const total = severities.reduce((sum, s) => sum + (s.count || 0), 0);
  
  if (total === 0) {
    return (
      <div style={{ height, backgroundColor: 'rgba(110, 118, 129, 0.2)', borderRadius: height / 2, ...sx }} />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...sx }}>
      <div style={{ display: 'flex', height, borderRadius: height / 2, overflow: 'hidden' }}>
        {severities.map((item, index) => {
          const config = getSeverityConfig(item.severity);
          const percentage = total > 0 ? (item.count / total) * 100 : 0;
          
          return percentage > 0 ? (
            <Tooltip 
              key={index}
              title={`${config.label}: ${item.count} (${percentage.toFixed(1)}%)`}
            >
              <div
                style={{
                  width: `${percentage}%`,
                  backgroundColor: config.color,
                  transition: 'width 0.3s ease'
                }}
              />
            </Tooltip>
          ) : null;
        })}
      </div>
      
      {showLabels && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {severities.filter(s => s.count > 0).map((item, index) => {
            const config = getSeverityConfig(item.severity);
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <SeverityDot severity={item.severity} size={6} />
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                  {config.label}: {item.count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SeverityBadge;
