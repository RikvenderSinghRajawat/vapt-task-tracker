import React from 'react';
import { motion } from 'framer-motion';
import { colors, typography } from '../../theme/designSystem';

const gradients = {
  premium: `linear-gradient(135deg, ${colors.primary[400]} 0%, ${colors.severity.info} 40%, ${colors.secondary[400]} 70%, ${colors.primary[300]} 100%)`,
  cyan: `linear-gradient(135deg, ${colors.primary[300]} 0%, ${colors.primary[500]} 50%, ${colors.primary[600]} 100%)`,
  security: `linear-gradient(135deg, ${colors.severity.info} 0%, ${colors.primary[400]} 30%, ${colors.severity.low} 60%, ${colors.primary[500]} 100%)`,
  gradient: `linear-gradient(90deg, ${colors.primary[400]}, ${colors.severity.info}, ${colors.secondary[400]}, ${colors.primary[400]})`,
};

const AnimatedBrandText = ({
  children,
  variant = 'premium',
  size = 'lg',
  weight = 800,
  as: Component = 'span',
  shimmer = false,
  sx = {},
  ...props
}) => {
  const fontSize = { xs: '1rem', sm: '1.25rem', md: '1.5rem', lg: '1.75rem' }[size] || '1.5rem';
  const gradient = gradients[variant] || gradients.premium;

  const baseSx = {
    fontWeight: weight,
    fontSize,
    letterSpacing: typography.tracking.tight,
    background: gradient,
    backgroundSize: shimmer ? '200% auto' : '100% auto',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    ...sx,
  };

  if (shimmer) {
    return (
      <motion.span
        component={Component}
        animate={{ backgroundPosition: ['0% center', '200% center'] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        style={baseSx}
        {...props}
      >
        {children}
      </motion.span>
    );
  }

  return <Component style={baseSx} {...props}>{children}</Component>;
};

export default AnimatedBrandText;
