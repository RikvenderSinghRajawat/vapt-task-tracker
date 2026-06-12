import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { motion } from 'framer-motion';
import {
  TrendingUp as TrendingUpIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';
import { colors, typography, borderRadius, shadows } from '../theme/designSystem';

const axisSx = {
  '& .MuiChartsAxis-tickLabel': { fill: colors.text.tertiary, fontSize: 11 },
  '& .MuiChartsAxis-line': { stroke: colors.border.subtle },
  '& .MuiChartsAxis-tick': { stroke: colors.border.subtle },
};

const hasChartData = (items, keys) => {
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.some((item) => keys.some((key) => Number(item?.[key] || 0) > 0));
};

const truncateLabel = (value, max = 14) => {
  const label = String(value || '');
  return label.length > max ? `${label.slice(0, max - 3)}...` : label;
};

const chartHeight = 340;

const legendRight = {
  legend: {
    position: { vertical: 'middle', horizontal: 'right' },
    direction: 'column',
    labelStyle: { fill: colors.text.secondary, fontSize: 11 },
    itemMarkWidth: 10,
    itemMarkHeight: 10,
    itemGap: 10,
  },
};

const tooltipGlass = {
  tooltip: {
    sx: {
      '& .MuiChartsTooltip-root': {
        background: `${colors.background.secondary}ee`,
        backdropFilter: 'blur(12px)',
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: borderRadius.lg,
        boxShadow: shadows.lg,
      },
      '& .MuiChartsTooltip-label': { color: colors.text.primary, fontWeight: 600, fontSize: 13 },
      '& .MuiChartsTooltip-value': { color: colors.text.secondary, fontWeight: 500 },
    },
  },
};

const chartSlotProps = { ...legendRight, ...tooltipGlass };

const EmptyChart = ({ height = chartHeight }) => (
  <Box
    sx={{
      height,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `1px dashed ${colors.border.subtle}`,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.background.tertiary,
    }}
  >
    <Typography variant="body2" sx={{ color: colors.text.tertiary }}>
      No data available
    </Typography>
  </Box>
);

const PremiumCharts = ({ data, type = 'trend' }) => {
  const renderTrendChart = () => {
    const rawData = data.trends || [];
    const hasSeverity = hasChartData(rawData, ['critical', 'high', 'medium']);
    const hasCount = hasChartData(rawData, ['count']);
    if (!hasSeverity && !hasCount) return <EmptyChart />;

    const xKey = rawData.some((d) => d.date) ? 'date' : 'label';
    const labels = rawData.map(d => truncateLabel(d[xKey], 8));

    if (hasSeverity) {
      return (
        <LineChart
          xAxis={[{ scaleType: 'point', data: labels, sx: axisSx }]}
          yAxis={[{ sx: axisSx }]}
          series={[
            { data: rawData.map(d => d.critical || 0), label: 'Critical', color: colors.severity.critical, area: true, showMark: false },
            { data: rawData.map(d => d.high || 0), label: 'High', color: colors.severity.high, area: true, showMark: false },
            { data: rawData.map(d => d.medium || 0), label: 'Medium', color: colors.severity.medium, area: true, showMark: false },
            { data: rawData.map(d => d.low || 0), label: 'Low', color: colors.severity.low, area: true, showMark: false },
          ]}
          height={chartHeight}
          slotProps={chartSlotProps}
          margin={{ top: 10, bottom: 30, left: 40, right: 120 }}
        />
      );
    }

    return (
      <LineChart
        xAxis={[{ scaleType: 'point', data: labels, sx: axisSx }]}
        yAxis={[{ sx: axisSx }]}
        series={[
          { data: rawData.map(d => d.count || 0), label: 'Findings', color: colors.primary[500], area: true, showMark: false },
        ]}
        height={chartHeight}
        slotProps={chartSlotProps}
        margin={{ top: 10, bottom: 30, left: 40, right: 120 }}
      />
    );
  };

  const renderSeverityChart = () => {
    const items = [
      { label: 'Critical', value: data.critical || 0, color: colors.severity.critical },
      { label: 'High', value: data.high || 0, color: colors.severity.high },
      { label: 'Medium', value: data.medium || 0, color: colors.severity.medium },
      { label: 'Low', value: data.low || 0, color: colors.severity.low },
    ];
    const total = items.reduce((s, i) => s + i.value, 0);
    if (total === 0) return <EmptyChart />;

    const maxValue = Math.max(...items.map(i => i.value), 1);

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: chartHeight, justifyContent: 'center', px: 1 }}>
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="caption" sx={{ color: colors.text.secondary, width: 64, textAlign: 'right', fontWeight: 500, fontSize: 11 }}>
                {item.label}
              </Typography>
              <Box sx={{ flex: 1, height: 30, borderRadius: 2, background: colors.background.tertiary, overflow: 'hidden', position: 'relative' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.value / maxValue) * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 + 0.2, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    height: '100%',
                    borderRadius: 8,
                    background: `linear-gradient(90deg, ${item.color}, ${item.color}88)`,
                    boxShadow: `0 0 16px ${item.color}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: 10,
                    minWidth: item.value > 0 ? 36 : 0,
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, fontSize: 11, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                    {item.value}
                  </Typography>
                </motion.div>
              </Box>
              <Typography variant="caption" sx={{ color: colors.text.tertiary, width: 42, fontWeight: 600, fontSize: 11 }}>
                {total > 0 ? `${Math.round((item.value / total) * 100)}%` : '0%'}
              </Typography>
            </Box>
          </motion.div>
        ))}
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${colors.border.subtle}`, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: colors.text.tertiary, fontWeight: 500 }}>
            Total: {total} findings
          </Typography>
        </Box>
      </Box>
    );
  };

  const renderPerformanceChart = () => {
    const chartData = data.performance || [];
    if (!hasChartData(chartData, ['resolved', 'pending', 'overdue'])) return <EmptyChart />;

    const labels = chartData.map(d => truncateLabel(d.name, 12));
    return (
      <BarChart
        xAxis={[{ scaleType: 'band', data: labels, sx: axisSx }]}
        yAxis={[{ sx: axisSx }]}
        series={[
          { data: chartData.map(d => d.resolved || 0), label: 'Resolved', color: colors.severity.low },
          { data: chartData.map(d => d.pending || 0), label: 'Pending', color: colors.severity.medium },
          { data: chartData.map(d => d.overdue || 0), label: 'Overdue', color: colors.severity.critical },
        ]}
        height={chartHeight}
        slotProps={chartSlotProps}
        margin={{ top: 10, bottom: 30, left: 40, right: 130 }}
      />
    );
  };

  const renderUserActivityChart = () => {
    const rawData = data.userActivity || [];
    const hasCreated = hasChartData(rawData, ['created', 'closed']);
    const hasCount = hasChartData(rawData, ['count']);
    if (!hasCreated && !hasCount) return <EmptyChart />;

    const xKey = rawData.some((d) => d.date) ? 'date' : 'label';
    const labels = rawData.map(d => truncateLabel(d[xKey], 8));

    if (hasCreated) {
      return (
        <LineChart
          xAxis={[{ scaleType: 'point', data: labels, sx: axisSx }]}
          yAxis={[{ sx: axisSx }]}
          series={[
            { data: rawData.map(d => d.created || 0), label: 'Created', color: colors.primary[500], area: true, showMark: false },
            { data: rawData.map(d => d.closed || 0), label: 'Closed', color: colors.severity.low, area: true, showMark: false },
          ]}
          height={chartHeight}
          slotProps={chartSlotProps}
          margin={{ top: 10, bottom: 30, left: 40, right: 120 }}
        />
      );
    }

    return (
      <LineChart
        xAxis={[{ scaleType: 'point', data: labels, sx: axisSx }]}
        yAxis={[{ sx: axisSx }]}
        series={[
          { data: rawData.map(d => d.count || 0), label: 'Findings', color: colors.primary[500], area: true, showMark: false },
        ]}
        height={chartHeight}
        slotProps={chartSlotProps}
        margin={{ top: 10, bottom: 30, left: 40, right: 120 }}
      />
    );
  };

  const renderRoleDistributionChart = () => {
    const pieData = (data.roleDistribution || []).map((entry, index) => ({
      id: entry.role || entry.name,
      value: entry.count || entry.value || 0,
      color: entry.color || ['#06B6D4', '#8B5CF6', '#F0883E', '#3FB950', '#58A6FF'][index % 5],
      label: entry.role || entry.name,
    }));
    return (
      <PieChart
        series={[{
          data: pieData,
          innerRadius: 56,
          outerRadius: 90,
          paddingAngle: 3,
          cornerRadius: 6,
          cx: '45%',
        }]}
        height={chartHeight}
        slotProps={chartSlotProps}
        margin={{ top: 10, bottom: 10, left: 10, right: 130 }}
      />
    );
  };

  const renderProjectStatusChart = () => {
    const statusItems = data.projectStatus || [];
    if (statusItems.length === 0) return <EmptyChart />;

    const colors3 = [colors.severity.medium, colors.severity.low, colors.primary[500]];
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: chartHeight, justifyContent: 'center', px: 2 }}>
        {statusItems.map((item, i) => {
          const c = item.color || colors3[i % 3];
          const pct = Math.min(100, item.count > 0 ? Math.round((item.count / Math.max(...statusItems.map(s => s.count), 1)) * 100) : 0);
          return (
            <motion.div
              key={item.status}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="caption" sx={{ color: colors.text.secondary, width: 80, fontWeight: 500, fontSize: 11 }}>
                  {item.status}
                </Typography>
                <Box sx={{ flex: 1, height: 24, borderRadius: 1.5, background: colors.background.tertiary, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 + 0.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      height: '100%',
                      borderRadius: 6,
                      background: `linear-gradient(90deg, ${c}, ${c}88)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: 8,
                      minWidth: item.count > 0 ? 24 : 0,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, fontSize: 10 }}>
                      {item.count}
                    </Typography>
                  </motion.div>
                </Box>
              </Box>
            </motion.div>
          );
        })}
      </Box>
    );
  };

  const renderProjectProgressChart = () => {
    const chartData = data.projectProgress || [];
    if (!hasChartData(chartData, ['open', 'closed', 'progress'])) return <EmptyChart />;

    const labels = chartData.map(d => truncateLabel(d.name, 12));
    return (
      <BarChart
        xAxis={[{ scaleType: 'band', data: labels, sx: axisSx }]}
        yAxis={[{ sx: axisSx }]}
        series={[
          { data: chartData.map(d => d.open || 0), label: 'Open', color: colors.severity.high },
          { data: chartData.map(d => d.closed || 0), label: 'Closed', color: colors.severity.low },
          { data: chartData.map(d => d.progress || 0), label: 'Progress', color: colors.primary[500] },
        ]}
        height={chartHeight}
        slotProps={chartSlotProps}
        margin={{ top: 10, bottom: 30, left: 40, right: 130 }}
      />
    );
  };

  const renderStatusBreakdownChart = () => {
    const chartData = data.statusBreakdown || [];
    if (!hasChartData(chartData, ['count'])) return <EmptyChart />;

    const labels = chartData.map(d => truncateLabel(d.status, 12));
    return (
      <BarChart
        xAxis={[{ scaleType: 'band', data: labels, sx: axisSx }]}
        yAxis={[{ sx: axisSx }]}
        series={[{
          data: chartData.map((d, i) => ({ value: d.count || 0, color: d.color || ['#06B6D4', '#8B5CF6', '#F0883E', '#3FB950', '#58A6FF'][i % 5] })),
          label: 'Count',
        }]}
        height={chartHeight}
        slotProps={chartSlotProps}
        margin={{ top: 10, bottom: 30, left: 40, right: 120 }}
      />
    );
  };

  const renderAgeBucketsChart = () => {
    const chartData = data.ageBuckets || [];
    if (!hasChartData(chartData, ['open', 'closed'])) return <EmptyChart />;

    const labels = chartData.map(d => d.bucket);
    return (
      <BarChart
        xAxis={[{ scaleType: 'band', data: labels, sx: axisSx }]}
        yAxis={[{ sx: axisSx }]}
        series={[
          { data: chartData.map(d => d.open || 0), label: 'Open', color: colors.severity.high },
          { data: chartData.map(d => d.closed || 0), label: 'Closed', color: colors.severity.low },
        ]}
        height={chartHeight}
        slotProps={chartSlotProps}
        margin={{ top: 10, bottom: 30, left: 40, right: 120 }}
      />
    );
  };

  const renderTopProjectsChart = () => {
    const chartData = data.topProjects || [];
    if (!hasChartData(chartData, ['critical', 'high', 'medium', 'low'])) return <EmptyChart />;

    const labels = chartData.map(d => truncateLabel(d.name, 12));
    return (
      <BarChart
        xAxis={[{ scaleType: 'band', data: labels, sx: axisSx }]}
        yAxis={[{ sx: axisSx }]}
        series={[
          { data: chartData.map(d => d.critical || 0), label: 'Critical', color: colors.severity.critical, stack: 'total' },
          { data: chartData.map(d => d.high || 0), label: 'High', color: colors.severity.high, stack: 'total' },
          { data: chartData.map(d => d.medium || 0), label: 'Medium', color: colors.severity.medium, stack: 'total' },
          { data: chartData.map(d => d.low || 0), label: 'Low', color: colors.severity.low, stack: 'total' },
        ]}
        height={chartHeight}
        slotProps={chartSlotProps}
        margin={{ top: 10, bottom: 30, left: 40, right: 130 }}
      />
    );
  };

  const renderSlaChart = () => {
    const chartData = data.slaBuckets || [];
    if (!hasChartData(chartData, ['count'])) return <EmptyChart />;

    const labels = chartData.map(d => d.label);
    return (
      <BarChart
        xAxis={[{ scaleType: 'band', data: labels, sx: axisSx }]}
        yAxis={[{ sx: axisSx }]}
        series={[{
          data: chartData.map((d, i) => ({ value: d.count || 0, color: d.color || ['#D73A49', '#F0883E', '#DBAB09', '#3FB950'][i % 4] })),
          label: 'Count',
        }]}
        height={chartHeight}
        slotProps={chartSlotProps}
        margin={{ top: 10, bottom: 30, left: 40, right: 120 }}
      />
    );
  };

  const renderServerResourcesChart = () => {
    const chartData = data.serverResources || [];
    if (!hasChartData(chartData, ['usedPercent'])) return <EmptyChart />;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: chartHeight, justifyContent: 'center', px: 1 }}>
        {chartData.map((d, i) => (
          <motion.div
            key={d.metric}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="caption" sx={{ color: colors.text.secondary, width: 80, fontWeight: 500, fontSize: 11 }}>
                {d.metric}
              </Typography>
              <Box sx={{ flex: 1, height: 28, borderRadius: 2, background: colors.background.tertiary, overflow: 'hidden', position: 'relative' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, d.usedPercent)}%` }}
                  transition={{ duration: 1, delay: i * 0.1 + 0.2, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    height: '100%',
                    borderRadius: 8,
                    background: `linear-gradient(90deg, ${d.color || colors.primary[500]}, ${(d.color || colors.primary[500])}88)`,
                    boxShadow: `0 0 12px ${(d.color || colors.primary[500])}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: 10,
                    minWidth: d.usedPercent > 0 ? 36 : 0,
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, fontSize: 11 }}>
                    {d.usedPercent}%
                  </Typography>
                </motion.div>
              </Box>
            </Box>
          </motion.div>
        ))}
      </Box>
    );
  };

  const getChartTitle = () => {
    switch (type) {
      case 'trend': return 'Vulnerability Trends';
      case 'severity': return 'Severity Distribution';
      case 'performance': return 'Team Performance';
      case 'userActivity': return 'Finding Activity';
      case 'roleDistribution': return 'User Role Mix';
      case 'projectStatus': return 'Project Status';
      case 'projectProgress': return 'Project Remediation';
      case 'statusBreakdown': return 'Finding Status';
      case 'ageBuckets': return 'Finding Age';
      case 'topProjects': return 'Top Risk Projects';
      case 'sla': return 'SLA Exposure';
      case 'serverResources': return 'Server Resources';
      default: return 'Analytics';
    }
  };

  const getChartIcon = () => {
    switch (type) {
      case 'trend': return <TrendingUpIcon />;
      case 'severity': return <AssessmentIcon />;
      case 'performance': return <TimelineIcon />;
      case 'userActivity': return <TimelineIcon />;
      case 'roleDistribution': return <SecurityIcon />;
      case 'projectStatus': return <BugReportIcon />;
      case 'projectProgress': return <SpeedIcon />;
      case 'statusBreakdown': return <AssessmentIcon />;
      case 'ageBuckets': return <TimelineIcon />;
      case 'topProjects': return <AssessmentIcon />;
      case 'sla': return <TimelineIcon />;
      case 'serverResources': return <StorageIcon />;
      default: return <AssessmentIcon />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ height: '100%' }}
    >
      <Card
        sx={{
          background: `linear-gradient(145deg, ${colors.background.secondary} 0%, ${colors.background.tertiary} 100%)`,
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: borderRadius.xl,
          height: '100%',
          minHeight: 460,
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          '&:hover': {
            borderColor: colors.border.default,
            boxShadow: shadows.lg,
            transform: 'translateY(-2px)',
          },
        }}
        elevation={0}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 3 }, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
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
              {getChartIcon()}
            </Box>
            <Typography
              variant="h6"
              sx={{
                color: colors.text.primary,
                fontWeight: typography.weight.semibold,
                fontSize: typography.size.base,
                letterSpacing: typography.tracking.tight,
              }}
            >
              {getChartTitle()}
            </Typography>
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, width: '100%' }}>
            {type === 'trend' && renderTrendChart()}
            {type === 'severity' && renderSeverityChart()}
            {type === 'performance' && renderPerformanceChart()}
            {type === 'userActivity' && renderUserActivityChart()}
            {type === 'roleDistribution' && renderRoleDistributionChart()}
            {type === 'projectStatus' && renderProjectStatusChart()}
            {type === 'projectProgress' && renderProjectProgressChart()}
            {type === 'statusBreakdown' && renderStatusBreakdownChart()}
            {type === 'ageBuckets' && renderAgeBucketsChart()}
            {type === 'topProjects' && renderTopProjectsChart()}
            {type === 'sla' && renderSlaChart()}
            {type === 'serverResources' && renderServerResourcesChart()}
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PremiumCharts;
