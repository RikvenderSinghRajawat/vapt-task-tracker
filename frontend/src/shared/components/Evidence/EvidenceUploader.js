import React, { useState, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  IconButton, 
  Button,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  GetApp as DownloadIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { colors, typography, borderRadius } from '../../../theme/designSystem';
import { formatFileSize } from '../../utils/formatters';

/**
 * EvidenceFile - Individual file display
 */
const EvidenceFile = ({ 
  file, 
  onDelete, 
  onPreview,
  uploading = false,
  progress = 0
}) => {
  const isImage = file.type?.startsWith('image/') || 
                  file.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPdf = file.type === 'application/pdf' || file.name?.endsWith('.pdf');

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: colors.background.tertiary,
        border: `1px solid ${colors.border.subtle}`,
        transition: 'all 0.2s ease'
      }}
    >
      {/* Preview Area */}
      <Box
        sx={{
          aspectRatio: isImage ? '16/9' : 'auto',
          minHeight: isImage ? 120 : 80,
          backgroundColor: isImage ? 'transparent' : colors.background.secondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        {isImage && file.preview ? (
          <img
            src={file.preview}
            alt={file.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <Box sx={{ textAlign: 'center', p: 2 }}>
            {isImage ? (
              <ImageIcon sx={{ fontSize: 40, color: colors.primary[400], mb: 1 }} />
            ) : (
              <FileIcon sx={{ fontSize: 40, color: colors.text.tertiary, mb: 1 }} />
            )}
            <Typography
              variant="caption"
              sx={{
                color: colors.text.tertiary,
                fontSize: typography.size.xs,
                display: 'block'
              }}
            >
              {isImage ? 'Image' : isPdf ? 'PDF' : 'File'}
            </Typography>
          </Box>
        )}

        {/* Overlay Actions */}
        {!uploading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              opacity: 0,
              transition: 'opacity 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              '&:hover': {
                opacity: 1
              }
            }}
          >
            {isImage && (
              <Tooltip title="Preview">
                <IconButton
                  size="small"
                  onClick={() => onPreview?.(file)}
                  sx={{ color: 'white' }}
                >
                  <ViewIcon />
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title="Download">
              <IconButton
                size="small"
                onClick={() => window.open(file.url || file.preview, '_blank')}
                sx={{ color: 'white' }}
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Delete">
              <IconButton
                size="small"
                onClick={() => onDelete?.(file)}
                sx={{ color: colors.severity.critical }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Upload Progress */}
        {uploading && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              p: 1,
              backgroundColor: 'rgba(0,0,0,0.7)'
            }}
          >
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 4,
                borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.2)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: colors.primary[500]
                }
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: 'white', fontSize: '0.625rem', mt: 0.5, display: 'block' }}
            >
              {progress}%
            </Typography>
          </Box>
        )}
      </Box>

      {/* File Info */}
      <Box sx={{ p: 1.5 }}>
        <Typography
          variant="body2"
          sx={{
            color: colors.text.primary,
            fontSize: typography.size.xs,
            fontWeight: typography.weight.medium,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={file.name}
        >
          {file.name}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: colors.text.tertiary, fontSize: '0.625rem' }}
        >
          {formatFileSize(file.size)}
          {file.uploadedAt && ` • ${formatFileSize(file.size)}`}
        </Typography>
      </Box>
    </Box>
  );
};

/**
 * EvidenceUploader - Drag & drop file upload component
 */
const EvidenceUploader = ({
  files = [],
  onFilesAdded,
  onFileDelete,
  onFilePreview,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['image/*', 'application/pdf', '.html', '.htm', '.log', '.txt'],
  uploading = false,
  uploadProgress = {}
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);

  const validateFile = (file) => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File ${file.name} is too large. Max size: ${formatFileSize(maxFileSize)}`;
    }

    // Check file count
    if (files.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed`;
    }

    return null;
  };

  const handleFiles = (fileList) => {
    setError(null);
    const newFiles = [];

    Array.from(fileList).forEach(file => {
      const error = validateFile(file);
      if (error) {
        setError(error);
        return;
      }

      // Create preview for images
      const isImage = file.type.startsWith('image/');
      const fileData = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        file: file, // Original file object
        preview: isImage ? URL.createObjectURL(file) : null,
        uploadedAt: new Date().toISOString()
      };

      newFiles.push(fileData);
    });

    if (newFiles.length > 0) {
      onFilesAdded?.(newFiles);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [files]);

  const handleFileInput = (e) => {
    handleFiles(e.target.files);
    e.target.value = ''; // Reset input
  };

  return (
    <Box>
      {/* Drop Zone */}
      <Box
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          border: `2px dashed ${isDragging ? colors.primary[500] : colors.border.default}`,
          borderRadius: borderRadius.xl,
          p: 4,
          textAlign: 'center',
          backgroundColor: isDragging ? 'rgba(6, 182, 212, 0.05)' : colors.background.secondary,
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
      >
        <input
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          style={{ display: 'none' }}
          id="evidence-upload"
        />
        <label htmlFor="evidence-upload" style={{ cursor: 'pointer' }}>
          <CloudUploadIcon
            sx={{
              fontSize: 48,
              color: isDragging ? colors.primary[500] : colors.text.tertiary,
              mb: 2
            }}
          />
          <Typography
            variant="h6"
            sx={{
              color: isDragging ? colors.primary[400] : colors.text.secondary,
              fontWeight: typography.weight.medium,
              mb: 1
            }}
          >
            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: colors.text.tertiary, mb: 2 }}
          >
            or click to browse
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: colors.text.tertiary, display: 'block' }}
          >
            Max {maxFiles} files • Up to {formatFileSize(maxFileSize)} each
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: colors.text.tertiary, display: 'block', mt: 0.5 }}
          >
            Supported: Images, PDF, HTML, Logs, Text files
          </Typography>
        </label>
      </Box>

      {/* Error Message */}
      {error && (
        <Typography
          variant="body2"
          sx={{
            color: colors.severity.critical,
            mt: 2,
            textAlign: 'center'
          }}
        >
          {error}
        </Typography>
      )}

      {/* File Count */}
      {files.length > 0 && (
        <Typography
          variant="body2"
          sx={{
            color: colors.text.secondary,
            mt: 2,
            mb: 2
          }}
        >
          {files.length} of {maxFiles} files
        </Typography>
      )}

      {/* Files Grid */}
      {files.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 2
          }}
        >
          {files.map((file) => (
            <EvidenceFile
              key={file.id}
              file={file}
              onDelete={onFileDelete}
              onPreview={onFilePreview}
              uploading={uploading}
              progress={uploadProgress[file.id] || 0}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default EvidenceUploader;
