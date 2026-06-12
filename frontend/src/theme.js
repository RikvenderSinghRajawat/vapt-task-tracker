import { createTheme, alpha } from '@mui/material/styles';
import { colors, typography, borderRadius, transitions } from './theme/designSystem';

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0D1117',
      paper: '#161B22',
    },
    primary: {
      main: '#06B6D4',
      light: '#22D3EE',
      dark: '#0891B2',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#8B5CF6',
      light: '#A78BFA',
      dark: '#7C3AED',
      contrastText: '#ffffff',
    },
    success: { main: '#3FB950' },
    warning: { main: '#D29922' },
    error: { main: '#D73A49' },
    info: { main: '#58A6FF' },
    text: {
      primary: '#E6EDF3',
      secondary: '#9CA3AF',
      disabled: '#484F58',
    },
    divider: '#30363D',
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { fontSize: '1.625rem', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.3 },
    h2: { fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.35 },
    h3: { fontSize: '1.125rem', fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.4 },
    h4: { fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.4 },
    h5: { fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.45 },
    h6: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.5 },
    body1: { fontSize: '0.875rem', lineHeight: 1.6 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.55 },
    button: { fontSize: '0.8125rem', fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em' },
    caption: { fontSize: '0.75rem', color: '#6E7681', lineHeight: 1.5 },
    overline: { fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6E7681' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: colors.background.primary,
          scrollbarWidth: 'thin',
          scrollbarColor: '#30363d #161b22',
        },
        '*::-webkit-scrollbar': { width: '6px', height: '6px' },
        '*::-webkit-scrollbar-track': { background: '#161b22', borderRadius: '3px' },
        '*::-webkit-scrollbar-thumb': { background: '#30363d', borderRadius: '3px' },
        '*::-webkit-scrollbar-thumb:hover': { background: '#484f58' },
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        '@keyframes fadeInScale': {
          from: { opacity: 0, transform: 'scale(0.95)' },
          to: { opacity: 1, transform: 'scale(1)' },
        },
        '@keyframes shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        '@keyframes slideIn': {
          from: { opacity: 0, transform: 'translateX(-10px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
        '@keyframes pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        '@keyframes glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(6, 182, 212, 0.5)' },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '10px',
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 20px',
          transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        },
        contained: {
          background: `linear-gradient(135deg, ${colors.primary[500]} 0%, ${colors.primary[600]} 100%)`,
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.1)',
          '&:hover': {
            background: `linear-gradient(135deg, ${colors.primary[400]} 0%, ${colors.primary[500]} 100%)`,
            boxShadow: `0 4px 12px ${alpha(colors.primary[500], 0.3)}`,
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          border: '1px solid #30363d',
          '&:hover': { background: 'rgba(255,255,255,0.05)', border: '1px solid #484f58' },
        },
        text: {
          '&:hover': { background: 'rgba(255,255,255,0.05)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: colors.background.secondary,
          border: '1px solid #30363d',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '10px',
            backgroundColor: alpha(colors.background.tertiary, 0.6),
            '& fieldset': { borderColor: '#30363d' },
            '&:hover fieldset': { borderColor: '#484f58' },
            '&.Mui-focused fieldset': {
              borderColor: colors.primary[500],
              boxShadow: `0 0 0 3px ${alpha(colors.primary[500], 0.1)}`,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '9999px',
          fontWeight: 500,
        },
        filled: { background: 'rgba(255,255,255,0.08)' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #21262d',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            color: '#9ca3af',
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid #21262d',
          background: colors.background.primary,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: alpha(colors.background.primary, 0.8),
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #21262d',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: '8px',
          padding: '6px 12px',
          fontSize: '0.75rem',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '16px',
          background: colors.background.secondary,
          border: '1px solid #30363d',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: '10px',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: colors.background.secondary,
          border: `1px solid ${colors.border.subtle}`,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: colors.text.primary,
          '&:hover': {
            backgroundColor: colors.background.tertiary,
          },
          '&.Mui-selected': {
            backgroundColor: alpha(colors.primary[500], 0.15),
            '&:hover': {
              backgroundColor: alpha(colors.primary[500], 0.25),
            },
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          background: `linear-gradient(135deg, ${colors.primary[500]} 0%, ${colors.primary[400]} 100%)`,
          height: 3,
          borderRadius: '3px 3px 0 0',
        },
      },
    },
  },
});

export default theme;
