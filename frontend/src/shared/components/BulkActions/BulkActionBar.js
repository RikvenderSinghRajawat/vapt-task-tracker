import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Menu,
  MenuItem,
  Divider,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  TextField,
  Chip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircle as CheckIcon,
  Archive as ArchiveIcon,
  AssignmentInd as AssignIcon,
  LocalOffer as TagIcon,
  ContentCopy as CopyIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import { colors, typography, borderRadius } from '../../../theme/designSystem';
import { StatusBadge, SeverityBadge } from '../index';
import { getAllTags } from '../../constants/tags';

/**
 * BulkActionBar - Action bar for bulk operations
 */
const BulkActionBar = ({
  selectedCount = 0,
  totalCount = 0,
  onSelectAll,
  onClearSelection,
  onDelete,
  onChangeStatus,
  onChangeSeverity,
  onAssign,
  onAddTags,
  onDuplicate,
  onArchive,
  availableUsers = [],
  disabled = false
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [activeDialog, setActiveDialog] = useState(null);
  const [formData, setFormData] = useState({});

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleAction = (action) => {
    handleMenuClose();
    
    if (['status', 'severity', 'assign', 'tags'].includes(action)) {
      setActiveDialog(action);
      setFormData({});
    } else {
      // Direct actions
      switch (action) {
        case 'delete':
          onDelete?.();
          break;
        case 'duplicate':
          onDuplicate?.();
          break;
        case 'archive':
          onArchive?.();
          break;
        default:
          break;
      }
    }
  };

  const handleDialogSubmit = () => {
    switch (activeDialog) {
      case 'status':
        onChangeStatus?.(formData.status);
        break;
      case 'severity':
        onChangeSeverity?.(formData.severity);
        break;
      case 'assign':
        onAssign?.(formData.assignee);
        break;
      case 'tags':
        onAddTags?.(formData.tags);
        break;
      default:
        break;
    }
    setActiveDialog(null);
  };

  const allTags = getAllTags();

  // Dialog content based on type
  const renderDialogContent = () => {
    switch (activeDialog) {
      case 'status':
        return (
          <Box sx={{ minWidth: 300 }}>
            <Typography variant="body2" sx={{ mb: 2, color: colors.text.secondary }}>
              Change status for {selectedCount} selected items
            </Typography>
            <Select
              fullWidth
              value={formData.status || ''}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              displayEmpty
            >
              <MenuItem value="">Select status...</MenuItem>
              <MenuItem value="open">
                <StatusBadge status="open" size="small" showTooltip={false} />
              </MenuItem>
              <MenuItem value="in_progress">
                <StatusBadge status="in_progress" size="small" showTooltip={false} />
              </MenuItem>
              <MenuItem value="fixed">
                <StatusBadge status="fixed" size="small" showTooltip={false} />
              </MenuItem>
              <MenuItem value="closed">
                <StatusBadge status="closed" size="small" showTooltip={false} />
              </MenuItem>
              <MenuItem value="reopened">
                <StatusBadge status="reopened" size="small" showTooltip={false} />
              </MenuItem>
            </Select>
          </Box>
        );

      case 'severity':
        return (
          <Box sx={{ minWidth: 300 }}>
            <Typography variant="body2" sx={{ mb: 2, color: colors.text.secondary }}>
              Change severity for {selectedCount} selected items
            </Typography>
            <Select
              fullWidth
              value={formData.severity || ''}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              displayEmpty
            >
              <MenuItem value="">Select severity...</MenuItem>
              <MenuItem value="critical">
                <SeverityBadge severity="critical" size="small" showTooltip={false} />
              </MenuItem>
              <MenuItem value="high">
                <SeverityBadge severity="high" size="small" showTooltip={false} />
              </MenuItem>
              <MenuItem value="medium">
                <SeverityBadge severity="medium" size="small" showTooltip={false} />
              </MenuItem>
              <MenuItem value="low">
                <SeverityBadge severity="low" size="small" showTooltip={false} />
              </MenuItem>
            </Select>
          </Box>
        );

      case 'assign':
        return (
          <Box sx={{ minWidth: 300 }}>
            <Typography variant="body2" sx={{ mb: 2, color: colors.text.secondary }}>
              Assign {selectedCount} items to
            </Typography>
            <Select
              fullWidth
              value={formData.assignee || ''}
              onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
              displayEmpty
            >
              <MenuItem value="">Select user...</MenuItem>
              {availableUsers.map((user) => (
                <MenuItem key={user.uid} value={user.uid}>
                  {user.name || user.email}
                </MenuItem>
              ))}
            </Select>
          </Box>
        );

      case 'tags':
        return (
          <Box sx={{ minWidth: 400 }}>
            <Typography variant="body2" sx={{ mb: 2, color: colors.text.secondary }}>
              Add tags to {selectedCount} items
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 200, overflow: 'auto' }}>
              {allTags.map((tag) => (
                <Chip
                  key={tag.id}
                  label={tag.name}
                  onClick={() => {
                    const current = formData.tags || [];
                    const exists = current.includes(tag.id);
                    setFormData({
                      ...formData,
                      tags: exists 
                        ? current.filter(t => t !== tag.id)
                        : [...current, tag.id]
                    });
                  }}
                  sx={{
                    backgroundColor: (formData.tags || []).includes(tag.id) 
                      ? `${tag.color}30`
                      : 'transparent',
                    border: `1px solid ${(formData.tags || []).includes(tag.id) ? tag.color : colors.border.subtle}`,
                    color: tag.color,
                    cursor: 'pointer'
                  }}
                />
              ))}
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.background.secondary,
          borderTop: `1px solid ${colors.border.subtle}`,
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 100,
          boxShadow: '0 -4px 12px rgba(0,0,0,0.2)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedCount === totalCount && totalCount > 0}
                indeterminate={selectedCount > 0 && selectedCount < totalCount}
                onChange={(e) => e.target.checked ? onSelectAll?.() : onClearSelection?.()}
              />
            }
            label={
              <Typography variant="body2" sx={{ color: colors.text.primary }}>
                <strong>{selectedCount}</strong> of <strong>{totalCount}</strong> selected
              </Typography>
            }
          />
          
          <Button
            size="small"
            onClick={onClearSelection}
            sx={{ color: colors.text.tertiary }}
          >
            Clear
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* Quick Actions */}
          <Button
            size="small"
            startIcon={<CheckIcon />}
            onClick={() => handleAction('status')}
            disabled={disabled}
            sx={{ textTransform: 'none' }}
          >
            Status
          </Button>
          
          <Button
            size="small"
            startIcon={<EditIcon />}
            onClick={() => handleAction('severity')}
            disabled={disabled}
            sx={{ textTransform: 'none' }}
          >
            Severity
          </Button>
          
          <Button
            size="small"
            startIcon={<AssignIcon />}
            onClick={() => handleAction('assign')}
            disabled={disabled}
            sx={{ textTransform: 'none' }}
          >
            Assign
          </Button>

          {/* More Actions Menu */}
          <Button
            size="small"
            endIcon={<MoreIcon />}
            onClick={handleMenuOpen}
            disabled={disabled}
            sx={{ textTransform: 'none' }}
          >
            More
          </Button>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                backgroundColor: colors.background.secondary,
                border: `1px solid ${colors.border.subtle}`
              }
            }}
          >
            <MenuItem onClick={() => handleAction('tags')}>
              <TagIcon fontSize="small" sx={{ mr: 1 }} />
              Add Tags
            </MenuItem>
            <MenuItem onClick={() => handleAction('duplicate')}>
              <CopyIcon fontSize="small" sx={{ mr: 1 }} />
              Duplicate
            </MenuItem>
            <MenuItem onClick={() => handleAction('archive')}>
              <ArchiveIcon fontSize="small" sx={{ mr: 1 }} />
              Archive
            </MenuItem>
            <Divider sx={{ my: 1, borderColor: colors.border.subtle }} />
            <MenuItem onClick={() => handleAction('delete')} sx={{ color: colors.severity.critical }}>
              <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
              Delete
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Action Dialogs */}
      <Dialog
        open={Boolean(activeDialog)}
        onClose={() => setActiveDialog(null)}
        PaperProps={{
          sx: {
            backgroundColor: colors.background.secondary,
            minWidth: 350
          }
        }}
      >
        <DialogTitle sx={{ color: colors.text.primary }}>
          Bulk {activeDialog?.charAt(0).toUpperCase() + activeDialog?.slice(1)}
        </DialogTitle>
        <DialogContent>
          {renderDialogContent()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveDialog(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDialogSubmit}
            disabled={
              (activeDialog === 'status' && !formData.status) ||
              (activeDialog === 'severity' && !formData.severity) ||
              (activeDialog === 'assign' && !formData.assignee) ||
              (activeDialog === 'tags' && !(formData.tags || []).length)
            }
          >
            Apply to {selectedCount} items
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BulkActionBar;
