import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Tooltip,
  Badge,
  Button,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Computer as ComputerIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  DataUsage as DataUsageIcon,
  Timer as TimerIcon,
  Info as InfoIcon,
  Dns as ServerIcon,
} from '@mui/icons-material';
import { colors, typography, borderRadius, transitions } from '../theme/designSystem';
import { useSystemInfo, systemInfoService } from '../services/systemInfo';

const SystemInfo = ({ showInCard = true, compact = false }) => {
  const { systemInfo, lastUpdate, isLoading, error, isAvailable } = useSystemInfo();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await systemInfoService.fetchSystemInfo();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getTimeSinceUpdate = () => {
    if (!lastUpdate) return 'Never';
    const now = new Date();
    const diff = Math.floor((now - lastUpdate) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const getStatusColor = (percentage) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 75) return 'warning';
    return 'success';
  };

  const iconColor = '#58A6FF';

  const SystemInfoContent = () => {
    if (error) {
      return (
        <Box sx={{ p: 2 }}>
          <Typography color="error" sx={{ mb: 2 }}>
            Failed to load system information: {typeof error === 'string' ? error : 'Unknown error'}
          </Typography>
          <Button size="small" onClick={handleManualRefresh} variant="outlined">
            Try Again
          </Button>
        </Box>
      );
    }

    if (!systemInfo) {
      return (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color={colors.text.secondary}>
            No system information available
          </Typography>
        </Box>
      );
    }

    return (
      <Box>
        {!showInCard && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ServerIcon sx={{ color: iconColor }} />
              <Typography variant="h5" sx={{ fontWeight: typography.weight.semibold, color: colors.text.primary }}>
                Server Status
              </Typography>
              <Badge variant="dot" color={isAvailable ? 'success' : 'error'} sx={{ ml: 1 }} />
              <Chip
                label="Real-time"
                size="small"
                sx={{
                  backgroundColor: 'rgba(88, 166, 255, 0.15)',
                  color: '#58A6FF',
                  fontSize: typography.size.xs,
                  fontWeight: typography.weight.medium,
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color={colors.text.tertiary}>
                {getTimeSinceUpdate()}
              </Typography>
              <Tooltip title="Refresh Now">
                <IconButton
                  size="small"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing || isLoading}
                  sx={{
                    color: colors.text.secondary,
                    '&:hover': { backgroundColor: colors.background.tertiary, color: colors.text.primary },
                    transition: transitions.all,
                  }}
                >
                  <RefreshIcon
                    sx={{
                      animation: isRefreshing || isLoading ? 'spin 1s linear infinite' : 'none',
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' },
                      },
                    }}
                  />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}

        <Grid container spacing={3}>
          {/* Host Information */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 2,
                backgroundColor: colors.background.tertiary,
                borderRadius: borderRadius.md,
                border: `1px solid ${colors.border.subtle}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ComputerIcon sx={{ mr: 1, color: iconColor }} />
                <Typography variant="h6" sx={{ fontWeight: typography.weight.semibold, color: colors.text.primary }}>
                  Host Information
                </Typography>
              </Box>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Hostname"
                    secondary={systemInfo.host?.name || 'Unknown'}
                    primaryTypographyProps={{ fontSize: typography.size.sm, fontWeight: typography.weight.medium, color: colors.text.primary }}
                    secondaryTypographyProps={{ fontSize: typography.size.sm, color: colors.text.secondary }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Platform"
                    secondary={systemInfo.host?.platform || 'Unknown'}
                    primaryTypographyProps={{ fontSize: typography.size.sm, fontWeight: typography.weight.medium, color: colors.text.primary }}
                    secondaryTypographyProps={{ fontSize: typography.size.sm, color: colors.text.secondary }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Architecture"
                    secondary={systemInfo.host?.arch || 'Unknown'}
                    primaryTypographyProps={{ fontSize: typography.size.sm, fontWeight: typography.weight.medium, color: colors.text.primary }}
                    secondaryTypographyProps={{ fontSize: typography.size.sm, color: colors.text.secondary }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Uptime"
                    secondary={systemInfo.host?.uptime || 'Unknown'}
                    primaryTypographyProps={{ fontSize: typography.size.sm, fontWeight: typography.weight.medium, color: colors.text.primary }}
                    secondaryTypographyProps={{ fontSize: typography.size.sm, color: colors.text.secondary }}
                  />
                </ListItem>
              </List>
            </Box>
          </Grid>

          {/* CPU Usage */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 2,
                backgroundColor: colors.background.tertiary,
                borderRadius: borderRadius.md,
                border: `1px solid ${colors.border.subtle}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SpeedIcon sx={{ mr: 1, color: iconColor }} />
                  <Typography variant="h6" sx={{ fontWeight: typography.weight.semibold, color: colors.text.primary }}>
                    CPU Usage
                  </Typography>
                </Box>
                <InfoIcon color={getStatusColor(systemInfo.cpu?.load?.percentage || 0)} />
              </Box>
              <Typography variant="body2" sx={{ mb: 1, color: colors.text.primary }}>
                {systemInfo.cpu?.model || 'Unknown CPU'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: colors.text.secondary }}>
                {systemInfo.cpu?.cores || 0} cores
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color={colors.text.primary}>Load Average</Typography>
                  <Typography variant="body2" sx={{ fontWeight: typography.weight.medium, color: colors.text.primary }}>
                    {systemInfo.cpu?.load?.current?.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={systemInfo.cpu?.load?.percentage || 0}
                  color={getStatusColor(systemInfo.cpu?.load?.percentage || 0)}
                  sx={{ height: 8, borderRadius: 4, backgroundColor: colors.background.elevated }}
                />
              </Box>
              <Typography variant="caption" color={colors.text.tertiary}>
                1m: {systemInfo.cpu?.load?.avg1m?.toFixed(2) || '0.00'} | 5m: {systemInfo.cpu?.load?.avg5m?.toFixed(2) || '0.00'} | 15m: {systemInfo.cpu?.load?.avg15m?.toFixed(2) || '0.00'}
              </Typography>
            </Box>
          </Grid>

          {/* Memory Usage */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 2,
                backgroundColor: colors.background.tertiary,
                borderRadius: borderRadius.md,
                border: `1px solid ${colors.border.subtle}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <MemoryIcon sx={{ mr: 1, color: iconColor }} />
                  <Typography variant="h6" sx={{ fontWeight: typography.weight.semibold, color: colors.text.primary }}>
                    Memory Usage
                  </Typography>
                </Box>
                <InfoIcon color={getStatusColor(systemInfo.memory?.percentage || 0)} />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color={colors.text.primary}>Usage</Typography>
                  <Typography variant="body2" sx={{ fontWeight: typography.weight.medium, color: colors.text.primary }}>
                    {systemInfo.memory?.usedGB || '0'}GB / {systemInfo.memory?.totalGB || '0'}GB
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={systemInfo.memory?.percentage || 0}
                  color={getStatusColor(systemInfo.memory?.percentage || 0)}
                  sx={{ height: 8, borderRadius: 4, backgroundColor: colors.background.elevated }}
                />
              </Box>
              <Typography variant="caption" color={colors.text.tertiary}>
                Free: {systemInfo.memory?.freeGB || '0'}GB | Used: {systemInfo.memory?.percentage || 0}%
              </Typography>
            </Box>
          </Grid>

          {/* Storage Usage */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: 2,
                backgroundColor: colors.background.tertiary,
                borderRadius: borderRadius.md,
                border: `1px solid ${colors.border.subtle}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <StorageIcon sx={{ mr: 1, color: iconColor }} />
                  <Typography variant="h6" sx={{ fontWeight: typography.weight.semibold, color: colors.text.primary }}>
                    Storage Usage
                  </Typography>
                </Box>
                <InfoIcon color={getStatusColor(systemInfo.storage?.percentage || 0)} />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color={colors.text.primary}>Usage</Typography>
                  <Typography variant="body2" sx={{ fontWeight: typography.weight.medium, color: colors.text.primary }}>
                    {systemInfo.storage?.used || '0'} / {systemInfo.storage?.total || '0'}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={systemInfo.storage?.percentage || 0}
                  color={getStatusColor(systemInfo.storage?.percentage || 0)}
                  sx={{ height: 8, borderRadius: 4, backgroundColor: colors.background.elevated }}
                />
              </Box>
              <Typography variant="caption" color={colors.text.tertiary}>
                Free: {systemInfo.storage?.free || '0'} | Used: {systemInfo.storage?.percentage || 0}%
              </Typography>
            </Box>
          </Grid>

          {/* Network Information */}
          {systemInfo.network && (
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 2,
                  backgroundColor: colors.background.tertiary,
                  borderRadius: borderRadius.md,
                  border: `1px solid ${colors.border.subtle}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <DataUsageIcon sx={{ mr: 1, color: iconColor }} />
                  <Typography variant="h6" sx={{ fontWeight: typography.weight.semibold, color: colors.text.primary }}>
                    Network
                  </Typography>
                </Box>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Primary IP"
                      secondary={systemInfo.network.primaryIP || 'Unknown'}
                      primaryTypographyProps={{ fontSize: typography.size.sm, fontWeight: typography.weight.medium, color: colors.text.primary }}
                      secondaryTypographyProps={{ fontSize: typography.size.sm, color: colors.text.secondary }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Interfaces"
                      secondary={systemInfo.network.interfaceCount || 0}
                      primaryTypographyProps={{ fontSize: typography.size.sm, fontWeight: typography.weight.medium, color: colors.text.primary }}
                      secondaryTypographyProps={{ fontSize: typography.size.sm, color: colors.text.secondary }}
                    />
                  </ListItem>
                </List>
              </Box>
            </Grid>
          )}

          {/* Backend Process */}
          {systemInfo.process && (
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 2,
                  backgroundColor: colors.background.tertiary,
                  borderRadius: borderRadius.md,
                  border: `1px solid ${colors.border.subtle}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TimerIcon sx={{ mr: 1, color: iconColor }} />
                  <Typography variant="h6" sx={{ fontWeight: typography.weight.semibold, color: colors.text.primary }}>
                    Backend Process
                  </Typography>
                </Box>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Uptime"
                      secondary={systemInfo.process.uptime || 'Unknown'}
                      primaryTypographyProps={{ fontSize: typography.size.sm, fontWeight: typography.weight.medium, color: colors.text.primary }}
                      secondaryTypographyProps={{ fontSize: typography.size.sm, color: colors.text.secondary }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Memory Usage"
                      secondary={`${systemInfo.process.heap?.usedMB || 0}MB / ${systemInfo.process.heap?.totalMB || 0}MB`}
                      primaryTypographyProps={{ fontSize: typography.size.sm, fontWeight: typography.weight.medium, color: colors.text.primary }}
                      secondaryTypographyProps={{ fontSize: typography.size.sm, color: colors.text.secondary }}
                    />
                  </ListItem>
                </List>
              </Box>
            </Grid>
          )}

          {/* System Processes */}
          {systemInfo.processes && (
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 2,
                  backgroundColor: colors.background.tertiary,
                  borderRadius: borderRadius.md,
                  border: `1px solid ${colors.border.subtle}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <InfoIcon sx={{ mr: 1, color: iconColor }} />
                  <Typography variant="h6" sx={{ fontWeight: typography.weight.semibold, color: colors.text.primary }}>
                    System Processes
                  </Typography>
                </Box>
                <Typography variant="body2" color={colors.text.primary}>
                  Total running processes: {systemInfo.processes}
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  };

  if (!showInCard) {
    return <SystemInfoContent />;
  }

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: borderRadius.lg,
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border.subtle}`,
        height: '100%',
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ServerIcon sx={{ color: iconColor }} />
            <Typography variant="h6" sx={{ fontWeight: typography.weight.semibold, color: colors.text.primary }}>
              Server Status
            </Typography>
            <Badge variant="dot" color={isAvailable ? 'success' : 'error'} sx={{ ml: 1 }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color={colors.text.tertiary}>
              {getTimeSinceUpdate()}
            </Typography>
            <Tooltip title="Refresh Now">
              <IconButton
                size="small"
                onClick={handleManualRefresh}
                disabled={isRefreshing || isLoading}
                sx={{
                  color: colors.text.secondary,
                  '&:hover': { backgroundColor: colors.background.tertiary, color: colors.text.primary },
                  transition: transitions.all,
                }}
              >
                <RefreshIcon
                  sx={{
                    animation: isRefreshing || isLoading ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <SystemInfoContent />
      </CardContent>
    </Card>
  );
};

export default SystemInfo;
