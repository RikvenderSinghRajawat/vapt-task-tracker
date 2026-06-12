import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Box, Typography, IconButton, Paper, Slide, Fade } from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { premiumColors, glassStyles, transitions } from '../theme/premiumTheme';

// Toast Context
const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

// Individual Toast Component
const ToastItem = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  
  useEffect(() => {
    if (toast.duration !== Infinity) {
      const timer = setTimeout(() => {
        handleClose();
      }, toast.duration || 5000);
      
      return () => clearTimeout(timer);
    }
  }, [toast.duration]);
  
  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(toast.id), 300);
  };
  
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <SuccessIcon sx={{ color: premiumColors.status.success }} />;
      case 'error':
        return <ErrorIcon sx={{ color: premiumColors.status.error }} />;
      case 'warning':
        return <WarningIcon sx={{ color: premiumColors.status.warning }} />;
      case 'info':
      default:
        return <InfoIcon sx={{ color: premiumColors.status.info }} />;
    }
  };
  
  const getColors = () => {
    switch (toast.type) {
      case 'success':
        return {
          border: `1px solid rgba(16, 185, 129, 0.3)`,
          background: 'rgba(16, 185, 129, 0.1)',
          glow: '0 0 20px rgba(16, 185, 129, 0.2)',
        };
      case 'error':
        return {
          border: `1px solid rgba(239, 68, 68, 0.3)`,
          background: 'rgba(239, 68, 68, 0.1)',
          glow: '0 0 20px rgba(239, 68, 68, 0.2)',
        };
      case 'warning':
        return {
          border: `1px solid rgba(245, 158, 11, 0.3)`,
          background: 'rgba(245, 158, 11, 0.1)',
          glow: '0 0 20px rgba(245, 158, 11, 0.2)',
        };
      case 'info':
      default:
        return {
          border: `1px solid rgba(59, 130, 246, 0.3)`,
          background: 'rgba(59, 130, 246, 0.1)',
          glow: '0 0 20px rgba(59, 130, 246, 0.2)',
        };
    }
  };
  
  const colors = getColors();
  
  return (
    <Slide direction="left" in={!isExiting} mountOnEnter unmountOnExit>
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 2,
          mb: 1,
          minWidth: '320px',
          maxWidth: '400px',
          borderRadius: '14px',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: glassStyles.card.background,
          border: colors.border,
          boxShadow: `${glassStyles.card.boxShadow}, ${colors.glow}`,
          transition: transitions.normal,
          animation: 'slideIn 0.3s ease-out',
          '@keyframes slideIn': {
            from: { transform: 'translateX(100%)', opacity: 0 },
            to: { transform: 'translateX(0)', opacity: 1 },
          },
        }}
      >
        {getIcon()}
        
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {toast.title && (
            <Typography
              variant="subtitle2"
              sx={{
                color: premiumColors.text.primary,
                fontWeight: 600,
                mb: 0.25,
              }}
            >
              {toast.title}
            </Typography>
          )}
          <Typography
            variant="body2"
            sx={{
              color: premiumColors.text.secondary,
              fontSize: '0.875rem',
            }}
          >
            {toast.message}
          </Typography>
        </Box>
        
        <IconButton
          size="small"
          onClick={handleClose}
          sx={{
            color: premiumColors.text.tertiary,
            '&:hover': { color: premiumColors.text.secondary },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Paper>
    </Slide>
  );
};

// Toast Provider Component
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  
  const addToast = useCallback((options) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    const newToast = {
      id,
      type: options.type || 'info',
      title: options.title,
      message: options.message,
      duration: options.duration !== undefined ? options.duration : 5000,
    };
    
    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);
  
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  
  // Convenience methods
  const toast = {
    success: (message, title, duration) => 
      addToast({ type: 'success', message, title, duration }),
    error: (message, title, duration) => 
      addToast({ type: 'error', message, title, duration }),
    warning: (message, title, duration) => 
      addToast({ type: 'warning', message, title, duration }),
    info: (message, title, duration) => 
      addToast({ type: 'info', message, title, duration }),
  };
  
  return (
    <ToastContext.Provider value={toast}>
      {children}
      
      {/* Toast Container */}
      <Box
        sx={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          pointerEvents: 'none',
          '& > *': { pointerEvents: 'auto' },
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={removeToast} />
        ))}
      </Box>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
