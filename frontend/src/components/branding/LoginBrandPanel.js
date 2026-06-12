import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import EKavachLogo from '../EKavachLogo';
import { colors, typography } from '../../theme/designSystem';

const LoginBrandPanel = () => {

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      {/* Animated logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <Box
          sx={{
            position: 'relative',
            mb: 0.5,
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: -8,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${colors.primary[500]}20, transparent 70%)`,
              animation: 'pulseRing 2s ease-in-out infinite',
            },
          }}
        >
          <Box
            sx={{
              filter: `drop-shadow(0 0 12px ${colors.primary[500]}40)`,
              display: 'flex',
              transition: 'filter 0.3s ease',
              '&:hover': { filter: `drop-shadow(0 0 20px ${colors.primary[500]}60)` },
            }}
          >
            <EKavachLogo size="md" variant="icon" />
          </Box>
        </Box>
      </motion.div>

      {/* Gradient brand text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 900,
            fontSize: { xs: '1.6rem', sm: '1.9rem' },
            letterSpacing: '0.03em',
            fontStyle: 'italic',
            background: `linear-gradient(135deg, ${colors.primary[200]} 0%, ${colors.severity.info} 35%, ${colors.secondary[300]} 65%, ${colors.primary[300]} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textAlign: 'center',
            lineHeight: 1.15,
            filter: 'drop-shadow(0 0 30px rgba(0, 180, 255, 0.2)) drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}
        >
          eKavach
        </Typography>
      </motion.div>

      <style>{`
        @keyframes pulseRing {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
      `}</style>
    </Box>
  );
};

export default LoginBrandPanel;
