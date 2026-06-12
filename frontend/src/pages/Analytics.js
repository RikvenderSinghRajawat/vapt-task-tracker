import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';
import { colors, typography, borderRadius } from '../theme/designSystem';
import { analyticsAPI } from '../services/api';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import SummaryCards from '../components/analytics/SummaryCards';
import ChartCard from '../components/analytics/ChartCard';
import EmptyState from '../components/analytics/EmptyState';
import {
  SeverityDonut, VulnerabilityTrends, ActivityLine, StatusDonut, TrendStackedBar,
  ProjectHorizontalBar, RemediationProgress, CompletionArea,
  RiskRadar, AgeHistogram, SLAStackedBar, SLACircular,
  TeamWorkload, DeveloperLeaderboard, ResolutionKPI, AssignmentDonut,
} from '../components/analytics/AnalyticsCharts';

// ========================================================================
// Icons (inline SVG for zero dependency)
// ========================================================================
const RefreshIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const SectionHeader = ({ title, subtitle, action }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, mt: { xs: 2, sm: 3 } }}>
      <Box>
        <Typography
          variant="h6"
          sx={{
            color: colors.text.primary,
            fontSize: typography.size.lg,
            fontWeight: typography.weight.semibold,
            letterSpacing: typography.tracking.tight,
            position: 'relative',
            display: 'inline-block',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -3,
              left: 0,
              width: 28,
              height: 2.5,
              borderRadius: 2,
              background: `linear-gradient(90deg, ${colors.primary[500]}, ${colors.primary[500]}00)`,
            },
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            sx={{
              color: colors.text.tertiary,
              fontSize: typography.size.sm,
              mt: 1,
              fontStyle: 'italic',
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box>{action}</Box>}
    </Box>
  </motion.div>
);

// ========================================================================
// Grid Components
// ========================================================================
const ChartGrid = ({ children, cols = { xs: 1, sm: 2, lg: 3 } }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: {
        xs: `repeat(${Math.min(cols.xs || 1, 1)}, 1fr)`,
        sm: `repeat(${Math.min(cols.sm || 2, 2)}, 1fr)`,
        md: `repeat(${Math.min(cols.md || cols.sm || 2, 3)}, 1fr)`,
        lg: `repeat(${cols.lg || 3}, 1fr)`,
      },
      gap: { xs: 1.5, sm: 2 },
      alignItems: 'stretch',
    }}
  >
    {children}
  </Box>
);

const Grid2 = ({ children }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: { xs: 1.5, sm: 2 }, alignItems: 'stretch' }}>
    {children}
  </Box>
);

const Grid3 = ({ children }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 1.5, sm: 2 }, alignItems: 'stretch' }}>
    {children}
  </Box>
);

const Grid4 = ({ children }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 1.5, sm: 2 }, alignItems: 'stretch' }}>
    {children}
  </Box>
);

const Grid5 = ({ children }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: { xs: 1.5, sm: 2 }, alignItems: 'stretch' }}>
    {children}
  </Box>
);

// ========================================================================
// Error Alert
// ========================================================================
const ErrorAlert = ({ message, onRetry }) => (
  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 16 }}>
    <Box
      sx={{
        p: 2,
        borderRadius: borderRadius.lg,
        background: `${colors.severity.critical}12`,
        border: `1px solid ${colors.severity.critical}30`,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.severity.critical} strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <Typography sx={{ color: colors.text.secondary, fontSize: typography.size.sm, flex: 1 }}>
        {message}
      </Typography>
      {onRetry && (
        <Box
          onClick={onRetry}
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.75,
            color: colors.primary[400], cursor: 'pointer',
            fontSize: typography.size.sm, fontWeight: 500,
            '&:hover': { color: colors.primary[300] },
            transition: 'color 0.15s ease',
          }}
        >
          <RefreshIcon size={14} /> Retry
        </Box>
      )}
    </Box>
  </motion.div>
);

// ========================================================================
// Main Analytics Component
// ========================================================================
const Analytics = () => {
  // Raw API data
  const [stats, setStats] = useState(null);
  const [advancedApi, setAdvancedApi] = useState(null);
  const [severityDist, setSeverityDist] = useState(null);
  const [findingsTrend, setFindingsTrend] = useState(null);
  const [projectPerf, setProjectPerf] = useState(null);
  const [teamPerf, setTeamPerf] = useState(null);
  const [slaCompliance, setSlaCompliance] = useState(null);
  const [ageData, setAgeData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        analyticsAPI.getDashboardStats(),
        analyticsAPI.getAdvancedAnalytics(),
        analyticsAPI.getSeverityDistribution(),
        analyticsAPI.getFindingsTrend('6months'),
        analyticsAPI.getProjectPerformance(),
        analyticsAPI.getTeamPerformance(),
        analyticsAPI.getSLACompliance(),
        analyticsAPI.getFindingAge(),
      ]);
      const [d, adv, sev, trend, pp, tp, sla, age] = results;
      if (d.status === 'fulfilled') setStats(d.value);
      if (adv.status === 'fulfilled') setAdvancedApi(adv.value);
      if (sev.status === 'fulfilled') setSeverityDist(sev.value);
      if (trend.status === 'fulfilled') setFindingsTrend(trend.value);
      if (pp.status === 'fulfilled') setProjectPerf(pp.value);
      if (tp.status === 'fulfilled') setTeamPerf(tp.value);
      if (sla.status === 'fulfilled') setSlaCompliance(sla.value);
      if (age.status === 'fulfilled') setAgeData(age.value);
      if (d.status === 'rejected' && adv.status === 'rejected') {
        setError('Some analytics data could not be loaded. Partial data shown below.');
      }
    } catch {
      setError('Failed to load analytics. Please check your connection.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => fetchAll(true), 12000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // ======================================================================
  // Processed data for chart components
  // ======================================================================
  const processed = useMemo(() => {
    // 1. Summary card data
    const s = stats || {};
    const summaryData = {
      projects: Number(s.totalProjects || s.projects?.total || 0),
      findings: Number(s.openFindings || s.findings?.open || s.findings?.total || 0),
      critical: Number(s.criticalFindings || s.findings?.critical || 0),
      sla: Number(s.slaBreaches || s.slaBreachRate || 0),
      rate: Number(s.resolutionRate || s.metrics?.resolutionRate || 0),
      time: Number(s.avgResolutionTime || s.metrics?.avgResolutionTime || 0),
    };

    // 2. Advanced stats
    const adv = advancedApi || {};
    const advSev = adv.severityDistribution || {};
    const monthlyTrend = adv.monthlyTrend || [];
    const recentFindings = adv.recentFindings || [];

    // 3. Severity distribution
    const severityObj = {
      critical: Number(severityDist?.critical || advSev.critical || s.criticalFindings || s.findings?.critical || 0),
      high: Number(severityDist?.high || advSev.high || s.highFindings || s.findings?.high || 0),
      medium: Number(severityDist?.medium || advSev.medium || s.mediumFindings || s.findings?.medium || 0),
      low: Number(severityDist?.low || advSev.low || s.lowFindings || s.findings?.low || 0),
      info: Number(severityDist?.info || advSev.info || s.infoFindings || s.findings?.info || 0),
    };

    const statusDist = adv.statusDistribution || {};

    // 4. Monthly trend for area/line/bar
    const trendSrc = findingsTrend || [];
    const trendData = monthlyTrend.length > 0
      ? monthlyTrend.map(m => ({
          label: m.label,
          created: m.created || 0,
          closed: m.closed || 0,
          completed: m.closed || 0,
          total: m.created || 0,
          critical: m.critical || 0,
          high: m.high || 0,
          medium: m.medium || 0,
          low: m.low || 0,
        }))
      : trendSrc.map(m => ({
          label: m.label,
          created: m.created || 0,
          closed: m.closed || 0,
          completed: m.closed || 0,
          total: m.created || 0,
          critical: m.critical || 0,
          high: m.high || 0,
          medium: m.medium || 0,
          low: m.low || 0,
        }));

    // 5. Status distribution from API
    const statusData = {
      open: Number(statusDist.open || 0),
      inProgress: Number(statusDist.in_progress || statusDist['in-progress'] || 0),
      resolved: Number(statusDist.resolved || 0),
      closed: Number(statusDist.closed || statusDist.verified || 0),
    };

    // 6. Project data (now includes finding counts from backend)
    const projects = Array.isArray(projectPerf) && projectPerf.length > 0
      ? projectPerf
      : (recentFindings.length > 0 ? (() => {
          const map = {};
          recentFindings.forEach(f => {
            const pid = f.project?._id || f.projectId || 'unknown';
            const pname = f.project?.name || f.projectName || 'Unassigned';
            if (!map[pid]) map[pid] = { name: pname, critical: 0, high: 0, medium: 0, low: 0, open: 0, closed: 0, total: 0, status: f.project?.status || 'active' };
            map[pid].total++;
            const sev = (f.severity || 'low').toLowerCase();
            if (['critical', 'high', 'medium', 'low'].includes(sev)) map[pid][sev]++;
            const st = (f.status || 'open').toLowerCase();
            if (['closed', 'verified', 'resolved'].includes(st)) map[pid].closed++;
            else map[pid].open++;
          });
          Object.values(map).forEach(p => { p.progress = p.total > 0 ? Math.round((p.closed / p.total) * 100) : 0; });
          return Object.values(map);
        })() : []);

    const sortedByRisk = [...projects].sort(
      (a, b) => (b.critical * 4 + b.high * 3 + b.medium * 2 + b.low) - (a.critical * 4 + a.high * 3 + a.medium * 2 + a.low)
    );
    const sortedByTotal = [...projects].sort((a, b) => b.total - a.total);

    // 7. SLA - map backend { onTrack } to { compliant }
    const sla = slaCompliance || {};
    const slaData = {
      compliant: Number(sla.compliant || sla.onTrack || 0),
      atRisk: Number(sla.atRisk || 0),
      breached: Number(sla.breached || 0),
      total: Number(sla.total || 0) || Number(sla.onTrack || 0) + Number(sla.atRisk || 0) + Number(sla.breached || 0) + Number(sla.overdue || 0),
    };

    // 8. Age buckets - convert backend array [{ bucket, open, closed }] to object { '0-7': N, ... }
    const ageArr = Array.isArray(ageData) ? ageData : [];
    const bucketMap = { '0-7d': '0-7', '8-15d': '7-14', '16-30d': '14-30', '31-60d': '30-60', '60d+': '90+' };
    const age = {};
    ageArr.forEach(b => {
      const key = bucketMap[b.bucket];
      if (key) age[key] = (age[key] || 0) + (b.open || 0);
    });

    // 9. Team performance - map to chart formats
    const rawTeam = Array.isArray(teamPerf) ? teamPerf : (teamPerf?.members || teamPerf?.users || []);
    const team = rawTeam.map(t => ({
      name: t.user?.name || t.name || t.email || 'Unknown',
      email: t.user?.email || t.email || '',
      critical: Number(t.findings?.critical || t.critical || 0),
      assigned: Number(t.findings?.assigned || t.assigned || 0),
      resolved: Number(t.findings?.closed || t.closed || t.resolved || 0),
      closureRate: Number(t.findings?.closureRate || t.closureRate || 0),
      overdue: Number(t.findings?.overdue || t.overdue || 0),
      high: Number(t.findings?.high || t.high || 0),
      medium: Number(t.findings?.medium || t.medium || 0),
      low: Number(t.findings?.low || t.low || 0),
    }));
    const slaTrendData = slaData.total > 0
      ? [{ label: 'SLA Overview', Breached: slaData.breached, 'At Risk': slaData.atRisk, 'On Track': slaData.compliant }]
      : [];

    // 10. Resolution metrics
    const totalFindings = summaryData.critical + severityObj.high + severityObj.medium + severityObj.low + severityObj.info
      || s.totalFindings || s.findings?.total || 0;
    const totalClosed = statusData.closed + statusData.resolved || 0;
    const resolutionMetrics = {
      avgResolution: summaryData.time,
      onTimeRate: totalFindings > 0 ? Math.round((totalClosed / totalFindings) * 100) : 0,
      reopened: Number(s.reopened || s.findings?.reopened || 0),
      totalAssigned: team.reduce((acc, t) => acc + Number(t.assigned || t.total || t.tasks || 0), 0) || totalFindings,
    };

    return {
      summaryData,
      severityObj,
      trendData,
      statusData,
      slaData,
      slaTrendData,
      age,
      projects,
      sortedByRisk,
      sortedByTotal,
      team,
      resolutionMetrics,
      _recent: recentFindings,
    };
  }, [stats, advancedApi, severityDist, findingsTrend, projectPerf, teamPerf, slaCompliance, ageData]);

  // ======================================================================
  // Helper: check if data exists
  // ======================================================================
  const hasTrend = processed.trendData.length > 0;
  const hasSeverity = Object.values(processed.severityObj).some(v => v > 0);
  const hasStatus = Object.values(processed.statusData).some(v => v > 0);
  const hasSLA = processed.slaData.total > 0 || processed.slaTrendData.length > 0;
  const hasProjects = processed.projects.length > 0;
  const hasAge = Object.keys(processed.age).length > 0 && Object.values(processed.age).some(v => v > 0);
  const hasTeam = processed.team.length > 0;

  // Special empty state when absolutely nothing loaded
  const totallyEmpty = !hasTrend && !hasSeverity && !hasProjects && !hasSLA && processed.summaryData.projects === 0 && processed.summaryData.findings === 0;

  // ======================================================================
  // Load Skeleton
  // ======================================================================
  if (loading) return <DashboardSkeleton />;

  // ======================================================================
  // Render
  // ======================================================================
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <Box sx={{ minHeight: '100vh', background: colors.background.primary, p: { xs: 1.5, sm: 2, md: 3 }, pb: 6 }}>
        {/* ---------- Header ---------- */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 3, gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: typography.weight.bold,
                  color: colors.text.primary,
                  fontSize: { xs: '1.35rem', sm: '1.5rem', md: '1.75rem' },
                  letterSpacing: typography.tracking.tight,
                  background: `linear-gradient(135deg, ${colors.text.primary}, ${colors.primary[400]})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Security Analytics
              </Typography>
              <Typography variant="body2" sx={{ color: colors.text.tertiary, mt: 0.5, WebkitTextFillColor: colors.text.tertiary }}>
                Real-time vulnerability posture, remediation tracking, and team performance metrics
              </Typography>
            </Box>
            <Tooltip title="Refresh data" arrow>
              <IconButton
                onClick={fetchAll}
                sx={{
                  color: colors.text.tertiary,
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.subtle}`,
                  borderRadius: borderRadius.lg,
                  p: 1,
                  transition: 'all 0.2s ease',
                  '&:hover': { color: colors.primary[400], borderColor: colors.primary[800], background: `${colors.primary[500]}08`, transform: 'rotate(180deg)' },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </motion.div>

        {/* ---------- Error Alert ---------- */}
        {error && <ErrorAlert message={error} onRetry={fetchAll} />}

        {/* ================================================================ */}
        {/* 1. SUMMARY CARDS                                                */}
        {/* ================================================================ */}
        <SummaryCards data={processed.summaryData} loading={false} />

        {/* ================================================================ */}
        {/* 2. VULNERABILITY POSTURE                                        */}
        {/* ================================================================ */}
        <SectionHeader title="Vulnerability Posture" subtitle="Severity breakdown and trend analysis across all projects" />

        <Grid5>
          <ChartCard title="Vulnerability Trends" severity="info" delay={0.1} minHeight={380}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
          >
            {hasTrend ? <VulnerabilityTrends data={processed.trendData} /> : <EmptyState message="Create findings over time to see vulnerability trends" />}
          </ChartCard>

          <ChartCard title="Severity Distribution" severity="critical" delay={0.15} minHeight={380}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            }
          >
            {hasSeverity ? <SeverityDonut data={processed.severityObj} /> : <EmptyState message="Log findings with severity levels to see distribution" />}
          </ChartCard>

          <ChartCard title="Resolution Metrics" severity="low" delay={0.2} minHeight={380}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
          >
            <ResolutionKPI data={processed.resolutionMetrics} />
          </ChartCard>
        </Grid5>

        {/* ================================================================ */}
        {/* 3. FINDING ANALYTICS                                            */}
        {/* ================================================================ */}
        <SectionHeader title="Finding Analytics" subtitle="Activity patterns, status distribution, and monthly finding trends" />

        <Grid2>
          <ChartCard title="Finding Activity" severity="info" delay={0.1} minHeight={350}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
              </svg>
            }
          >
            {hasTrend ? <ActivityLine data={processed.trendData} /> : <EmptyState message="Findings created over time will appear here" />}
          </ChartCard>

          <ChartCard title="Finding Status" severity="medium" delay={0.15} minHeight={350}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
          >
            {hasStatus ? <StatusDonut data={processed.statusData} /> : <EmptyState message="Findings with status updates will populate this chart" />}
          </ChartCard>
        </Grid2>

        <Box sx={{ mt: 2 }}>
          <ChartGrid cols={{ xs: 1, sm: 1, md: 1, lg: 1 }}>
            <ChartCard title="Monthly Finding Trends" severity="default" delay={0.2} minHeight={320}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              }
            >
              {hasTrend ? <TrendStackedBar data={processed.trendData} /> : <EmptyState message="Monthly finding data will display as findings are logged" />}
            </ChartCard>
          </ChartGrid>
        </Box>

        {/* ================================================================ */}
        {/* 4. PROJECT PERFORMANCE                                          */}
        {/* ================================================================ */}
        <SectionHeader title="Project Performance" subtitle="Status distribution, remediation progress, and completion timelines" />

        <Grid3>
          <ChartCard title="Project Status" severity="info" delay={0.1} minHeight={350}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            }
          >
            {hasProjects ? <ProjectHorizontalBar data={processed.projects} /> : <EmptyState message="Add projects to see status distribution" />}
          </ChartCard>

          <ChartCard title="Remediation Progress" severity="low" delay={0.15} minHeight={350}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
              </svg>
            }
          >
            {hasProjects ? <RemediationProgress data={processed.sortedByTotal} /> : <EmptyState message="Track findings within projects to see remediation progress" />}
          </ChartCard>

          <ChartCard title="Completion Timeline" severity="medium" delay={0.2} minHeight={350}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            }
          >
            {hasTrend ? <CompletionArea data={processed.trendData} /> : <EmptyState message="Finding completion data over time will display here" />}
          </ChartCard>
        </Grid3>

        {/* ================================================================ */}
        {/* 5. RISK & SLA                                                   */}
        {/* ================================================================ */}
        <SectionHeader title="Risk & SLA Analysis" subtitle="Top risk projects, finding age, SLA exposure, and compliance rates" />

        <Grid4>
          <ChartCard title="Top Risk Projects" severity="critical" delay={0.1} minHeight={320}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            }
          >
            {hasProjects ? <RiskRadar data={processed.sortedByRisk} /> : <EmptyState message="Projects with findings data will appear in risk radar" />}
          </ChartCard>

          <ChartCard title="Finding Age" severity="high" delay={0.15} minHeight={320}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            }
          >
            {hasAge ? <AgeHistogram data={processed.age} /> : <EmptyState message="Finding age data will appear as findings are created" />}
          </ChartCard>

          <ChartCard title="SLA Exposure" severity="medium" delay={0.2} minHeight={320}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            }
          >
            {hasSLA ? <SLAStackedBar data={processed.slaTrendData} /> : <EmptyState message="SLA tracking activates when findings have severity-based SLAs" />}
          </ChartCard>

          <ChartCard title="SLA Compliance" severity="low" delay={0.25} minHeight={320}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
          >
            {hasSLA ? <SLACircular data={processed.slaData} /> : <EmptyState message="SLA compliance metrics appear once findings have SLA deadlines" />}
          </ChartCard>
        </Grid4>

        {/* ================================================================ */}
        {/* 6. TEAM PERFORMANCE                                             */}
        {/* ================================================================ */}
        <SectionHeader title="Team Performance" subtitle="Workload distribution, productivity ranking, and assignment breakdown" />

        <Grid3>
          <ChartCard title="Team Workload" severity="default" delay={0.1} minHeight={380}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          >
            {hasTeam ? <TeamWorkload data={processed.team} /> : <EmptyState message="Assign findings to team members to see workload distribution" />}
          </ChartCard>

          <ChartCard title="Developer Productivity" severity="low" delay={0.15} minHeight={380}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
          >
            {hasTeam ? <DeveloperLeaderboard data={processed.team} /> : <EmptyState message="Developer productivity data shows when tasks are assigned and completed" />}
          </ChartCard>

          <ChartCard title="Assignment Distribution" severity="info" delay={0.2} minHeight={380}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            }
          >
            {hasTeam ? <AssignmentDonut data={processed.team} /> : <EmptyState message="Finding assignments to team members appear here" />}
          </ChartCard>
        </Grid3>

        {/* ================================================================ */}
        {/* 7. TOTALLY EMPTY STATE (only if absolutely no data)             */}
        {/* ================================================================ */}
        {totallyEmpty && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Box
              sx={{
                mt: 6,
                p: 6,
                borderRadius: borderRadius['2xl'],
                background: `linear-gradient(135deg, ${colors.background.secondary}, ${colors.background.tertiary})`,
                border: `1px solid ${colors.border.subtle}`,
                textAlign: 'center',
              }}
            >
              <Box sx={{ maxWidth: 400, mx: 'auto' }}>
                <EmptyState
                  title="No Analytics Data Available"
                  message="Start by creating projects and logging findings. Analytics will populate automatically as data accumulates."
                  icon={
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  }
                />
              </Box>
            </Box>
          </motion.div>
        )}
      </Box>
    </motion.div>
  );
};

export default Analytics;
