import React from 'react';
import { Skeleton, Box } from '@mui/material';
import { borderRadius } from '../../../theme/designSystem';

/**
 * SkeletonCard - Card-shaped skeleton loader
 */
export const SkeletonCard = ({ height = 120, animate = true }) => (
  <Box
    sx={{
      height,
      background: 'rgba(30, 41, 59, 0.5)',
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      position: 'relative',
      '&::after': animate ? {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
        animation: 'shimmer 1.5s infinite'
      } : {}
    }}
  >
    <style>{`
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `}</style>
  </Box>
);

/**
 * SkeletonStat - Stat card skeleton
 */
export const SkeletonStat = () => (
  <SkeletonCard height={140} />
);

/**
 * SkeletonTableRow - Table row skeleton
 */
export const SkeletonTableRow = ({ columns = 5 }) => (
  <Box sx={{ display: 'flex', gap: 2, py: 2 }}>
    {[...Array(columns)].map((_, i) => (
      <Skeleton
        key={i}
        variant="rectangular"
        height={24}
        sx={{ 
          flex: 1,
          borderRadius: borderRadius.md,
          backgroundColor: 'rgba(30, 41, 59, 0.5)'
        }}
      />
    ))}
  </Box>
);

/**
 * SkeletonList - List item skeletons
 */
export const SkeletonList = ({ count = 5 }) => (
  <Box>
    {[...Array(count)].map((_, i) => (
      <Box
        key={i}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          py: 2,
          borderBottom: i < count - 1 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none'
        }}
      >
        <Skeleton
          variant="circular"
          width={40}
          height={40}
          sx={{ backgroundColor: 'rgba(30, 41, 59, 0.5)' }}
        />
        <Box sx={{ flex: 1 }}>
          <Skeleton
            variant="text"
            width="60%"
            height={20}
            sx={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', mb: 0.5 }}
          />
          <Skeleton
            variant="text"
            width="40%"
            height={16}
            sx={{ backgroundColor: 'rgba(30, 41, 59, 0.5)' }}
          />
        </Box>
      </Box>
    ))}
  </Box>
);

/**
 * SkeletonChart - Chart area skeleton
 */
export const SkeletonChart = ({ height = 300 }) => (
  <Box
    sx={{
      height,
      background: 'rgba(30, 41, 59, 0.3)',
      borderRadius: borderRadius.lg,
      p: 3,
      position: 'relative'
    }}
  >
    <Skeleton variant="text" width="30%" height={24} sx={{ mb: 2 }} />
    <Box
      sx={{
        height: `calc(100% - 50px)`,
        background: 'rgba(30, 41, 59, 0.5)',
        borderRadius: borderRadius.md,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60%',
          background: 'linear-gradient(to top, rgba(6, 182, 212, 0.1), transparent)'
        }}
      />
    </Box>
  </Box>
);

/**
 * DashboardSkeleton - Full dashboard loading state
 */
export const DashboardSkeleton = () => (
  <Box sx={{ p: 3 }}>
    {/* Stats Row */}
    <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
      {[1, 2, 3, 4].map((i) => (
        <Box key={i} sx={{ flex: 1 }}>
          <SkeletonStat />
        </Box>
      ))}
    </Box>

    {/* Charts Row */}
    <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
      <Box sx={{ flex: 2 }}>
        <SkeletonChart height={350} />
      </Box>
      <Box sx={{ flex: 1 }}>
        <SkeletonCard height={350} />
      </Box>
    </Box>

    {/* Recent Items */}
    <SkeletonCard height={400} />
  </Box>
);

export default {
  SkeletonCard,
  SkeletonStat,
  SkeletonTableRow,
  SkeletonList,
  SkeletonChart,
  DashboardSkeleton
};
