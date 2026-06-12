import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  ClickAwayListener,
  CircularProgress,
  Chip,
  InputAdornment,
  TextField,
  IconButton
} from '@mui/material';
import {
  Search as SearchIcon,
  BugReport as BugReportIcon,
  Folder as FolderIcon,
  People as PeopleIcon,
  Description as DescriptionIcon,
  Close as CloseIcon,
  NavigateNext as NavigateNextIcon
} from '@mui/icons-material';
import { colors, typography, borderRadius, shadows } from '../theme/designSystem';

const SearchDropdown = ({ onNavigate, user, hasFullAccess, allocatedProjects, teamMembers }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query) => {
      if (query.trim().length >= 2) {
        performSearch(query);
      } else {
        setSearchResults(null);
      }
    }, 300),
    [user, hasFullAccess, allocatedProjects, teamMembers]
  );

  // Debounce utility function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  const performSearch = async (query) => {
    setIsLoading(true);
    
    try {
      // Simulate search results (replace with actual API call)
      const results = {
        findings: [],
        projects: [],
        users: [],
        reports: []
      };

      // Search findings (filtered by user's allocated projects if not admin)
      if (hasFullAccess()) {
        results.findings = [
          { id: '1', title: 'SQL Injection in Login Form', severity: 'critical', project: 'E-Commerce Platform' },
          { id: '2', title: 'XSS Vulnerability in Comments', severity: 'high', project: 'Banking App' },
          { id: '3', title: 'Weak Password Policy', severity: 'medium', project: 'HR Portal' }
        ].filter(finding => 
          finding.title.toLowerCase().includes(query.toLowerCase()) ||
          finding.project.toLowerCase().includes(query.toLowerCase())
        );
      }

      // Search projects (filtered by allocation if not admin)
      if (hasFullAccess()) {
        results.projects = [
          { id: '1', name: 'E-Commerce Platform', status: 'in_progress', code: 'ECOM-2024' },
          { id: '2', name: 'Banking Application', status: 'completed', code: 'BANK-2024' },
          { id: '3', name: 'HR Portal', status: 'planning', code: 'HR-2024' }
        ].filter(project => 
          project.name.toLowerCase().includes(query.toLowerCase()) ||
          project.code.toLowerCase().includes(query.toLowerCase())
        );
      }

      // Search users (admin only)
      if (hasFullAccess()) {
        results.users = [
          { id: '1', name: 'John Doe', email: 'john@example.com', role: 'developer' },
          { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'vapt_analyst' },
          { id: '3', name: 'Mike Johnson', email: 'mike@example.com', role: 'project_manager' }
        ].filter(user => 
          user.name.toLowerCase().includes(query.toLowerCase()) ||
          user.email.toLowerCase().includes(query.toLowerCase())
        );
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      debouncedSearch(searchQuery);
    } else {
      setSearchResults(null);
    }
  }, [searchQuery, debouncedSearch]);

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
    if (!isOpen && e.target.value.trim()) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (searchQuery.trim()) {
      setIsOpen(true);
    }
  };

  const handleClickAway = () => {
    setIsOpen(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setIsOpen(false);
    searchInputRef.current?.focus();
  };

  const handleItemClick = (type, item) => {
    if (onNavigate) {
      onNavigate(type, item);
    }
    setIsOpen(false);
  };

  const getResultIcon = (type) => {
    switch (type) {
      case 'findings': return <BugReportIcon />;
      case 'projects': return <FolderIcon />;
      case 'users': return <PeopleIcon />;
      case 'reports': return <DescriptionIcon />;
      default: return <SearchIcon />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return colors.severity.critical;
      case 'high': return colors.severity.high;
      case 'medium': return colors.severity.medium;
      case 'low': return colors.severity.low;
      default: return colors.text.secondary;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'planning': return '#f59e0b';
      default: return colors.text.secondary;
    }
  };

  const totalResults = searchResults ? 
    Object.values(searchResults).reduce((sum, arr) => sum + arr.length, 0) : 0;

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box ref={dropdownRef} sx={{ position: 'relative', width: '100%' }}>
        <TextField
          ref={searchInputRef}
          size="small"
          placeholder="Search (Ctrl+/)"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: colors.background.tertiary,
              borderRadius: borderRadius.lg,
              '& fieldset': {
                borderColor: colors.border.subtle,
              },
              '&:hover fieldset': {
                borderColor: colors.border.default,
              },
              '&.Mui-focused fieldset': {
                borderColor: colors.primary[500],
              },
            },
            '& .MuiInputBase-input': {
              color: colors.text.primary,
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {isLoading ? (
                  <CircularProgress size={16} sx={{ color: colors.primary[500] }} />
                ) : (
                  <SearchIcon sx={{ color: colors.text.secondary, fontSize: 18 }} />
                )}
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClearSearch}>
                  <CloseIcon sx={{ fontSize: 16, color: colors.text.secondary }} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Search Results Dropdown */}
        {isOpen && (
          <Paper
            elevation={8}
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              mt: 1,
              maxHeight: 400,
              overflow: 'auto',
              borderRadius: borderRadius.lg,
              backgroundColor: colors.background.secondary,
              border: `1px solid ${colors.border.default}`,
              boxShadow: shadows.xl,
              zIndex: 1300,
            }}
          >
            {isLoading ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress size={24} sx={{ color: colors.primary[500], mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Searching...
                </Typography>
              </Box>
            ) : searchQuery.trim().length < 2 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Type at least 2 characters to search
                </Typography>
              </Box>
            ) : searchResults && totalResults > 0 ? (
              <>
                {/* Results Header */}
                <Box sx={{ p: 2, borderBottom: `1px solid ${colors.border.subtle}` }}>
                  <Typography variant="caption" color="text.secondary">
                    {totalResults} results found
                  </Typography>
                </Box>

                {/* Findings */}
                {searchResults.findings.length > 0 && (
                  <>
                    <Box sx={{ px: 2, py: 1, bgcolor: colors.background.tertiary }}>
                      <Typography variant="caption" fontWeight={600} color="text.secondary">
                        FINDINGS
                      </Typography>
                    </Box>
                    {searchResults.findings.map((finding) => (
                      <ListItem
                        key={`finding-${finding.id}`}
                        button
                        onClick={() => handleItemClick('findings', finding)}
                        sx={{
                          py: 1.5,
                          '&:hover': { backgroundColor: colors.background.tertiary }
                        }}
                      >
                        <ListItemIcon sx={{ color: getSeverityColor(finding.severity) }}>
                          <BugReportIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight={500} color="text.primary">
                              {finding.title}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                {finding.project}
                              </Typography>
                              <Chip
                                label={finding.severity.toUpperCase()}
                                size="small"
                                sx={{
                                  bgcolor: getSeverityColor(finding.severity),
                                  color: 'white',
                                  fontSize: '0.625rem',
                                  height: 16
                                }}
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </>
                )}

                {/* Projects */}
                {searchResults.projects.length > 0 && (
                  <>
                    <Box sx={{ px: 2, py: 1, bgcolor: colors.background.tertiary }}>
                      <Typography variant="caption" fontWeight={600} color="text.secondary">
                        PROJECTS
                      </Typography>
                    </Box>
                    {searchResults.projects.map((project) => (
                      <ListItem
                        key={`project-${project.id}`}
                        button
                        onClick={() => handleItemClick('projects', project)}
                        sx={{
                          py: 1.5,
                          '&:hover': { backgroundColor: colors.background.tertiary }
                        }}
                      >
                        <ListItemIcon sx={{ color: colors.primary[500] }}>
                          <FolderIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight={500} color="text.primary">
                              {project.name}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                {project.code}
                              </Typography>
                              <Chip
                                label={project.status.replace('_', ' ')}
                                size="small"
                                sx={{
                                  bgcolor: getStatusColor(project.status),
                                  color: 'white',
                                  fontSize: '0.625rem',
                                  height: 16
                                }}
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </>
                )}

                {/* Users */}
                {searchResults.users.length > 0 && (
                  <>
                    <Box sx={{ px: 2, py: 1, bgcolor: colors.background.tertiary }}>
                      <Typography variant="caption" fontWeight={600} color="text.secondary">
                        USERS
                      </Typography>
                    </Box>
                    {searchResults.users.map((user) => (
                      <ListItem
                        key={`user-${user.id}`}
                        button
                        onClick={() => handleItemClick('users', user)}
                        sx={{
                          py: 1.5,
                          '&:hover': { backgroundColor: colors.background.tertiary }
                        }}
                      >
                        <ListItemIcon sx={{ color: colors.text.secondary }}>
                          <PeopleIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight={500} color="text.primary">
                              {user.name}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                {user.email}
                              </Typography>
                              <Chip
                                label={user.role.replace('_', ' ')}
                                size="small"
                                variant="outlined"
                                sx={{
                                  fontSize: '0.625rem',
                                  height: 16
                                }}
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </>
                )}
              </>
            ) : searchQuery.trim().length >= 2 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <SearchIcon sx={{ fontSize: 48, color: colors.text.tertiary, mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  No results found for "{searchQuery}"
                </Typography>
                <Typography variant="caption" color="text.tertiary" sx={{ mt: 1, display: 'block' }}>
                  Try searching for findings, projects, or users
                </Typography>
              </Box>
            ) : null}
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
};

export default SearchDropdown;
