import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Shield as ShieldIcon } from '@mui/icons-material';

const VaptWorkspace = () => {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
      <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 500 }}>
        <ShieldIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>VAPT Workspace</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          This workspace is for VAPT analysts and leads.
        </Typography>
      </Paper>
    </Box>
  );
};

export default VaptWorkspace;
