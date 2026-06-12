// Premium Theme System for eKavach
// Glassmorphism, animations, and professional styling

export const premiumColors = {
  // Dark theme base
  background: {
    primary: '#0a0f1a',
    secondary: '#111827',
    tertiary: '#1e293b',
    card: 'rgba(30, 41, 59, 0.7)',
    glass: 'rgba(17, 24, 39, 0.8)',
  },
  
  // Glassmorphism effects
  glass: {
    light: 'rgba(255, 255, 255, 0.05)',
    medium: 'rgba(255, 255, 255, 0.1)',
    heavy: 'rgba(255, 255, 255, 0.15)',
    border: 'rgba(255, 255, 255, 0.1)',
    glow: 'rgba(6, 182, 212, 0.15)',
  },
  
  // Severity colors with glow
  severity: {
    critical: {
      main: '#ef4444',
      glow: 'rgba(239, 68, 68, 0.4)',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    },
    high: {
      main: '#f97316',
      glow: 'rgba(249, 115, 22, 0.4)',
      gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    },
    medium: {
      main: '#eab308',
      glow: 'rgba(234, 179, 8, 0.4)',
      gradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
    },
    low: {
      main: '#22c55e',
      glow: 'rgba(34, 197, 94, 0.4)',
      gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    },
    info: {
      main: '#06b6d4',
      glow: 'rgba(6, 182, 212, 0.4)',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    },
  },
  
  // Accent colors
  accent: {
    primary: '#06b6d4',
    secondary: '#8b5cf6',
    tertiary: '#f472b6',
    quaternary: '#10b981',
  },
  
  // Text colors
  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
    tertiary: '#64748b',
    muted: '#475569',
  },
  
  // Gradients
  gradients: {
    primary: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
    secondary: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    success: 'linear-gradient(135deg, #10b981 0%, #22c55e 100%)',
    warning: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
    error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    glass: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
  },
  
  // Status colors
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    pending: '#8b5cf6',
  },
};

// Animation configurations
export const animations = {
  // Durations
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
  slower: '700ms',
  
  // Easing
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  
  // Keyframes
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `,
  
  slideIn: `
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }
  `,
  
  scaleIn: `
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `,
  
  pulse: `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `,
  
  shimmer: `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `,
  
  glow: `
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.3); }
      50% { box-shadow: 0 0 40px rgba(6, 182, 212, 0.5); }
    }
  `,
  
  float: `
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
  `,
  
  rotate: `
    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,
};

// Glassmorphism styles
export const glassStyles = {
  card: {
    background: 'rgba(30, 41, 59, 0.6)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
  },
  
  cardHover: {
    background: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '0 8px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(6, 182, 212, 0.1)',
    transform: 'translateY(-2px)',
  },
  
  elevated: {
    background: 'rgba(17, 24, 39, 0.9)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '20px',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
  },
  
  button: {
    background: 'rgba(6, 182, 212, 0.1)',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(6, 182, 212, 0.3)',
    borderRadius: '10px',
  },
  
  buttonHover: {
    background: 'rgba(6, 182, 212, 0.2)',
    border: '1px solid rgba(6, 182, 212, 0.5)',
    boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
  },
  
  input: {
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
  },
  
  badge: {
    background: 'rgba(239, 68, 68, 0.2)',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '20px',
  },
};

// Premium gradients
export const gradients = {
  primary: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  secondary: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  success: 'linear-gradient(135deg, #10b981 0%, #22c55e 100%)',
  warning: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
  error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  dark: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
  glass: 'linear-gradient(145deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
  shimmer: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
};

// Shadow system
export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px rgba(0, 0, 0, 0.4)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.6)',
  glow: '0 0 20px rgba(6, 182, 212, 0.3)',
  glowStrong: '0 0 40px rgba(6, 182, 212, 0.5)',
  inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
};

// Border radius
export const borderRadius = {
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '18px',
  '2xl': '22px',
  full: '9999px',
};

// Typography scale
export const typography = {
  fontFamily: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    mono: 'JetBrains Mono, Fira Code, monospace',
  },
  size: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
};

// Spacing scale
export const spacing = {
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
};

// Z-index scale
export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  modal: 300,
  tooltip: 400,
  toast: 500,
  commandPalette: 600,
};

// Transition presets
export const transitions = {
  fast: 'all 150ms cubic-bezier(0.16, 1, 0.3, 1)',
  normal: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
  slow: 'all 500ms cubic-bezier(0.16, 1, 0.3, 1)',
  spring: 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
};

// MUI theme overrides for premium look
export const muiThemeOverrides = {
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: glassStyles.card.background,
          backdropFilter: glassStyles.card.backdropFilter,
          border: glassStyles.card.border,
          borderRadius: glassStyles.card.borderRadius,
          boxShadow: glassStyles.card.boxShadow,
          transition: transitions.normal,
          '&:hover': {
            background: glassStyles.cardHover.background,
            border: glassStyles.cardHover.border,
            boxShadow: glassStyles.cardHover.boxShadow,
            transform: glassStyles.cardHover.transform,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.lg,
          textTransform: 'none',
          fontWeight: typography.weight.semibold,
          transition: transitions.spring,
        },
        contained: {
          background: gradients.primary,
          boxShadow: shadows.glow,
          '&:hover': {
            boxShadow: shadows.glowStrong,
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          border: '1px solid rgba(255, 255, 255, 0.2)',
          background: 'rgba(255, 255, 255, 0.05)',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.full,
          fontWeight: typography.weight.medium,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: borderRadius.lg,
            background: glassStyles.input.background,
            backdropFilter: glassStyles.input.backdropFilter,
            border: glassStyles.input.border,
            '&:hover': {
              border: '1px solid rgba(255, 255, 255, 0.2)',
            },
            '&.Mui-focused': {
              border: '1px solid rgba(6, 182, 212, 0.5)',
              boxShadow: '0 0 0 3px rgba(6, 182, 212, 0.1)',
            },
          },
        },
      },
    },
  },
};

// Utility functions for premium effects
export const getSeverityStyle = (severity) => {
  const styles = {
    critical: {
      color: premiumColors.severity.critical.main,
      glow: premiumColors.severity.critical.glow,
      gradient: premiumColors.severity.critical.gradient,
    },
    high: {
      color: premiumColors.severity.high.main,
      glow: premiumColors.severity.high.glow,
      gradient: premiumColors.severity.high.gradient,
    },
    medium: {
      color: premiumColors.severity.medium.main,
      glow: premiumColors.severity.medium.glow,
      gradient: premiumColors.severity.medium.gradient,
    },
    low: {
      color: premiumColors.severity.low.main,
      glow: premiumColors.severity.low.glow,
      gradient: premiumColors.severity.low.gradient,
    },
    info: {
      color: premiumColors.severity.info.main,
      glow: premiumColors.severity.info.glow,
      gradient: premiumColors.severity.info.gradient,
    },
  };
  return styles[severity] || styles.info;
};

export const getStatusColor = (status) => {
  const colors = {
    open: premiumColors.severity.critical.main,
    'in-progress': premiumColors.severity.high.main,
    'pending-close': premiumColors.status.pending,
    'pending-reopen': premiumColors.status.warning,
    fixed: premiumColors.status.success,
    verified: premiumColors.status.info,
    closed: premiumColors.status.success,
    rejected: premiumColors.status.error,
  };
  return colors[status] || premiumColors.text.secondary;
};

// Animation classes for CSS-in-JS
export const animationClasses = {
  fadeIn: {
    animation: `fadeIn ${animations.normal} ${animations.easeOut} forwards`,
  },
  slideIn: {
    animation: `slideIn ${animations.normal} ${animations.easeOut} forwards`,
  },
  scaleIn: {
    animation: `scaleIn ${animations.normal} ${animations.spring} forwards`,
  },
  pulse: {
    animation: `pulse ${animations.slow} ease-in-out infinite`,
  },
  float: {
    animation: `float ${animations.slow} ease-in-out infinite`,
  },
  glow: {
    animation: `glow ${animations.slow} ease-in-out infinite`,
  },
};

// Default export
export default {
  colors: premiumColors,
  animations,
  glass: glassStyles,
  gradients,
  shadows,
  borderRadius,
  typography,
  spacing,
  zIndex,
  transitions,
  muiThemeOverrides,
  getSeverityStyle,
  getStatusColor,
  animationClasses,
};
