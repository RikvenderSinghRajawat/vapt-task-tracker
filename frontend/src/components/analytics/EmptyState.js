import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { motion } from 'framer-motion';
import { colors, typography, borderRadius } from '../../theme/designSystem';

const EmptyState = ({ title, message, icon, action }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          p: 4,
          height: '100%',
          minHeight: 280,
        }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: borderRadius['2xl'],
              background: `linear-gradient(135deg, ${colors.background.elevated}, ${colors.background.tertiary})`,
              border: `1px solid ${colors.border.subtle}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2.5,
              color: colors.text.tertiary,
              '& svg': { fontSize: 36 },
            }}
          >
            {icon || (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            )}
          </Box>
        </motion.div>

        <Typography
          variant="h6"
          sx={{
            color: colors.text.secondary,
            fontWeight: typography.weight.semibold,
            fontSize: typography.size.lg,
            mb: 0.75,
          }}
        >
          {title || 'No Data Available'}
        </Typography>

        <Typography
          sx={{
            color: colors.text.tertiary,
            fontSize: typography.size.sm,
            maxWidth: 280,
            lineHeight: typography.leading.relaxed,
            mb: action ? 2.5 : 0,
          }}
        >
          {message || 'Start by creating projects and findings to see analytics here.'}
        </Typography>

        {action && (
          <Button
            variant="outlined"
            size="small"
            onClick={action.onClick}
            sx={{
              color: colors.primary[400],
              borderColor: colors.primary[800],
              borderRadius: borderRadius.lg,
              textTransform: 'none',
              fontWeight: typography.weight.medium,
              fontSize: typography.size.sm,
              '&:hover': {
                borderColor: colors.primary[600],
                background: `${colors.primary[500]}10`,
              },
            }}
          >
            {action.label || 'Get Started'}
          </Button>
        )}
      </Box>
    </motion.div>
  );
};

export default EmptyState;
