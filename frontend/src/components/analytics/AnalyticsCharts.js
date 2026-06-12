import React, { useMemo } from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { motion } from 'framer-motion';
import { colors, borderRadius } from '../../theme/designSystem';

const axisSx = {
  '& .MuiChartsAxis-tickLabel': { fill: colors.text.tertiary, fontSize: 11 },
  '& .MuiChartsAxis-line': { stroke: colors.border.subtle },
  '& .MuiChartsAxis-tick': { stroke: colors.border.subtle },
};

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
      },
      '& .MuiChartsTooltip-label': { color: colors.text.primary, fontWeight: 600, fontSize: 13 },
      '& .MuiChartsTooltip-value': { color: colors.text.secondary, fontWeight: 500 },
    },
  },
};

const chartSlotProps = { ...legendRight, ...tooltipGlass };

// ========================================================================
// 1. Severity Distribution — Horizontal Stacked Bar
// ========================================================================
export const SeverityDonut = ({ data }) => {
  const items = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Critical', value: Number(data.critical) || 0, color: colors.severity.critical },
      { label: 'High', value: Number(data.high) || 0, color: colors.severity.high },
      { label: 'Medium', value: Number(data.medium) || 0, color: colors.severity.medium },
      { label: 'Low', value: Number(data.low) || 0, color: colors.severity.low },
      { label: 'Info', value: Number(data.info) || 0, color: colors.severity.info },
    ];
  }, [data]);

  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return null;

  const maxValue = Math.max(...items.map(i => i.value), 1);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%', justifyContent: 'center', px: 0.5 }}>
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="caption" sx={{ color: colors.text.secondary, width: 58, textAlign: 'right', fontWeight: 500, fontSize: 11 }}>
              {item.label}
            </Typography>
            <Box sx={{ flex: 1, height: 26, borderRadius: 1.5, background: colors.background.tertiary, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / maxValue) * 100}%` }}
                transition={{ duration: 0.8, delay: i * 0.08 + 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  height: '100%',
                  borderRadius: 6,
                  background: `linear-gradient(90deg, ${item.color}, ${item.color}88)`,
                  boxShadow: `0 0 12px ${item.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: 8,
                  minWidth: item.value > 0 ? 28 : 0,
                }}
              >
                <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, fontSize: 10 }}>
                  {item.value}
                </Typography>
              </motion.div>
            </Box>
            <Typography variant="caption" sx={{ color: colors.text.tertiary, width: 36, fontWeight: 600, fontSize: 11 }}>
              {Math.round((item.value / total) * 100)}%
            </Typography>
          </Box>
        </motion.div>
      ))}
      <Box sx={{ mt: 0.5, pt: 1, borderTop: `1px solid ${colors.border.subtle}`, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: colors.text.tertiary, fontWeight: 500 }}>
          Total: {total}
        </Typography>
      </Box>
    </Box>
  );
};

// ========================================================================
// 2. Vulnerability Trends — Smooth Area Chart
// ========================================================================
export const VulnerabilityTrends = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return null;
    return {
      labels: data.map(d => d.label || d.date?.slice(5) || ''),
      critical: data.map(d => d.critical || 0),
      high: data.map(d => d.high || 0),
      medium: data.map(d => d.medium || 0),
      low: data.map(d => d.low || 0),
    };
  }, [data]);

  if (!chartData) return null;

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <LineChart
        xAxis={[{ scaleType: 'point', data: chartData.labels, sx: axisSx }]}
        series={[
          { data: chartData.critical, label: 'Critical', color: colors.severity.critical, area: true, showMark: false },
          { data: chartData.high, label: 'High', color: colors.severity.high, area: true, showMark: false },
          { data: chartData.medium, label: 'Medium', color: colors.severity.medium, area: true, showMark: false },
          { data: chartData.low, label: 'Low', color: colors.severity.low, area: true, showMark: false },
        ]}
        height={300}
        slotProps={chartSlotProps}
        margin={{ top: 10, bottom: 30, left: 40, right: 120 }}
      />
    </Box>
  );
};

// ========================================================================
// 3. Status Distribution — Modern Donut with Centered Value
// ========================================================================
export const StatusDonut = ({ data }) => {
  const { chartData, total } = useMemo(() => {
    if (!data) return { chartData: [], total: 0 };
    const statusMap = {
      open: { label: 'Open', color: colors.severity.critical },
      inProgress: { label: 'In Progress', color: colors.primary[500] },
      resolved: { label: 'Resolved', color: colors.severity.low },
      closed: { label: 'Closed', color: colors.text.tertiary },
    };
    const items = Object.entries(data)
      .map(([key, val], i) => {
        const config = statusMap[key] || { label: key, color: ['#06B6D4', '#8B5CF6', '#F0883E', '#3FB950', '#58A6FF'][i % 5] };
        return { id: i, value: Number(val) || 0, label: config.label, color: config.color };
      })
      .filter(d => d.value > 0);
    return { chartData: items, total: items.reduce((s, i) => s + i.value, 0) };
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <PieChart
        series={[{
          data: chartData,
          innerRadius: 70,
          outerRadius: 105,
          paddingAngle: 4,
          cornerRadius: 6,
          cx: '45%',
        }]}
        height={280}
        slotProps={chartSlotProps}
        margin={{ top: 10, bottom: 10, left: 10, right: 130 }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '42%',
          left: '38%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <Typography variant="h4" sx={{ color: colors.text.primary, fontWeight: 800, fontSize: { xs: '1.5rem', sm: '1.75rem' }, lineHeight: 1 }}>
          {total}
        </Typography>
        <Typography variant="caption" sx={{ color: colors.text.tertiary, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
          Total
        </Typography>
      </Box>
    </Box>
  );
};

// ========================================================================
// 4. Trend Stacked Bar Chart
// ========================================================================
export const TrendStackedBar = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return null;
    return {
      labels: data.map(d => d.label || d.date?.slice(5) || ''),
      critical: data.map(d => d.critical || 0),
      high: data.map(d => d.high || 0),
      medium: data.map(d => d.medium || 0),
      low: data.map(d => d.low || 0),
    };
  }, [data]);

  if (!chartData) return null;

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <BarChart
        xAxis={[{ scaleType: 'band', data: chartData.labels, sx: axisSx }]}
        series={[
          { data: chartData.critical, label: 'Critical', color: colors.severity.critical, stack: 'total' },
          { data: chartData.high, label: 'High', color: colors.severity.high, stack: 'total' },
          { data: chartData.medium, label: 'Medium', color: colors.severity.medium, stack: 'total' },
          { data: chartData.low, label: 'Low', color: colors.severity.low, stack: 'total' },
        ]}
        height={280}
        slotProps={chartSlotProps}
        margin={{ top: 10, bottom: 30, left: 40, right: 130 }}
      />
    </Box>
  );
};

// ========================================================================
// 5. Project Horizontal Bar
// ========================================================================
export const ProjectHorizontalBar = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.slice(0, 8).map(d => ({
      name: d.name?.length > 16 ? d.name.slice(0, 13) + '...' : d.name,
      value: d.count || d.total || 0,
    }));
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <BarChart
        layout="horizontal"
        yAxis={[{ scaleType: 'band', data: chartData.map(d => d.name), sx: axisSx }]}
        series={[{ data: chartData.map(d => d.value), color: colors.primary[500], label: 'Findings' }]}
        height={300}
        margin={{ left: 100, right: 120, top: 10, bottom: 20 }}
        slotProps={chartSlotProps}
      />
    </Box>
  );
};

// ========================================================================
// 6. Activity Line Chart — Div‑based Open vs Closed per month
// ========================================================================
export const ActivityLine = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    const items = data.map(d => ({
      label: (d.label || d.date || '').length > 6 ? (d.label || d.date || '').slice(0, 3) : (d.label || d.date || ''),
      open: d.created || 0,
      closed: d.closed || 0,
    }));
    const allVals = items.flatMap(i => [i.open, i.closed]);
    const maxVal = Math.max(...allVals, 1);
    return { items, maxVal };
  }, [data]);

  if (!chartData) return null;

  const { items, maxVal } = chartData;
  const yTicks = 4;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((maxVal / yTicks) * i));

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', px: 1 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 1.5, justifyContent: 'flex-end' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: colors.primary[500] }} />
          <Typography variant="caption" sx={{ color: colors.text.secondary, fontSize: 11 }}>Created</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: colors.severity.low }} />
          <Typography variant="caption" sx={{ color: colors.text.secondary, fontSize: 11 }}>Closed</Typography>
        </Box>
      </Box>
      <Box sx={{ flex: 1, display: 'flex', gap: 0 }}>
        {/* Y axis labels */}
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pr: 1, pt: 1, pb: 1, minWidth: 32, textAlign: 'right' }}>
          {yLabels.slice().reverse().map((v, i) => (
            <Typography key={i} variant="caption" sx={{ color: colors.text.tertiary, fontSize: 10, lineHeight: 1 }}>
              {v}
            </Typography>
          ))}
        </Box>
        {/* Chart area */}
        <Box sx={{ flex: 1, position: 'relative', minHeight: 180 }}>
          {/* Grid lines */}
          {yLabels.map((v, i) => (
            <Box key={i} sx={{ position: 'absolute', left: 0, right: 0, top: `${(1 - v / maxVal) * 100}%`, borderTop: `0.5px solid ${colors.border.subtle}`, opacity: 0.5 }} />
          ))}
          {/* Columns */}
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', gap: 0.5 }}>
            {items.map((item, i) => (
              <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, height: '100%', justifyContent: 'flex-end' }}>
                {/* Created (open) bar */}
                <Box sx={{
                  width: '65%', maxWidth: 28, borderRadius: '3px 3px 0 0',
                  height: `${(item.open / maxVal) * 100}%`,
                  background: `linear-gradient(180deg, ${colors.primary[400]}, ${colors.primary[600]})`,
                  opacity: 0.85,
                  minHeight: item.open > 0 ? 4 : 0,
                }} />
                {/* Closed bar */}
                <Box sx={{
                  width: '65%', maxWidth: 28, borderRadius: '3px 3px 0 0',
                  height: `${(item.closed / maxVal) * 100}%`,
                  background: `linear-gradient(180deg, ${colors.severity.low}, #2d8a47)`,
                  opacity: 0.85,
                  minHeight: item.closed > 0 ? 4 : 0,
                }} />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
      {/* X axis labels */}
      <Box sx={{ display: 'flex', gap: 0.5, pl: '32px' }}>
        {items.map((item, i) => (
          <Typography key={i} variant="caption" sx={{ flex: 1, textAlign: 'center', color: colors.text.tertiary, fontSize: 9, pt: 0.5 }}>
            {item.label}
          </Typography>
        ))}
      </Box>
      {/* Value tooltip row */}
      <Box sx={{ display: 'flex', gap: 0.5, pl: '32px', pt: 0.5 }}>
        {items.map((item, i) => (
          <Typography key={i} variant="caption" sx={{ flex: 1, textAlign: 'center', color: colors.text.disabled, fontSize: 8 }}>
            {item.open}/{item.closed}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};

// ========================================================================
// 7. Remediation Progress — Custom Progress Bars
// ========================================================================
export const RemediationProgress = ({ data }) => {
  if (!data || !Array.isArray(data)) return null;
  return (
    <Stack spacing={2.5} sx={{ p: 0.5, height: '100%', justifyContent: 'center' }}>
      {data.slice(0, 6).map((item, i) => (
        <motion.div
          key={item.name || i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: colors.text.secondary, fontWeight: 600, fontSize: 11 }}>
                {item.name}
              </Typography>
              <Typography variant="caption" sx={{ color: colors.text.primary, fontWeight: 700, fontSize: 11 }}>
                {item.progress || 0}%
              </Typography>
            </Box>
            <Box sx={{ height: 8, borderRadius: 4, background: colors.background.tertiary, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, item.progress || 0)}%` }}
                transition={{ duration: 0.8, delay: i * 0.08 + 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  height: '100%',
                  borderRadius: 4,
                  background: `linear-gradient(90deg, ${colors.primary[600]}, ${colors.primary[400]})`,
                  boxShadow: `0 0 8px ${colors.primary[500]}40`,
                }}
              />
            </Box>
          </Box>
        </motion.div>
      ))}
    </Stack>
  );
};

// ========================================================================
// 8. Risk Radar — Security Gauge (0-100)
// ========================================================================
export const RiskRadar = ({ data }) => {
  const score = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return 100;
    const totalRisk = data.reduce((acc, p) => {
      return acc + (p.critical || 0) * 10 + (p.high || 0) * 5 + (p.medium || 0) * 2 + (p.low || 0) * 1;
    }, 0);
    const maxRisk = data.length * 40;
    const normalized = Math.max(0, Math.min(100, Math.round(100 - (totalRisk / (maxRisk || 1)) * 100)));
    return normalized;
  }, [data]);

  const getColor = (s) => {
    if (s >= 80) return colors.severity.low;
    if (s >= 50) return colors.severity.medium;
    if (s >= 30) return colors.severity.high;
    return colors.severity.critical;
  };

  const color = getColor(score);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
      <Box sx={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="70" fill="none" stroke={colors.background.tertiary} strokeWidth="12" />
          <motion.circle
            cx="80" cy="80" r="70"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 440} 440`}
            transform="rotate(-90 80 80)"
            initial={{ strokeDasharray: '0 440' }}
            animate={{ strokeDasharray: `${(score / 100) * 440} 440` }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
          />
        </svg>
        <Box sx={{ position: 'absolute', textAlign: 'center' }}>
          <Typography variant="h3" sx={{ color: colors.text.primary, fontWeight: 800, fontSize: '2rem', lineHeight: 1 }}>
            {score}
          </Typography>
          <Typography variant="caption" sx={{ color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 1, fontSize: 10 }}>
            Security Score
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        {[
          { label: 'Safe', min: 80, color: colors.severity.low },
          { label: 'Moderate', min: 50, color: colors.severity.medium },
          { label: 'Risky', min: 30, color: colors.severity.high },
          { label: 'Critical', min: 0, color: colors.severity.critical },
        ].map(r => (
          <Box key={r.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: r.color, opacity: score >= r.min ? 1 : 0.2 }} />
            <Typography variant="caption" sx={{ color: colors.text.tertiary, fontSize: 9 }}>{r.label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ========================================================================
// 9-16. Aliases & Shared Components
// ========================================================================
export const CompletionArea = VulnerabilityTrends;

export const AgeHistogram = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data || typeof data !== 'object') return null;
    const entries = Object.entries(data).filter(([, v]) => v > 0);
    if (entries.length === 0) return null;
    return {
      labels: entries.map(([k]) => k),
      values: entries.map(([, v]) => v),
    };
  }, [data]);

  if (!chartData) return null;

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <BarChart
        xAxis={[{ scaleType: 'band', data: chartData.labels, sx: axisSx }]}
        series={[{ data: chartData.values, color: colors.severity.high, label: 'Findings' }]}
        height={280}
        slotProps={chartSlotProps}
        margin={{ top: 10, bottom: 30, left: 40, right: 120 }}
      />
    </Box>
  );
};

export const SLAStackedBar = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    return {
      labels: data.map(d => d.label || ''),
      breached: data.map(d => d.Breached || 0),
      atRisk: data.map(d => d['At Risk'] || d.atRisk || 0),
      onTrack: data.map(d => d['On Track'] || d.onTrack || d.compliant || 0),
    };
  }, [data]);

  if (!chartData) return null;

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <BarChart
        xAxis={[{ scaleType: 'band', data: chartData.labels, sx: axisSx }]}
        series={[
          { data: chartData.breached, label: 'Breached', color: colors.severity.critical, stack: 'total' },
          { data: chartData.atRisk, label: 'At Risk', color: colors.severity.high, stack: 'total' },
          { data: chartData.onTrack, label: 'On Track', color: colors.severity.low, stack: 'total' },
        ]}
        height={280}
        slotProps={chartSlotProps}
        margin={{ top: 10, bottom: 30, left: 40, right: 130 }}
      />
    </Box>
  );
};

export const SLACircular = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data) return [];
    return [
      { id: 0, value: Number(data.breached) || 0, label: 'Breached', color: colors.severity.critical },
      { id: 1, value: Number(data.atRisk) || 0, label: 'At Risk', color: colors.severity.high },
      { id: 2, value: Number(data.compliant) || 0, label: 'Compliant', color: colors.severity.low },
    ].filter(d => d.value > 0);
  }, [data]);

  if (chartData.length === 0) return null;
  const total = chartData.reduce((s, i) => s + i.value, 0);

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <PieChart
        series={[{
          data: chartData,
          innerRadius: 65,
          outerRadius: 100,
          paddingAngle: 4,
          cornerRadius: 6,
          cx: '45%',
        }]}
        height={280}
        slotProps={chartSlotProps}
        margin={{ top: 10, bottom: 10, left: 10, right: 130 }}
      />
      <Box sx={{ position: 'absolute', top: '42%', left: '38%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
        <Typography variant="h4" sx={{ color: colors.text.primary, fontWeight: 800, fontSize: { xs: '1.5rem', sm: '1.75rem' }, lineHeight: 1 }}>
          {total}
        </Typography>
        <Typography variant="caption" sx={{ color: colors.text.tertiary, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
          Total
        </Typography>
      </Box>
    </Box>
  );
};

export const TeamWorkload = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.slice(0, 8).map(d => ({
      name: (d.name || d.email || 'Unknown').length > 14 ? (d.name || d.email || 'Unknown').slice(0, 11) + '...' : (d.name || d.email || 'Unknown'),
      value: d.assigned || d.total || 0,
    }));
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <BarChart
        layout="horizontal"
        yAxis={[{ scaleType: 'band', data: chartData.map(d => d.name), sx: axisSx }]}
        series={[{ data: chartData.map(d => d.value), color: colors.secondary[500], label: 'Assigned' }]}
        height={300}
        margin={{ left: 100, right: 120, top: 10, bottom: 20 }}
        slotProps={chartSlotProps}
      />
    </Box>
  );
};

export const DeveloperLeaderboard = ({ data }) => {
  const sorted = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return [...data]
      .sort((a, b) => (b.resolved || b.closureRate || 0) - (a.resolved || a.closureRate || 0))
      .slice(0, 8)
      .map((d, i) => ({
        rank: i + 1,
        name: (d.name || d.email || 'Unknown').length > 14 ? (d.name || d.email || 'Unknown').slice(0, 11) + '...' : (d.name || d.email || 'Unknown'),
        value: d.resolved || Math.round((d.closureRate || 0) * (d.assigned || 1) / 100) || 0,
      }));
  }, [data]);

  if (sorted.length === 0) return null;

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <BarChart
        layout="horizontal"
        yAxis={[{ scaleType: 'band', data: sorted.map(d => `#${d.rank} ${d.name}`), sx: axisSx }]}
        series={[{ data: sorted.map(d => d.value), color: colors.severity.low, label: 'Resolved' }]}
        height={300}
        margin={{ left: 120, right: 120, top: 10, bottom: 20 }}
        slotProps={chartSlotProps}
      />
    </Box>
  );
};

export const ResolutionKPI = ({ data }) => {
  if (!data) return null;
  const kpis = [
    { label: 'Avg Resolution', value: data.avgResolution, suffix: 'h', color: colors.primary[500] },
    { label: 'On-Time Rate', value: data.onTimeRate, suffix: '%', color: colors.severity.low },
    { label: 'Reopened', value: data.reopened, suffix: '', color: colors.severity.high },
    { label: 'Total Assigned', value: data.totalAssigned, suffix: '', color: colors.secondary[500] },
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, height: '100%', p: 1 }}>
      {kpis.map((kpi, i) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <Box
            sx={{
              p: 1.5,
              borderRadius: borderRadius.lg,
              background: `${kpi.color}10`,
              border: `1px solid ${kpi.color}20`,
              textAlign: 'center',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Typography variant="caption" sx={{ color: colors.text.tertiary, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
              {kpi.label}
            </Typography>
            <Typography variant="h5" sx={{ color: colors.text.primary, fontWeight: 700, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              {kpi.value}{kpi.suffix}
            </Typography>
          </Box>
        </motion.div>
      ))}
    </Box>
  );
};

export const AssignmentDonut = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.slice(0, 6).map((d, i) => ({
      id: i,
      value: d.assigned || d.total || d.tasks || 0,
      label: (d.name || d.email || 'Unknown').length > 12 ? (d.name || d.email || 'Unknown').slice(0, 10) + '...' : (d.name || d.email || 'Unknown'),
      color: ['#06B6D4', '#8B5CF6', '#F0883E', '#3FB950', '#58A6FF', '#F472B6'][i % 6],
    })).filter(d => d.value > 0);
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <PieChart
        series={[{
          data: chartData,
          innerRadius: 50,
          outerRadius: 85,
          paddingAngle: 3,
          cornerRadius: 5,
          cx: '45%',
        }]}
        height={280}
        slotProps={chartSlotProps}
        margin={{ top: 10, bottom: 10, left: 10, right: 130 }}
      />
    </Box>
  );
};
