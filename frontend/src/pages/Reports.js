import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Menu,
  Stack,
  Tooltip
} from '@mui/material';
import { Upload as UploadIcon, Download as DownloadIcon, Delete as DeleteIcon, MoreVert as MoreVertIcon, Description as DescriptionIcon, Visibility as ViewIcon } from '@mui/icons-material';
import CircularProgress from '@mui/material/CircularProgress';
import { reportAPI, projectAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DashboardHeader } from '../components/branding';
import { colors, typography, borderRadius } from '../theme/designSystem';

const Reports = () => {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { showToast, showConfirm } = useToast();
  const [reports, setReports] = useState([]);
  const [open, setOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [jsonUploadDialogOpen, setJsonUploadDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadProgressMessage, setUploadProgressMessage] = useState('');
  const [projectName, setProjectName] = useState('');
  const [downloadingReport, setDownloadingReport] = useState(null); // Track which report is being downloaded
  const [formData, setFormData] = useState({
    name: '',
    type: 'initial'
  });
  
  // Only admin and VAPT analyst can upload/delete reports
  const canUploadReports = user?.role === 'admin' || user?.role === 'vapt_analyst';
  const canDeleteReports = user?.role === 'admin' || user?.role === 'vapt_analyst';

  useEffect(() => {
    fetchReports();
    fetchProjectName();
  }, [projectId]);

  const fetchProjectName = async () => {
    try {
      const project = await projectAPI.getProject(projectId);
      setProjectName(project?.name || 'Unknown');
    } catch (error) {
      console.error('Error fetching project:', error);
      setProjectName('Unknown');
    }
  };

  const fetchReports = async () => {
    try {
      const reports = await reportAPI.getReports(projectId);
      setReports(reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const handleOpen = () => {
    setFormData({
      name: '',
      type: 'initial'
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      // Generate report ID with format: GETEPAY*-ProjectName*-ReportName-Date
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const sanitizedProject = projectName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      const sanitizedReport = formData.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      const reportId = `GETEPAY-${sanitizedProject}-${sanitizedReport}-${dateStr}`;
      
      await reportAPI.createReport(projectId, {
        ...formData,
        reportId: reportId
      });
      handleClose();
      fetchReports();
    } catch (error) {
      console.error('Error creating report:', error);
    }
  };

  const handleDownload = async (report, format = 'original') => {
    const needsConversion = report.file?.format === 'json' && format === 'pdf';
    if (needsConversion) {
      setDownloadingReport({ reportId: report.id, format: 'pdf' });
    }

    try {
      const { blob, fileName, contentType } = await reportAPI.downloadReport(projectId, report.id, format);

      const ext = format === 'pdf' ? 'pdf' : 'html';
      const baseName = fileName.replace(/\.[^/.]+$/, '') || `report-${report.reportId || report.id}`;
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${baseName}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      showToast('Error downloading report: ' + error.message, 'error');
    } finally {
      setDownloadingReport(null);
    }
  };

  const handleView = async (report, format = 'original') => {
    try {
      const { blob } = await reportAPI.downloadReport(projectId, report.id, format);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      showToast('Error viewing report: ' + error.message, 'error');
    }
  };

  const handleExecutiveDownload = async () => {
    try {
      const { blob, fileName } = await reportAPI.downloadExecutivePdf(projectId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Executive report downloaded successfully', 'success');
    } catch (error) {
      console.error('Error downloading executive report:', error);
      showToast('Error downloading executive report: ' + error.message, 'error');
    }
  };

  const handleUploadClick = (report) => {
    setSelectedReport(report);
    setSelectedFile(null);
    setUploadDialogOpen(true);
  };

  const handleJsonUploadClick = (report) => {
    setSelectedReport(report);
    setSelectedFile(null);
    setJsonUploadDialogOpen(true);
  };

  const handleFileSelect = (e, acceptJson = false) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const fileType = file.type;

    // Accept HTML, PDF, and JSON files based on dialog type
    const isHtml = fileType === 'text/html' || fileName.endsWith('.html') || fileName.endsWith('.htm');
    const isPdf = fileType === 'application/pdf' || fileName.endsWith('.pdf');
    const isJson = fileType === 'application/json' || fileName.endsWith('.json');

    if (acceptJson) {
      if (isJson) {
        setSelectedFile(file);
      } else {
        showToast('Please select a JSON file for this upload section', 'warning');
      }
    } else {
      if (isHtml || isPdf) {
        setSelectedFile(file);
      } else {
        showToast('Please select an HTML or PDF file', 'warning');
      }
    }
  };

  const handleUploadSubmit = async (isJsonUpload = false) => {
    if (!selectedFile || !selectedReport) return;
    
    // Generate new file name with format: GETEPAY-ProjectName-ReportName-Date.ext
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const sanitizedProject = projectName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    const sanitizedReport = selectedReport.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    const extension = selectedFile.name.split('.').pop();
    const newFileName = `GETEPAY-${sanitizedProject}-${sanitizedReport}-${dateStr}.${extension}`;
    
    // Create new file with renamed filename
    const renamedFile = new File([selectedFile], newFileName, { type: selectedFile.type });
    
    if (isJsonUpload) {
      setUploadProgress(true);
      setUploadProgressMessage('Starting upload...');
    }
    
    try {
      // Progress callback for JSON uploads
      const progressCallback = isJsonUpload ? (message) => {
        setUploadProgressMessage(message);
      } : null;
      
      await reportAPI.uploadReportFile(
        projectId, 
        selectedReport.id, 
        renamedFile, 
        user?.name || user?.email,
        progressCallback
      );
      
      if (isJsonUpload) {
        setJsonUploadDialogOpen(false);
      } else {
        setUploadDialogOpen(false);
      }
      
      setSelectedFile(null);
      setSelectedReport(null);
      setUploadProgress(false);
      setUploadProgressMessage('');
      fetchReports();
      showToast('Report uploaded successfully!', 'success');
    } catch (error) {
      console.error('Error uploading report:', error);
      setUploadProgress(false);
      setUploadProgressMessage('');
      showToast('Error uploading report: ' + error.message, 'error');
    }
  };

  const handleDeleteReport = async (report) => {
    if (!await showConfirm({
      title: 'Delete Report',
      message: `Are you sure you want to delete report "${report.name}"? This action cannot be undone.`,
      severity: 'warning',
      confirmLabel: 'Delete Permanently',
    })) {
      return;
    }
    
    try {
      await reportAPI.deleteReport(projectId, report.id);
      fetchReports();
      showToast('Report deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting report:', error);
      showToast('Error deleting report: ' + error.message, 'error');
    }
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

  return (
    <Box sx={{ minHeight: '100vh', background: colors.background.primary, p: 3 }}>
      <DashboardHeader
        title={`${projectName} Reports`}
        subtitle="Manage and generate security assessment reports"
        actions={
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              startIcon={<DescriptionIcon />}
              onClick={() => reportAPI.previewExecutiveReport(projectId)}
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', textTransform: 'none', borderRadius: borderRadius.lg, '&:hover': { borderColor: '#fff', background: 'rgba(255,255,255,0.08)' } }}
            >
              Preview Executive Report
            </Button>
            <Button
               variant="contained"
               startIcon={<DownloadIcon />}
               onClick={() => reportAPI.generateExecutiveReport(projectId)}
               sx={{ background: colors.primary[600], color: '#fff', textTransform: 'none', borderRadius: borderRadius.lg, '&:hover': { background: colors.primary[500] } }}
             >
               Generate PDF
             </Button>
            {canUploadReports && (
              <Button
                variant="contained"
                startIcon={<UploadIcon  />}
                onClick={handleOpen}
                sx={{ background: colors.primary[600], color: '#fff', textTransform: 'none', borderRadius: borderRadius.lg, '&:hover': { background: colors.primary[500] } }}
              >
                New Report
              </Button>
            )}
          </Box>
        }
      />

      <Grid container spacing={3}>
        {reports.map((report) => (
          <Grid item xs={12} md={6} key={report.id}>
            <Card sx={{ 
              background: colors.background.secondary, 
              border: `1px solid ${colors.border.subtle}`, 
              borderRadius: borderRadius.xl,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: `0 8px 24px rgba(0,0,0,0.3)`
              }
            }}>
              <CardContent>
                <Tooltip title={report.name} arrow>
                  <Typography 
                    variant="h6" 
                    gutterBottom
                    sx={{ 
                      color: colors.text.primary,
                      fontWeight: typography.weight.semibold,
                      fontSize: '1.1rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {report.name}
                  </Typography>
                </Tooltip>
                <Typography 
                  variant="body2" 
                  gutterBottom
                  sx={{ 
                    color: colors.text.secondary,
                    fontFamily: 'monospace',
                    fontSize: '0.8rem'
                  }}
                >
                  {report.reportId}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={report.type}
                    size="small"
                    sx={{ 
                      mr: 1,
                      background: colors.info,
                      color: '#fff',
                      fontWeight: typography.weight.medium,
                      textTransform: 'capitalize'
                    }}
                  />
                  {(canUploadReports) ? (
                    <FormControl size="small" sx={{ minWidth: 110 }}>
                      <Select
                        value={report.status}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          if (newVal !== report.status) {
                            reportAPI.updateReport(projectId, report.id, { status: newVal })
                              .then(() => { fetchReports(); showToast('Status updated!', 'success'); })
                              .catch(err => showToast('Error: ' + err.message, 'error'));
                          }
                        }}
                        sx={{
                          height: 24,
                          fontSize: '0.75rem',
                          color: '#fff',
                          background: report.status === 'published' ? colors.status.success :
                                     report.status === 'draft' ? colors.status.warning :
                                     report.status === 'archived' ? colors.severity.low :
                                     colors.primary[600],
                          borderRadius: '16px',
                          '& .MuiSelect-icon': { color: '#fff' },
                          '& fieldset': { border: 'none' },
                          textTransform: 'capitalize',
                          fontWeight: typography.weight.medium,
                        }}
                      >
                        {['draft', 'in_review', 'approved', 'published', 'archived'].map(s => (
                          <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s.replace('_', ' ')}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <Chip
                      label={report.status?.replace('_', ' ')}
                      size="small"
                      sx={{
                        background: report.status === 'published' ? colors.status.success :
                                   report.status === 'draft' ? colors.status.warning :
                                   report.status === 'archived' ? colors.severity.low :
                                   colors.primary[600],
                        color: '#fff',
                        fontWeight: typography.weight.medium,
                        textTransform: 'capitalize'
                      }}
                    />
                  )}
                </Box>
                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {report.file ? (
                    <>
                      {/* View button */}
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => handleView(report, 'html')}
                        sx={{
                          borderColor: colors.border.default,
                          color: colors.status.success,
                          textTransform: 'none',
                          borderRadius: borderRadius.md,
                          '&:hover': {
                            borderColor: colors.status.success,
                            background: 'rgba(46, 160, 67, 0.1)'
                          }
                        }}
                      >
                        View
                      </Button>
                      {/* Show download buttons based on available formats */}
                      {(report.file.format === 'json' || report.file.availableFormats?.includes('json')) && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={() => handleDownload(report, 'original')}
                          sx={{
                            borderColor: colors.border.default,
                            color: colors.primary[400],
                            textTransform: 'none',
                            borderRadius: borderRadius.md,
                            '&:hover': {
                              borderColor: colors.primary[400],
                              background: 'rgba(88, 166, 255, 0.1)'
                            }
                          }}
                        >
                          Download JSON
                        </Button>
                      )}
                      {(report.file.format === 'html' || report.file.availableFormats?.includes('html')) && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={() => handleDownload(report, 'html')}
                          sx={{
                            borderColor: colors.border.default,
                            color: colors.primary[400],
                            textTransform: 'none',
                            borderRadius: borderRadius.md,
                            '&:hover': {
                              borderColor: colors.primary[400],
                              background: 'rgba(88, 166, 255, 0.1)'
                            }
                          }}
                        >
                          Download HTML
                        </Button>
                      )}
                      {(report.file.format === 'pdf' || report.file.availableFormats?.includes('pdf')) && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={downloadingReport?.reportId === report.id && downloadingReport?.format === 'pdf'
                            ? <CircularProgress size={16} sx={{ color: colors.primary[400] }} />
                            : <DownloadIcon />
                          }
                          onClick={() => handleDownload(report, 'pdf')}
                          disabled={downloadingReport?.reportId === report.id && downloadingReport?.format === 'pdf'}
                          sx={{
                            borderColor: colors.border.default,
                            color: colors.primary[400],
                            textTransform: 'none',
                            borderRadius: borderRadius.md,
                            '&:hover': {
                              borderColor: colors.primary[400],
                              background: 'rgba(88, 166, 255, 0.1)'
                            }
                          }}
                        >
                          {downloadingReport?.reportId === report.id && downloadingReport?.format === 'pdf'
                            ? 'Converting...'
                            : 'Download PDF'
                          }
                        </Button>
                      )}
                      {/* Show file type indicator */}
                      <Chip
                        label={report.file.format?.toUpperCase() || 'FILE'}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: colors.border.subtle,
                          color: colors.text.tertiary,
                          fontSize: '0.75rem'
                        }}
                      />
                    </>
                  ) : (
                    canUploadReports ? (
                      <>
                        {/* Upload HTML/PDF Section */}
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<UploadIcon />}
                          onClick={() => handleUploadClick(report)}
                          sx={{
                            borderColor: colors.border.default,
                            color: colors.status.warning,
                            textTransform: 'none',
                            borderRadius: borderRadius.md,
                            '&:hover': {
                              borderColor: colors.status.warning,
                              background: 'rgba(219, 171, 9, 0.1)'
                            }
                          }}
                        >
                          Upload HTML/PDF
                        </Button>
                        {/* Upload JSON Section (separate) */}
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<UploadIcon />}
                          onClick={() => handleJsonUploadClick(report)}
                          sx={{
                            borderColor: colors.border.default,
                            color: colors.info,
                            textTransform: 'none',
                            borderRadius: borderRadius.md,
                            '&:hover': {
                              borderColor: colors.info,
                              background: 'rgba(88, 166, 255, 0.1)'
                            }
                          }}
                        >
                          Upload JSON
                        </Button>
                      </>
                    ) : null // Explicitly return null if canUploadReports is false
                  )}
                  {/* Delete button for relevant roles */}
                  {canDeleteReports && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteReport(report)}
                      sx={{
                        borderColor: colors.border.default,
                        color: colors.status.error,
                        textTransform: 'none',
                        borderRadius: borderRadius.md,
                        '&:hover': {
                          borderColor: colors.status.error,
                          background: 'rgba(248, 81, 73, 0.1)'
                        }
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            background: colors.background.secondary,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: borderRadius.xl
          }
        }}
      >
        <DialogTitle sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>
          New Report
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Report Name"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleChange}
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: colors.text.primary,
                background: colors.background.tertiary,
                borderRadius: borderRadius.lg,
                '& fieldset': { borderColor: colors.border.default },
                '&:hover fieldset': { borderColor: colors.border.hover },
                '&.Mui-focused fieldset': { borderColor: colors.primary[400] },
              },
              '& .MuiInputLabel-root': { color: colors.text.tertiary },
              '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[400] },
            }}
          />
          <FormControl 
            fullWidth 
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: colors.text.primary,
                background: colors.background.tertiary,
                borderRadius: borderRadius.lg,
                '& fieldset': { borderColor: colors.border.default },
                '&:hover fieldset': { borderColor: colors.border.hover },
                '&.Mui-focused fieldset': { borderColor: colors.primary[400] },
              },
              '& .MuiInputLabel-root': { color: colors.text.tertiary },
              '& .MuiInputLabel-root.Mui-focused': { color: colors.primary[400] },
            }}
          >
            <InputLabel>Report Type</InputLabel>
            <Select
              name="type"
              value={formData.type}
              label="Report Type"
              onChange={handleChange}
              sx={{ color: colors.text.primary }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: colors.background.secondary,
                    border: `1px solid ${colors.border.subtle}`,
                    borderRadius: borderRadius.lg,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    '& .MuiMenuItem-root': {
                      color: colors.text.primary,
                      backgroundColor: 'transparent',
                      '&:hover': {
                        backgroundColor: colors.background.tertiary,
                      },
                      '&.Mui-selected': {
                        backgroundColor: colors.primary[900],
                        color: colors.primary[300],
                        '&:hover': {
                          backgroundColor: colors.primary[800],
                        }
                      }
                    }
                  }
                }
              }}
            >
              <MenuItem value="initial">Initial</MenuItem>
              <MenuItem value="remediation">Remediation</MenuItem>
              <MenuItem value="retest">Retest</MenuItem>
              <MenuItem value="final">Final</MenuItem>
              <MenuItem value="interim">Interim</MenuItem>
              <MenuItem value="executive">Executive</MenuItem>
              <MenuItem value="technical">Technical</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleClose}
            sx={{ color: colors.text.secondary, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            sx={{ 
              background: colors.primary[600],
              color: '#fff',
              textTransform: 'none',
              '&:hover': { background: colors.primary[500] }
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* HTML/PDF Upload Dialog */}
      <Dialog 
        open={uploadDialogOpen} 
        onClose={() => setUploadDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            background: colors.background.secondary,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: borderRadius.xl
          }
        }}
      >
        <DialogTitle sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>
          Upload HTML/PDF Report
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: colors.text.secondary }}>
            {selectedReport?.name}
          </Typography>
          <Typography variant="caption" sx={{ mb: 1, display: 'block', color: colors.text.tertiary }}>
            Supported formats: HTML, PDF only
          </Typography>
          <Button
            variant="outlined"
            component="label"
            fullWidth
            sx={{
              mb: 2,
              borderColor: colors.border.default,
              color: colors.text.secondary,
              background: colors.background.tertiary,
              borderRadius: borderRadius.lg,
              py: 1.5,
              '&:hover': {
                borderColor: colors.primary[400],
                background: 'rgba(88, 166, 255, 0.1)'
              }
            }}
          >
            Select HTML/PDF File
            <input
              type="file"
              accept=".html,.htm,.pdf"
              hidden
              onChange={(e) => handleFileSelect(e, false)}
            />
          </Button>
          {selectedFile && (
            <Typography variant="body2" sx={{ color: colors.status.success }}>
              Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setUploadDialogOpen(false)}
            sx={{ color: colors.text.secondary, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => handleUploadSubmit(false)} 
            variant="contained"
            disabled={!selectedFile}
            sx={{ 
              background: colors.status.success,
              color: '#fff',
              textTransform: 'none',
              '&:hover': { background: '#2EA043' },
              '&.Mui-disabled': { background: colors.background.tertiary, color: colors.text.tertiary }
            }}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      {/* JSON Upload Dialog with Progress */}
      <Dialog 
        open={jsonUploadDialogOpen} 
        onClose={() => !uploadProgress && setJsonUploadDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            background: colors.background.secondary,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: borderRadius.xl
          }
        }}
      >
        <DialogTitle sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>
          Upload JSON Report
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: colors.text.secondary }}>
            {selectedReport?.name}
          </Typography>
          <Typography variant="caption" sx={{ mb: 1, display: 'block', color: colors.text.tertiary }}>
            JSON files will be converted to HTML and PDF formats
          </Typography>
          
          {!uploadProgress ? (
            <>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                sx={{
                  mb: 2,
                  borderColor: colors.border.default,
                  color: colors.text.secondary,
                  background: colors.background.tertiary,
                  borderRadius: borderRadius.lg,
                  py: 1.5,
                  '&:hover': {
                    borderColor: colors.primary[400],
                    background: 'rgba(88, 166, 255, 0.1)'
                  }
                }}
              >
                Select JSON File
                <input
                  type="file"
                  accept=".json"
                  hidden
                  onChange={(e) => handleFileSelect(e, true)}
                />
              </Button>
              {selectedFile && (
                <Typography variant="body2" sx={{ color: colors.status.success }}>
                  Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                </Typography>
              )}
            </>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
              <CircularProgress 
                size={48} 
                sx={{ color: colors.primary[400], mb: 2 }}
              />
              <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                {uploadProgressMessage || 'Converting JSON to HTML/PDF formats...'}
              </Typography>
              <Typography variant="caption" sx={{ color: colors.text.tertiary, mt: 1 }}>
                This may take a few moments
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setJsonUploadDialogOpen(false)}
            disabled={uploadProgress}
            sx={{ color: colors.text.secondary, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => handleUploadSubmit(true)} 
            variant="contained"
            disabled={!selectedFile || uploadProgress}
            sx={{ 
              background: colors.info,
              color: '#fff',
              textTransform: 'none',
              '&:hover': { background: '#1F6FEB' },
              '&.Mui-disabled': { background: colors.background.tertiary, color: colors.text.tertiary }
            }}
          >
            {uploadProgress ? 'Converting...' : 'Upload & Convert'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Reports;
