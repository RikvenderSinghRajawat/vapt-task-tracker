import React from 'react';
import { Skeleton, Box, Card, CardContent } from '@mui/material';
import { glassStyles } from '../../theme/premiumTheme';

export const SkeletonCard = ({ lines = 3 }) => (
  <Card sx={{ ...glassStyles.card, mb: 2 }}>
    <CardContent>
      <Skeleton variant="text" width="60%" height={32} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i}
          variant="text" 
          width={`${100 - (i * 10)}%`} 
          sx={{ bgcolor: 'rgba(255,255,255,0.05)', mt: 1 }}
        />
      ))}
    </CardContent>
  </Card>
);

export const SkeletonStat = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
    <Skeleton variant="circular" width={48} height={48} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
    <Box sx={{ flex: 1 }}>
      <Skeleton variant="text" width="40%" sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
      <Skeleton variant="text" width="60%" sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
    </Box>
  </Box>
);

export const SkeletonTable = ({ rows = 5 }) => (
  <Box>
    <Skeleton variant="rectangular" height={40} sx={{ bgcolor: 'rgba(255,255,255,0.1)', mb: 1, borderRadius: 1 }} />
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton 
        key={i}
        variant="rectangular" 
        height={52} 
        sx={{ bgcolor: 'rgba(255,255,255,0.05)', mb: 1, borderRadius: 1 }}
      />
    ))}
  </Box>
);

export const SkeletonChart = () => (
  <Box sx={{ p: 3 }}>
    <Skeleton variant="text" width="30%" height={32} sx={{ bgcolor: 'rgba(255,255,255,0.1)', mb: 2 }} />
    <Skeleton variant="rectangular" height={250} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }} />
  </Box>
);

export const SkeletonGrid = ({ count = 4 }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} lines={2} />
    ))}
  </Box>
);

const PremiumSkeleton = {
  Card: SkeletonCard,
  Stat: SkeletonStat,
  Table: SkeletonTable,
  Chart: SkeletonChart,
  Grid: SkeletonGrid,
};

export default PremiumSkeleton;
