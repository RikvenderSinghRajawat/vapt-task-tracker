import React from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Box,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  BugReport as BugReportIcon,
  Folder as FolderIcon,
  Report as ReportIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Assessment as AssessmentIcon,
  Speed as SpeedIcon,
  Settings as SettingsIcon,
  Psychology as PsychologyIcon,
  TrackChanges as TrackChangesIcon
} from '@mui/icons-material';
import { colors, typography, borderRadius, shadows } from '../theme/designSystem';

const QuickActionsMenu = ({ anchorEl, open, onClose, onAction }) => {
  const handleAction = (action) => {
    onAction(action);
    onClose();
  };

  const actionItems = [
    {
      category: 'Create',
      items: [
        { id: 'add_finding', label: 'New Finding', icon: <BugReportIcon />, description: 'Add vulnerability finding' },
        { id: 'add_project', label: 'New Project', icon: <FolderIcon />, description: 'Create security project' },
      ]
    },
    {
      category: 'Reports',
      items: [
        { id: 'generate_report', label: 'Generate Report', icon: <ReportIcon />, description: 'Create security report' },
        { id: 'export_data', label: 'Export Data', icon: <DownloadIcon />, description: 'Download findings data' },
      ]
    },
    {
      category: 'Tools',
      items: [
        { id: 'bulk_upload', label: 'Bulk Upload', icon: <UploadIcon />, description: 'Import findings from CSV' },
        { id: 'risk_assessment', label: 'Risk Assessment', icon: <AssessmentIcon />, description: 'Analyze project risk' },
        { id: 'performance', label: 'Performance', icon: <SpeedIcon />, description: 'View team metrics' },
      ]
    },
    {
      category: 'Advanced',
      items: [
        { id: 'duplicate_detection', label: 'Duplicate Detection', icon: <PsychologyIcon />, description: 'Find duplicate findings' },
        { id: 'bulk_operations', label: 'Bulk Operations', icon: <TrackChangesIcon />, description: 'Mass update findings' },
      ]
    }
  ];

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          backgroundColor: colors.background.secondary,
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: borderRadius.xl,
          boxShadow: shadows.xl,
          minWidth: 280,
          maxHeight: 480,
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: 6,
          },
          '&::-webkit-scrollbar-track': {
            background: colors.border.subtle,
          },
          '&::-webkit-scrollbar-thumb': {
            background: colors.border.default,
            borderRadius: 3,
          },
        },
      }}
    >
      <Box sx={{ p: 2, borderBottom: `1px solid ${colors.border.subtle}` }}>
        <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>
          Quick Actions
        </Typography>
        <Typography variant="caption" sx={{ color: colors.text.secondary }}>
          Press Ctrl+N for quick add
        </Typography>
      </Box>

      {actionItems.map((category, categoryIndex) => (
        <Box key={category.category}>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="caption" sx={{ color: colors.text.tertiary, fontWeight: typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {category.category}
            </Typography>
          </Box>
          
          {category.items.map((item) => (
            <MenuItem
              key={item.id}
              onClick={() => handleAction(item.id)}
              sx={{
                py: 1.5,
                px: 2,
                '&:hover': {
                  backgroundColor: colors.background.tertiary,
                },
              }}
            >
              <ListItemIcon sx={{ color: colors.primary[400], minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ color: colors.text.primary, fontWeight: typography.weight.medium }}>
                  {item.label}
                </Typography>
                <Typography variant="caption" sx={{ color: colors.text.secondary }}>
                  {item.description}
                </Typography>
              </Box>
            </MenuItem>
          ))}
          
          {categoryIndex < actionItems.length - 1 && (
            <Divider sx={{ my: 1, borderColor: colors.border.subtle }} />
          )}
        </Box>
      ))}

      <Box sx={{ p: 2, borderTop: `1px solid ${colors.border.subtle}`, mt: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            label="Ctrl+K"
            sx={{
              backgroundColor: `${colors.primary[500]}15`,
              color: colors.primary[400],
              fontWeight: typography.weight.medium,
              fontSize: '0.7rem',
            }}
          />
          <Chip
            size="small"
            label="Ctrl+/"
            sx={{
              backgroundColor: `${colors.secondary[500]}15`,
              color: colors.secondary[400],
              fontWeight: typography.weight.medium,
              fontSize: '0.7rem',
            }}
          />
          <Chip
            size="small"
            label="Ctrl+N"
            sx={{
              backgroundColor: `${colors.severity.medium}15`,
              color: colors.severity.medium,
              fontWeight: typography.weight.medium,
              fontSize: '0.7rem',
            }}
          />
        </Box>
      </Box>
    </Menu>
  );
};

export default QuickActionsMenu;
