import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Fade,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  FilterList as FilterIcon,
  BugReport as BugReportIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { findingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FindingsSkeleton } from '../components/SkeletonLoader';
import { colors, typography, shadows, borderRadius, componentStyles, getSeverityColor as _getSeverityColor, getSeverityBg, getStatusColor as _getStatusColor } from '../theme/designSystem';
import { sortFindingsByStatusAndSeverity } from '../utils/sortingUtils';

const STATUS_TABS = [
  { label: 'All', key: 'all' },
  { label: 'Open', key: 'open' },
  { label: 'In Progress', key: 'in_progress' },
  { label: 'Under Review', key: 'under_review' },
  { label: 'Resolved', key: 'resolved' },
  { label: 'Closed', key: 'closed' },
  { label: 'Reopened', key: 'reopened' },
  { label: 'Duplicate', key: 'duplicate' },
  { label: 'Accepted Risk', key: 'accepted_risk' },
];

const GlobalFindings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasFullAccess, filterProjectsByAllocation } = useAuth();
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [counts, setCounts] = useState({});
  const [severityCounts, setSeverityCounts] = useState({ critical: 0, high: 0, medium: 0, low: 0, info: 0 });

  const canManageFindings = hasFullAccess();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filter = params.get('filter');
    if (filter) {
      const idx = STATUS_TABS.findIndex(t => t.key === filter);
      if (idx >= 0) setActiveTab(idx);
    }
  }, [location.search]);

  useEffect(() => {
    fetchAllFindings();
  }, []);

  const fetchAllFindings = async () => {
    try {
      setLoading(true);
      const allFindings = await findingAPI.getAllFindings();

      setFindings(allFindings);

      const closedStatuses = ['closed', 'resolved', 'verified', 'accepted_risk', 'duplicate'];
      const closedCount = allFindings.filter(f => closedStatuses.includes(f.status)).length;
      const openCount = allFindings.filter(f => !closedStatuses.includes(f.status)).length;

      const c = { total: allFindings.length, open: openCount, closed: closedCount };
      STATUS_TABS.forEach(tab => {
        if (tab.key === 'all') c[tab.key] = allFindings.length;
        else c[tab.key] = allFindings.filter(f => f.status === tab.key).length;
      });
      setCounts(c);

      const severityBreakdown = {
        critical: allFindings.filter(f => f.severity === 'critical' && !closedStatuses.includes(f.status)).length,
        high: allFindings.filter(f => f.severity === 'high' && !closedStatuses.includes(f.status)).length,
        medium: allFindings.filter(f => f.severity === 'medium' && !closedStatuses.includes(f.status)).length,
        low: allFindings.filter(f => f.severity === 'low' && !closedStatuses.includes(f.status)).length,
        info: allFindings.filter(f => f.severity === 'info' && !closedStatuses.includes(f.status)).length,
      };
      setSeverityCounts(severityBreakdown);
    } catch (error) {
      console.error('Error fetching findings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getFilteredFindings = () => {
    const key = STATUS_TABS[activeTab].key;
    if (key === 'all') return findings;
    return findings.filter(f => f.status === key);
  };

  const getSeverityColor = _getSeverityColor;
  const getSeverityBgColor = (s) => getSeverityBg(s);
  const getStatusColor = _getStatusColor;

  const filteredFindings = useMemo(() => {
    const filtered = getFilteredFindings();
    return sortFindingsByStatusAndSeverity(filtered);
  }, [findings, activeTab]);

  if (loading) return <FindingsSkeleton />;

  return (
    <Box sx={{ minHeight: '100vh', background: colors.background.primary, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: colors.text.primary, mb: 0.75, letterSpacing: '-0.02em', display: 'inline-flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => navigate('/dashboard')} sx={{ color: colors.text.tertiary }}>
              <ArrowBackIcon />
            </IconButton>
            Kavach Administrator
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: colors.text.primary, lineHeight: 1.1 }}>
            All Vulnerability Findings
          </Typography>
          <Typography variant="body1" sx={{ color: colors.text.secondary, mt: 1 }}>
            Enterprise-wide security vulnerability management ({findings.length} total)
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { color: colors.text.tertiary, minHeight: 48, textTransform: 'none', fontWeight: 600 },
            '& .Mui-selected': { color: colors.primary[500] },
            '& .MuiTabs-indicator': { backgroundColor: colors.primary[500] },
          }}
        >
          {STATUS_TABS.map((tab, i) => (
            <Tab
              key={tab.key}
              label={
                <Badge
                  badgeContent={counts[tab.key] || 0}
                  color={i === 0 ? 'primary' : 'default'}
                  sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', height: 18, minWidth: 18 } }}
                >
                  <Typography sx={{ px: 1 }}>{tab.label}</Typography>
                </Badge>
              }
            />
          ))}
        </Tabs>
      </Box>

      <Grid container spacing={3}>
        {filteredFindings.map((finding, index) => (
          <Grid item xs={12} md={6} lg={4} key={finding._id || finding.id}>
            <Card
              onClick={() => {
                const pid = finding.project?._id || finding.project?.id || finding.project;
                if (pid) navigate(`/projects/${pid}/findings/${finding._id || finding.id}`);
              }}
              sx={{
                ...componentStyles.card.interactive,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`,
                '@keyframes fadeInUp': {
                  from: { opacity: 0, transform: 'translateY(20px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
                cursor: 'pointer',
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: '3px',
                  background: getSeverityColor(finding.severity),
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1, p: 3 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', color: colors.text.primary, mb: 0.5 }}>
                    {finding.title || 'Untitled Finding'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: colors.primary[500], fontFamily: 'monospace', fontWeight: 600, display: 'block', mb: 0.5 }}>
                    {finding.project?.name || 'Unknown Project'} ({finding.project?.code || 'N/A'})
                  </Typography>
                  {finding.project?.client && (
                    <Typography variant="caption" sx={{                     color: colors.text.tertiary, display: 'block', mb: 0.5 }}>
                      Client: {finding.project.client}
                    </Typography>
                  )}
                  <Typography variant="caption" sx={{ color: colors.text.tertiary, fontSize: '11px', fontFamily: 'monospace' }}>
                    ID: {finding.findingId || `Vuln_${String((finding._id || finding.id || '').slice(-6) || '000000').padStart(7, '0')}`}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip
                    label={finding.severity}
                    size="small"
                    sx={{
                      fontWeight: 600, textTransform: 'uppercase', px: 1, borderRadius: 2,
                      backgroundColor: getSeverityBgColor(finding.severity),
                      color: getSeverityColor(finding.severity),
                      border: `1px solid ${getSeverityColor(finding.severity)}40`,
                    }}
                  />
                  <Chip
                    label={finding.status?.replace(/_/g, ' ')}
                    size="small"
                    sx={{
                      fontWeight: 600, textTransform: 'capitalize', px: 1, borderRadius: 2,
                      backgroundColor: `${getStatusColor(finding.status)}20`,
                      color: getStatusColor(finding.status),
                      border: `1px solid ${getStatusColor(finding.status)}40`,
                    }}
                  />
                </Box>

                <Box sx={{ p: 2, backgroundColor: colors.background.tertiary, borderRadius: 2, border: `1px solid ${colors.border.subtle}` }}>
                  <Typography variant="body2" sx={{ color: colors.text.secondary, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {finding.description}
                  </Typography>
                </Box>

                {finding.assignee && (
                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: colors.text.tertiary }}>Assigned to:</Typography>
                    <Chip
                      label={finding.assignee?.name || finding.assignee?.email || 'Unknown'}
                      size="small"
                      sx={{ backgroundColor: `${colors.primary[500]}15`, color: colors.primary[400], fontWeight: 500 }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {!loading && filteredFindings.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <BugReportIcon sx={{ fontSize: 64, color: `${colors.text.tertiary}50`, mb: 2 }} />
          <Typography variant="h6" sx={{ color: colors.text.secondary, fontWeight: 600, mb: 1 }}>
            No Findings Found
          </Typography>
          <Typography variant="body2" sx={{ color: colors.text.tertiary }}>
            {findings.length === 0
              ? 'No findings have been reported yet.'
              : 'No findings match the selected status filter.'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default GlobalFindings;
