import React, { useState, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  LinearProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox
} from '@mui/material';
import {
  ContentCopy as DuplicateIcon,
  Warning as WarningIcon,
  MergeType as MergeIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { colors, typography, borderRadius } from '../../../theme/designSystem';
import { 
  calculateFindingSimilarity, 
  findPotentialDuplicates,
  findDuplicatesForFinding 
} from '../../utils/stringSimilarity';
import SeverityBadge from '../SeverityBadge';
import { DataTable } from '../DataTable';

/**
 * DuplicateMatchCard - Display a duplicate match
 */
const DuplicateMatchCard = ({ match, onMerge, onDelete, selected, onSelect }) => {
  const { finding, overallScore, titleSimilarity, descriptionSimilarity } = match;
  const confidenceColor = overallScore >= 0.9 ? colors.severity.critical :
                        overallScore >= 0.8 ? colors.severity.high :
                        colors.severity.medium;

  return (
    <Card
      sx={{
        backgroundColor: colors.background.tertiary,
        border: `1px solid ${selected ? colors.primary[500] : colors.border.subtle}`,
        borderRadius: borderRadius.lg,
        mb: 2,
        position: 'relative'
      }}
    >
      {selected && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 1
          }}
        >
          <Checkbox checked size="small" />
        </Box>
      )}

      <CardContent sx={{ p: 2, pl: selected ? 5 : 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <SeverityBadge severity={finding.severity} size="small" showTooltip={false} />
          
          <Chip
            size="small"
            label={`${Math.round(overallScore * 100)}% match`}
            sx={{
              backgroundColor: `${confidenceColor}20`,
              color: confidenceColor,
              fontWeight: typography.weight.semibold,
              fontSize: '0.75rem'
            }}
          />
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
          {finding.title}
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
          {finding.description?.substring(0, 200)}...
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip
            size="small"
            label={`Title: ${Math.round(titleSimilarity * 100)}%`}
            sx={{
              height: 20,
              fontSize: '0.625rem',
              backgroundColor: colors.background.secondary,
              color: colors.text.tertiary
            }}
          />
          <Chip
            size="small"
            label={`Desc: ${Math.round(descriptionSimilarity * 100)}%`}
            sx={{
              height: 20,
              fontSize: '0.625rem',
              backgroundColor: colors.background.secondary,
              color: colors.text.tertiary
            }}
          />
          {finding.projectName && (
            <Chip
              size="small"
              label={finding.projectName}
              sx={{
                height: 20,
                fontSize: '0.625rem',
                backgroundColor: colors.background.secondary,
                color: colors.text.tertiary
              }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ViewIcon />}
            onClick={() => onSelect?.(finding)}
            sx={{ textTransform: 'none' }}
          >
            View
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<MergeIcon />}
            onClick={() => onMerge?.(finding)}
            sx={{ textTransform: 'none' }}
          >
            Merge
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => onDelete?.(finding)}
            sx={{ textTransform: 'none' }}
          >
            Mark Duplicate
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

/**
 * DuplicateFinder - Main duplicate detection component
 */
const DuplicateFinder = ({
  findings = [],
  currentFinding = null,
  onCheckDuplicates,
  onMerge,
  onMarkDuplicate,
  onViewFinding,
  threshold = 0.75
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [duplicates, setDuplicates] = useState([]);
  const [selectedDuplicates, setSelectedDuplicates] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState(null);

  const runDuplicateScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setError(null);

    try {
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setScanProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      let results = [];

      if (currentFinding) {
        // Check specific finding against all
        results = findDuplicatesForFinding(currentFinding, findings, { threshold });
      } else {
        // Check all findings
        results = findPotentialDuplicates(findings, { threshold, maxResults: 50 });
      }

      clearInterval(progressInterval);
      setScanProgress(100);
      
      setTimeout(() => {
        setDuplicates(results);
        setShowResults(true);
        setIsScanning(false);
        onCheckDuplicates?.(results);
      }, 300);

    } catch (err) {
      setError(err.message);
      setIsScanning(false);
    }
  };

  const handleMergeSelected = () => {
    const selectedFindings = duplicates
      .filter((_, index) => selectedDuplicates.includes(index))
      .map(d => d.finding || d.finding2);
    
    onMerge?.(currentFinding, selectedFindings);
  };

  const toggleSelection = (index) => {
    setSelectedDuplicates(prev => 
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const confidenceSummary = useMemo(() => {
    const high = duplicates.filter(d => d.overallScore >= 0.9).length;
    const medium = duplicates.filter(d => d.overallScore >= 0.8 && d.overallScore < 0.9).length;
    const low = duplicates.filter(d => d.overallScore >= 0.75 && d.overallScore < 0.8).length;
    
    return { high, medium, low, total: duplicates.length };
  }, [duplicates]);

  if (isScanning) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <DuplicateIcon sx={{ fontSize: 48, color: colors.primary[500], mb: 2 }} />
        <Typography variant="h6" sx={{ color: colors.text.primary, mb: 2 }}>
          Scanning for Duplicates...
        </Typography>
        <Box sx={{ maxWidth: 400, mx: 'auto', mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={scanProgress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.background.tertiary,
              '& .MuiLinearProgress-bar': {
                backgroundColor: colors.primary[500]
              }
            }}
          />
        </Box>
        <Typography variant="body2" sx={{ color: colors.text.secondary }}>
          {scanProgress < 100 
            ? `Analyzing ${findings.length} findings...` 
            : 'Processing results...'}
        </Typography>
      </Box>
    );
  }

  if (!showResults) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <DuplicateIcon sx={{ fontSize: 48, color: colors.text.tertiary, mb: 2, opacity: 0.5 }} />
        <Typography variant="h6" sx={{ color: colors.text.secondary, mb: 1 }}>
          {currentFinding 
            ? 'Check for Similar Findings'
            : 'Scan All Findings for Duplicates'}
        </Typography>
        <Typography variant="body2" sx={{ color: colors.text.tertiary, mb: 3, maxWidth: 400, mx: 'auto' }}>
          {currentFinding
            ? 'Compare this finding against all others to identify potential duplicates'
            : 'Run a comprehensive scan to find similar findings across all projects'}
        </Typography>
        
        <Button
          variant="contained"
          size="large"
          startIcon={<RefreshIcon />}
          onClick={runDuplicateScan}
        >
          Start Scan
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ color: colors.text.primary, mb: 0.5 }}>
            Duplicate Scan Results
          </Typography>
          <Typography variant="body2" sx={{ color: colors.text.secondary }}>
            Found {confidenceSummary.total} potential duplicates
          </Typography>
        </Box>
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={runDuplicateScan}
          size="small"
        >
          Rescan
        </Button>
      </Box>

      {/* Summary */}
      {confidenceSummary.total > 0 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          {confidenceSummary.high > 0 && (
            <Chip
              size="small"
              icon={<WarningIcon />}
              label={`${confidenceSummary.high} High Confidence`}
              sx={{
                backgroundColor: `${colors.severity.critical}20`,
                color: colors.severity.critical,
                fontWeight: typography.weight.medium
              }}
            />
          )}
          {confidenceSummary.medium > 0 && (
            <Chip
              size="small"
              label={`${confidenceSummary.medium} Medium Confidence`}
              sx={{
                backgroundColor: `${colors.severity.high}20`,
                color: colors.severity.high
              }}
            />
          )}
          {confidenceSummary.low > 0 && (
            <Chip
              size="small"
              label={`${confidenceSummary.low} Low Confidence`}
              sx={{
                backgroundColor: `${colors.severity.medium}20`,
                color: colors.severity.medium
              }}
            />
          )}
        </Box>
      )}

      {/* Results */}
      {duplicates.length === 0 ? (
        <Alert 
          severity="success" 
          sx={{ 
            backgroundColor: `${colors.severity.low}15`,
            color: colors.severity.low,
            border: `1px solid ${colors.severity.low}30`
          }}
        >
          No duplicates found! This finding appears to be unique.
        </Alert>
      ) : (
        <>
          {currentFinding ? (
            // Single finding check results
            <>
              {duplicates.map((match, index) => (
                <DuplicateMatchCard
                  key={match.finding.id}
                  match={match}
                  selected={selectedDuplicates.includes(index)}
                  onSelect={() => toggleSelection(index)}
                  onMerge={() => onMerge?.(currentFinding, match.finding)}
                  onDelete={() => onMarkDuplicate?.(match.finding.id)}
                />
              ))}
              
              {selectedDuplicates.length > 0 && (
                <Box
                  sx={{
                    position: 'sticky',
                    bottom: 0,
                    backgroundColor: colors.background.secondary,
                    p: 2,
                    borderTop: `1px solid ${colors.border.subtle}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                    {selectedDuplicates.length} selected
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<MergeIcon />}
                    onClick={handleMergeSelected}
                  >
                    Merge Selected
                  </Button>
                </Box>
              )}
            </>
          ) : (
            // Bulk scan results
            <DataTable
              columns={[
                {
                  key: 'finding1',
                  title: 'Finding 1',
                  render: (val) => (
                    <Typography variant="body2" sx={{ color: colors.text.primary, maxWidth: 200 }} noWrap>
                      {val.title}
                    </Typography>
                  )
                },
                {
                  key: 'finding2',
                  title: 'Finding 2',
                  render: (val) => (
                    <Typography variant="body2" sx={{ color: colors.text.primary, maxWidth: 200 }} noWrap>
                      {val.title}
                    </Typography>
                  )
                },
                {
                  key: 'overallScore',
                  title: 'Match %',
                  render: (val) => (
                    <Chip
                      size="small"
                      label={`${Math.round(val * 100)}%`}
                      sx={{
                        backgroundColor: val >= 0.9 ? `${colors.severity.critical}20` :
                                        val >= 0.8 ? `${colors.severity.high}20` :
                                        `${colors.severity.medium}20`,
                        color: val >= 0.9 ? colors.severity.critical :
                              val >= 0.8 ? colors.severity.high :
                              colors.severity.medium,
                        fontWeight: typography.weight.semibold
                      }}
                    />
                  )
                },
                {
                  key: 'confidence',
                  title: 'Confidence',
                  render: (val) => (
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        textTransform: 'capitalize',
                        color: val === 'high' ? colors.severity.critical :
                              val === 'medium' ? colors.severity.high :
                              colors.severity.medium
                      }}
                    >
                      {val}
                    </Typography>
                  )
                }
              ]}
              data={duplicates.map((d, i) => ({
                id: i,
                finding1: d.finding1,
                finding2: d.finding2,
                overallScore: d.overallScore,
                confidence: d.confidence
              }))}
            />
          )}
        </>
      )}
    </Box>
  );
};

export default DuplicateFinder;
