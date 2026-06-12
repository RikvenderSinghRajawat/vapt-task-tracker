import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { colors, typography, borderRadius, shadows } from '../../theme/designSystem';

const severityAccents = {
  critical: { border: `1px solid ${colors.severity.critical}40`, glow: `0 0 12px ${colors.severity.critical}20` },
  high: { border: `1px solid ${colors.severity.high}40`, glow: `0 0 12px ${colors.severity.high}20` },
  medium: { border: `1px solid ${colors.severity.medium}40`, glow: `0 0 12px ${colors.severity.medium}20` },
  low: { border: `1px solid ${colors.severity.low}40`, glow: `0 0 12px ${colors.severity.low}20` },
  info: { border: `1px solid ${colors.severity.info}40`, glow: `0 0 12px ${colors.severity.info}20` },
  default: { border: `1px solid ${colors.border.subtle}`, glow: 'none' },
};

const ChartCard = ({ title, icon, children, severity, action, delay = 0, minHeight = 420 }) => {
  const accent = severityAccents[severity] || severityAccents.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ height: '100%' }}
    >
      <Card
        sx={{
          background: `linear-gradient(145deg, ${colors.background.secondary} 0%, ${colors.background.tertiary} 100%)`,
          border: accent.border,
          borderRadius: borderRadius.xl,
          height: '100%',
          minHeight,
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          '&:hover': {
            borderColor: accent === severityAccents.default ? colors.border.default : accent.border.replace('40', '80'),
            boxShadow: accent.glow,
            transform: 'translateY(-2px)',
          },
        }}
        elevation={0}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 }, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {(title || icon) && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, minHeight: 36 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {icon && (
                  <Box
                    sx={{
                      p: 0.75,
                      borderRadius: borderRadius.lg,
                      background: `linear-gradient(135deg, ${colors.primary[500]}20, ${colors.secondary[500]}10)`,
                      color: colors.primary[400],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '& svg': { fontSize: 20 },
                    }}
                  >
                    {icon}
                  </Box>
                )}
                <Typography
                  variant="h6"
                  sx={{
                    color: colors.text.primary,
                    fontWeight: typography.weight.semibold,
                    fontSize: typography.size.base,
                    letterSpacing: typography.tracking.tight,
                  }}
                >
                  {title}
                </Typography>
              </Box>
              {action && <Box>{action}</Box>}
            </Box>
          )}
          <Box sx={{ flex: 1, minHeight: 0, width: '100%' }}>
            {children}
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ChartCard;
