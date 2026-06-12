import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Alert,
  Tooltip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Description as FileIcon,
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Security as SecurityIcon,
  Assessment as AssessmentIcon,
  Gavel as GavelIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { securityReportAPI } from '../services/api';
import { colors, typography, borderRadius, shadows } from '../theme/designSystem';

const SecurityReports = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast, showConfirm } = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newReport, setNewReport] = useState({
    title: '',
    type: 'firewall',
    description: '',
    file: null
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const reportTypes = [
    { value: 'firewall', label: 'Firewall Audit', icon: <SecurityIcon /> },
    { value: 'network', label: 'Network Security Audit', icon: <AssessmentIcon /> },
    { value: 'vulnerability', label: 'Vulnerability Assessment', icon: <GavelIcon /> },
    { value: 'compliance', label: 'Compliance Audit', icon: <SecurityIcon /> },
    { value: 'penetration', label: 'Penetration Test Report', icon: <GavelIcon /> },
    { value: 'risk', label: 'Risk Assessment', icon: <AssessmentIcon /> }
  ];

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const data = await securityReportAPI.getReports();
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching security reports:', error);
      setError('Failed to load security reports');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!newReport.title || !newReport.type || !newReport.file) {
      setError('Please fill all required fields');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', newReport.title);
      formData.append('type', newReport.type);
      formData.append('description', newReport.description);
      formData.append('file', newReport.file);
      formData.append('uploadedBy', user.email);

      const report = await securityReportAPI.uploadReport(formData);
      setReports([report, ...reports]);
      setSuccess('Security report uploaded successfully');
      setUploadDialogOpen(false);
      setNewReport({ title: '', type: 'firewall', description: '', file: null });
    } catch (error) {
      console.error('Error uploading report:', error);
      setError('Failed to upload security report');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (reportId, filename) => {
    try {
      const response = await securityReportAPI.downloadReport(reportId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      setError('Failed to download report');
    }
  };

  const handleDelete = async (reportId) => {
    if (!await showConfirm({
      title: 'Delete Security Report',
      message: 'Are you sure you want to delete this security report?',
      severity: 'warning',
      confirmLabel: 'Delete',
    })) {
      return;
    }

    try {
      await securityReportAPI.deleteReport(reportId);
      setReports(reports.filter(report => report.id !== reportId));
      setSuccess('Security report deleted successfully');
    } catch (error) {
      console.error('Error deleting report:', error);
      setError('Failed to delete security report');
    }
  };

  const getReportTypeIcon = (type) => {
    const reportType = reportTypes.find(rt => rt.value === type);
    return reportType ? reportType.icon : <FileIcon />;
  };

  const getReportTypeLabel = (type) => {
    const reportType = reportTypes.find(rt => rt.value === type);
    return reportType ? reportType.label : type;
  };

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress sx={{ color: colors.primary[500] }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: colors.text.secondary }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ 
            color: colors.text.primary,
            fontWeight: typography.weight.bold,
            fontSize: typography.size['2xl']
          }}>
            Security Reports
          </Typography>
          <Chip
            label="Audit & Compliance"
            size="small"
            sx={{
              backgroundColor: `${colors.primary[500]}20`,
              color: colors.primary[400],
              fontWeight: typography.weight.medium
            }}
          />
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setUploadDialogOpen(true)}
          sx={{
            background: `linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[700]} 100%)`,
            color: colors.gray[50],
            borderRadius: borderRadius.lg,
            textTransform: 'none',
            fontWeight: typography.weight.semibold,
            px: 3,
            py: 1.5,
            boxShadow: shadows.md
          }}
        >
          Upload Report
        </Button>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Reports Grid */}
      <Grid container spacing={3}>
        {reports.length === 0 ? (
          <Grid item xs={12}>
            <Card sx={{ 
              background: colors.background.secondary,
              border: `1px solid ${colors.border.subtle}`,
              borderRadius: borderRadius.xl,
              textAlign: 'center',
              py: 8
            }}>
              <SecurityIcon sx={{ fontSize: 64, color: colors.text.tertiary, mb: 2 }} />
              <Typography variant="h6" sx={{ color: colors.text.secondary, mb: 2 }}>
                No Security Reports Available
              </Typography>
              <Typography variant="body2" sx={{ color: colors.text.tertiary, mb: 3 }}>
                Upload firewall audits, network security reports, and compliance documents
              </Typography>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setUploadDialogOpen(true)}
                sx={{
                  borderColor: colors.border.default,
                  color: colors.text.secondary,
                  '&:hover': {
                    borderColor: colors.primary[500],
                    color: colors.primary[500],
                    backgroundColor: 'rgba(6, 182, 212, 0.05)'
                  }
                }}
              >
                Upload First Report
              </Button>
            </Card>
          </Grid>
        ) : (
          reports.map((report) => (
            <Grid item xs={12} md={6} lg={4} key={report.id}>
              <Card sx={{ 
                background: colors.background.secondary,
                border: `1px solid ${colors.border.subtle}`,
                borderRadius: borderRadius.xl,
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: shadows.lg,
                  borderColor: colors.primary[500]
                }
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getReportTypeIcon(report.type)}
                      <Typography variant="h6" sx={{ 
                        color: colors.text.primary,
                        fontWeight: typography.weight.semibold,
                        fontSize: typography.size.lg
                      }}>
                        {report.title}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={getReportTypeLabel(report.type)}
                      sx={{
                        backgroundColor: `${colors.primary[500]}15`,
                        color: colors.primary[400],
                        fontSize: '0.7rem',
                        fontWeight: typography.weight.medium
                      }}
                    />
                  </Box>
                  
                  <Typography variant="body2" sx={{ 
                    color: colors.text.secondary,
                    mb: 3,
                    height: 40,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {report.description || 'No description available'}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="caption" sx={{ color: colors.text.tertiary }}>
                      {formatDate(report.createdAt)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.text.tertiary }}>
                      by {report.uploadedBy}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownload(report.id, report.fileName || report.title)}
                      sx={{
                        flex: 1,
                        borderColor: colors.border.default,
                        color: colors.text.secondary,
                        '&:hover': {
                          borderColor: colors.primary[500],
                          color: colors.primary[500],
                          backgroundColor: 'rgba(6, 182, 212, 0.05)'
                        }
                      }}
                    >
                      Download
                    </Button>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(report.id)}
                      sx={{
                        color: colors.text.tertiary,
                        '&:hover': {
                          color: colors.severity.critical,
                          backgroundColor: 'rgba(220, 38, 38, 0.1)'
                        }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* Upload Dialog */}
      <Dialog 
        open={uploadDialogOpen} 
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: colors.background.secondary,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: borderRadius.xl
          }
        }}
      >
        <DialogTitle sx={{ color: colors.text.primary, fontWeight: typography.weight.semibold }}>
          Upload Security Report
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <TextField
              label="Report Title"
              value={newReport.title}
              onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
              fullWidth
              sx={{
                '& .MuiInputLabel-root': { color: colors.text.secondary },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: colors.border.subtle },
                  '&:hover fieldset': { borderColor: colors.border.default },
                  '&.Mui-focused fieldset': { borderColor: colors.primary[500] },
                },
                '& .MuiInputBase-input': { color: colors.text.primary }
              }}
            />
            
            <FormControl fullWidth>
              <InputLabel sx={{ color: colors.text.secondary }}>Report Type</InputLabel>
              <Select
                value={newReport.type}
                onChange={(e) => setNewReport({ ...newReport, type: e.target.value })}
                sx={{
                  color: colors.text.primary,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.border.subtle },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.border.default },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.primary[500] },
                }}
              >
                {reportTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value} sx={{ color: colors.text.primary }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {type.icon}
                      {type.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="Description"
              value={newReport.description}
              onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
              sx={{
                '& .MuiInputLabel-root': { color: colors.text.secondary },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: colors.border.subtle },
                  '&:hover fieldset': { borderColor: colors.border.default },
                  '&.Mui-focused fieldset': { borderColor: colors.primary[500] },
                },
                '& .MuiInputBase-input': { color: colors.text.primary }
              }}
            />
            
            <Button
              variant="outlined"
              component="label"
              sx={{
                borderColor: colors.border.default,
                color: colors.text.secondary,
                '&:hover': {
                  borderColor: colors.primary[500],
                  color: colors.primary[500],
                  backgroundColor: 'rgba(6, 182, 212, 0.05)'
                }
              }}
            >
              {newReport.file ? newReport.file.name : 'Choose File'}
              <input
                type="file"
                hidden
                onChange={(e) => setNewReport({ ...newReport, file: e.target.files[0] })}
                accept=".pdf,.doc,.docx,.xls,.xlsx"
              />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setUploadDialogOpen(false)}
            sx={{ color: colors.text.secondary }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={uploading}
            sx={{
              background: `linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[700]} 100%)`,
              color: colors.gray[50],
              borderRadius: borderRadius.lg,
              textTransform: 'none',
              fontWeight: typography.weight.semibold
            }}
          >
            {uploading ? 'Uploading...' : 'Upload Report'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecurityReports;
