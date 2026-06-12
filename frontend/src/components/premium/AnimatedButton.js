import React from 'react';
import { Button } from '@mui/material';
import { gradients, shadows, transitions, glassStyles } from '../../theme/premiumTheme';

const AnimatedButton = ({ 
  variant = 'contained', 
  children, 
  sx = {}, 
  glow = false,
  ...props 
}) => {
  const baseStyles = {
    borderRadius: '12px',
    textTransform: 'none',
    fontWeight: 600,
    transition: transitions.spring,
    position: 'relative',
    overflow: 'hidden',
  };

  const variantStyles = {
    contained: {
      background: gradients.primary,
      boxShadow: glow ? shadows.glow : shadows.md,
      '&:hover': {
        boxShadow: glow ? shadows.glowStrong : shadows.lg,
        transform: 'translateY(-2px)',
      },
    },
    outlined: {
      border: '1px solid rgba(255, 255, 255, 0.2)',
      background: 'rgba(255, 255, 255, 0.05)',
      '&:hover': {
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        transform: 'translateY(-1px)',
      },
    },
    glass: {
      ...glassStyles.button,
      color: '#06b6d4',
      '&:hover': {
        ...glassStyles.buttonHover,
        transform: 'translateY(-1px)',
      },
    },
  };

  return (
    <Button
      variant={variant === 'glass' ? 'outlined' : variant}
      sx={{
        ...baseStyles,
        ...variantStyles[variant],
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  );
};

export default AnimatedButton;
