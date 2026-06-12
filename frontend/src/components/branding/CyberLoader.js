import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import EKavachLogo from '../EKavachLogo';
import { colors, typography } from '../../theme/designSystem';

const statusMessages = [
  'Initializing Security Engine...',
  'Loading Threat Intelligence...',
  'Analyzing Vulnerability Data...',
  'Establishing Secure Channel...',
  'Synchronizing Asset Inventory...',
  'Calibrating Risk Algorithms...',
  'Indexing Finding Database...',
  'Updating Defense Signatures...',
  'Scanning Network Topology...',
  'Loading Dashboard Intelligence...',
];

const CyberLoader = ({ message = 'Loading...', showProgress = false, progress = 0, duration = null }) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (showProgress) return;
    const interval = setInterval(() => {
      if (mountedRef.current) setMsgIndex(prev => (prev + 1) % statusMessages.length);
    }, 2500);

    // Auto-hide after duration if provided
    let hideTimer;
    if (duration) {
      hideTimer = setTimeout(() => {
        if (mountedRef.current) setVisible(false);
      }, duration);
    }

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [showProgress, duration]);

  const displayMessage = useMemo(() => {
    if (showProgress) return message;
    return statusMessages[msgIndex];
  }, [showProgress, message, msgIndex]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Box sx={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(180deg, ${colors.background.primary} 0%, ${colors.background.secondary} 50%, ${colors.background.primary} 100%)`,
            overflow: 'hidden',
          }}>
            {/* Cyber grid */}
            <Box sx={{
              position: 'absolute', inset: 0, opacity: 0.04,
              backgroundImage: `linear-gradient(${colors.primary[400]}10 1px, transparent 1px), linear-gradient(90deg, ${colors.primary[400]}10 1px, transparent 1px)`,
              backgroundSize: '40px 40px', pointerEvents: 'none',
            }} />

            {/* Radial glows */}
            <Box sx={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: `
                radial-gradient(ellipse at 30% 20%, ${colors.primary[500]}08 0%, transparent 50%),
                radial-gradient(ellipse at 70% 80%, ${colors.severity.info}06 0%, transparent 50%),
                radial-gradient(ellipse at 50% 50%, ${colors.primary[500]}04 0%, transparent 60%)
              `,
            }} />

            {/* Scanning line */}
            <Box
              component={motion.div}
              animate={{ top: ['-10%', '110%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              sx={{
                position: 'absolute', left: '10%', right: '10%', height: '1px',
                background: `linear-gradient(90deg, transparent, ${colors.primary[400]}50, transparent)`,
                pointerEvents: 'none',
              }}
            />

            {/* Circular scanner ring 1 */}
            <Box
              component={motion.div}
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              sx={{
                position: 'absolute', top: '50%', left: '50%',
                width: 200, height: 200, ml: -100, mt: -100,
                borderRadius: '50%',
                border: `1px solid ${colors.primary[500]}10`,
                pointerEvents: 'none',
                '&::before': {
                  content: '""',
                  position: 'absolute', top: -1, left: '50%',
                  width: 3, height: '50%',
                  background: `linear-gradient(180deg, ${colors.primary[400]}60, transparent)`,
                  borderRadius: '2px', transform: 'translateX(-50%)',
                },
              }}
            />

            {/* Circular scanner ring 2 (reverse) */}
            <Box
              component={motion.div}
              animate={{ rotate: -360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              sx={{
                position: 'absolute', top: '50%', left: '50%',
                width: 160, height: 160, ml: -80, mt: -80,
                borderRadius: '50%',
                border: `1px solid ${colors.severity.info}08`,
                pointerEvents: 'none',
                '&::before': {
                  content: '""',
                  position: 'absolute', bottom: -1, left: '50%',
                  width: 2, height: '40%',
                  background: `linear-gradient(0deg, ${colors.severity.info}40, transparent)`,
                  borderRadius: '2px', transform: 'translateX(-50%)',
                },
              }}
            />
          </Box>

          {/* Content */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, gap: 3 }}>
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <Box sx={{ filter: `drop-shadow(0 0 20px ${colors.primary[500]}40)`, mb: 0.5 }}>
                <EKavachLogo size="md" variant="icon" />
              </Box>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              <Typography variant="h4" sx={{
                fontWeight: 800,
                fontSize: { xs: '1.5rem', sm: '1.75rem' },
                fontStyle: 'italic',
                background: `linear-gradient(135deg, ${colors.primary[300]} 0%, ${colors.severity.info} 50%, ${colors.primary[400]} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                letterSpacing: '-0.3px',
              }}>
                eKavach
              </Typography>
            </motion.div>

            <Box sx={{ height: 24, display: 'flex', alignItems: 'center' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={msgIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <Typography sx={{ color: colors.text.tertiary, fontSize: typography.size.sm, fontWeight: 400 }}>
                    {displayMessage}
                  </Typography>
                </motion.div>
              </AnimatePresence>
            </Box>

            <Box sx={{ width: 240, textAlign: 'center' }}>
              {showProgress ? (
                <Box sx={{ width: '100%' }}>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                      height: 4, borderRadius: 2,
                      backgroundColor: colors.background.elevated,
                      '& .MuiLinearProgress-bar': {
                        background: `linear-gradient(90deg, ${colors.primary[500]}, ${colors.severity.info})`, borderRadius: 2,
                      },
                    }}
                  />
                  <Typography sx={{ color: colors.text.disabled, fontSize: 10, mt: 0.75, fontFamily: typography.fontFamily.mono }}>
                    {Math.round(progress)}%
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <Box
                      key={i}
                      component={motion.div}
                      animate={{ scale: [0.6, 1, 0.6], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
                      sx={{ width: 6, height: 6, borderRadius: '50%', background: colors.primary[400] }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            style={{ position: 'absolute', bottom: 32, zIndex: 1 }}
          >
            <Typography variant="caption" sx={{ color: colors.text.disabled, fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500 }}>
              Enterprise Security Platform
            </Typography>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CyberLoader;
