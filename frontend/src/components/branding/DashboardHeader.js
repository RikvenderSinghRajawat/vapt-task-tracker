import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { motion } from 'framer-motion';
import { colors, typography, borderRadius, transitions } from '../../theme/designSystem';

const ArrowLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);

const DashboardHeader = ({ title, subtitle, badge, actions, onBack, gradient = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Box sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' },
        mb: 3, gap: 2, flexDirection: { xs: 'column', sm: 'row' },
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          {onBack && (
            <IconButton
              onClick={onBack}
              sx={{ color: colors.text.secondary, borderRadius: borderRadius.lg, p: 0.75, flexShrink: 0,
                transition: transitions.premium,
                '&:hover': { background: colors.background.tertiary, color: colors.text.primary },
              }}
            >
              <ArrowLeft />
            </IconButton>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  color: colors.text.primary,
                  fontSize: { xs: '1.25rem', sm: '1.4rem', md: '1.6rem' },
                  letterSpacing: typography.tracking.tight,
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  ...(gradient ? {
                    background: `linear-gradient(135deg, ${colors.text.primary}, ${colors.primary[400]})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  } : {}),
                }}
              >
                {title}
              </Typography>
              {badge && (
                <Box sx={{
                  px: 1.5, py: 0.35, borderRadius: 20,
                  background: `${badge.color || colors.severity.high}15`,
                  border: `1px solid ${(badge.color || colors.severity.high)}30`,
                  fontSize: '0.65rem', fontWeight: 600,
                  color: badge.color || colors.severity.high,
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                  textTransform: 'uppercase',
                }}>
                  {badge.label}
                </Box>
              )}
            </Box>
            {subtitle && (
              <Typography
                variant="body2"
                sx={{
                  color: colors.text.tertiary,
                  fontSize: { xs: '0.8rem', sm: '0.85rem' },
                  mt: 0.5,
                  lineHeight: 1.4,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        {actions && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, flexWrap: 'wrap' }}>
            {actions}
          </Box>
        )}
      </Box>
    </motion.div>
  );
};

export default DashboardHeader;
