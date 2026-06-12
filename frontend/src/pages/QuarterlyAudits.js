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
  Visibility as ViewIcon,
  Description as FileIcon,
  Add as AddIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { quarterlyAuditAPI } from '../services/api';
import { API_BASE_URL } from '../config/apiBaseResolver';
import { colors, typography, borderRadius, shadows } from '../theme/designSystem';

const QuarterlyAudits = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast, showConfirm } = useToast();
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  
  const [newAudit, setNewAudit] = useState({
    title: '',
    type: 'Firewall',
    quarter: 'Q1',
    year: new Date().getFullYear().toString(),
    description: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    setLoading(true);
    try {
      const data = await quarterlyAuditAPI.getAudits();
      setAudits(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      setError('Failed to fetch audit reports');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!newAudit.title || !selectedFile) {
      setError('Please provide a title and select a file');
      return;
    }

    setUploading(true);
    setError(null);
    try {
       await quarterlyAuditAPI.uploadAudit({
         ...newAudit,
         uploadedBy: user.id,
         uploadedById: user.uid
       }, selectedFile);
      
      setUploadDialogOpen(false);
      setNewAudit({
        title: '',
        type: 'Firewall',
        quarter: 'Q1',
        year: new Date().getFullYear().toString(),
        description: ''
      });
      setSelectedFile(null);
      fetchAudits();
    } catch (err) {
      setError('Upload failed');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!await showConfirm({
      title: 'Delete Audit Report',
      message: 'Are you sure you want to delete this audit report? This action cannot be undone.',
      severity: 'warning',
      confirmLabel: 'Delete',
    })) {
      return;
    }
    try {
      await quarterlyAuditAPI.deleteAudit(id);
      fetchAudits();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleView = (audit) => {
    const apiOrigin = API_BASE_URL.startsWith('http')
      ? API_BASE_URL.replace(/\/api$/, '')
      : window.location.origin;
    const resolveUrl = (filePath) => {
      if (!filePath) return null;
      if (filePath.startsWith('http')) return filePath;
      return `${apiOrigin}${filePath}`;
    };

    const fileUrl = resolveUrl(audit.fileUrl);
    if (fileUrl) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    } else if (audit.base64Content) {
      const linkSource = `data:${audit.fileType};base64,${audit.base64Content}`;
      window.open(linkSource, '_blank', 'noopener,noreferrer');
    } else {
      setError('File URL not available to view this audit');
    }
  };

  const handleDownload = async (audit) => {
    const apiOrigin = API_BASE_URL.startsWith('http')
      ? API_BASE_URL.replace(/\/api$/, '')
      : window.location.origin;
    const resolveUrl = (filePath) => {
      if (!filePath) return null;
      if (filePath.startsWith('http')) return filePath;
      return `${apiOrigin}${filePath}`;
    };

    const fileUrl = resolveUrl(audit.fileUrl);
    if (fileUrl) {
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Download failed');
        const blob = await response.blob();
        const disposition = response.headers.get('Content-Disposition');
        let fileName = audit.fileName || 'audit-file';
        if (disposition) {
          const match = disposition.match(/filename=(["']?)([^"'\s]+)\1/);
          if (match) fileName = match[2];
        }
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        setError('Failed to download file');
        console.error('Download error:', err);
      }
    } else if (audit.base64Content) {
      // Fallback for legacy audits stored as base64
      const linkSource = `data:${audit.fileType};base64,${audit.base64Content}`;
      const downloadLink = document.createElement('a');
      downloadLink.href = linkSource;
      downloadLink.download = audit.fileName || 'audit-file';
      downloadLink.click();
    } else {
      setError('Download URL not available for this audit');
    }
  };

  const auditTypes = ['Firewall', 'AD Server', 'Network', 'Compliance', 'Other'];
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const years = [
    (new Date().getFullYear() - 1).toString(),
    new Date().getFullYear().toString(),
    (new Date().getFullYear() + 1).toString()
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ color: colors.text.secondary }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" sx={{ color: colors.text.primary, fontWeight: typography.weight.bold }}>
            Compliance Vault
          </Typography>
          <Typography variant="body2" sx={{ color: colors.text.secondary }}>
            Manage and access firewall, AD server, and other security infrastructure audits
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setUploadDialogOpen(true)}
          sx={{
            background: `linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[700]} 100%)`,
            borderRadius: borderRadius.lg,
            textTransform: 'none',
            fontWeight: typography.weight.semibold,
            boxShadow: shadows.md
          }}
        >
          Upload Audit
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <TableContainer component={Paper} sx={{ 
        background: colors.background.secondary,
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: borderRadius.xl,
        boxShadow: shadows.sm
      }}>
        <Table>
          <TableHead>
            <TableRow sx={{ borderBottom: `2px solid ${colors.border.subtle}` }}>
              <TableCell sx={{ color: colors.text.secondary, fontWeight: typography.weight.semibold }}>Audit Title</TableCell>
              <TableCell sx={{ color: colors.text.secondary, fontWeight: typography.weight.semibold }}>Type</TableCell>
              <TableCell sx={{ color: colors.text.secondary, fontWeight: typography.weight.semibold }}>Period</TableCell>
              <TableCell sx={{ color: colors.text.secondary, fontWeight: typography.weight.semibold }}>Uploaded By</TableCell>
              <TableCell sx={{ color: colors.text.secondary, fontWeight: typography.weight.semibold }}>Date</TableCell>
              <TableCell align="right" sx={{ color: colors.text.secondary, fontWeight: typography.weight.semibold }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {audits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <Typography variant="body1" sx={{ color: colors.text.secondary }}>
                    No audit reports found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              audits.map((audit) => (
                <TableRow key={audit.id} sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <FileIcon sx={{ color: colors.primary[400] }} />
                      <Box>
                        <Typography variant="body1" sx={{ color: colors.text.primary, fontWeight: typography.weight.medium }}>
                          {audit.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.text.secondary }}>
                          {audit.fileName}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={audit.type} 
                      size="small"
                      sx={{ 
                        backgroundColor: `${colors.primary[500]}20`, 
                        color: colors.primary[400],
                        fontWeight: typography.weight.medium
                      }} 
                    />
                  </TableCell>
                  <TableCell sx={{ color: colors.text.primary }}>
                    {audit.quarter} {audit.year}
                  </TableCell>
                  <TableCell sx={{ color: colors.text.primary }}>
                    {audit.uploadedBy}
                  </TableCell>
                  <TableCell sx={{ color: colors.text.secondary }}>
                    {new Date(audit.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton onClick={() => handleView(audit)} sx={{ color: colors.primary[400] }}>
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download">
                      <IconButton onClick={() => handleDownload(audit)} sx={{ color: colors.primary[400] }}>
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                    {(user.role === 'admin' || user.role === 'vapt_analyst' || user.role === 'vapt_tl' || user.uid === audit.uploadedById) && (
                      <Tooltip title="Delete">
                        <IconButton onClick={() => handleDelete(audit.id)} sx={{ color: colors.severity.critical }}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Upload Dialog */}
      <Dialog 
        open={uploadDialogOpen} 
        onClose={() => !uploading && setUploadDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: colors.background.secondary,
            backgroundImage: 'none',
            borderRadius: borderRadius.xl,
            border: `1px solid ${colors.border.subtle}`,
            minWidth: 450
          }
        }}
      >
        <DialogTitle sx={{ color: colors.text.primary, fontWeight: typography.weight.bold }}>
          Upload Compliance Document
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField
              fullWidth
              label="Document Title"
              value={newAudit.title}
              onChange={(e) => setNewAudit({ ...newAudit, title: e.target.value })}
              variant="outlined"
              sx={{ 
                '& .MuiInputBase-input': { color: colors.text.primary },
                '& .MuiInputLabel-root': { color: colors.text.secondary },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: colors.border.default },
                  '&:hover fieldset': { borderColor: colors.primary[400] },
                }
              }}
            />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth sx={{ 
                  '& .MuiInputLabel-root': { color: colors.text.secondary },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: colors.border.default },
                    '&:hover fieldset': { borderColor: colors.primary[400] },
                  }
                }}>
                  <InputLabel>Audit Type</InputLabel>
                  <Select
                    value={newAudit.type}
                    label="Audit Type"
                    onChange={(e) => setNewAudit({ ...newAudit, type: e.target.value })}
                    sx={{ color: colors.text.primary }}
                  >
                    {auditTypes.map(type => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={3}>
                <FormControl fullWidth sx={{ 
                  '& .MuiInputLabel-root': { color: colors.text.secondary },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: colors.border.default },
                    '&:hover fieldset': { borderColor: colors.primary[400] },
                  }
                }}>
                  <InputLabel>Quarter</InputLabel>
                  <Select
                    value={newAudit.quarter}
                    label="Quarter"
                    onChange={(e) => setNewAudit({ ...newAudit, quarter: e.target.value })}
                    sx={{ color: colors.text.primary }}
                  >
                    {quarters.map(q => (
                      <MenuItem key={q} value={q}>{q}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={3}>
                <FormControl fullWidth sx={{ 
                  '& .MuiInputLabel-root': { color: colors.text.secondary },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: colors.border.default },
                    '&:hover fieldset': { borderColor: colors.primary[400] },
                  }
                }}>
                  <InputLabel>Year</InputLabel>
                  <Select
                    value={newAudit.year}
                    label="Year"
                    onChange={(e) => setNewAudit({ ...newAudit, year: e.target.value })}
                    sx={{ color: colors.text.primary }}
                  >
                    {years.map(y => (
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Description (Optional)"
              multiline
              rows={3}
              value={newAudit.description}
              onChange={(e) => setNewAudit({ ...newAudit, description: e.target.value })}
              sx={{ 
                '& .MuiInputBase-input': { color: colors.text.primary },
                '& .MuiInputLabel-root': { color: colors.text.secondary },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: colors.border.default },
                  '&:hover fieldset': { borderColor: colors.primary[400] },
                }
              }}
            />

            <Box 
              sx={{ 
                border: `2px dashed ${colors.border.default}`, 
                borderRadius: borderRadius.lg,
                p: 3,
                textAlign: 'center',
                backgroundColor: 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: colors.primary[400] }
              }}
              onClick={() => document.getElementById('audit-file-upload').click()}
            >
              <input
                type="file"
                id="audit-file-upload"
                hidden
                onChange={handleFileChange}
              />
              <UploadIcon sx={{ fontSize: 40, color: colors.text.secondary, mb: 1 }} />
              <Typography variant="body2" sx={{ color: colors.text.primary }}>
                {selectedFile ? selectedFile.name : 'Click to select audit report file'}
              </Typography>
              <Typography variant="caption" sx={{ color: colors.text.secondary }}>
                PDF, HTML, or DOCX preferred
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setUploadDialogOpen(false)} 
            sx={{ color: colors.text.secondary }}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={uploading || !newAudit.title || !selectedFile}
            sx={{
              background: `linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[700]} 100%)`,
              textTransform: 'none',
              fontWeight: typography.weight.semibold,
              minWidth: 100
            }}
          >
            {uploading ? <CircularProgress size={24} color="inherit" /> : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuarterlyAudits;
