import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Collapse,
  useTheme,
  useMediaQuery,
  Menu,
  CircularProgress
} from '@mui/material';
import {
  Download as DownloadIcon,
  Search as SearchIcon,
  Folder as FolderIcon,
  Description as DescriptionIcon,
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  MoreVert as MoreVertIcon,
  Launch as LaunchIcon
} from '@mui/icons-material';
import { reportAPI, projectAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FindingsSkeleton } from '../components/SkeletonLoader';
import { colors, typography, shadows, borderRadius } from '../theme/designSystem';

const GlobalReports = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reports, setReports] = useState([]);
  const [projects, setProjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [downloadingReport, setDownloadingReport] = useState(null); // Track which report is being downloaded
  const [expandedRows, setExpandedRows] = useState(new Set()); // Track expanded rows for mobile view
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState(null); // Track download menu anchor
  const [selectedReportForDownload, setSelectedReportForDownload] = useState(null); // Track selected report for download
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
  // Only admin and VAPT analyst can access this page
  const canAccess = user?.role === 'admin' || user?.role === 'vapt_analyst';

  useEffect(() => {
    if (!canAccess) {
      navigate('/dashboard');
      return;
    }
    fetchAllReports();
  }, [canAccess, navigate]);

  const fetchAllReports = async () => {
    try {
      setLoading(true);
      // Get all projects first
      const projectsData = await projectAPI.getProjects();
      const projectsMap = {};
      projectsData.forEach(p => {
        projectsMap[p.id] = p;
      });
      setProjects(projectsMap);

      // Fetch reports from all projects
      const allReports = [];
      for (const project of projectsData) {
        try {
          const projectReports = await reportAPI.getReports(project.id);
          projectReports.forEach(report => {
            allReports.push({
              ...report,
              name: report.name || '',
              projectId: project.id,
              projectName: project.name || '',
              projectCode: project.code || ''
            });
          });
        } catch (error) {
          console.error(`Error fetching reports for project ${project.id}:`, error);
        }
      }

      // Sort by created date (newest first)
      allReports.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setReports(allReports);
    } catch (error) {
      console.error('Error fetching all reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (report, format = 'html') => {
    if (!report.file || !report.file.filename) {
      showToast('No file attached to this report', 'warning');
      return;
    }
    try {
      const { blob } = await reportAPI.downloadReport(report.projectId, report.id, format);
      if (!blob || blob.size === 0) {
        showToast('Report file is empty or not found on server', 'warning');
        return;
      }
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error viewing report:', error);
      showToast('Error viewing report: ' + error.message, 'error');
    }
  };

  const handleDownload = async (report, format = 'original') => {
    // Show loading spinner for PDF conversion (especially for JSON files)
    if (!report.file || !report.file.filename) {
      showToast('No file attached to this report', 'warning');
      return;
    }
    const needsConversion = report.file.format === 'json' && format === 'pdf';
    if (needsConversion) {
      setDownloadingReport({ reportId: report.id, format: 'pdf' });
    }

    try {
      const { blob, fileName } = await reportAPI.downloadReport(report.projectId, report.id, format);

      if (!blob || blob.size === 0) {
        showToast('Report file is empty or not found on server', 'warning');
        return;
      }

      const url = window.URL.createObjectURL(blob);

      // Create download link with correct extension
      const link = document.createElement('a');
      link.href = url;
      
      const extension = format === 'pdf' ? 'pdf' : (format === 'html' ? 'html' : 'json');
      const filename = fileName || `${report.reportId || 'report'}.${extension}`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Clean up
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      showToast('Error downloading report: ' + error.message, 'error');
    } finally {
      // Hide loading spinner
      setDownloadingReport(null);
    }
  };

  const getFilteredReports = () => {
    return reports.filter(report => {
      const matchesSearch = report.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           report.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           report.reportId?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || report.type === filterType;
      const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      in_review: 'warning',
      approved: 'success',
      published: 'info',
      archived: 'default'
    };
    return colors[status] || 'default';
  };

  const getTypeColor = (type) => {
    const colors = {
      initial: 'primary',
      remediation: 'warning',
      retest: 'secondary',
      final: 'success',
      interim: 'info',
      executive: 'default',
      technical: 'default'
    };
    return colors[type] || 'default';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toggleRowExpansion = (reportId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(reportId)) {
      newExpanded.delete(reportId);
    } else {
      newExpanded.add(reportId);
    }
    setExpandedRows(newExpanded);
  };

  const handleDownloadMenuClick = (event, report) => {
    setDownloadMenuAnchor(event.currentTarget);
    setSelectedReportForDownload(report);
  };

  const handleDownloadMenuClose = () => {
    setDownloadMenuAnchor(null);
    setSelectedReportForDownload(null);
  };

  const handleDownloadFromMenu = (format) => {
    if (selectedReportForDownload) {
      handleDownload(selectedReportForDownload, format);
    }
    handleDownloadMenuClose();
  };

  if (loading) {
    return <FindingsSkeleton />;
  }

  const filteredReports = getFilteredReports();

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: colors.background.primary, 
      p: { xs: 2, sm: 3 },
      maxWidth: '100vw',
      overflowX: 'hidden'
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/dashboard')}
            sx={{
              color: colors.text.secondary,
              textTransform: 'none',
              '&:hover': { color: colors.primary[400] }
            }}
          >
            Back
          </Button>
          <Typography 
            variant="h4"
            sx={{
              color: colors.text.primary,
              fontWeight: typography.weight.bold,
              fontSize: typography.size['2xl']
            }}
          >
            All Reports
          </Typography>
        </Box>
        <Chip 
          label={`${filteredReports.length} Reports`} 
          sx={{
            background: colors.primary[600],
            color: '#fff',
            fontWeight: typography.weight.medium
          }}
          size="small"
        />
      </Box>

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3, maxWidth: '100%' }}>
        <Grid item xs={12} sm={12} md={4} lg={4}>
          <TextField
            fullWidth
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                background: colors.background.secondary,
                color: colors.text.primary,
                borderRadius: borderRadius.lg,
                '& fieldset': { borderColor: colors.border.subtle },
                '&:hover fieldset': { borderColor: colors.border.default }
              },
              '& .MuiInputLabel-root': { color: colors.text.tertiary },
              '& .MuiInputAdornment-root': { color: colors.text.tertiary }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: colors.text.tertiary }} />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: colors.text.tertiary }}>Type</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              label="Type"
              sx={{
                background: colors.background.secondary,
                color: colors.text.primary,
                borderRadius: borderRadius.lg,
                '& fieldset': { borderColor: colors.border.subtle },
                '& .MuiSelect-icon': { color: colors.text.tertiary }
              }}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="initial">Initial</MenuItem>
              <MenuItem value="remediation">Remediation</MenuItem>
              <MenuItem value="retest">Retest</MenuItem>
              <MenuItem value="final">Final</MenuItem>
              <MenuItem value="executive">Executive</MenuItem>
              <MenuItem value="technical">Technical</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: colors.text.tertiary }}>Status</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              label="Status"
              sx={{
                background: colors.background.secondary,
                color: colors.text.primary,
                borderRadius: borderRadius.lg,
                '& fieldset': { borderColor: colors.border.subtle },
                '& .MuiSelect-icon': { color: colors.text.tertiary }
              }}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="in_review">In Review</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="published">Published</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Reports Table - Dark Theme */}
      <TableContainer 
        component={Paper}
        sx={{
          background: colors.background.secondary,
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: borderRadius.xl,
          '& .MuiTable-root': { background: 'transparent' },
          maxWidth: '100%',
          overflowX: 'auto'
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: colors.background.tertiary }}>
              {!isMobile && (
                <TableCell sx={{ 
                  color: colors.text.primary, 
                  fontWeight: typography.weight.bold,
                  minWidth: '160px',
                  maxWidth: '180px'
                }}>Report</TableCell>
              )}
              {!isMobile && (
                <TableCell sx={{ 
                  color: colors.text.primary, 
                  fontWeight: typography.weight.bold,
                  minWidth: '120px',
                  maxWidth: '140px'
                }}>Project</TableCell>
              )}
              <TableCell sx={{ 
                color: colors.text.primary, 
                fontWeight: typography.weight.bold,
                minWidth: '70px',
                maxWidth: '80px'
              }}>Type</TableCell>
              <TableCell sx={{ 
                color: colors.text.primary, 
                fontWeight: typography.weight.bold,
                minWidth: '70px',
                maxWidth: '90px'
              }}>Status</TableCell>
              {!isMobile && (
                <TableCell sx={{ 
                  color: colors.text.primary, 
                  fontWeight: typography.weight.bold,
                  minWidth: '70px',
                  maxWidth: '80px'
                }}>Created</TableCell>
              )}
              <TableCell sx={{ 
                color: colors.text.primary, 
                fontWeight: typography.weight.bold,
                minWidth: '80px',
                maxWidth: '100px'
              }}>File</TableCell>
              <TableCell sx={{ 
                color: colors.text.primary, 
                fontWeight: typography.weight.bold,
                minWidth: '60px',
                maxWidth: '70px'
              }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isMobile ? 4 : 6} align="center">
                  <Typography sx={{ py: 4, color: colors.text.secondary }}>
                    No reports found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredReports.map((report) => (
                <TableRow key={report.id} hover sx={{ '&:hover': { backgroundColor: colors.background.tertiary } }}>
                  {!isMobile && (
                    <TableCell sx={{ 
                      color: colors.text.primary,
                      minWidth: '160px',
                      maxWidth: '180px'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DescriptionIcon sx={{ color: colors.text.tertiary, flexShrink: 0 }} />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Tooltip title={report.name || 'Untitled'} arrow>
                            <Typography 
                              variant="body2" 
                              fontWeight="medium" 
                              sx={{ 
                                color: colors.text.primary,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {report.name && report.name.length > 25 ? report.name.substring(0, 25) + '...' : report.name || 'Untitled'}
                            </Typography>
                          </Tooltip>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: colors.text.tertiary,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {report.reportId ? (report.reportId.length > 15 ? report.reportId.substring(0, 15) + '...' : report.reportId) : 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                  )}
                  {!isMobile && (
                    <TableCell sx={{ 
                      color: colors.text.primary,
                      minWidth: '120px',
                      maxWidth: '140px'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FolderIcon sx={{ color: colors.text.tertiary, flexShrink: 0 }} fontSize="small" />
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: colors.text.secondary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {report.projectName && report.projectName.length > 18 ? report.projectName.substring(0, 18) + '...' : report.projectName || ''}
                        </Typography>
                      </Box>
                    </TableCell>
                  )}
                  <TableCell>
                    <Chip
                      label={report.type}
                      color={getTypeColor(report.type)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={report.status?.replace('_', ' ')}
                      color={getStatusColor(report.status)}
                      size="small"
                    />
                  </TableCell>
                  {!isMobile && (
                    <TableCell>
                      <Typography variant="body2" sx={{ color: colors.text.tertiary }}>
                        {formatDate(report.createdAt)}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell sx={{ 
                    minWidth: '80px',
                    maxWidth: '100px'
                  }}>
                    {report.file ? (
                      <Tooltip title={report.file.originalName || report.file.filename || 'Unknown'} arrow>
                      <Chip
                        icon={<DescriptionIcon />}
                        label={isMobile ? 'File' : ((report.file.originalName || report.file.filename) && ((report.file.originalName || report.file.filename).length > 12) ? (report.file.originalName || report.file.filename).substring(0, 12) + '...' : (report.file.originalName || report.file.filename) || 'Unknown')}
                        size="small"
                        variant="outlined"
                        color="success"
                        sx={{
                          maxWidth: '100%',
                          '& .MuiChip-label': {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }
                        }}
                      />
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" sx={{ color: colors.text.tertiary }}>
                        No file
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ 
                    minWidth: '60px',
                    maxWidth: '70px'
                  }}>
                    {report.file && (
                      <>
                        <IconButton
                          size="small"
                          onClick={(e) => handleDownloadMenuClick(e, report)}
                          sx={{ color: colors.primary[400] }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                        <Menu
                          anchorEl={downloadMenuAnchor}
                          open={Boolean(downloadMenuAnchor) && selectedReportForDownload?.id === report.id}
                          onClose={handleDownloadMenuClose}
                          PaperProps={{
                            sx: {
                              background: colors.background.secondary,
                              border: `1px solid ${colors.border.subtle}`,
                              boxShadow: shadows.md,
                              minWidth: '150px'
                            }
                          }}
                          >
                            {(report.file.availableFormats?.includes('html') || (report.file.format === 'html' && !report.file.availableFormats?.length)) && (
                            <MenuItem 
                              onClick={() => handleDownloadFromMenu('html')}
                              sx={{ 
                                color: colors.text.primary,
                                '&:hover': { backgroundColor: colors.background.tertiary }
                              }}
                            >
                              <DownloadIcon sx={{ mr: 1, fontSize: '16px' }} />
                              Download HTML
                            </MenuItem>
                          )}
                          {(report.file.availableFormats?.includes('pdf') || (report.file.format === 'pdf' && !report.file.availableFormats?.length)) && (
                            <MenuItem 
                              onClick={() => handleDownloadFromMenu('pdf')}
                              disabled={downloadingReport?.reportId === report.id && downloadingReport?.format === 'pdf'}
                              sx={{ 
                                color: colors.text.primary,
                                '&:hover': { backgroundColor: colors.background.tertiary },
                                '&.Mui-disabled': { color: colors.text.tertiary }
                              }}
                            >
                              {downloadingReport?.reportId === report.id && downloadingReport?.format === 'pdf' ? (
                                <>
                                  <CircularProgress size={16} sx={{ mr: 1, color: colors.primary[400] }} />
                                  Converting...
                                </>
                              ) : (
                                <>
                                  <DownloadIcon sx={{ mr: 1, fontSize: '16px' }} />
                                  Download PDF
                                </>
                              )}
                            </MenuItem>
                          )}
                          <MenuItem
                            onClick={() => {
                              handleView(report, 'html');
                              handleDownloadMenuClose();
                            }}
                            sx={{
                              color: colors.text.primary,
                              '&:hover': { backgroundColor: colors.background.tertiary }
                            }}
                          >
                            <VisibilityIcon sx={{ mr: 1, fontSize: '16px' }} />
                            View
                          </MenuItem>
                          <MenuItem 
                            onClick={() => {
                              navigate(`/projects/${report.projectId}`);
                              handleDownloadMenuClose();
                            }}
                            sx={{ 
                              color: colors.text.primary,
                              '&:hover': { backgroundColor: colors.background.tertiary }
                            }}
                          >
                            <LaunchIcon sx={{ mr: 1, fontSize: '16px' }} />
                            View Project
                          </MenuItem>
                        </Menu>
                      </>
                    )}
                  </TableCell>
                  {isMobile && (
                    <TableCell colSpan={3} sx={{ p: 0 }}>
                      <Collapse in={expandedRows.has(report.id)} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2, backgroundColor: colors.background.tertiary, mt: 1 }}>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" sx={{ color: colors.text.tertiary, mb: 1, display: 'block' }}>Report Details</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <DescriptionIcon sx={{ color: colors.text.tertiary, fontSize: '16px' }} />
                              <Typography variant="body2" sx={{ color: colors.text.primary, fontWeight: 'medium' }}>
                                {report.name}
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: colors.text.tertiary, ml: 3 }}>
                              {report.reportId}
                            </Typography>
                          </Box>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" sx={{ color: colors.text.tertiary, mb: 1, display: 'block' }}>Project</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <FolderIcon sx={{ color: colors.text.tertiary, fontSize: '16px' }} />
                              <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                                {report.projectName}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" sx={{ color: colors.text.tertiary, mb: 1, display: 'block' }}>Created</Typography>
                            <Typography variant="body2" sx={{ color: colors.text.tertiary }}>
                              {formatDate(report.createdAt)}
                            </Typography>
                          </Box>
                          {report.file && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" sx={{ color: colors.text.tertiary, mb: 1, display: 'block' }}>File</Typography>
                              <Tooltip title={report.file.originalName || report.file.filename || 'Unknown'} arrow>
                              <Chip
                                icon={<DescriptionIcon />}
                                label={report.file.originalName || report.file.filename || 'Unknown'}
                                size="small"
                                variant="outlined"
                                color="success"
                                sx={{
                                  maxWidth: '100%',
                                  '& .MuiChip-label': {
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }
                                }}
                              />
                              </Tooltip>
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  )}
                  {isMobile && (
                    <TableCell sx={{ width: '60px' }}>
                      <IconButton
                        size="small"
                        onClick={() => toggleRowExpansion(report.id)}
                        sx={{ 
                          transform: expandedRows.has(report.id) ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease-in-out',
                          color: colors.text.tertiary
                        }}
                      >
                        <ExpandMoreIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary Stats */}
      <Grid container spacing={2} sx={{ mt: 3 }}>
        <Grid item xs={12} sm={3}>
          <Card sx={{ background: colors.background.secondary, border: `1px solid ${colors.border.subtle}`, borderRadius: borderRadius.xl }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: colors.primary[400], fontWeight: typography.weight.bold }}>
                {reports.filter(r => r.file).length}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                With Files
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ background: colors.background.secondary, border: `1px solid ${colors.border.subtle}`, borderRadius: borderRadius.xl }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: colors.status.warning, fontWeight: typography.weight.bold }}>
                {reports.filter(r => r.status === 'draft').length}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                Draft
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ background: colors.background.secondary, border: `1px solid ${colors.border.subtle}`, borderRadius: borderRadius.xl }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: colors.status.success, fontWeight: typography.weight.bold }}>
                {reports.filter(r => r.status === 'published').length}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                Published
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ background: colors.background.secondary, border: `1px solid ${colors.border.subtle}`, borderRadius: borderRadius.xl }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: colors.text.primary, fontWeight: typography.weight.bold }}>
                {[...new Set(reports.map(r => r.projectId))].length}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                Projects
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GlobalReports;
