import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Chip,
  Paper,
  Fade,
} from '@mui/material';
import {
  Search as SearchIcon,
  Dashboard as DashboardIcon,
  Folder as ProjectIcon,
  BugReport as FindingIcon,
  Flag as MilestoneIcon,
  Assessment as AnalyticsIcon,
  People as UsersIcon,
  Notifications as NotificationIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Keyboard as KeyboardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { premiumColors, glassStyles, animations, transitions } from '../theme/premiumTheme';

// Command definitions with icons, shortcuts, and actions
const getCommands = (user, navigate, onClose) => [
  {
    id: 'dashboard',
    title: 'Go to Dashboard',
    icon: <DashboardIcon />,
    shortcut: 'G D',
    keywords: 'home main overview stats',
    action: () => { navigate('/'); onClose(); },
    category: 'Navigation',
  },
  {
    id: 'projects',
    title: 'View Projects',
    icon: <ProjectIcon />,
    shortcut: 'G P',
    keywords: 'project list',
    action: () => { navigate('/projects'); onClose(); },
    category: 'Navigation',
  },
  {
    id: 'findings',
    title: 'View Findings',
    icon: <FindingIcon />,
    shortcut: 'G F',
    keywords: 'vulnerability bug issue security',
    action: () => { navigate('/findings'); onClose(); },
    category: 'Navigation',
  },
  {
    id: 'milestones',
    title: 'View Milestones',
    icon: <MilestoneIcon />,
    shortcut: 'G M',
    keywords: 'deadline timeline deliverable',
    action: () => { navigate('/milestones'); onClose(); },
    category: 'Navigation',
  },
  {
    id: 'analytics',
    title: 'View Analytics',
    icon: <AnalyticsIcon />,
    shortcut: 'G A',
    keywords: 'charts reports statistics metrics',
    action: () => { navigate('/analytics'); onClose(); },
    category: 'Navigation',
  },
  {
    id: 'notifications',
    title: 'View Notifications',
    icon: <NotificationIcon />,
    shortcut: 'G N',
    keywords: 'alerts messages updates',
    action: () => { navigate('/notifications'); onClose(); },
    category: 'Navigation',
  },
  {
    id: 'users',
    title: 'Manage Users',
    icon: <UsersIcon />,
    shortcut: 'G U',
    keywords: 'people team members admins',
    action: () => { navigate('/users'); onClose(); },
    category: 'Navigation',
    roles: ['admin', 'vapt_analyst'],
  },
  {
    id: 'profile',
    title: 'My Profile',
    icon: <PersonIcon />,
    shortcut: 'G Me',
    keywords: 'account settings preferences',
    action: () => { navigate('/profile'); onClose(); },
    category: 'Navigation',
  },
  {
    id: 'new-finding',
    title: 'Create New Finding',
    icon: <AddIcon />,
    shortcut: 'C F',
    keywords: 'add vulnerability bug security issue',
    action: () => { 
      // Open quick add finding modal or navigate to findings with create
      navigate('/findings?action=create'); 
      onClose(); 
    },
    category: 'Actions',
    roles: ['admin', 'vapt_analyst'],
  },
  {
    id: 'new-project',
    title: 'Create New Project',
    icon: <AddIcon />,
    shortcut: 'C P',
    keywords: 'add project new',
    action: () => { 
      navigate('/projects?action=create'); 
      onClose(); 
    },
    category: 'Actions',
    roles: ['admin', 'vapt_analyst'],
  },
  {
    id: 'logout',
    title: 'Logout',
    icon: <LogoutIcon />,
    shortcut: 'L O',
    keywords: 'sign out exit leave',
    action: () => { 
      // Trigger logout
      window.dispatchEvent(new CustomEvent('app-logout'));
      onClose(); 
    },
    category: 'Actions',
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    icon: <KeyboardIcon />,
    shortcut: '?',
    keywords: 'help keys commands hotkeys',
    action: () => { 
      // Show shortcuts help
      onClose();
    },
    category: 'Help',
  },
];

const CommandPalette = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Get filtered commands based on role and search
  const commands = useMemo(() => {
    const allCommands = getCommands(user, navigate, onClose);
    return allCommands.filter(cmd => {
      // Check role permissions
      if (cmd.roles && !cmd.roles.includes(user?.role)) {
        return false;
      }
      // Check search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          cmd.title.toLowerCase().includes(query) ||
          cmd.keywords?.toLowerCase().includes(query) ||
          cmd.category.toLowerCase().includes(query) ||
          cmd.shortcut?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [user, navigate, onClose, searchQuery]);
  
  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups = {};
    commands.forEach(cmd => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [commands]);
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!open) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, commands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedCommand = commands[selectedIndex];
      if (selectedCommand) {
        selectedCommand.action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [open, commands, selectedIndex, onClose]);
  
  // Global keyboard shortcut listener
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Ctrl+K or Cmd+K to open
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (!open) {
          // Open command palette
          const event = new CustomEvent('open-command-palette');
          window.dispatchEvent(event);
        }
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [open]);
  
  // Reset state when opening
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [open]);
  
  // Render shortcut keys
  const renderShortcut = (shortcut) => {
    return shortcut.split(' ').map((key, idx) => (
      <Chip
        key={idx}
        label={key}
        size="small"
        sx={{
          height: '20px',
          fontSize: '0.65rem',
          fontWeight: 600,
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: premiumColors.text.secondary,
          border: '1px solid rgba(255,255,255,0.2)',
          ml: 0.5,
        }}
      />
    ));
  };
  
  // Get all commands in a flat list for index tracking
  const flatCommands = useMemo(() => {
    const flat = [];
    Object.values(groupedCommands).forEach(group => {
      flat.push(...group);
    });
    return flat;
  }, [groupedCommands]);
  
  let currentIndex = 0;
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: glassStyles.elevated.background,
          backdropFilter: glassStyles.elevated.backdropFilter,
          border: glassStyles.elevated.border,
          borderRadius: glassStyles.elevated.borderRadius,
          boxShadow: glassStyles.elevated.boxShadow,
          overflow: 'hidden',
          maxHeight: '70vh',
        },
      }}
    >
      <DialogTitle sx={{ p: 2, pb: 1 }}>
        <TextField
          autoFocus
          fullWidth
          placeholder="Search commands..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          InputProps={{
            startAdornment: (
              <SearchIcon sx={{ color: premiumColors.text.tertiary, mr: 1 }} />
            ),
            sx: {
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '12px',
              '& fieldset': {
                border: '1px solid rgba(255, 255, 255, 0.1)',
              },
              '&:hover fieldset': {
                border: '1px solid rgba(255, 255, 255, 0.2)',
              },
              '&.Mui-focused fieldset': {
                border: `1px solid ${premiumColors.accent.primary}`,
              },
            },
          }}
          sx={{
            '& .MuiInputBase-root': {
              color: premiumColors.text.primary,
              fontSize: '1rem',
            },
          }}
        />
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, overflow: 'auto' }}>
        {commands.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography sx={{ color: premiumColors.text.secondary }}>
              No commands found for "{searchQuery}"
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 1 }}>
            {Object.entries(groupedCommands).map(([category, items]) => (
              <Box key={category}>
                <Typography
                  variant="caption"
                  sx={{
                    px: 2,
                    py: 1,
                    display: 'block',
                    color: premiumColors.text.tertiary,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: '0.7rem',
                  }}
                >
                  {category}
                </Typography>
                {items.map((command) => {
                  const isSelected = currentIndex === selectedIndex;
                  const index = currentIndex++;
                  
                  return (
                    <ListItem
                      key={command.id}
                      onClick={() => command.action()}
                      sx={{
                        borderRadius: '10px',
                        mb: 0.5,
                        cursor: 'pointer',
                        backgroundColor: isSelected 
                          ? 'rgba(6, 182, 212, 0.15)' 
                          : 'transparent',
                        border: isSelected 
                          ? `1px solid ${premiumColors.accent.primary}` 
                          : '1px solid transparent',
                        transition: transitions.normal,
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        },
                      }}
                    >
                      <ListItemIcon sx={{ color: premiumColors.text.secondary, minWidth: 40 }}>
                        {command.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography sx={{ color: premiumColors.text.primary, fontWeight: 500 }}>
                            {command.title}
                          </Typography>
                        }
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {renderShortcut(command.shortcut)}
                      </Box>
                    </ListItem>
                  );
                })}
              </Box>
            ))}
          </List>
        )}
        
        {/* Footer with tips */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="caption" sx={{ color: premiumColors.text.tertiary }}>
            Press <strong>↑↓</strong> to navigate, <strong>Enter</strong> to select
          </Typography>
          <Chip
            label="Ctrl+K"
            size="small"
            sx={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: premiumColors.text.secondary,
              fontSize: '0.65rem',
              fontWeight: 600,
            }}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;
