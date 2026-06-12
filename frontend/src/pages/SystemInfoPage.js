import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Alert,
  Button,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Avatar,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Computer as ComputerIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  NetworkCheck as NetworkIcon,
  DeleteSweep as ClearCacheIcon,
} from '@mui/icons-material';
import { PieChart } from '@mui/x-charts/PieChart';
import { LineChart } from '@mui/x-charts/LineChart';
import SystemInfo from '../components/SystemInfo';
import BackendUnavailable from '../components/BackendUnavailable';
import { useBackendStatus } from '../services/backendStatus';
import { useSystemInfo, systemInfoService } from '../services/systemInfo';
import { useAuth } from '../context/AuthContext';
import { colors, typography, borderRadius, shadows } from '../theme/designSystem';

const SystemInfoPage = () => {
  const backendStatusState = useBackendStatus();
  const { systemInfo, lastUpdate, isLoading, error, isAvailable } = useSystemInfo();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isBackendOnline = !!backendStatusState?.isAvailable;
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const handleClearCache = async () => {
    setClearDialogOpen(false);
    const result = await systemInfoService.clearCache();
    setToast({
      open: true,
      message: result.success ? 'Cache cleared successfully' : result.message || 'Failed to clear cache',
      severity: result.success ? 'success' : 'error'
    });
  };

  const prepareResourceData = () => {
    if (!systemInfo) return [];
    return [
      { name: 'CPU Usage', value: systemInfo.cpu?.load?.percentage || 0, color: '#58A6FF' },
      { name: 'Memory Usage', value: systemInfo.memory?.percentage || 0, color: '#3FB950' },
      { name: 'Storage Usage', value: systemInfo.storage?.percentage || 0, color: '#DBAB09' },
    ];
  };

  const prepareTimelineData = () => {
    if (!systemInfo) return [];
    return [
      { time: 'Now', cpu: systemInfo.cpu?.load?.percentage || 0, memory: systemInfo.memory?.percentage || 0 },
      { time: '5m ago', cpu: Math.max(0, (systemInfo.cpu?.load?.percentage || 0) - Math.random() * 10), memory: Math.max(0, (systemInfo.memory?.percentage || 0) - Math.random() * 5) },
      { time: '10m ago', cpu: Math.max(0, (systemInfo.cpu?.load?.percentage || 0) - Math.random() * 15), memory: Math.max(0, (systemInfo.memory?.percentage || 0) - Math.random() * 8) },
      { time: '15m ago', cpu: Math.max(0, (systemInfo.cpu?.load?.percentage || 0) - Math.random() * 20), memory: Math.max(0, (systemInfo.memory?.percentage || 0) - Math.random() * 12) },
    ];
  };

  const resourceData = prepareResourceData();
  const timelineData = prepareTimelineData();

  const getStatusColor = (value) => {
    if (value >= 90) return '#F85149';
    if (value >= 75) return '#DBAB09';
    if (value >= 60) return '#D29922';
    return '#3FB950';
  };

  return (
    <Box sx={{ backgroundColor: colors.background.primary, minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        <BackendUnavailable
          status={backendStatusState}
          onDismiss={() => {}}
        />

        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              sx={{
                bgcolor: 'rgba(88, 166, 255, 0.15)',
                color: '#58A6FF',
                mr: 2,
                width: 48,
                height: 48,
              }}
            >
              <ComputerIcon sx={{ fontSize: 24 }} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  color: colors.text.primary,
                  mb: 0.5,
                }}
              >
                Server Info Dashboard
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: colors.text.secondary,
                  fontWeight: 400,
                }}
              >
                Real-time server performance monitoring and resource utilization
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Alert
              severity="info"
              sx={{
                flex: 1,
                backgroundColor: 'rgba(88, 166, 255, 0.1)',
                border: '1px solid rgba(88, 166, 255, 0.2)',
                color: colors.text.primary,
                '& .MuiAlert-icon': {
                  color: '#58A6FF',
                },
                '& .MuiAlert-message': {
                  fontSize: '14px',
                  fontWeight: 400,
                  color: colors.text.primary,
                },
              }}
            >
              <strong>Auto-refresh:</strong> Server metrics update every 15 minutes. Last updated:{' '}
              {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Never'}
            </Alert>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={() => window.location.reload()}
              disabled={isLoading}
              sx={{
                minWidth: 120,
                backgroundColor: '#58A6FF',
                color: '#FFFFFF',
                fontWeight: 500,
                '&:hover': {
                  backgroundColor: '#3B82F6',
                },
                '&:disabled': {
                  backgroundColor: colors.background.tertiary,
                  color: colors.text.disabled,
                },
              }}
            >
              {isLoading ? 'Refreshing...' : 'Refresh Now'}
            </Button>
            {isAdmin && (
              <Button
                variant="outlined"
                startIcon={<ClearCacheIcon />}
                onClick={() => setClearDialogOpen(true)}
                sx={{
                  minWidth: 120,
                  borderColor: colors.severity.warning,
                  color: colors.severity.warning,
                  fontWeight: 500,
                  '&:hover': {
                    borderColor: colors.severity.error,
                    color: colors.severity.error,
                    backgroundColor: 'rgba(215,58,73,0.08)',
                  },
                }}
              >
                Clear Cache
              </Button>
            )}
          </Box>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            {
              label: 'Server Status',
              value: isAvailable ? 'Online' : 'Offline',
              icon: <NetworkIcon />,
              color: isBackendOnline ? '#3FB950' : '#F85149',
              bgColor: isBackendOnline ? 'rgba(63, 185, 80, 0.1)' : 'rgba(248, 81, 73, 0.1)',
              progress: null,
            },
            {
              label: 'CPU Usage',
              value: `${systemInfo?.cpu?.load?.percentage || 0}%`,
              icon: <SpeedIcon />,
              color: getStatusColor(systemInfo?.cpu?.load?.percentage || 0),
              bgColor: colors.background.tertiary,
              progress: systemInfo?.cpu?.load?.percentage || 0,
            },
            {
              label: 'Memory Usage',
              value: `${systemInfo?.memory?.percentage || 0}%`,
              icon: <MemoryIcon />,
              color: getStatusColor(systemInfo?.memory?.percentage || 0),
              bgColor: colors.background.tertiary,
              progress: systemInfo?.memory?.percentage || 0,
            },
            {
              label: 'Storage Usage',
              value: `${systemInfo?.storage?.percentage || 0}%`,
              icon: <StorageIcon />,
              color: getStatusColor(systemInfo?.storage?.percentage || 0),
              bgColor: colors.background.tertiary,
              progress: systemInfo?.storage?.percentage || 0,
            },
          ].map((stat) => (
            <Grid item xs={12} sm={6} md={3} key={stat.label}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  backgroundColor: colors.background.secondary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: borderRadius.lg,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: colors.border.default,
                    boxShadow: shadows.md,
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      sx={{
                        backgroundColor: stat.bgColor,
                        color: stat.color,
                        mr: 2,
                        width: 40,
                        height: 40,
                      }}
                    >
                      {stat.icon}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: colors.text.secondary,
                          fontWeight: 500,
                          mb: 0.5,
                        }}
                      >
                        {stat.label}
                      </Typography>
                      <Typography
                        variant="h5"
                        sx={{
                          color: colors.text.primary,
                          fontWeight: 700,
                        }}
                      >
                        {stat.value}
                      </Typography>
                    </Box>
                  </Box>
                  {stat.progress !== null && (
                    <LinearProgress
                      variant="determinate"
                      value={stat.progress}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: colors.background.tertiary,
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                          backgroundColor: stat.color,
                        },
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card
              elevation={0}
              sx={{
                height: '100%',
                backgroundColor: colors.background.secondary,
                border: `1px solid ${colors.border.subtle}`,
                borderRadius: borderRadius.lg,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <AssessmentIcon sx={{ color: '#58A6FF', mr: 1 }} />
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: colors.text.primary,
                    }}
                  >
                    Resource Utilization
                  </Typography>
                </Box>
                <PieChart
                  series={[{
                    data: resourceData.map(d => ({ id: d.name, value: d.value, label: d.name, color: d.color })),
                    innerRadius: 30,
                    outerRadius: 90,
                    paddingAngle: 2,
                    cornerRadius: 4,
                  }]}
                  width={400}
                  height={250}
                  slotProps={{
                    legend: { hidden: true },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              elevation={0}
              sx={{
                height: '100%',
                backgroundColor: colors.background.secondary,
                border: `1px solid ${colors.border.subtle}`,
                borderRadius: borderRadius.lg,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <TimelineIcon sx={{ color: '#58A6FF', mr: 1 }} />
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: colors.text.primary,
                    }}
                  >
                    Performance Timeline
                  </Typography>
                </Box>
                <LineChart
                  xAxis={[{
                    scaleType: 'point',
                    data: timelineData.map(d => d.time),
                    sx: { '& .MuiChartsAxis-tickLabel': { fill: colors.text.secondary, fontSize: 12 } },
                  }]}
                  yAxis={[{
                    sx: { '& .MuiChartsAxis-tickLabel': { fill: colors.text.secondary, fontSize: 12 } },
                  }]}
                  series={[
                    { data: timelineData.map(d => d.cpu), label: 'CPU Usage (%)', color: '#58A6FF', showMark: true },
                    { data: timelineData.map(d => d.memory), label: 'Memory Usage (%)', color: '#3FB950', showMark: true },
                  ]}
                  width={600}
                  height={250}
                  slotProps={{
                    legend: { position: { vertical: 'bottom', horizontal: 'middle' }, labelStyle: { fill: colors.text.secondary } },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Paper
          elevation={0}
          sx={{
            borderRadius: borderRadius.lg,
            backgroundColor: colors.background.secondary,
            border: `1px solid ${colors.border.subtle}`,
            p: 3,
            mb: 3,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: colors.text.primary,
              mb: 3,
            }}
          >
            Detailed Server Info
          </Typography>
          <SystemInfo showInCard={false} compact={false} />
        </Paper>

        <Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)}
          PaperProps={{ sx: { borderRadius: borderRadius.lg, bgcolor: colors.background.secondary, border: `1px solid ${colors.border.subtle}` } }}>
          <DialogTitle sx={{ color: colors.text.primary, fontWeight: 600 }}>Clear System Cache</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: colors.text.secondary }}>
              This will clear all cached system metrics. Data will be re-fetched on the next refresh cycle. Continue?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setClearDialogOpen(false)} sx={{ color: colors.text.secondary }}>Cancel</Button>
            <Button onClick={handleClearCache} variant="contained" color="error">Clear Cache</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({ ...toast, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: borderRadius.lg }}>
            {toast.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default SystemInfoPage;
