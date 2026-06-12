import React, { lazy, Suspense } from 'react';
import { Box, Typography } from '@mui/material';

const CyberLoader = lazy(() => import('./branding/CyberLoader'));

const LoadingScreen = (props) => (
  <Suspense fallback={
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0D1117' }}>
      <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Loading...</Typography>
    </Box>
  }>
    <CyberLoader {...props} />
  </Suspense>
);

export default LoadingScreen;
