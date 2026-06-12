import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { colors, typography } from '../../theme/designSystem';

const BrandHeader = ({ size = 'sm', showSubtitle = false }) => {
  const fontSize = size === 'sm' ? '0.95rem' : size === 'md' ? '1.1rem' : '1.35rem';

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        userSelect: 'none',
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <Typography
          variant="body1"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1rem', sm: '1.2rem' },
              fontStyle: 'italic',
              letterSpacing: '-0.3px',
              background: `linear-gradient(135deg, ${colors.primary[300]} 0%, ${colors.severity.info} 60%, ${colors.primary[400]} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.2,
            }}
        >
          eKavach
        </Typography>
        {/* Subtle underline glow */}
        <Box
          sx={{
            mt: 0.25,
            height: '2px',
            width: '60%',
            borderRadius: 2,
            background: `linear-gradient(90deg, ${colors.primary[500]}60, transparent)`,
          }}
        />
      </Box>
      {showSubtitle && (
        <Typography
          variant="caption"
          sx={{
            color: colors.text.tertiary,
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 500,
            borderLeft: `1px solid ${colors.border.subtle}`,
            pl: 1.5,
            ml: 0.5,
            pb: 0.15,
          }}
        >
          Vulnerability Tracker
        </Typography>
      )}
    </Box>
  );
};

export default BrandHeader;
