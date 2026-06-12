import React from 'react';
import { Chip, Tooltip, Box } from '@mui/material';
import { colors, borderRadius, typography } from '../../../theme/designSystem';
import { getTagById } from '../../constants/tags';

/**
 * TagBadge - Display a single tag
 * @param {string} tag - Tag ID or name
 * @param {object} tagData - Optional tag data object
 * @param {function} onDelete - Delete handler
 * @param {function} onClick - Click handler
 * @param {string} size - Size variant
 * @param {boolean} clickable - Whether tag is clickable
 */
const TagBadge = ({ 
  tag, 
  tagData,
  onDelete,
  onClick,
  size = 'small',
  clickable = false,
  sx = {}
}) => {
  // Get tag data from predefined or use custom
  const predefinedTag = typeof tag === 'string' ? getTagById(tag) : null;
  const data = tagData || predefinedTag || { 
    id: tag, 
    name: tag, 
    color: colors.primary[500],
    description: tag 
  };

  const chipSize = size === 'tiny' ? { height: 20, fontSize: '0.625rem' } :
                   size === 'small' ? { height: 24, fontSize: '0.75rem' } :
                   { height: 28, fontSize: '0.875rem' };

  return (
    <Tooltip 
      title={data.description || data.name} 
      arrow
      placement="top"
    >
      <Chip
        size={size === 'tiny' ? 'small' : size}
        label={data.name || data}
        onDelete={onDelete}
        onClick={clickable ? onClick : undefined}
        sx={{
          height: chipSize.height,
          fontSize: chipSize.fontSize,
          fontWeight: typography.weight.medium,
          backgroundColor: `${data.color}15`,
          color: data.color,
          border: `1px solid ${data.color}30`,
          borderRadius: borderRadius.md,
          cursor: clickable ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          '&:hover': clickable ? {
            backgroundColor: `${data.color}25`,
            borderColor: `${data.color}50`,
            transform: 'scale(1.02)'
          } : {},
          '& .MuiChip-deleteIcon': {
            color: `${data.color}80`,
            fontSize: '0.875rem',
            '&:hover': {
              color: data.color
            }
          },
          ...sx
        }}
      />
    </Tooltip>
  );
};

/**
 * TagGroup - Display multiple tags
 */
export const TagGroup = ({ 
  tags = [], 
  maxTags = 3,
  size = 'small',
  onTagClick,
  onTagDelete,
  sx = {}
}) => {
  const displayTags = tags.slice(0, maxTags);
  const remainingCount = tags.length - maxTags;

  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', ...sx }}>
      {displayTags.map((tag, index) => (
        <TagBadge
          key={`${tag.id || tag}-${index}`}
          tag={tag}
          size={size}
          clickable={!!onTagClick}
          onClick={() => onTagClick?.(tag)}
          onDelete={onTagDelete ? () => onTagDelete(tag, index) : undefined}
        />
      ))}
      
      {remainingCount > 0 && (
        <Tooltip title={tags.slice(maxTags).map(t => t.name || t).join(', ')} arrow>
          <Chip
            size="small"
            label={`+${remainingCount}`}
            sx={{
              height: size === 'tiny' ? 20 : 24,
              fontSize: size === 'tiny' ? '0.625rem' : '0.75rem',
              fontWeight: typography.weight.medium,
              backgroundColor: 'rgba(110, 118, 129, 0.2)',
              color: colors.text.secondary,
              border: `1px solid ${colors.border.subtle}`,
              cursor: 'pointer'
            }}
          />
        </Tooltip>
      )}
    </Box>
  );
};

/**
 * TagInput - Input for adding tags with autocomplete
 */
export const TagInput = ({
  value = [],
  onChange,
  suggestions = [],
  placeholder = 'Add tags...',
  maxTags = 10,
  disabled = false
}) => {
  const [inputValue, setInputValue] = React.useState('');
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const inputRef = React.useRef(null);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    setShowSuggestions(e.target.value.length > 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  const addTag = (tag) => {
    if (value.length >= maxTags) return;
    
    const normalizedTag = tag.toLowerCase().trim().replace(/\s+/g, '-');
    if (!value.includes(normalizedTag)) {
      onChange?.([...value, normalizedTag]);
    }
    
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (index) => {
    onChange?.(value.filter((_, i) => i !== index));
  };

  const filteredSuggestions = suggestions.filter(s => 
    s.name.toLowerCase().includes(inputValue.toLowerCase()) &&
    !value.includes(s.id)
  ).slice(0, 5);

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          p: 1,
          border: `1px solid ${colors.border.default}`,
          borderRadius: borderRadius.lg,
          backgroundColor: colors.background.secondary,
          minHeight: 40,
          alignItems: 'center',
          '&:focus-within': {
            borderColor: colors.primary[500]
          }
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, index) => (
          <TagBadge
            key={index}
            tag={tag}
            size="tiny"
            onDelete={() => removeTag(index)}
          />
        ))}
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue && setShowSuggestions(true)}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled || value.length >= maxTags}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: colors.text.primary,
            fontSize: '0.875rem',
            flex: 1,
            minWidth: 80,
            padding: '4px 0'
          }}
        />
      </Box>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 0.5,
            backgroundColor: colors.background.secondary,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: borderRadius.md,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
            maxHeight: 200,
            overflow: 'auto'
          }}
        >
          {filteredSuggestions.map((suggestion) => (
            <Box
              key={suggestion.id}
              onClick={() => addTag(suggestion.id)}
              sx={{
                px: 2,
                py: 1,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                '&:hover': {
                  backgroundColor: colors.background.tertiary
                }
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: suggestion.color
                }}
              />
              <Box>
                <Box sx={{ fontSize: '0.875rem', color: colors.text.primary }}>
                  {suggestion.name}
                </Box>
                <Box sx={{ fontSize: '0.75rem', color: colors.text.tertiary }}>
                  {suggestion.description}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default TagBadge;
