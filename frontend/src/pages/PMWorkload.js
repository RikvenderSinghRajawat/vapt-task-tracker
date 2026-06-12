import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Avatar,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Schedule as ClockIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as TaskIcon,
  Folder as FolderIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { projectAPI, findingAPI, userAPI } from '../services/api';
import { calculateProjectRisk, calculateSLAStatus } from '../utils/findingAnalytics';
import { glassStyles } from '../theme/premiumTheme';
import GlassCard from '../components/premium/GlassCard';
import DeveloperAssignment from '../modules/pm/components/DeveloperAssignment';
import { useNavigate } from 'react-router-dom';

const severityColors = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};
const severityKeys = ['critical', 'high', 'medium', 'low'];

const PMWorkload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [projects, setProjects] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamStats, setTeamStats] = useState({
    totalFindings: 0,
    overdueCount: 0,
    atRiskCount: 0,
    avgRiskScore: 0,
  });

  const fetchPMData = async () => {
    setLoading(true);
    try {
      const allProjects = await projectAPI.getProjects() || [];
      const projectsWithFindings = await Promise.all(
        allProjects.map(async (project) => {
          const projectId = project._id || project.id;
          if (!projectId) return null;
          try {
            const findings = await findingAPI.getFindings(projectId).catch(() => []);
            const riskData = calculateProjectRisk(findings);
            return {
              ...project,
              findings,
              riskScore: riskData.overallScore || 0,
              riskLevel: riskData.level || 'low',
              breakdown: riskData.severityDistribution || {},
              metrics: {
                totalFindings: riskData.metrics?.totalFindings || findings.length,
                openFindings: riskData.metrics?.openFindings || findings.filter(f => f.status !== 'closed').length,
                criticalOpen: riskData.metrics?.criticalOpen || findings.filter(f => f.severity === 'critical' && f.status !== 'closed').length,
                highOpen: riskData.metrics?.highOpen || findings.filter(f => f.severity === 'high' && f.status !== 'closed').length,
              },
            };
          } catch (err) {
            return { ...project, findings: [], riskScore: 0, riskLevel: 'low', breakdown: {}, metrics: { totalFindings: 0, openFindings: 0, criticalOpen: 0, highOpen: 0 } };
          }
        })
      );

      const enhancedProjects = projectsWithFindings.filter(Boolean);
      setProjects(enhancedProjects);

      let allUsers = [];
      try { allUsers = await userAPI.getUsers(); } catch (_) {}
      const developerUsers = allUsers.filter(u => u.role === 'developer' && u.isActive !== false);

      const devWorkload = developerUsers.map(dev => {
        let assignedFindings = 0;
        let overdueFindings = 0;
        let criticalFindings = 0;
        const assignedProjectNames = [];

        enhancedProjects.forEach(project => {
          const isDevAllocated = (dev.allocatedProjects || []).includes(project.id);
          if (!isDevAllocated) return;

          assignedProjectNames.push(project.name);

          const devFindings = (project.findings || []).filter(f => {
            const allAssigned = [
              ...(Array.isArray(f.assignedDevelopers) ? f.assignedDevelopers.map(a => a.id || a._id || a) : []),
              f.assignee ? (f.assignee.id || f.assignee._id || f.assignee) : null,
            ].filter(Boolean);
            const devId = dev.id || dev._id || dev.uid;
            return allAssigned.includes(devId);
          });

          assignedFindings += devFindings.length;
          devFindings.forEach(f => {
            if (f.severity === 'critical') criticalFindings++;
            const sla = calculateSLAStatus(f);
            if (sla.isBreached) overdueFindings++;
          });
        });

        const workloadScore = Math.min((assignedFindings / 10) * 100, 100);
        const availability = assignedFindings === 0 ? 'available' :
          workloadScore >= 100 ? 'overloaded' :
          workloadScore >= 75 ? 'busy' : 'available';

        return {
          id: dev.id || dev._id,
          uid: dev.uid,
          name: dev.name,
          email: dev.email,
          assignedFindings,
          overdueFindings,
          criticalFindings,
          assignedProjects: assignedProjectNames.length,
          assignedProjectList: assignedProjectNames,
          workloadScore,
          availability,
        };
      });

      devWorkload.sort((a, b) => b.workloadScore - a.workloadScore);
      setDevelopers(devWorkload);

      const allFindings = enhancedProjects.flatMap(p => p.findings || []);
      let overdueCount = 0;
      let atRiskCount = 0;
      allFindings.forEach(f => {
        const sla = calculateSLAStatus(f);
        if (sla.isBreached) overdueCount++;
        else if (sla.isAtRisk) atRiskCount++;
      });

      setTeamStats({
        totalFindings: allFindings.length,
        overdueCount,
        atRiskCount,
        avgRiskScore: enhancedProjects.length > 0
          ? Math.round(enhancedProjects.reduce((s, p) => s + (p.riskScore || 0), 0) / enhancedProjects.length)
          : 0,
      });
    } catch (error) {
      console.error('Failed to fetch PM data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeListeners = useCallback(() => {
    if (!user) return;
    return () => {};
  }, [user]);

  useEffect(() => {
    fetchPMData();
    const cleanup = setupRealtimeListeners();
    return cleanup;
  }, [user, setupRealtimeListeners]);

  const getRiskColor = (score) => {
    if (score >= 70) return '#ef4444';
    if (score >= 50) return '#f97316';
    if (score >= 30) return '#eab308';
    return '#22c55e';
  };

  const getAvailabilityColor = (status) => {
    switch (status) {
      case 'available': return '#22c55e';
      case 'busy': return '#eab308';
      case 'overloaded': return '#ef4444';
      default: return '#64748b';
    }
  };

  const renderProjectCard = (project) => (
    <Grid item xs={12} md={6} key={project.id}>
      <Card
        sx={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.9))',
          border: '1px solid rgba(148,163,184,0.15)',
          borderRadius: 3,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            borderColor: 'rgba(6,182,212,0.3)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          },
        }}
        onClick={() => navigate(`/projects/${project.id}`)}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 600, mb: 0.25 }}>
                {project.name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                {project.code} &middot; {project.status?.replace('_', ' ')}
              </Typography>
            </Box>
            <Chip
              label={project.riskLevel}
              size="small"
              sx={{
                backgroundColor: `${getRiskColor(project.riskScore || 0)}20`,
                color: getRiskColor(project.riskScore || 0),
                fontWeight: 600,
                textTransform: 'capitalize',
                fontSize: '0.7rem',
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Box sx={{ flex: 1 }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(project.riskScore || 0, 100)}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getRiskColor(project.riskScore || 0),
                  },
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600, minWidth: 32, textAlign: 'right' }}>
              {project.riskScore || 0}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
            {severityKeys.map(sev => {
              const count = project.breakdown?.[sev] || 0;
              if (!count) return null;
              return (
                <Chip
                  key={sev}
                  label={`${sev.charAt(0).toUpperCase()}: ${count}`}
                  size="small"
                  sx={{
                    backgroundColor: `${severityColors[sev]}20`,
                    color: severityColors[sev],
                    fontSize: '0.7rem',
                    height: 22,
                  }}
                />
              );
            })}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              <FolderIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
              {project.metrics?.openFindings || 0} open findings
            </Typography>
            <Button
              size="small"
              variant="text"
              endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
              sx={{ color: '#06b6d4', textTransform: 'none', fontSize: '0.75rem' }}
              onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}
            >
              View
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700, mb: 0.5 }}>
        Team Workload
      </Typography>
      <Typography variant="body1" sx={{ color: '#94a3b8', mb: 3 }}>
        Manage project allocation, monitor team workload, and track SLA compliance
      </Typography>

      {/* Team Overview Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <GlassCard>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TaskIcon sx={{ color: '#06b6d4', fontSize: 36 }} />
              <Box>
                <Typography variant="h5" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                  {teamStats.totalFindings}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  Total Findings
                </Typography>
              </Box>
            </Box>
          </GlassCard>
        </Grid>
        <Grid item xs={6} sm={3}>
          <GlassCard>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <WarningIcon sx={{ color: '#ef4444', fontSize: 36 }} />
              <Box>
                <Typography variant="h5" sx={{ color: '#ef4444', fontWeight: 700 }}>
                  {teamStats.overdueCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  SLA Breached
                </Typography>
              </Box>
            </Box>
          </GlassCard>
        </Grid>
        <Grid item xs={6} sm={3}>
          <GlassCard>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ClockIcon sx={{ color: '#f97316', fontSize: 36 }} />
              <Box>
                <Typography variant="h5" sx={{ color: '#f97316', fontWeight: 700 }}>
                  {teamStats.atRiskCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  SLA At Risk
                </Typography>
              </Box>
            </Box>
          </GlassCard>
        </Grid>
        <Grid item xs={6} sm={3}>
          <GlassCard>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TrendingUpIcon sx={{ color: getRiskColor(teamStats.avgRiskScore), fontSize: 36 }} />
              <Box>
                <Typography variant="h5" sx={{ color: getRiskColor(teamStats.avgRiskScore), fontWeight: 700 }}>
                  {teamStats.avgRiskScore}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  Avg Risk Score
                </Typography>
              </Box>
            </Box>
          </GlassCard>
        </Grid>
      </Grid>

      {/* Step indicator */}
      <Paper sx={{ ...glassStyles.card, mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          textColor="primary"
          indicatorColor="primary"
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': { color: '#94a3b8', fontWeight: 500, textTransform: 'none', fontSize: '0.85rem' },
            '& .Mui-selected': { color: '#06b6d4' },
          }}
        >
          <Tab label="1. My Projects" />
          <Tab label="2. Developer Allocation" />
          <Tab label="3. Team Workload" />
          <Tab label="4. SLA Overview" />
        </Tabs>
      </Paper>

      {/* 1. My Projects Tab */}
      {activeTab === 0 && (
        <Box>
          <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 600, mb: 2 }}>
            My Projects ({projects.length})
          </Typography>
          {projects.length === 0 ? (
            <Paper sx={{ ...glassStyles.card, p: 4, textAlign: 'center' }}>
              <FolderIcon sx={{ fontSize: 48, color: '#64748b', mb: 1 }} />
              <Typography sx={{ color: '#94a3b8' }}>
                No projects allocated yet. Contact an admin to get assigned.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {projects.map(renderProjectCard)}
            </Grid>
          )}
        </Box>
      )}

      {/* 2. Developer Allocation Tab */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 600, mb: 2 }}>
            Allocate Developers to Projects
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
            Assign developers to your projects. All open findings in the project will be automatically assigned to the developer.
          </Typography>
          <Paper sx={{ ...glassStyles.card, overflow: 'hidden', p: 2 }}>
            <DeveloperAssignment pmUser={user} onRefresh={fetchPMData} />
          </Paper>
        </Box>
      )}

      {/* 3. Team Workload Tab */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 600, mb: 2 }}>
            Developer Workload ({developers.length})
          </Typography>
          <Paper sx={{ ...glassStyles.card, overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid rgba(148,163,184,0.12)' }}>Developer</TableCell>
                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid rgba(148,163,184,0.12)' }}>Status</TableCell>
                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid rgba(148,163,184,0.12)' }}>Assigned Findings</TableCell>
                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid rgba(148,163,184,0.12)' }}>Overdue</TableCell>
                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid rgba(148,163,184,0.12)' }}>Critical</TableCell>
                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid rgba(148,163,184,0.12)' }}>Projects</TableCell>
                    <TableCell sx={{ color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid rgba(148,163,184,0.12)' }}>Workload</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {developers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', color: '#64748b', py: 4 }}>
                        No developers allocated yet. Go to "Developer Allocation" tab to assign.
                      </TableCell>
                    </TableRow>
                  ) : (
                    developers.map((dev) => (
                      <TableRow key={dev.id} hover sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' } }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: '#06b6d4', fontSize: '0.8rem' }}>
                              {(dev.name || dev.email || '?')[0].toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography sx={{ color: '#f8fafc', fontSize: '0.875rem' }}>
                                {dev.name || dev.email}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b' }}>
                                {dev.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={dev.availability}
                            size="small"
                            sx={{
                              backgroundColor: `${getAvailabilityColor(dev.availability)}20`,
                              color: getAvailabilityColor(dev.availability),
                              fontWeight: 600,
                              fontSize: '0.7rem',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: '#f8fafc', fontWeight: 500 }}>
                          {dev.assignedFindings}
                        </TableCell>
                        <TableCell>
                          {dev.overdueFindings > 0 ? (
                            <Typography sx={{ color: '#ef4444', fontWeight: 600 }}>
                              {dev.overdueFindings}
                            </Typography>
                          ) : (
                            <Typography sx={{ color: '#64748b' }}>0</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {dev.criticalFindings > 0 ? (
                            <Typography sx={{ color: '#ef4444', fontWeight: 600 }}>
                              {dev.criticalFindings}
                            </Typography>
                          ) : (
                            <Typography sx={{ color: '#64748b' }}>0</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ color: '#f8fafc' }}>
                          {dev.assignedProjects}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ flex: 1, minWidth: 80 }}>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(dev.workloadScore, 100)}
                                sx={{
                                  height: 6,
                                  borderRadius: 3,
                                  backgroundColor: 'rgba(255,255,255,0.06)',
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: getAvailabilityColor(dev.availability),
                                  },
                                }}
                              />
                            </Box>
                            <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 500, minWidth: 36, textAlign: 'right' }}>
                              {dev.workloadScore}%
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* 4. SLA Overview Tab */}
      {activeTab === 3 && (
        <Box>
          <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 600, mb: 2 }}>
            SLA Compliance by Project
          </Typography>
          {projects.length === 0 ? (
            <Paper sx={{ ...glassStyles.card, p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: '#94a3b8' }}>No project data available.</Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {projects.map((project) => {
                const findingsWithSLA = (project.findings || []).map(finding => ({
                  ...finding,
                  sla: calculateSLAStatus(finding),
                }));
                const breached = findingsWithSLA.filter(f => f.sla.isBreached);
                const atRisk = findingsWithSLA.filter(f => f.sla.isAtRisk && !f.sla.isBreached);
                const onTrack = findingsWithSLA.length - breached.length - atRisk.length;

                return (
                  <Grid item xs={12} md={6} key={project.id}>
                    <GlassCard>
                      <Typography variant="h6" sx={{ color: '#f8fafc', mb: 2, fontWeight: 600 }}>
                        {project.name}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Box sx={{ flex: 1, textAlign: 'center', p: 1.5, borderRadius: 2, backgroundColor: 'rgba(239,68,68,0.08)' }}>
                          <Typography variant="h5" sx={{ color: '#ef4444', fontWeight: 700 }}>
                            {breached.length}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>Breached</Typography>
                        </Box>
                        <Box sx={{ flex: 1, textAlign: 'center', p: 1.5, borderRadius: 2, backgroundColor: 'rgba(249,115,22,0.08)' }}>
                          <Typography variant="h5" sx={{ color: '#f97316', fontWeight: 700 }}>
                            {atRisk.length}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>At Risk</Typography>
                        </Box>
                        <Box sx={{ flex: 1, textAlign: 'center', p: 1.5, borderRadius: 2, backgroundColor: 'rgba(34,197,94,0.08)' }}>
                          <Typography variant="h5" sx={{ color: '#22c55e', fontWeight: 700 }}>
                            {onTrack}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>On Track</Typography>
                        </Box>
                      </Box>

                      {breached.slice(0, 3).map((finding) => (
                        <Box
                          key={finding.id}
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 1,
                            p: 1, mb: 0.5, borderRadius: 1,
                            backgroundColor: 'rgba(239,68,68,0.04)',
                          }}
                        >
                          <WarningIcon sx={{ color: '#ef4444', fontSize: 14 }} />
                          <Typography variant="body2" sx={{ color: '#e2e8f0', flex: 1, fontSize: '0.8rem' }} noWrap>
                            {finding.title || finding.name}
                          </Typography>
                          <Chip
                            label={`${Math.abs(finding.sla.daysRemaining)}d overdue`}
                            size="small"
                            sx={{ backgroundColor: '#ef444420', color: '#ef4444', fontSize: '0.65rem', height: 20 }}
                          />
                        </Box>
                      ))}
                      {findingsWithSLA.length === 0 && (
                        <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'center', py: 2 }}>
                          No findings in this project.
                        </Typography>
                      )}
                    </GlassCard>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}
    </Box>
  );
};

export default PMWorkload;