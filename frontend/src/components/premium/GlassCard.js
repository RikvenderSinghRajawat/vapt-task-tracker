import React from 'react';
import { Card, CardContent, Box } from '@mui/material';
import { glassStyles, transitions } from '../../theme/premiumTheme';

const GlassCard = ({ 
  children, 
  sx = {}, 
  hover = true,
  elevated = false,
  onClick,
  className
}) => {
  const baseStyles = elevated ? glassStyles.elevated : glassStyles.card;
  const hoverStyles = hover && !elevated ? glassStyles.cardHover : {};

  return (
    <Card
      onClick={onClick}
      className={className}
      sx={{
        ...baseStyles,
        transition: transitions.normal,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': hover ? hoverStyles : {},
        ...sx,
      }}
    >
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        {children}
      </CardContent>
    </Card>
  );
};

export default GlassCard;
