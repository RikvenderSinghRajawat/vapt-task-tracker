import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import EKavachLogo from '../EKavachLogo';
import { colors, typography, borderRadius } from '../../theme/designSystem';

const glowKeyframes = {
  '@keyframes pulseGlow': {
    '0%, 100%': { opacity: 0.4 },
    '50%': { opacity: 0.8 },
  },
  '@keyframes scanLine': {
    '0%': { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(200%)' },
  },
};

const SidebarBrand = ({ open, collapsed }) => {
  const isExpanded = open && !collapsed;

  return (
    <Box sx={{ ...glowKeyframes }}>
      <Box
        sx={{
          px: isExpanded ? 2.5 : 1.5,
          py: isExpanded ? 2.5 : 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isExpanded ? 'flex-start' : 'center',
          gap: 2,
          borderBottom: `1px solid ${colors.border.subtle}`,
          minHeight: 64,
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Scanning line effect */}
        <Box
          as={motion.div}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: 1 }}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '60%',
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${colors.primary[400]}60, transparent)`,
            pointerEvents: 'none',
          }}
        />

        {/* Logo icon with glow */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              filter: `drop-shadow(0 0 8px ${colors.primary[500]}30)`,
              display: 'flex',
              transition: 'filter 0.3s ease',
              '&:hover': {
                filter: `drop-shadow(0 0 14px ${colors.primary[500]}50)`,
              },
            }}
          >
            <EKavachLogo size={isExpanded ? 'md' : 'md'} variant="icon" />
          </Box>
        </motion.div>

        {/* Brand text */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: '1.1rem',
                fontStyle: 'italic',
                lineHeight: 1.2,
                background: `linear-gradient(135deg, ${colors.primary[300]} 0%, ${colors.severity.info} 50%, ${colors.primary[400]} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.3px',
              }}
            >
              eKavach
            </Typography>
          </motion.div>
        )}
      </Box>
    </Box>
  );
};

export default SidebarBrand;
