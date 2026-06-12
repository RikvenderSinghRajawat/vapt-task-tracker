import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import { 
  Restore as RestoreIcon, 
  DeleteForever as DeleteForeverIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { recycleBinAPI } from '../services/api';

import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DashboardHeader } from '../components/branding';
import { colors, typography, borderRadius } from '../theme/designSystem';

const RecycleBin = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [daysRemaining, setDaysRemaining] = useState({});

  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, item: null, action: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const getEntityLabel = (item) => {
    if (!item) return { type: 'project', label: 'Project' };
    if (!item.entityType) return { type: 'project', label: 'Project' };
    const t = item.entityType || 'project';
    const labels = {
      project: 'Project',
      report: 'Report',
      finding: 'Finding',
      user: 'User',
    };
    return { type: t, label: labels[t] || 'Item' };
  };

  const getEntityName = (item) => {
    if (!item) return 'Unknown';
    const map = {
      project: item.project?.name,
      report: item.report?.name,
      finding: item.finding?.title,
      user: item.user?.name,
    };
    return map[item.entityType || 'project'] || map.project || 'Unknown';
  };

  useEffect(() => {
    fetchRecycleBinItems();
  }, []);

  const fetchRecycleBinItems = async () => {
    try {
      setLoading(true);
      const items = await recycleBinAPI.getItems();
      setItems(items);

    } catch (error) {
      console.error('Error fetching recycle bin items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item) => {
    try {
      setActionLoading(true);
      const { type } = getEntityLabel(item);
      await recycleBinAPI.restoreItem(type, item.id);

      await fetchRecycleBinItems();
      showToast(`${getEntityLabel(item).label} restored successfully`, 'success');

    } catch (error) {
      showToast(`Error restoring ${getEntityLabel(item).type}: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async (item) => {
    try {
      setActionLoading(true);
      const { type } = getEntityLabel(item);
      await recycleBinAPI.permanentDelete(type, item.id);

      await fetchRecycleBinItems();
      showToast(`${getEntityLabel(item).label} permanently deleted`, 'success');

    } catch (error) {
      showToast(`Error deleting ${getEntityLabel(item).type}: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openConfirmDialog = (item, action) => {
    setConfirmDialog({ open: true, item, action });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, item: null, action: '' });
  };

  const confirmAction = () => {
    // Keep dialog open while async action runs
    if (actionLoading) return;
    if (confirmDialog.action === 'restore') {
      handleRestore(confirmDialog.item).finally(() => closeConfirmDialog());
    } else if (confirmDialog.action === 'delete') {
      handlePermanentDelete(confirmDialog.item).finally(() => closeConfirmDialog());
    }
  };

  const getDaysRemaining = (item) => {
    const deletedAt = item?.deletedAt;
    if (!deletedAt) return 0;
    // Recycle window: 15 days
    return Math.max(0, Math.ceil((new Date(deletedAt).getTime() + 15 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000)));
  };


  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', background: colors.background.primary, p: 3 }}>
        <Typography sx={{ color: colors.text.primary }}>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: colors.background.primary, p: 3 }}>
      <DashboardHeader
        title="Recycle Bin"
        subtitle="Restore or permanently delete removed items"
        badge={{ label: `${items.length} item(s)`, color: colors.status.warning }}
      />

      {items.length === 0 ? (
        <Alert 
          severity="info"
          sx={{ 
            background: colors.background.secondary,
            color: colors.text.secondary,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: borderRadius.lg,
            '& .MuiAlert-icon': { color: colors.info }
          }}
        >
            Recycle Bin is empty. Deleted items will appear here for 15 days before permanent deletion.
        </Alert>
      ) : (
        <>
          <Alert 
            severity="warning" 
            sx={{ 
              mb: 3,
              background: 'rgba(219, 171, 9, 0.1)',
              color: colors.status.warning,
              border: `1px solid ${colors.status.warning}40`,
              borderRadius: borderRadius.lg,
              '& .MuiAlert-icon': { color: colors.status.warning }
            }}
          >
            Items in the Recycle Bin will be permanently deleted after 15 days. 
            You can restore them before that time.
          </Alert>

          <Grid container spacing={3}>
            {items.map((item) => {
              const { type: entityType } = getEntityLabel(item);
              const name = getEntityName(item);
              const entityData = item[entityType] || {};
              const subtitle = (() => {
                if (entityType === 'project') return `Code: ${entityData.code || '—'}`;
                if (entityType === 'report') return `Type: ${entityData.type || entityData.reportId || '—'}`;
                if (entityType === 'finding') return `Severity: ${entityData.severity || '—'} | Status: ${entityData.status || '—'}`;
                if (entityType === 'user') return `Role: ${entityData.role || '—'} | Email: ${entityData.email || '—'}`;
                return '';
              })();
              const entityId = entityData.id || item.id;

              return (
                <Grid item xs={12} md={6} key={entityId}>
                  <Card
                    sx={{
                      background: colors.background.secondary,
                      border: `1px solid ${colors.border.subtle}`,
                      borderLeft: `4px solid ${colors.status.warning}`,
                      borderRadius: borderRadius.xl
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography
                            variant="h6"
                            gutterBottom
                            sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}
                          >
                            {name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                            {subtitle}
                          </Typography>
                        </Box>

                        <Chip
                          label={`${getDaysRemaining(item)} days left`}
                          size="small"
                          sx={{
                            background: getDaysRemaining(item) <= 3 ? colors.severity.critical : colors.status.warning,
                            color: '#000',
                            fontWeight: typography.weight.medium
                          }}
                        />
                      </Box>

                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" sx={{ color: colors.text.tertiary }}>
                          Deleted by: {item.deletedBy?.name || item.deletedBy?.email || 'Unknown'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: colors.text.tertiary }}>
                          Deleted on: {new Date(item.deletedAt).toLocaleString()}
                        </Typography>
                        <Typography variant="body2" sx={{ color: colors.text.tertiary }}>
                          Expires on: {new Date(item.expiresAt).toLocaleDateString()}
                        </Typography>
                      </Box>

                      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={`${Object.keys(item.findings || {}).length} findings`}
                          size="small"
                          sx={{
                            background: colors.background.tertiary,
                            color: colors.text.secondary,
                            border: `1px solid ${colors.border.subtle}`
                          }}
                        />
                        <Chip
                          label={`${Object.keys(item.reports || {}).length} reports`}
                          size="small"
                          sx={{
                            background: colors.background.tertiary,
                            color: colors.text.secondary,
                            border: `1px solid ${colors.border.subtle}`
                          }}
                        />
                        <Chip
                          label={`${Object.keys(item.milestones || {}).length} milestones`}
                          size="small"
                          sx={{
                            background: colors.background.tertiary,
                            color: colors.text.secondary,
                            border: `1px solid ${colors.border.subtle}`
                          }}
                        />
                      </Box>

                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<RestoreIcon />}
                          onClick={() => openConfirmDialog(item, 'restore')}
                          fullWidth
                          sx={{
                            background: colors.status.success,
                            color: '#fff',
                            '&:hover': { background: '#2EA043' }
                          }}
                        >
                          Restore
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<DeleteForeverIcon />}
                          onClick={() => openConfirmDialog(item, 'delete')}
                          fullWidth
                          sx={{
                            borderColor: colors.severity.critical,
                            color: colors.severity.critical,
                            '&:hover': {
                              background: 'rgba(215, 58, 73, 0.1)',
                              borderColor: colors.severity.critical
                            }
                          }}
                        >
                          Delete Forever
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}

      {/* Confirmation Dialog */}
      <Dialog 
        open={confirmDialog.open} 
        onClose={closeConfirmDialog} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            background: colors.background.secondary,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: borderRadius.xl
          }
        }}
      >
        <DialogTitle sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>
          {confirmDialog.action === 'restore' 
            ? `Restore ${getEntityLabel(confirmDialog.item).label}` 
            : `Delete ${getEntityLabel(confirmDialog.item).label} Permanently`}
        </DialogTitle>
        <DialogContent>
          <Alert 
            severity={confirmDialog.action === 'restore' ? 'info' : 'error'} 
            sx={{ 
              mb: 2,
              background: confirmDialog.action === 'restore' ? colors.background.tertiary : 'rgba(215, 58, 73, 0.1)',
              color: colors.text.secondary,
              border: `1px solid ${confirmDialog.action === 'restore' ? colors.border.subtle : colors.severity.critical}40`,
              borderRadius: borderRadius.lg,
              '& .MuiAlert-icon': { 
                color: confirmDialog.action === 'restore' ? colors.info : colors.severity.critical 
              }
            }}
          >
            {confirmDialog.action === 'restore' 
              ? 'This will restore the item with all its data back to the active list.'
              : 'WARNING: This action cannot be undone. The item and all associated data will be permanently deleted.'
            }
          </Alert>
          <Typography variant="body1" sx={{ color: colors.text.secondary }}>
            <strong style={{ color: colors.text.primary }}>{getEntityName(confirmDialog.item)}</strong>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={closeConfirmDialog}
            sx={{ 
              color: colors.text.secondary,
              textTransform: 'none',
              '&:hover': { color: colors.text.primary }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmAction} 
            variant="contained"
            disabled={actionLoading}
            sx={{ 
              background: confirmDialog.action === 'restore' ? colors.status.success : colors.severity.critical,
              color: '#fff',
              textTransform: 'none',
              '&:hover': { 
                background: confirmDialog.action === 'restore' ? '#2EA043' : '#B91C1C'
              }
            }}
          >
            {actionLoading ? (
              <CircularProgress size={18} sx={{ color: '#fff', mr: 1 }} />
            ) : null}
            {confirmDialog.action === 'restore' ? 'Restore' : 'Delete Forever'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecycleBin;
