import React, { useMemo } from 'react';
import { Grid, Grow } from '@mui/material';
import { SecurityStatCard } from './SecurityStatCard';
import SeverityBadge from '../../../shared/components/SeverityBadge';
import StatusBadge from '../../../shared/components/StatusBadge';
import { calculateSeverityStats, calculateStatusStats } from '../../../shared/constants';

/**
 * StatCards - Dashboard statistics cards component
 */
const StatCards = ({ 
  stats, 
  loading = false,
  onCardClick,
  userRole
}) => {
  // Calculate derived stats
  const severityStats = useMemo(() => {
    if (!stats?.findings?.allFindings) return null;
    return calculateSeverityStats(stats.findings.allFindings);
  }, [stats]);

  const statusStats = useMemo(() => {
    if (!stats?.findings?.allFindings) return null;
    return calculateStatusStats(stats.findings.allFindings);
  }, [stats]);

  if (loading) {
    return (
      <Grid container spacing={3}>
        {[1, 2, 3, 4].map((i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <div style={{ 
              height: 120, 
              background: 'rgba(30, 41, 59, 0.5)', 
              borderRadius: 12,
              animation: 'pulse 1.5s infinite'
            }} />
          </Grid>
        ))}
      </Grid>
    );
  }

  const cards = [
    {
      title: 'Total Findings',
      value: statusStats?.total || 0,
      icon: <span style={{ fontSize: 24 }}>🐛</span>,
      severity: 'info',
      onClick: () => onCardClick?.('all-findings')
    },
    {
      title: 'Critical & High',
      value: (severityStats?.critical || 0) + (severityStats?.high || 0),
      icon: <span style={{ fontSize: 24 }}>🔥</span>,
      severity: 'critical',
      onClick: () => onCardClick?.('critical-high')
    },
    {
      title: 'Open Issues',
      value: statusStats?.active || 0,
      icon: <span style={{ fontSize: 24 }}>📂</span>,
      severity: 'high',
      onClick: () => onCardClick?.('open')
    },
    {
      title: 'Resolved',
      value: statusStats?.resolved || 0,
      icon: <span style={{ fontSize: 24 }}>✅</span>,
      severity: 'low',
      onClick: () => onCardClick?.('resolved')
    }
  ];

  return (
    <Grid container spacing={3}>
      {cards.map((card, index) => (
        <Grid item xs={12} sm={6} md={3} key={card.title}>
          <Grow in={true} timeout={300 + index * 100}>
            <div>
              <SecurityStatCard {...card} index={index} />
            </div>
          </Grow>
        </Grid>
      ))}
    </Grid>
  );
};

// Re-export SecurityStatCard for use in StatCards
export { SecurityStatCard } from './SecurityStatCard';

export default StatCards;
