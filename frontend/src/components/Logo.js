import React from 'react';
import { Box, Typography } from '@mui/material';
import { colors, typography } from '../theme/designSystem';
import logoImage from '../assets/logo.png';

const Logo = ({ size = 'medium', showTagline = false, onClick }) => {
  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return {
          iconSize: 24,
          fontSize: '1.25rem',
          spacing: 1,
          taglineFontSize: '0.625rem'
        };
      case 'large':
        return {
          iconSize: 40,
          fontSize: '1.875rem',
          spacing: 2,
          taglineFontSize: '0.75rem'
        };
      default: // medium
        return {
          iconSize: 32,
          fontSize: '1.5rem',
          spacing: 1.5,
          taglineFontSize: '0.6875rem'
        };
    }
  };

  const config = getSizeConfig();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: config.spacing,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none'
      }}
      onClick={onClick}
    >
      {/* Shield Icon */}
      <Box
        component="img"
        src={logoImage}
        alt="eKavach Logo"
        sx={{
          width: config.iconSize,
          height: config.iconSize,
          filter: 'grayscale(100%) brightness(0.6) contrast(1.1)',
          opacity: 0.85,
          transition: 'all 0.3s ease',
          '&:hover': onClick ? {
            opacity: 1,
            filter: 'grayscale(80%) brightness(0.7) contrast(1.2)',
            transform: 'scale(1.05)'
          } : {}
        }}
      />

      {/* Logo Text */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <Typography
          component="span"
          sx={{
            fontSize: config.fontSize,
            fontWeight: typography.weight.bold,
            letterSpacing: '0.02em',
            lineHeight: 1,
            fontFamily: '"Inter", "Poppins", "Satoshi", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            display: 'flex',
            alignItems: 'center',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
          }}
        >
          <span
            style={{
              color: '#4b5563',
              marginRight: '2px',
              fontWeight: 700
            }}
          >
            eK
          </span>
          <span
            style={{
              color: '#9ca3af',
              fontWeight: 600
            }}
          >
            avach
          </span>
        </Typography>

        {/* Optional Tagline */}
        {showTagline && (
          <Typography
            component="span"
            sx={{
              fontSize: config.taglineFontSize,
              fontWeight: typography.weight.medium,
              letterSpacing: '0.15em',
              lineHeight: 1.2,
              mt: 0.25,
              color: '#6b7280',
              textTransform: 'uppercase'
            }}
          >
            Detect. Prioritize. Defend.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default Logo;
