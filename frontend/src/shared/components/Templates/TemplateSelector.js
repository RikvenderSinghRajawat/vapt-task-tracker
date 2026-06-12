import React, { useState, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Search as SearchIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandIcon,
  Info as InfoIcon,
  Bookmark as BookmarkIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import { colors, typography, borderRadius } from '../../../theme/designSystem';
import { 
  FINDING_TEMPLATES, 
  OWASP_CATEGORIES,
  getCategories,
  searchTemplates,
  applyTemplate 
} from '../../constants/findingTemplates';
import SeverityBadge from '../SeverityBadge';

/**
 * TemplateCard - Individual template preview
 */
const TemplateCard = ({ template, onSelect, onPreview }) => {
  const category = OWASP_CATEGORIES[template.category.toUpperCase()];
  
  return (
    <Card
      sx={{
        backgroundColor: colors.background.tertiary,
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: borderRadius.lg,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: colors.primary[500],
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }
      }}
      onClick={() => onSelect?.(template)}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <SeverityBadge severity={template.severity} size="small" showTooltip={false} />
          
          <Tooltip title="Preview template">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onPreview?.(template);
              }}
              sx={{ color: colors.text.tertiary }}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: typography.weight.semibold,
            color: colors.text.primary,
            mb: 1,
            lineHeight: 1.4
          }}
        >
          {template.title}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: colors.text.secondary,
            fontSize: typography.size.xs,
            mb: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {template.description?.substring(0, 150)}...
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          <Chip
            size="small"
            label={category?.name || template.category}
            sx={{
              height: 20,
              fontSize: '0.625rem',
              backgroundColor: `${category?.color || colors.primary[500]}15`,
              color: category?.color || colors.primary[500],
              border: `1px solid ${category?.color || colors.primary[500]}30`
            }}
          />
          
          {template.tags?.slice(0, 2).map((tag) => (
            <Chip
              key={tag}
              size="small"
              label={tag}
              sx={{
                height: 20,
                fontSize: '0.625rem',
                backgroundColor: colors.background.secondary,
                color: colors.text.tertiary
              }}
            />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

/**
 * TemplatePreview - Full template preview dialog
 */
const TemplatePreview = ({ template, open, onClose, onUse }) => {
  // Move hooks outside of conditional return
  const [variables, setVariables] = useState({
    parameter: '{parameter}',
    endpoint: '{endpoint}',
    payload: '{payload}'
  });

  const applied = useMemo(() => 
    template ? applyTemplate(template, variables) : null,
    [template, variables]
  );

  if (!template) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: colors.background.secondary,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ color: colors.text.primary, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BookmarkIcon sx={{ color: colors.primary[500] }} />
          {template.title}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ overflow: 'auto' }}>
        {/* Variables Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ color: colors.text.secondary, mb: 1 }}>
            Template Variables
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {Object.keys(variables).map((key) => (
              <TextField
                key={key}
                size="small"
                label={key.charAt(0).toUpperCase() + key.slice(1)}
                value={variables[key]}
                onChange={(e) => setVariables({ ...variables, [key]: e.target.value })}
                sx={{ minWidth: 150 }}
              />
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 2, borderColor: colors.border.subtle }} />

        {/* Preview Content */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ color: colors.text.secondary, mb: 1 }}>
            Description
          </Typography>
          <Box
            sx={{
              backgroundColor: colors.background.tertiary,
              p: 2,
              borderRadius: borderRadius.md,
              border: `1px solid ${colors.border.subtle}`,
              whiteSpace: 'pre-wrap',
              fontSize: typography.size.sm,
              color: colors.text.secondary,
              lineHeight: 1.6
            }}
          >
            {applied.description}
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ color: colors.text.secondary, mb: 1 }}>
            Impact
          </Typography>
          <Box
            sx={{
              backgroundColor: colors.background.tertiary,
              p: 2,
              borderRadius: borderRadius.md,
              border: `1px solid ${colors.border.subtle}`,
              whiteSpace: 'pre-wrap',
              fontSize: typography.size.sm,
              color: colors.text.secondary
            }}
          >
            {applied.impact}
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ color: colors.text.secondary, mb: 1 }}>
            Remediation
          </Typography>
          <Box
            sx={{
              backgroundColor: colors.background.tertiary,
              p: 2,
              borderRadius: borderRadius.md,
              border: `1px solid ${colors.border.subtle}`,
              whiteSpace: 'pre-wrap',
              fontSize: typography.size.sm,
              color: colors.text.secondary
            }}
          >
            {applied.remediation}
          </Box>
        </Box>

        {template.references?.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ color: colors.text.secondary, mb: 1 }}>
              References
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {template.references.map((ref, index) => (
                <Typography
                  key={index}
                  variant="body2"
                  component="a"
                  href={ref}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: colors.primary[400],
                    fontSize: typography.size.xs,
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  {ref}
                </Typography>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
        <Button
          variant="contained"
          startIcon={<CopyIcon />}
          onClick={() => onUse?.(applied)}
        >
          Use Template
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * TemplateSelector - Main template selection component
 */
const TemplateSelector = ({ 
  open, 
  onClose, 
  onSelect,
  selectedCategory = null 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(selectedCategory);

  const categories = getCategories();
  const templates = useMemo(() => {
    if (searchQuery) {
      return searchTemplates(searchQuery);
    }
    return FINDING_TEMPLATES;
  }, [searchQuery]);

  const templatesByCategory = useMemo(() => {
    const grouped = {};
    categories.forEach(cat => {
      grouped[cat.id] = templates.filter(t => t.category === cat.id);
    });
    return grouped;
  }, [templates, categories]);

  const handleUseTemplate = (template) => {
    onSelect?.(template);
    onClose?.();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: colors.background.primary,
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ color: colors.text.primary, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CodeIcon sx={{ color: colors.primary[500] }} />
            Finding Templates
          </Box>
        </DialogTitle>

        <DialogContent sx={{ overflow: 'auto' }}>
          {/* Search */}
          <TextField
            fullWidth
            placeholder="Search templates by name, category, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: colors.text.tertiary }} />
                </InputAdornment>
              )
            }}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                backgroundColor: colors.background.secondary,
                borderRadius: borderRadius.lg
              }
            }}
          />

          {/* Templates by Category */}
          {searchQuery ? (
            // Search results
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleUseTemplate}
                  onPreview={setPreviewTemplate}
                />
              ))}
            </Box>
          ) : (
            // Categorized view
            categories.map((category) => {
              const categoryTemplates = templatesByCategory[category.id] || [];
              if (categoryTemplates.length === 0) return null;

              return (
                <Accordion
                  key={category.id}
                  expanded={expandedCategory === category.id || expandedCategory === null}
                  onChange={() => setExpandedCategory(
                    expandedCategory === category.id ? null : category.id
                  )}
                  sx={{
                    backgroundColor: 'transparent',
                    '&:before': { display: 'none' },
                    mb: 1
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandIcon sx={{ color: colors.text.tertiary }} />}
                    sx={{
                      backgroundColor: colors.background.tertiary,
                      borderRadius: borderRadius.md,
                      border: `1px solid ${colors.border.subtle}`
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: category.color
                        }}
                      />
                      <Typography variant="subtitle1" sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>
                        {category.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={categoryTemplates.length}
                        sx={{
                          height: 20,
                          fontSize: '0.625rem',
                          backgroundColor: colors.background.secondary
                        }}
                      />
                    </Box>
                  </AccordionSummary>

                  <AccordionDetails sx={{ p: 2, pt: 2 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
                      {categoryTemplates.map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          onSelect={handleUseTemplate}
                          onPreview={setPreviewTemplate}
                        />
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <TemplatePreview
        template={previewTemplate}
        open={Boolean(previewTemplate)}
        onClose={() => setPreviewTemplate(null)}
        onUse={handleUseTemplate}
      />
    </>
  );
};

export default TemplateSelector;
