import React, { useMemo, useState, useCallback, useRef } from 'react';
 import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  TextField
} from '@mui/material';

import { userAPI, findingAPI } from '../../../services/api';
import { sortFindingsBySeverity } from '../../../utils/sortingUtils';

/**
 * FindingAssignment
 * PM UI to assign ONE finding to ONE or MORE developers.
 * - UI only (backend update required in later step)
 *
 * Props:
 *  - pmUser: currently logged-in PM user object
 *  - projects: pm allocated projects with `id` and `findings`
 *  - developers: list of developers from PM workload (real developer accounts)
 *  - onRefresh: callback to refresh parent after assignment
 */
const FindingAssignment = ({ pmUser, projects = [], developers = [], onRefresh }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [emailError, setEmailError] = useState('');
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [selectedDeveloperIds, setSelectedDeveloperIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Ref used by the email dialog to return the result to the awaiting call site
  const emailResolverRef = useRef(null);

  const pmProjectIds = useMemo(() => projects.map(p => p.id), [projects]);

  const eligibleDevelopers = useMemo(() => {
    // Use real developers passed from PM workload component
    // Filter developers who are allocated to PM's projects
    return developers.filter(dev => {
      const devProjects = dev.allocatedProjects || [];
      return devProjects.some(pid => pmProjectIds.includes(pid));
    });
  }, [developers, pmProjectIds]);

  const openAssignDialog = useCallback((finding) => {
    setSelectedFinding(finding);

    // Pre-select already assigned developer(s)
    const existing = finding?.assignedDevelopers || finding?.assignedTo || finding?.assigned || (finding?.assignee ? [finding.assignee] : []);
    const ids = Array.isArray(existing)
      ? existing.map(e => e.id || e._id || e)
      : existing
        ? [existing.id || existing._id || existing]
        : [];

    setSelectedDeveloperIds(ids);
    setDialogOpen(true);
    setError(null);
    setSuccess(null);
  }, []);

  const toggleDeveloper = (devId) => {
    setSelectedDeveloperIds(prev =>
      prev.includes(devId) ? prev.filter(id => id !== devId) : [devId]
    );
  };

  // Prompt replacement: resolves the developer email entered by the PM
  const showEmailPrompt = () => new Promise((resolve) => {
    emailResolverRef.current = resolve;
    setEmailDialogOpen(true);
    setEmailValue('');
    setEmailError('');
  });

  const handleEmailSubmit = async () => {
    const email = emailValue.trim();
    if (!email || !email.includes('@')) {
      setEmailError('Valid email address required');
      return;
    }
    if (emailResolverRef.current) {
      emailResolverRef.current(email);
      emailResolverRef.current = null;
    }
    setEmailDialogOpen(false);
  };

  const handleEmailCancel = () => {
    if (emailResolverRef.current) {
      emailResolverRef.current(null);
      emailResolverRef.current = null;
    }
    setEmailDialogOpen(false);
    setEmailError('');
    setEmailValue('');
  };

  const handleAssign = async () => {
    if (!selectedFinding || selectedDeveloperIds.length === 0) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const projectId = selectedFinding.projectId || selectedFinding.project;
      const findingId = selectedFinding.id;

      if (!projectId || !findingId) {
        throw new Error('Project or finding id missing');
      }

      // Handle manual input vs actual developer selection
      const selectedDev = selectedDeveloperIds[0];
      let assigneeId = selectedDev;

      // If manual input selected, show our custom email dialog
      if (selectedDev === 'manual_input') {
        assigneeId = await showEmailPrompt();
        if (!assigneeId) {
          setLoading(false);
          return;
        }
      }

      // Update finding with proper assignment fields
      // Use both assignee and assignedTo for compatibility
      const updateData = {
        assignee: assigneeId,
        assignedTo: [assigneeId],
        assignedAt: new Date().toISOString(),
        assignedBy: pmUser.email
      };

      const updateResponse = await findingAPI.updateFinding(projectId, findingId, updateData);

      await onRefresh?.();

      const assignedLabel = selectedDev === 'manual_input'
        ? assigneeId
        : `${selectedDeveloperIds.length} developer(s)`;
      setSuccess(`Assigned finding to ${assignedLabel}`);

      setTimeout(() => {
        setDialogOpen(false);
        setSelectedFinding(null);
        setSelectedDeveloperIds([]);
        setSuccess(null);
      }, 900);
    } catch (e) {
      setError(e.message || 'Failed to assign finding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ color: '#f8fafc', mb: 1 }}>
        Findings Allocation
      </Typography>

      {projects.map(project => {
        const openFindings = sortFindingsBySeverity((project.findings || []).filter(f => f.status !== 'closed'));

        return (
          <Box key={project.id} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                {project.name}
              </Typography>
              <Chip
                size="small"
                label={`${openFindings.length} open`}
                sx={{ backgroundColor: 'rgba(6,182,212,0.12)', color: '#06b6d4' }}
              />
            </Box>

                <Box>
                  {openFindings.slice(0, 6).map(f => {
                    const devs = f.assignedDevelopers || f.assignedTo || f.assigned || (f.assignee ? [f.assignee] : []);
                    const devArr = Array.isArray(devs) ? devs : [devs];
                    const assigneeLabel = devArr.length > 0
                      ? devArr.map(d => d?.name || d?.email || d?.id || String(d)).join(', ')
                      : 'Unassigned';

                return (
                  <Box
                    key={f.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                      p: 1,
                      mb: 1,
                      border: '1px solid rgba(148,163,184,0.18)',
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ color: '#f8fafc', fontWeight: 500 }} noWrap>
                        {f.title || f.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        {f.severity}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        size="small"
                        label={assigneeLabel}
                        sx={{ backgroundColor: 'rgba(100,116,139,0.15)', color: '#e2e8f0' }}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => openAssignDialog({ ...f, projectId: project.id })}
                        sx={{ borderColor: 'rgba(148,163,184,0.35)', color: '#e2e8f0' }}
                      >
                        Allocate
                      </Button>
                    </Box>
                  </Box>
                );
              })}

              {openFindings.length > 6 && (
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Showing first 6 open findings
                </Typography>
              )}

              {openFindings.length === 0 && (
                <Alert severity="info" sx={{ backgroundColor: 'rgba(148,163,184,0.12)', borderColor: 'rgba(148,163,184,0.25)' }}>
                  No open findings
                </Alert>
              )}
            </Box>

            <Divider sx={{ mt: 2, backgroundColor: 'rgba(148,163,184,0.15)' }} />
          </Box>
        );
      })}

      <Dialog
        open={dialogOpen}
        onClose={() => !loading && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: '#0b1220', border: '1px solid rgba(148,163,184,0.25)' },
        }}
      >
        <DialogTitle sx={{ color: '#f8fafc' }}>
          Allocate Finding
          {selectedFinding?.title && (
            <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
              {selectedFinding.title}
            </Typography>
          )}
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2, backgroundColor: 'rgba(239,68,68,0.15)' }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2, backgroundColor: 'rgba(34,197,94,0.12)' }}>
              {success}
            </Alert>
          )}

          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1 }}>
            Select developer(s):
          </Typography>

          <List sx={{ maxHeight: 320, overflow: 'auto' }}>
            {(eligibleDevelopers || []).map(dev => (
              <ListItem
                key={dev.id || dev.uid}
                dense
                button
                onClick={() => toggleDeveloper(dev.id || dev.uid)}
                sx={{ borderRadius: 1, '&.Mui-selected': { backgroundColor: 'rgba(6,182,212,0.12)' } }}
              >
                <Checkbox
                  checked={selectedDeveloperIds.includes(dev.id || dev.uid)}
                  edge="start"
                  disableRipple
                />
                <ListItemText
                  primary={dev.name || dev.displayName || dev.email}
                  secondary={dev.email}
                  primaryTypographyProps={{ color: '#f8fafc' }}
                  secondaryTypographyProps={{ color: '#64748b' }}
                />
              </ListItem>
            ))}

            {eligibleDevelopers.length === 0 && (
              <Alert severity="warning" sx={{ backgroundColor: 'rgba(234,179,8,0.12)', borderColor: 'rgba(234,179,8,0.25)' }}>
                No eligible developers found. Make sure developers are allocated to your projects.
              </Alert>
            )}
          </List>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAssign}
            disabled={loading || selectedDeveloperIds.length === 0}
            startIcon={loading ? <CircularProgress size={16} /> : null}
            sx={{ backgroundColor: '#06b6d4' }}
          >
            {loading ? 'Allocating...' : 'Allocate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Custom email prompt dialog — replaces window.prompt() */}
      <Dialog
        open={emailDialogOpen}
        onClose={handleEmailCancel}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            background: '#0b1220',
            border: '1px solid rgba(148,163,184,0.25)',
          }
        }}
      >
        <DialogTitle sx={{ color: '#f8fafc' }}>Enter Developer Email Address</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            type="email"
            placeholder="developer@example.com"
            value={emailValue}
            onChange={(e) => { setEmailValue(e.target.value); setEmailError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleEmailSubmit(); }}
            error={!!emailError}
            helperText={emailError}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEmailCancel} sx={{ color: '#94a3b8' }}>Cancel</Button>
          <Button
            onClick={handleEmailSubmit}
            variant="contained"
            sx={{ backgroundColor: '#06b6d4' }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FindingAssignment;
