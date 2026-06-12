import React, { useState } from 'react';
import {
  Box,
  Alert,
  AlertTitle,
  Collapse,
  IconButton,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
  Divider,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Computer as ComputerIcon,
  Storage as StorageIcon,
  Code as CodeIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Terminal as TerminalIcon
} from '@mui/icons-material';
import { backendStatus } from '../services/backendStatus';

const BackendUnavailable = ({ status, onDismiss }) => {
  const [expanded, setExpanded] = useState(false);
  const [checking, setChecking] = useState(false);
  const [localDismissed, setLocalDismissed] = useState(false);

  if (status.isAvailable || localDismissed) {
    return null;
  }

  const { requirements } = status;

  const handleCheckNow = async () => {
    setChecking(true);
    await backendStatus.checkNow();
    setChecking(false);
  };

  const handleDismiss = () => {
    setLocalDismissed(true);
    if (onDismiss) onDismiss();
  };

  return (
    <Collapse in={!localDismissed}>
      <Paper 
        elevation={3} 
        sx={{ 
          m: 2, 
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'error.main'
        }}
      >
        <Alert 
          severity="error" 
          variant="filled"
          icon={<ErrorIcon />}
          action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Tooltip title="Check backend status now">
                <IconButton
                  size="small"
                  onClick={handleCheckNow}
                  disabled={checking}
                  sx={{ color: 'white' }}
                >
                  <RefreshIcon sx={{ animation: checking ? 'spin 1s linear infinite' : 'none' }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Dismiss for this session">
                <IconButton
                  size="small"
                  onClick={handleDismiss}
                  sx={{ color: 'white' }}
                >
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Box>
          }
          sx={{ 
            borderRadius: '8px 8px 0 0',
            '& .MuiAlert-message': { width: '100%' }
          }}
        >
          <AlertTitle sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
            {requirements.title}
          </AlertTitle>
          <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
            {requirements.description}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Last checked: {status.lastCheck ? new Date(status.lastCheck).toLocaleTimeString() : 'Never'}
          </Typography>
        </Alert>

        <Box sx={{ p: 2 }}>
          {/* Server Requirements */}
          <Accordion 
            expanded={expanded} 
            onChange={() => setExpanded(!expanded)}
            elevation={0}
            sx={{ 
              '&:before': { display: 'none' },
              backgroundColor: 'transparent'
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                px: 0,
                '& .MuiAccordionSummary-content': { my: 1 }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SettingsIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>
                  Server Requirements
                </Typography>
                <Chip 
                  label="Action Required" 
                  color="error" 
                  size="small" 
                  sx={{ ml: 1 }}
                />
              </Box>
            </AccordionSummary>
            
            <AccordionDetails sx={{ px: 0 }}>
              <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                {requirements.requirements.map((req, index) => (
                  <React.Fragment key={req.name}>
                    <ListItem sx={{ py: 1.5 }}>
                      <ListItemIcon>
                        {req.name === 'Node.js' && <CodeIcon color="primary" />}
                        {req.name === 'MongoDB' && <StorageIcon color="primary" />}
                        {req.name === 'Backend Server' && <ComputerIcon color="primary" />}
                        {req.name === 'Environment Variables' && <SettingsIcon color="primary" />}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {req.name}
                            </Typography>
                            {req.version && (
                              <Chip label={`>= ${req.version}`} size="small" variant="outlined" />
                            )}
                            {req.port && (
                              <Chip label={`Port ${req.port}`} size="small" variant="outlined" />
                            )}
                            {req.required && (
                              <Chip label="Required" color="error" size="small" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            {req.check && (
                              <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', p: 0.5, borderRadius: 0.5 }}>
                                Check: {req.check}
                              </Typography>
                            )}
                            {req.note && (
                              <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                                Note: {req.note}
                              </Typography>
                            )}
                            {req.file && (
                              <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                                Config file: <code>{req.file}</code>
                              </Typography>
                            )}
                            {req.commands && (
                              <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.900', borderRadius: 1 }}>
                                <Typography variant="caption" color="grey.400" component="div" sx={{ mb: 0.5 }}>
                                  Commands to start:
                                </Typography>
                                {req.commands.map((cmd, i) => (
                                  <Typography 
                                    key={i} 
                                    variant="caption" 
                                    component="div" 
                                    sx={{ 
                                      fontFamily: 'monospace', 
                                      color: '#00ff88',
                                      pl: 1
                                    }}
                                  >
                                    $ {cmd}
                                  </Typography>
                                ))}
                              </Box>
                            )}
                            {req.variables && (
                              <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                                <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
                                  Required variables:
                                </Typography>
                                {req.variables.map((v, i) => (
                                  <Typography 
                                    key={i} 
                                    variant="caption" 
                                    component="div" 
                                    sx={{ 
                                      fontFamily: 'monospace',
                                      pl: 1
                                    }}
                                  >
                                    {v}
                                  </Typography>
                                ))}
                              </Box>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < requirements.requirements.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>

              {/* Quick Start Guide */}
              <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TerminalIcon fontSize="small" />
                  Quick Start Guide
                </Typography>
                <Box component="ol" sx={{ m: 0, pl: 2 }}>
                  {requirements.quickStart.map((step, index) => (
                    <Typography component="li" key={index} variant="body2" sx={{ mb: 0.5, fontFamily: step.includes(':') ? 'monospace' : 'inherit' }}>
                      {step}
                    </Typography>
                  ))}
                </Box>
              </Box>

              {/* Features Unavailable */}
              <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InfoIcon fontSize="small" />
                  Features Currently Unavailable
                </Typography>
                <List dense>
                  {requirements.featuresUnavailable.map((feature, index) => (
                    <ListItem key={index} sx={{ py: 0 }}>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        <ErrorIcon fontSize="small" color="error" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={feature} 
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              {/* Backend availability note */}
              <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon fontSize="small" color="success" />
                  Working Features
                </Typography>
                <Typography variant="body2">
                  {requirements.note}
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleDismiss}
              sx={{ textTransform: 'none' }}
            >
              Dismiss
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleCheckNow}
              disabled={checking}
              startIcon={<RefreshIcon />}
              sx={{ textTransform: 'none' }}
            >
              {checking ? 'Checking...' : 'Check Again'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Collapse>
  );
};

export default BackendUnavailable;
