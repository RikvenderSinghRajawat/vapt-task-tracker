import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { colors, typography, shadows, borderRadius, transitions } from '../../../theme/designSystem';

/**
 * SecurityStatCard - Individual statistic card component
 */
const SecurityStatCard = ({ 
  title, 
  value, 
  icon, 
  severity = 'info', 
  onClick, 
  index = 0,
  trend,
  trendValue
}) => {
  const severityColors = {
    critical: { 
      main: '#D73A49', 
      light: 'rgba(215, 58, 73, 0.15)', 
      gradient: 'linear-gradient(135deg, #D73A49 0%, #9B2226 100%)' 
    },
    high: { 
      main: '#F0883E', 
      light: 'rgba(240, 136, 62, 0.15)', 
      gradient: 'linear-gradient(135deg, #F0883E 0%, #C75B1A 100%)' 
    },
    medium: { 
      main: '#DBAB09', 
      light: 'rgba(219, 171, 9, 0.15)', 
      gradient: 'linear-gradient(135deg, #DBAB09 0%, #A17A04 100%)' 
    },
    low: { 
      main: '#3FB950', 
      light: 'rgba(63, 185, 80, 0.15)', 
      gradient: 'linear-gradient(135deg, #3FB950 0%, #238636 100%)' 
    },
    info: { 
      main: '#58A6FF', 
      light: 'rgba(88, 166, 255, 0.15)', 
      gradient: 'linear-gradient(135deg, #58A6FF 0%, #1F6FEB 100%)' 
    }
  };

  const severityColor = severityColors[severity] || severityColors.info;

  return (
    <Card
      onClick={onClick}
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: transitions.premium,
        background: colors.background.secondary,
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: severityColor.gradient
        },
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: shadows.lg,
          borderColor: severityColor.main
        } : {}
      }}
    >
      <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          justifyContent: 'space-between', 
          mb: 2 
        }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: borderRadius.lg,
              background: severityColor.light,
              color: severityColor.main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {icon}
          </Box>
          
          {trend && (
            <Box
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: borderRadius.md,
                background: trend === 'up' ? 'rgba(63, 185, 80, 0.15)' : 'rgba(215, 58, 73, 0.15)',
                color: trend === 'up' ? '#3FB950' : '#D73A49',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              {trend === 'up' ? '+' : '-'}{trendValue}%
            </Box>
          )}
        </Box>

        <Typography
          variant="h3"
          sx={{
            color: colors.text.primary,
            fontWeight: typography.weight.bold,
            fontSize: typography.size['3xl'],
            letterSpacing: typography.tracking.tight,
            mb: 0.5
          }}
        >
          {value}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: colors.text.secondary,
            fontWeight: typography.weight.medium,
            fontSize: typography.size.sm
          }}
        >
          {title}
        </Typography>
      </CardContent>
    </Card>
  );
};

export { SecurityStatCard };
export default SecurityStatCard;
