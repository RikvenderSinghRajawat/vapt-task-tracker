/**
 * Shared Styles for Premium UI Components
 * MUI sx prop compatible style objects
 */

import { colors, typography, spacing, shadows, borderRadius, transitions } from './designSystem';

// ============================================
// PAGE CONTAINER
// ============================================
export const pageContainer = {
  minHeight: '100vh',
  background: colors.background.primary,
  p: { xs: 2, sm: 3, lg: 4 },
  transition: transitions.premium,
};

// ============================================
// HEADER / PAGE TITLE
// ============================================
export const pageHeader = {
  mb: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 2,
};

export const pageTitle = {
  fontSize: typography.size['2xl'],
  fontWeight: typography.weight.bold,
  color: colors.text.primary,
  letterSpacing: typography.tracking.tight,
};

export const pageSubtitle = {
  fontSize: typography.size.sm,
  color: colors.text.tertiary,
  mt: 0.5,
};

// ============================================
// CARDS
// ============================================
export const cardBase = {
  background: colors.background.secondary,
  border: `1px solid ${colors.border.subtle}`,
  borderRadius: borderRadius.lg,
  overflow: 'hidden',
  transition: transitions.premium,
};

export const cardElevated = {
  ...cardBase,
  background: colors.background.tertiary,
  border: `1px solid ${colors.border.default}`,
  boxShadow: shadows.lg,
};

export const cardInteractive = {
  ...cardBase,
  cursor: 'pointer',
  '&:hover': {
    background: colors.background.tertiary,
    borderColor: colors.border.default,
    boxShadow: shadows.md,
    transform: 'translateY(-2px)',
  },
};

export const cardHeader = {
  px: 4,
  py: 3,
  borderBottom: `1px solid ${colors.border.subtle}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

export const cardContent = {
  p: 4,
};

// ============================================
// BUTTONS
// ============================================
export const buttonPrimary = {
  background: `linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[700]} 100%)`,
  color: colors.gray[50],
  border: 'none',
  borderRadius: borderRadius.lg,
  px: 4,
  py: 1.5,
  fontSize: typography.size.sm,
  fontWeight: typography.weight.medium,
  textTransform: 'none',
  boxShadow: `0 1px 2px 0 rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(6, 182, 212, 0.2)`,
  transition: transitions.premium,
  '&:hover': {
    background: `linear-gradient(135deg, ${colors.primary[500]} 0%, ${colors.primary[600]} 100%)`,
    boxShadow: `0 4px 12px rgba(6, 182, 212, 0.3)`,
    transform: 'translateY(-1px)',
  },
  '&:active': {
    transform: 'translateY(0)',
  },
  '&:disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
    transform: 'none',
  },
};

export const buttonSecondary = {
  background: colors.background.tertiary,
  color: colors.text.primary,
  border: `1px solid ${colors.border.default}`,
  borderRadius: borderRadius.lg,
  px: 4,
  py: 1.5,
  fontSize: typography.size.sm,
  fontWeight: typography.weight.medium,
  textTransform: 'none',
  transition: transitions.premium,
  '&:hover': {
    background: colors.background.elevated,
    borderColor: colors.border.strong,
  },
};

export const buttonGhost = {
  background: 'transparent',
  color: colors.text.secondary,
  border: 'none',
  borderRadius: borderRadius.lg,
  px: 3,
  py: 1.5,
  fontSize: typography.size.sm,
  fontWeight: typography.weight.medium,
  textTransform: 'none',
  transition: transitions.premium,
  '&:hover': {
    background: colors.background.tertiary,
    color: colors.text.primary,
  },
};

export const buttonDanger = {
  background: 'rgba(239, 68, 68, 0.1)',
  color: colors.status.error,
  border: `1px solid rgba(239, 68, 68, 0.2)`,
  borderRadius: borderRadius.lg,
  px: 4,
  py: 1.5,
  fontSize: typography.size.sm,
  fontWeight: typography.weight.medium,
  textTransform: 'none',
  transition: transitions.premium,
  '&:hover': {
    background: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
};

export const buttonIcon = {
  ...buttonGhost,
  p: 1,
  minWidth: 'auto',
  borderRadius: borderRadius.md,
};

// ============================================
// INPUTS
// ============================================
export const inputBase = {
  '& .MuiOutlinedInput-root': {
    background: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    color: colors.text.primary,
    transition: transitions.premium,
    '& fieldset': {
      borderColor: colors.border.default,
      transition: transitions.premium,
    },
    '&:hover fieldset': {
      borderColor: colors.border.strong,
    },
    '&.Mui-focused fieldset': {
      borderColor: colors.primary[500],
      boxShadow: `0 0 0 3px rgba(6, 182, 212, 0.1)`,
    },
  },
  '& .MuiInputLabel-root': {
    color: colors.text.tertiary,
    '&.Mui-focused': {
      color: colors.primary[500],
    },
  },
  '& .MuiInputBase-input::placeholder': {
    color: colors.text.tertiary,
    opacity: 1,
  },
};

export const inputSearch = {
  ...inputBase,
  '& .MuiOutlinedInput-root': {
    ...inputBase['& .MuiOutlinedInput-root'],
    borderRadius: borderRadius.full,
    pl: 2,
  },
};

// ============================================
// BADGES / CHIPS
// ============================================
export const badgeBase = {
  borderRadius: borderRadius.full,
  fontSize: typography.size.xs,
  fontWeight: typography.weight.medium,
  px: 2,
  py: 0.5,
  height: 'auto',
  textTransform: 'none',
};

export const badgeSeverity = {
  critical: {
    ...badgeBase,
    background: 'rgba(220, 38, 38, 0.15)',
    color: '#FCA5A5',
    border: '1px solid rgba(220, 38, 38, 0.3)',
  },
  high: {
    ...badgeBase,
    background: 'rgba(234, 88, 12, 0.15)',
    color: '#FDBA74',
    border: '1px solid rgba(234, 88, 12, 0.3)',
  },
  medium: {
    ...badgeBase,
    background: 'rgba(217, 119, 6, 0.15)',
    color: '#FCD34D',
    border: '1px solid rgba(217, 119, 6, 0.3)',
  },
  low: {
    ...badgeBase,
    background: 'rgba(5, 150, 105, 0.15)',
    color: '#6EE7B7',
    border: '1px solid rgba(5, 150, 105, 0.3)',
  },
};

export const badgeStatus = {
  active: {
    ...badgeBase,
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#6EE7B7',
    border: '1px solid rgba(16, 185, 129, 0.3)',
  },
  pending: {
    ...badgeBase,
    background: 'rgba(245, 158, 11, 0.15)',
    color: '#FCD34D',
    border: '1px solid rgba(245, 158, 11, 0.3)',
  },
  inactive: {
    ...badgeBase,
    background: 'rgba(107, 114, 128, 0.15)',
    color: '#D1D5DB',
    border: '1px solid rgba(107, 114, 128, 0.3)',
  },
};

// ============================================
// TABLES
// ============================================
export const tableContainer = {
  background: colors.background.secondary,
  border: `1px solid ${colors.border.subtle}`,
  borderRadius: borderRadius.lg,
  overflow: 'hidden',
};

export const tableHead = {
  background: colors.background.tertiary,
  borderBottom: `1px solid ${colors.border.default}`,
  '& th': {
    color: colors.text.tertiary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: typography.tracking.wider,
    py: 2,
    px: 3,
  },
};

export const tableRow = {
  borderBottom: `1px solid ${colors.border.subtle}`,
  transition: transitions.premium,
  '&:hover': {
    background: colors.background.tertiary,
  },
  '&:last-child': {
    borderBottom: 'none',
  },
};

export const tableCell = {
  color: colors.text.primary,
  fontSize: typography.size.sm,
  py: 2.5,
  px: 3,
  border: 'none',
};

// ============================================
// DIALOGS / MODALS
// ============================================
export const dialogPaper = {
  background: colors.background.secondary,
  border: `1px solid ${colors.border.default}`,
  borderRadius: borderRadius.xl,
  boxShadow: shadows['2xl'],
};

export const dialogTitle = {
  color: colors.text.primary,
  fontSize: typography.size.xl,
  fontWeight: typography.weight.semibold,
  px: 4,
  py: 3,
  borderBottom: `1px solid ${colors.border.subtle}`,
};

export const dialogContent = {
  px: 4,
  py: 3,
  color: colors.text.secondary,
};

export const dialogActions = {
  px: 4,
  py: 3,
  borderTop: `1px solid ${colors.border.subtle}`,
  gap: 2,
};

// ============================================
// STATS / METRICS
// ============================================
export const statCard = {
  ...cardBase,
  p: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

export const statValue = {
  fontSize: typography.size['3xl'],
  fontWeight: typography.weight.bold,
  color: colors.text.primary,
  letterSpacing: typography.tracking.tight,
};

export const statLabel = {
  fontSize: typography.size.sm,
  color: colors.text.tertiary,
  fontWeight: typography.weight.medium,
};

export const statChange = {
  positive: {
    fontSize: typography.size.xs,
    color: colors.status.success,
    fontWeight: typography.weight.medium,
  },
  negative: {
    fontSize: typography.size.xs,
    color: colors.status.error,
    fontWeight: typography.weight.medium,
  },
};

// ============================================
// SKELETON LOADING
// ============================================
export const skeletonBase = {
  background: colors.background.tertiary,
  backgroundImage: `linear-gradient(90deg, 
    ${colors.background.tertiary} 25%, 
    ${colors.background.elevated} 50%, 
    ${colors.background.tertiary} 75%
  )`,
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
  borderRadius: borderRadius.md,
};

// ============================================
// EMPTY STATES
// ============================================
export const emptyState = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  py: 12,
  px: 4,
  textAlign: 'center',
};

export const emptyStateIcon = {
  fontSize: '4rem',
  color: colors.text.tertiary,
  mb: 3,
};

export const emptyStateTitle = {
  fontSize: typography.size.lg,
  fontWeight: typography.weight.semibold,
  color: colors.text.primary,
  mb: 1,
};

export const emptyStateDescription = {
  fontSize: typography.size.sm,
  color: colors.text.tertiary,
  maxWidth: '400px',
};

// ============================================
// NAVIGATION
// ============================================
export const navItem = {
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  px: 3,
  py: 2,
  borderRadius: borderRadius.lg,
  color: colors.text.secondary,
  fontSize: typography.size.sm,
  fontWeight: typography.weight.medium,
  transition: transitions.premium,
  textDecoration: 'none',
  cursor: 'pointer',
  '&:hover': {
    background: colors.background.tertiary,
    color: colors.text.primary,
  },
  '&.active': {
    background: colors.background.tertiary,
    color: colors.primary[400],
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      width: '3px',
      height: '20px',
      background: colors.primary[500],
      borderRadius: '0 4px 4px 0',
    },
  },
};

// ============================================
// DIVIDERS
// ============================================
export const divider = {
  borderColor: colors.border.subtle,
  my: 2,
};

// ============================================
// ANIMATION STYLES (for injecting into components)
// ============================================
export const fadeInUp = {
  animation: 'fadeInUp 0.3s ease-out forwards',
};

export const staggerContainer = {
  '& > *': {
    opacity: 0,
    animation: 'fadeInUp 0.3s ease-out forwards',
  },
  '& > *:nth-child(1)': { animationDelay: '0ms' },
  '& > *:nth-child(2)': { animationDelay: '50ms' },
  '& > *:nth-child(3)': { animationDelay: '100ms' },
  '& > *:nth-child(4)': { animationDelay: '150ms' },
  '& > *:nth-child(5)': { animationDelay: '200ms' },
  '& > *:nth-child(6)': { animationDelay: '250ms' },
};

export default {
  pageContainer,
  pageHeader,
  pageTitle,
  pageSubtitle,
  cardBase,
  cardElevated,
  cardInteractive,
  cardHeader,
  cardContent,
  buttonPrimary,
  buttonSecondary,
  buttonGhost,
  buttonDanger,
  buttonIcon,
  inputBase,
  inputSearch,
  badgeBase,
  badgeSeverity,
  badgeStatus,
  tableContainer,
  tableHead,
  tableRow,
  tableCell,
  dialogPaper,
  dialogTitle,
  dialogContent,
  dialogActions,
  statCard,
  statValue,
  statLabel,
  statChange,
  skeletonBase,
  emptyState,
  emptyStateIcon,
  emptyStateTitle,
  emptyStateDescription,
  navItem,
  divider,
  fadeInUp,
  staggerContainer,
};
