import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Error as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { colors, typography, shadows, borderRadius } from '../../theme/designSystem';

/**
 * ErrorBoundary - Catches JavaScript errors in child components
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    
    // Log to error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Could send to analytics/error tracking here
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            backgroundColor: colors.background.primary
          }}
        >
          <Paper
            elevation={0}
            sx={{
              maxWidth: 500,
              width: '100%',
              p: 4,
              textAlign: 'center',
              backgroundColor: colors.background.secondary,
              border: `1px solid ${colors.border.subtle}`,
              borderRadius: borderRadius.xl,
              boxShadow: shadows.xl
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                backgroundColor: 'rgba(215, 58, 73, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3
              }}
            >
              <ErrorIcon sx={{ fontSize: 40, color: colors.severity.critical }} />
            </Box>

            <Typography
              variant="h5"
              sx={{
                color: colors.text.primary,
                fontWeight: typography.weight.bold,
                mb: 1
              }}
            >
              Something went wrong
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: colors.text.secondary,
                mb: 3
              }}
            >
              We're sorry, but an unexpected error has occurred. 
              Our team has been notified.
            </Typography>

            {this.state.error && (
              <Box
                sx={{
                  backgroundColor: colors.background.tertiary,
                  borderRadius: borderRadius.lg,
                  p: 2,
                  mb: 3,
                  textAlign: 'left',
                  overflow: 'auto'
                }}
              >
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{
                    color: colors.severity.critical,
                    fontFamily: typography.fontFamily.mono,
                    fontSize: typography.size.xs,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {this.state.error.toString()}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={this.handleReset}
                sx={{
                  borderColor: colors.border.default,
                  color: colors.text.primary,
                  '&:hover': {
                    borderColor: colors.border.strong,
                    backgroundColor: colors.background.tertiary
                  }
                }}
              >
                Try Again
              </Button>
              
              <Button
                variant="contained"
                onClick={this.handleReload}
                sx={{
                  backgroundColor: colors.primary[600],
                  '&:hover': {
                    backgroundColor: colors.primary[500]
                  }
                }}
              >
                Reload Page
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

/**
 * RouteErrorBoundary - Error boundary specifically for routes
 */
export const RouteErrorBoundary = ({ children }) => (
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
);

/**
 * ComponentErrorBoundary - Error boundary for individual components
 * Shows inline error instead of full-screen
 */
export const ComponentErrorBoundary = ({ children, onError, onReset }) => (
  <ErrorBoundary 
    onError={onError}
    onReset={onReset}
    fallback={
      <Box
        sx={{
          p: 3,
          textAlign: 'center',
          backgroundColor: 'rgba(215, 58, 73, 0.05)',
          border: `1px dashed ${colors.severity.critical}50`,
          borderRadius: borderRadius.lg
        }}
      >
        <ErrorIcon sx={{ color: colors.severity.critical, mb: 1 }} />
        <Typography variant="body2" color={colors.text.secondary}>
          Component failed to load
        </Typography>
      </Box>
    }
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;
