import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogActions, Button, Typography, Box, LinearProgress } from '@mui/material';
import { Schedule as ClockIcon } from '@mui/icons-material';

const InactivityWarningDialog = ({ open, onExtend, onLogout, timeRemaining = 300 }) => {
  const [seconds, setSeconds] = useState(timeRemaining);

  useEffect(() => {
    setSeconds(timeRemaining);
  }, [timeRemaining, open]);

  const totalSecs = 300;
  const progress = (seconds / totalSecs) * 100;
  const barColor = seconds > 120 ? '#f59e0b' : seconds > 60 ? '#ef4444' : '#dc2626';

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') onExtend();
      }}
      PaperProps={{
        sx: {
          background: '#1e293b',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          maxWidth: 400,
          width: '100%',
          mx: 2,
          boxShadow: '0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        }
      }}
    >
      <Box sx={{ height: 3, background: 'linear-gradient(90deg, #f59e0b, #ef4444)', borderRadius: '16px 16px 0 0' }} />

      <Box sx={{ p: 3.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ClockIcon sx={{ fontSize: 22, color: '#f59e0b' }} />
          </Box>
          <Box>
            <Typography sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.3 }}>
              Session Timeout
            </Typography>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem', mt: 0.25 }}>
              Extend or you will be logged out
            </Typography>
          </Box>
        </Box>

        <DialogContent sx={{ p: 0, mb: 2.5 }}>
          <Typography sx={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.6, mb: 2.5 }}>
            Your session is about to expire due to inactivity. Any unsaved progress will be lost.
          </Typography>

          <Box sx={{
            background: 'rgba(15, 23, 42, 0.5)', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)', p: 2, mb: 2,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1, mb: 1.5 }}>
              <Typography sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '2rem', fontFamily: "'Inter', monospace", lineHeight: 1 }}>
                {seconds}
              </Typography>
              <Typography sx={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 500 }}>
                seconds remaining
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 4,
                borderRadius: 2,
                background: 'rgba(255,255,255,0.06)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 2,
                  backgroundColor: barColor,
                  transition: 'width 0.3s ease',
                }
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, background: 'rgba(239, 68, 68, 0.06)', borderRadius: '8px', p: 1.5 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
            <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem', lineHeight: 1.4 }}>
              For security, sessions expire after 20 minutes of inactivity.
            </Typography>
          </Box>
        </DialogContent>

        {seconds <= 0 ? (
          <Box sx={{ textAlign: 'center', py: 1 }}>
            <Typography sx={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
              Logging out...
            </Typography>
          </Box>
        ) : (
          <DialogActions sx={{ p: 0, gap: 1.5, justifyContent: 'stretch' }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={onLogout}
              sx={{
                borderColor: 'rgba(255,255,255,0.12)',
                color: '#94a3b8',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.85rem',
                borderRadius: '8px',
                py: 1.2,
                '&:hover': { borderColor: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.04)' }
              }}
            >
              Logout Now
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={onExtend}
              sx={{
                background: '#06b6d4',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                borderRadius: '8px',
                py: 1.2,
                '&:hover': { background: '#0891b2' }
              }}
            >
              Stay Logged In
            </Button>
          </DialogActions>
        )}
      </Box>
    </Dialog>
  );
};

export default InactivityWarningDialog;
