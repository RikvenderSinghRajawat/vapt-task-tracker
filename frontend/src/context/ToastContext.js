/**
 * ToastContext — Centralised toast/snackbar notifications
 * Replaces all browser alert()/confirm()/prompt() calls with branded MUI Snackbar/Dialog
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { colors, typography, borderRadius } from '../theme/designSystem';

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider = ({ children }) => {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    severity: 'warning',
    confirmLabel: 'Confirm',
    resolve: null,
    loading: false,
  });

  const showToast = useCallback((message, severity = 'info', duration = 4000) => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const hideToast = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  const showConfirm = useCallback(({ title, message, severity = 'warning', confirmLabel = 'Confirm' }) => {
    return new Promise((resolve) => {
      setConfirmDialog({
        open: true,
        title,
        message,
        severity,
        confirmLabel,
        loading: false,
        resolve,
      });
    });
  }, []);

  const handleCancelConfirm = useCallback(() => {
    setConfirmDialog(prev => {
      if (prev.resolve) prev.resolve(false);
      return { ...prev, open: false, resolve: null };
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, showConfirm }}>
      {children}

      {/* Toast Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={hideToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ zIndex: 99999 }}
      >
        <Alert
          onClose={hideToast}
          severity={snackbar.severity}
          elevation={6}
          variant="filled"
          sx={{
            backgroundColor:
              snackbar.severity === 'success' ? colors.status.success :
              snackbar.severity === 'error'   ? colors.severity.critical :
              snackbar.severity === 'warning' ? colors.status.warning :
                                                colors.info,
            color: '#fff',
            borderRadius: borderRadius.lg,
            fontWeight: typography.weight.medium,
            minWidth: 320,
            '& .MuiAlert-icon': { color: '#fff' },
            '& .MuiAlert-action': { color: '#fff' },
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCancelConfirm}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: colors.background.secondary,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: borderRadius.xl,
          }
        }}
      >
        <DialogTitle sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <Alert
            severity={confirmDialog.severity}
            sx={{
              mb: 2,
              background: confirmDialog.severity === 'error'
                ? 'rgba(215, 58, 73, 0.1)'
                : 'rgba(219, 171, 9, 0.1)',
              color: colors.text.secondary,
              borderRadius: borderRadius.lg,
            }}
          >
            {confirmDialog.message}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setConfirmDialog(prev => {
                if (prev.resolve) prev.resolve(false);
                return { ...prev, open: false, resolve: null };
              });
            }}
            disabled={confirmDialog.loading}
            sx={{ color: colors.text.secondary, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              setConfirmDialog(prev => {
                if (prev.resolve) prev.resolve(true);
                return { ...prev, open: false, resolve: null };
              });
            }}
            variant="contained"
            disabled={confirmDialog.loading}
            sx={{
              background: confirmDialog.severity === 'error' ? colors.severity.critical : colors.status.warning,
              color: '#fff',
              textTransform: 'none',
              '&:hover': {
                background: confirmDialog.severity === 'error' ? '#B91C1C' : '#D97706',
              },
            }}
          >
            {confirmDialog.confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>
    </ToastContext.Provider>
  );
};
