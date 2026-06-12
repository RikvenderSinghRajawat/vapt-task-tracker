import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { colors, typography, borderRadius } from '../../theme/designSystem';
import AnimatedCounter from './AnimatedCounter';

const gradients = {
  projects: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
  findings: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
  critical: 'linear-gradient(135deg, #D73A49 0%, #B31D28 100%)',
  sla: 'linear-gradient(135deg, #F0883E 0%, #D06A1F 100%)',
  rate: 'linear-gradient(135deg, #3FB950 0%, #2EA043 100%)',
  time: 'linear-gradient(135deg, #58A6FF 0%, #1F6FEB 100%)',
};

const icons = {
  projects: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  ),
  findings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  critical: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  sla: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  rate: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  time: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

const cardData = [
  { key: 'projects', label: 'Total Projects', gradient: gradients.projects, icon: icons.projects },
  { key: 'findings', label: 'Open Findings', gradient: gradients.findings, icon: icons.findings },
  { key: 'critical', label: 'Critical Findings', gradient: gradients.critical, icon: icons.critical },
  { key: 'sla', label: 'SLA Breaches', gradient: gradients.sla, icon: icons.sla },
  { key: 'rate', label: 'Resolution Rate', gradient: gradients.rate, icon: icons.rate },
  { key: 'time', label: 'Avg Resolution', gradient: gradients.time, icon: icons.time },
];

const trendIcons = {
  up: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={colors.severity.low} stroke="none">
      <polygon points="12 5 19 19 5 19" />
    </svg>
  ),
  down: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={colors.severity.critical} stroke="none">
      <polygon points="12 19 5 5 19 5" />
    </svg>
  ),
  stable: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={colors.text.tertiary} stroke="none">
      <rect x="5" y="10" width="14" height="4" rx="2" />
    </svg>
  ),
};

const getTrend = (value) => {
  if (value == null) return trendIcons.stable;
  return value > 0 ? trendIcons.up : value < 0 ? trendIcons.down : trendIcons.stable;
};
const getTrendColor = (value) => {
  if (value == null) return colors.text.disabled;
  return value > 0 ? colors.severity.low : value < 0 ? colors.severity.critical : colors.text.tertiary;
};

const SummaryCards = ({ data, loading }) => {
  const isEmpty = !data || cardData.every(c => data[c.key] === undefined);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
        gap: { xs: 1.5, sm: 2 },
        mb: 3,
      }}
    >
      {cardData.map((card, idx) => {
        const value = data?.[card.key];
        const trend = data?.[card.key + '_trend'];
        const isPercent = card.key === 'rate';

        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card
              elevation={0}
              sx={{
                background: colors.background.secondary,
                border: `1px solid ${colors.border.subtle}`,
                borderRadius: borderRadius.xl,
                position: 'relative',
                overflow: 'visible',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: 'default',
                '&:hover': {
                  borderColor: colors.border.default,
                  transform: 'translateY(-3px)',
                  boxShadow: `0 12px 24px rgba(0,0,0,0.3), 0 0 0 1px ${colors.primary[500]}20`,
                  '& .card-accent': { opacity: 1 },
                  '& .card-value': { color: colors.text.primary },
                },
              }}
            >
              <Box
                className="card-accent"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: card.gradient,
                  borderRadius: `${borderRadius.xl} ${borderRadius.xl} 0 0`,
                  opacity: 0.7,
                  transition: 'opacity 0.25s ease',
                }}
              />

              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, position: 'relative' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography
                    sx={{
                      color: colors.text.tertiary,
                      fontSize: typography.size.xs,
                      fontWeight: typography.weight.medium,
                      textTransform: 'uppercase',
                      letterSpacing: typography.tracking.wide,
                    }}
                  >
                    {card.label}
                  </Typography>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: borderRadius.lg,
                      background: `${card.gradient}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: card.gradient.includes('D73A49') ? colors.severity.critical
                        : card.gradient.includes('F0883E') ? colors.severity.high
                        : card.gradient.includes('3FB950') ? colors.severity.low
                        : card.gradient.includes('58A6FF') ? colors.severity.info
                        : colors.primary[400],
                      flexShrink: 0,
                    }}
                  >
                    {card.icon}
                  </Box>
                </Box>

                <Typography
                  className="card-value"
                  variant="h4"
                  sx={{
                    color: loading ? colors.text.disabled : colors.text.primary,
                    fontWeight: typography.weight.bold,
                    fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                    lineHeight: 1.1,
                    mb: 0.5,
                    fontFamily: typography.fontFamily.mono,
                    transition: 'color 0.2s ease',
                  }}
                >
                  {loading ? (
                    <Box sx={{ height: 28, width: 60, borderRadius: 1, background: colors.background.tertiary, animation: 'pulse 1.5s infinite' }} />
                  ) : (
                    <>
                      {isEmpty ? (
                        <span style={{ color: colors.text.disabled }}>—</span>
                      ) : isPercent ? (
                        <AnimatedCounter value={value} decimals={1} suffix="%" />
                      ) : card.key === 'time' ? (
                        <AnimatedCounter value={value} decimals={0} suffix="h" />
                      ) : (
                        <AnimatedCounter value={value} />
                      )}
                    </>
                  )}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  {!loading && trend !== undefined && (
                    <>
                      {getTrend(trend)}
                      <Typography
                        sx={{
                          color: getTrendColor(trend),
                          fontSize: typography.size.xs,
                          fontWeight: typography.weight.medium,
                        }}
                      >
                        {trend > 0 ? '+' : ''}{trend}%
                      </Typography>
                    </>
                  )}
                  {!loading && trend === undefined && value !== undefined && (
                    <Typography
                      sx={{
                        color: colors.text.disabled,
                        fontSize: typography.size.xs,
                        fontStyle: 'italic',
                      }}
                    >
                      vs last period
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }`}</style>
    </Box>
  );
};

export default SummaryCards;
