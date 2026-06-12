import React from 'react';
import { 
  Box, 
  Skeleton, 
  Card, 
  CardContent,
  Grid,
  Typography 
} from '@mui/material';

// Skeleton for Dashboard stats
export const DashboardSkeleton = () => (
  <Box sx={{ p: 3 }}>
    {/* Header Skeleton */}
    <Skeleton variant="text" width={300} height={60} sx={{ mb: 3 }} />
    
    {/* Stats Cards Skeleton */}
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {[1, 2, 3, 4].map((i) => (
        <Grid item xs={12} sm={6} md={3} key={i}>
          <Card>
            <CardContent>
              <Skeleton variant="circular" width={40} height={40} sx={{ mb: 2 }} />
              <Skeleton variant="text" width="60%" height={40} />
              <Skeleton variant="text" width="80%" />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>

    {/* Charts/Progress Skeleton */}
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="40%" height={30} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={200} />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="40%" height={30} sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} variant="rectangular" height={40} />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </Box>
);

// Skeleton for Project List
export const ProjectListSkeleton = () => (
  <Box sx={{ p: 3 }}>
    <Skeleton variant="text" width={200} height={50} sx={{ mb: 3 }} />
    <Grid container spacing={3}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Grid item xs={12} md={6} key={i}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Skeleton variant="text" width="60%" height={30} />
                <Skeleton variant="circular" width={30} height={30} />
              </Box>
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="40%" />
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Skeleton variant="rounded" width={80} height={24} />
                <Skeleton variant="rounded" width={80} height={24} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  </Box>
);

// Skeleton for Findings List
export const FindingsSkeleton = () => (
  <Box sx={{ p: 3 }}>
    <Skeleton variant="text" width={250} height={50} sx={{ mb: 3 }} />
    {[1, 2, 3, 4, 5].map((i) => (
      <Card key={i} sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="70%" height={30} />
              <Skeleton variant="text" width="40%" />
              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                <Skeleton variant="rounded" width={60} height={24} />
                <Skeleton variant="rounded" width={60} height={24} />
              </Box>
            </Box>
            <Skeleton variant="circular" width={40} height={40} />
          </Box>
        </CardContent>
      </Card>
    ))}
  </Box>
);

// Skeleton for Table/List
export const TableSkeleton = ({ rows = 5 }) => (
  <Box sx={{ p: 3 }}>
    <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, pb: 2, borderBottom: '1px solid #e0e0e0' }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="text" width={`${20 + i * 5}%`} height={30} />
          ))}
        </Box>
        {/* Rows */}
        {[...Array(rows)].map((_, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
            <Skeleton variant="text" width="25%" />
            <Skeleton variant="text" width="25%" />
            <Skeleton variant="text" width="25%" />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Skeleton variant="circular" width={30} height={30} />
              <Skeleton variant="circular" width={30} height={30} />
            </Box>
          </Box>
        ))}
      </CardContent>
    </Card>
  </Box>
);

// Mini skeleton for inline loading
export const MiniSkeleton = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
    <Skeleton variant="circular" width={20} height={20} />
    <Skeleton variant="text" width={100} />
  </Box>
);

export default DashboardSkeleton;
