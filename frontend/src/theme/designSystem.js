/**
 * Premium Enterprise Design System
 * Inspired by Linear, Stripe, Notion, and Vercel dashboards
 * 
 * Design Principles:
 * - Clean, minimal aesthetics
 * - High contrast for readability
 * - Subtle depth with shadows and layering
 * - Smooth micro-interactions
 * - Consistent spacing and typography
 */

// ============================================
// COLOR PALETTE
// ============================================
export const colors = {
  // Base colors - Neutral gray scale (inspired by Linear)
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A',
  },

  // Primary accent - Cyan/Teal (modern, professional)
  primary: {
    50: '#ECFEFF',
    100: '#CFFAFE',
    200: '#A5F3FC',
    300: '#67E8F9',
    400: '#22D3EE',
    500: '#06B6D4',
    600: '#0891B2',
    700: '#0E7490',
    800: '#155E75',
    900: '#164E63',
    950: '#083344',
  },

  // Secondary accent - Violet/Purple (for highlights)
  secondary: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
    950: '#2E1065',
  },

  // Semantic colors - Severity/Status (softened for eye comfort)
  severity: {
    critical: '#D73A49',  // Softer red - GitHub style
    high: '#F0883E',      // Softer orange
    medium: '#DBAB09',    // Softer amber/gold
    low: '#3FB950',       // Softer green
    info: '#58A6FF',      // Softer blue
  },

  // Status colors (softened)
  status: {
    success: '#3FB950',
    warning: '#DBAB09',
    error: '#D73A49',
    info: '#58A6FF',
    neutral: '#8B949E',
  },

  // Background hierarchy - Softer dark theme (easier on eyes)
  background: {
    primary: '#0D1117',      // Main background - GitHub dark style (softer than pure black)
    secondary: '#161B22',    // Card/container background
    tertiary: '#1C2128',     // Elevated surfaces
    elevated: '#21262D',     // Highest elevation
  },

  // Text colors - Softer whites (less harsh contrast)
  text: {
    primary: '#E6EDF3',      // Headings - soft white (not pure #FAFAFA)
    secondary: '#9CA3AF',    // Body text - warm gray
    tertiary: '#6E7681',      // Subtle text - muted gray
    disabled: '#484F58',     // Disabled state
    inverse: '#0D1117',      // Text on light backgrounds
  },

  // Border colors - Subtle but visible
  border: {
    subtle: '#30363D',       // Very subtle borders
    default: '#484F58',      // Standard borders
    strong: '#6E7681',       // Emphasized borders
    focus: '#58A6FF',        // Focus ring - softer blue
  },
};

// ============================================
// TYPOGRAPHY
// ============================================
export const typography = {
  fontFamily: {
    sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
  },

  // Font sizes with consistent scale
  size: {
    xs: '0.7rem',       // 11.2px
    sm: '0.8125rem',    // 13px
    base: '0.9375rem',  // 15px
    lg: '1.0625rem',    // 17px
    xl: '1.1875rem',    // 19px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.75rem',   // 28px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
  },

  // Font weights
  weight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  // Line heights
  leading: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
  },

  // Letter spacing
  tracking: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
  },
};

// ============================================
// SPACING SYSTEM
// ============================================
export const spacing = {
  0: '0',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px
  1.5: '0.375rem',   // 6px
  2: '0.5rem',       // 8px
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px
  3.5: '0.875rem',   // 14px
  4: '1rem',         // 16px
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px
  7: '1.75rem',      // 28px
  8: '2rem',         // 32px
  9: '2.25rem',      // 36px
  10: '2.5rem',      // 40px
  11: '2.75rem',     // 44px
  12: '3rem',        // 48px
  16: '4rem',        // 64px
  20: '5rem',        // 80px
  24: '6rem',        // 96px
};

// ============================================
// SHADOWS & EFFECTS
// ============================================
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  
  // Premium glow effects
  glow: {
    sm: '0 0 4px rgba(6, 182, 212, 0.3)',
    DEFAULT: '0 0 8px rgba(6, 182, 212, 0.4)',
    lg: '0 0 16px rgba(6, 182, 212, 0.5)',
    primary: '0 0 20px rgba(6, 182, 212, 0.3)',
    success: '0 0 12px rgba(63, 185, 80, 0.3)',
    danger: '0 0 12px rgba(215, 58, 73, 0.3)',
    warning: '0 0 12px rgba(219, 171, 9, 0.3)',
    neon: '0 0 6px rgba(6, 182, 212, 0.5), 0 0 20px rgba(6, 182, 212, 0.15)',
  },
};

// ============================================
// BORDER RADIUS
// ============================================
export const borderRadius = {
  none: '0',
  sm: '0.125rem',    // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',    // 6px
  lg: '0.5rem',      // 8px
  xl: '0.75rem',     // 12px
  '2xl': '1rem',      // 16px
  '3xl': '1.5rem',    // 24px
  full: '9999px',
};

// ============================================
// TRANSITIONS & ANIMATIONS
// ============================================
export const transitions = {
  duration: {
    instant: '50ms',
    fast: '100ms',
    normal: '150ms',
    slow: '200ms',
    slower: '300ms',
  },
  
  easing: {
    linear: 'linear',
    ease: 'ease',
    'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
    'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
    'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    // Premium easing (inspired by Linear)
    'premium': 'cubic-bezier(0.16, 1, 0.3, 1)',
    'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  
  // Common transition combinations
  DEFAULT: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  fast: 'all 100ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  premium: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
};

// ============================================
// Z-INDEX SCALE
// ============================================
export const zIndex = {
  hide: -1,
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
};

// ============================================
// BREAKPOINTS
// ============================================
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// ============================================
// COMPONENT STYLES
// ============================================
export const componentStyles = {
  // Button variants
  button: {
    primary: {
      background: `linear-gradient(135deg, ${colors.primary[500]} 0%, ${colors.primary[700]} 100%)`,
      color: '#FFFFFF',
      border: 'none',
      fontWeight: typography.weight.semibold,
      fontSize: typography.size.sm,
      borderRadius: borderRadius.lg,
      padding: '10px 20px',
      letterSpacing: typography.tracking.wide,
      boxShadow: `0 1px 2px 0 rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(6, 182, 212, 0.15)`,
      '&:hover': {
        background: `linear-gradient(135deg, ${colors.primary[400]} 0%, ${colors.primary[600]} 100%)`,
        boxShadow: shadows.glow.DEFAULT,
        transform: 'translateY(-1px)',
      },
      '&:active': {
        transform: 'translateY(0px)',
      },
    },
    secondary: {
      background: 'transparent',
      color: colors.text.primary,
      border: `1px solid ${colors.border.default}`,
      fontWeight: typography.weight.medium,
      fontSize: typography.size.sm,
      borderRadius: borderRadius.lg,
      padding: '10px 20px',
      '&:hover': {
        background: colors.background.tertiary,
        borderColor: colors.border.strong,
        boxShadow: shadows.md,
      },
    },
    ghost: {
      background: 'transparent',
      color: colors.text.secondary,
      border: 'none',
      fontWeight: typography.weight.medium,
      fontSize: typography.size.sm,
      borderRadius: borderRadius.lg,
      padding: '8px 16px',
      '&:hover': {
        background: colors.background.tertiary,
        color: colors.text.primary,
      },
    },
    danger: {
      background: 'rgba(239, 68, 68, 0.08)',
      color: colors.status.error,
      border: `1px solid rgba(239, 68, 68, 0.2)`,
      fontWeight: typography.weight.medium,
      fontSize: typography.size.sm,
      borderRadius: borderRadius.lg,
      padding: '10px 20px',
      '&:hover': {
        background: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.4)',
        boxShadow: shadows.glow.danger,
      },
    },
  },

  // Card styles
  card: {
    DEFAULT: {
      background: colors.background.secondary,
      border: `1px solid ${colors.border.subtle}`,
      borderRadius: borderRadius.xl,
      boxShadow: shadows.sm,
    },
    elevated: {
      background: colors.background.secondary,
      border: `1px solid ${colors.border.default}`,
      borderRadius: borderRadius.xl,
      boxShadow: shadows.lg,
    },
    interactive: {
      background: colors.background.secondary,
      border: `1px solid ${colors.border.subtle}`,
      borderRadius: borderRadius.xl,
      boxShadow: shadows.sm,
      transition: transitions.premium,
      '&:hover': {
        background: colors.background.tertiary,
        borderColor: `rgba(6, 182, 212, 0.2)`,
        boxShadow: shadows.md,
        transform: 'translateY(-2px)',
      },
    },
    glass: {
      background: 'rgba(22, 27, 34, 0.8)',
      backdropFilter: 'blur(16px)',
      border: `1px solid ${colors.border.subtle}`,
      borderRadius: borderRadius.xl,
      boxShadow: shadows.md,
    },
  },

  // Input styles
  input: {
    background: colors.background.tertiary,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.lg,
    color: colors.text.primary,
    placeholder: colors.text.tertiary,
    fontSize: typography.size.sm,
    padding: '12px 16px',
    focus: {
      borderColor: colors.primary[500],
      boxShadow: `0 0 0 3px rgba(6, 182, 212, 0.08)`,
    },
    error: {
      borderColor: colors.status.error,
      boxShadow: `0 0 0 3px rgba(215, 58, 73, 0.08)`,
    },
  },

  // Badge/Chip styles
  badge: {
    default: {
      background: colors.background.tertiary,
      color: colors.text.secondary,
      border: `1px solid ${colors.border.default}`,
      borderRadius: borderRadius.md,
      fontWeight: typography.weight.medium,
    },
    success: {
      background: 'rgba(63, 185, 80, 0.1)',
      color: colors.status.success,
      border: '1px solid rgba(63, 185, 80, 0.2)',
      borderRadius: borderRadius.md,
      fontWeight: typography.weight.semibold,
    },
    severity: {
      critical: {
        background: 'rgba(215, 58, 73, 0.1)',
        color: '#FCA5A5',
        border: '1px solid rgba(215, 58, 73, 0.2)',
        borderRadius: borderRadius.md,
        fontWeight: typography.weight.semibold,
      },
      high: {
        background: 'rgba(240, 136, 62, 0.1)',
        color: '#FDBA74',
        border: '1px solid rgba(240, 136, 62, 0.2)',
        borderRadius: borderRadius.md,
        fontWeight: typography.weight.semibold,
      },
      medium: {
        background: 'rgba(219, 171, 9, 0.1)',
        color: '#FCD34D',
        border: '1px solid rgba(219, 171, 9, 0.2)',
        borderRadius: borderRadius.md,
        fontWeight: typography.weight.semibold,
      },
      low: {
        background: 'rgba(63, 185, 80, 0.1)',
        color: '#6EE7B7',
        border: '1px solid rgba(63, 185, 80, 0.2)',
        borderRadius: borderRadius.md,
        fontWeight: typography.weight.semibold,
      },
    },
  },

  // Table styles
  table: {
    header: {
      background: colors.background.tertiary,
      color: colors.text.secondary,
      fontWeight: typography.weight.semibold,
      fontSize: typography.size.xs,
      textTransform: 'uppercase',
      letterSpacing: typography.tracking.wider,
      borderBottom: `1px solid ${colors.border.subtle}`,
      padding: '12px 16px',
    },
    row: {
      borderBottom: `1px solid ${colors.border.subtle}`,
      transition: transitions.fast,
      '&:hover': {
        background: 'rgba(6, 182, 212, 0.02)',
      },
      '&:last-child': {
        borderBottom: 'none',
      },
    },
    cell: {
      padding: '12px 16px',
      color: colors.text.primary,
      fontSize: typography.size.sm,
    },
  },

  // Page header
  pageHeader: {
    container: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      mb: 4,
      flexWrap: 'wrap',
      gap: 2,
    },
    title: {
      color: colors.text.primary,
      fontWeight: typography.weight.bold,
      fontSize: typography.size['2xl'],
      letterSpacing: typography.tracking.tight,
      lineHeight: typography.leading.tight,
    },
    subtitle: {
      color: colors.text.tertiary,
      fontSize: typography.size.sm,
      fontWeight: typography.weight.normal,
      mt: 0.5,
    },
  },
};

// ============================================
// MUI THEME CONFIGURATION HELPER
// ============================================
export const createMuiTheme = () => ({
  palette: {
    mode: 'dark',
    background: {
      default: colors.background.primary,
      paper: colors.background.secondary,
    },
    primary: {
      main: colors.primary[500],
      light: colors.primary[400],
      dark: colors.primary[600],
      contrastText: colors.gray[50],
    },
    secondary: {
      main: colors.secondary[500],
      light: colors.secondary[400],
      dark: colors.secondary[600],
      contrastText: colors.gray[50],
    },
    text: {
      primary: colors.text.primary,
      secondary: colors.text.secondary,
      disabled: colors.text.disabled,
    },
    error: {
      main: colors.status.error,
    },
    warning: {
      main: colors.status.warning,
    },
    info: {
      main: colors.status.info,
    },
    success: {
      main: colors.status.success,
    },
    divider: colors.border.default,
  },
  typography: {
    fontFamily: typography.fontFamily.sans,
    h1: {
      fontSize: typography.size['4xl'],
      fontWeight: typography.weight.bold,
      letterSpacing: typography.tracking.tight,
    },
    h2: {
      fontSize: typography.size['3xl'],
      fontWeight: typography.weight.bold,
      letterSpacing: typography.tracking.tight,
    },
    h3: {
      fontSize: typography.size['2xl'],
      fontWeight: typography.weight.semibold,
      letterSpacing: typography.tracking.tight,
    },
    h4: {
      fontSize: typography.size.xl,
      fontWeight: typography.weight.semibold,
    },
    h5: {
      fontSize: typography.size.lg,
      fontWeight: typography.weight.semibold,
    },
    h6: {
      fontSize: typography.size.base,
      fontWeight: typography.weight.semibold,
    },
    body1: {
      fontSize: typography.size.base,
      lineHeight: typography.leading.normal,
    },
    body2: {
      fontSize: typography.size.sm,
      lineHeight: typography.leading.normal,
    },
    button: {
      fontSize: typography.size.sm,
      fontWeight: typography.weight.medium,
      textTransform: 'none',
    },
    caption: {
      fontSize: typography.size.xs,
      color: colors.text.tertiary,
    },
  },
  shape: {
    borderRadius: parseInt(borderRadius.lg),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.lg,
          textTransform: 'none',
          fontWeight: typography.weight.medium,
          transition: transitions.premium,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: colors.background.secondary,
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: borderRadius.lg,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: borderRadius.lg,
            backgroundColor: colors.background.tertiary,
          },
        },
      },
    },
  },
});

// ============================================
// ANIMATION KEYFRAMES
// ============================================
export const keyframes = {
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
  fadeInUp: `
    @keyframes fadeInUp {
      from { 
        opacity: 0; 
        transform: translateY(10px); 
      }
      to { 
        opacity: 1; 
        transform: translateY(0); 
      }
    }
  `,
  fadeInScale: `
    @keyframes fadeInScale {
      from { 
        opacity: 0; 
        transform: scale(0.95); 
      }
      to { 
        opacity: 1; 
        transform: scale(1); 
      }
    }
  `,
  shimmer: `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `,
  pulse: `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `,
  spin: `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,
  slideIn: `
    @keyframes slideIn {
      from { 
        opacity: 0; 
        transform: translateX(-10px); 
      }
      to { 
        opacity: 1; 
        transform: translateX(0); 
      }
    }
  `,
  slideInRight: `
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(10px); }
      to { opacity: 1; transform: translateX(0); }
    }
  `,
  scaleIn: `
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
  `,
  breathe: `
    @keyframes breathe {
      0%, 100% { opacity: 0.6; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.02); }
    }
  `,
  gradientShift: `
    @keyframes gradientShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  `,
};

// ============================================
// PREMIUM EFFECTS
// ============================================
export const effects = {
  // Glass morphism effect
  glass: {
    background: 'rgba(26, 26, 26, 0.8)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },

  // Gradient overlays
  gradient: {
    top: 'linear-gradient(to bottom, rgba(10, 10, 10, 0.8), transparent)',
    bottom: 'linear-gradient(to top, rgba(10, 10, 10, 0.8), transparent)',
    primary: `linear-gradient(135deg, ${colors.primary[500]} 0%, ${colors.secondary[500]} 100%)`,
    brand: `linear-gradient(135deg, ${colors.primary[300]} 0%, ${colors.primary[500]} 100%)`,
    subtle: `linear-gradient(135deg, ${colors.primary[900]}40 0%, transparent 100%)`,
  },

  // Shimmer loading effect
  shimmer: {
    background: `linear-gradient(90deg, 
      ${colors.background.tertiary} 25%, 
      ${colors.background.elevated} 50%, 
      ${colors.background.tertiary} 75%
    )`,
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Map severity to colors
export const getSeverityColor = (severity) => {
  const map = {
    critical: colors.severity.critical,
    high: colors.severity.high,
    medium: colors.severity.medium,
    low: colors.severity.low,
    info: colors.severity.info,
  };
  return map[severity] || colors.text.secondary;
};

export const getSeverityBg = (severity) => {
  const map = {
    critical: 'rgba(215, 58, 73, 0.1)',
    high: 'rgba(240, 136, 62, 0.1)',
    medium: 'rgba(219, 171, 9, 0.1)',
    low: 'rgba(63, 185, 80, 0.1)',
    info: 'rgba(88, 166, 255, 0.1)',
  };
  return map[severity] || 'rgba(139, 148, 158, 0.1)';
};

// Map status to colors
export const getStatusColor = (status) => {
  const map = {
    open: '#D73A49',
    in_progress: '#DBAB09',
    under_review: '#DBAB09',
    resolved: '#58A6FF',
    closed: '#3FB950',
    reopened: '#F0883E',
    duplicate: '#8B949E',
    accepted_risk: '#8B5CF6',
    rejected: '#8B949E',
    deferred: '#8B949E',
    planning: '#8B949E',
    received: '#58A6FF',
    remediation: '#DBAB09',
    retest: '#8B5CF6',
    paused: '#8B949E',
    completed: '#3FB950',
    verified: '#3FB950',
  };
  return map[status] || colors.text.secondary;
};

export const getStatusBg = (status) => {
  const map = {
    open: 'rgba(215, 58, 73, 0.1)',
    in_progress: 'rgba(219, 171, 9, 0.1)',
    under_review: 'rgba(219, 171, 9, 0.1)',
    resolved: 'rgba(88, 166, 255, 0.1)',
    closed: 'rgba(63, 185, 80, 0.1)',
    reopened: 'rgba(240, 136, 62, 0.1)',
    duplicate: 'rgba(139, 148, 158, 0.1)',
    accepted_risk: 'rgba(139, 92, 246, 0.1)',
    rejected: 'rgba(139, 148, 158, 0.1)',
    deferred: 'rgba(139, 148, 158, 0.1)',
    planning: 'rgba(139, 148, 158, 0.1)',
    received: 'rgba(88, 166, 255, 0.1)',
    remediation: 'rgba(219, 171, 9, 0.1)',
    retest: 'rgba(139, 92, 246, 0.1)',
    paused: 'rgba(139, 148, 158, 0.1)',
    completed: 'rgba(63, 185, 80, 0.1)',
    verified: 'rgba(63, 185, 80, 0.1)',
  };
  return map[status] || 'rgba(139, 148, 158, 0.1)';
};

export default {
  colors,
  typography,
  spacing,
  shadows,
  borderRadius,
  transitions,
  zIndex,
  breakpoints,
  componentStyles,
  createMuiTheme,
  keyframes,
  effects,
  getSeverityColor,
  getSeverityBg,
  getStatusColor,
  getStatusBg,
};
