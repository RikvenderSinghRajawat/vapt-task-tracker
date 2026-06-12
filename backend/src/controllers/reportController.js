const Report = require('../models/Report');
const Project = require('../models/Project');
const Finding = require('../models/Finding');
const AuditLog = require('../models/AuditLog');
const path = require('path');
const fs = require('fs');

const { getStoragePaths, buildFileUrl } = require('../config/storage');
const storagePaths = getStoragePaths();

const { createUploader } = require('../config/upload');
const upload = createUploader('reports');

// Helper to determine what formats a report can be converted to
function getAvailableFormats(originalFormat) {
  if (originalFormat === 'json') return ['html', 'pdf'];
  if (originalFormat === 'html') return ['pdf'];
  return [];
}

// @desc    Get all reports
// @route   GET /api/projects/:projectId/reports
// @access  Private
exports.getReports = async (req, res, next) => {
  try {
    const { type, status } = req.query;

    const query = { project: req.params.projectId, deletedAt: null };

    if (type) query.type = type;
    if (status) query.status = status;

    const reports = await Report.find(query)
      .populate('uploadedBy', 'name email avatar')
      .populate('reviewedBy.user', 'name email')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single report
// @route   GET /api/projects/:projectId/reports/:id
// @access  Private
exports.getReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('uploadedBy', 'name email avatar')
      .populate('reviewedBy.user', 'name email')
      .populate('findingsIncluded');

    if (!report || report.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new report
// @route   POST /api/projects/:projectId/reports
// @access  Private
exports.createReport = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const reportData = {
      ...req.body,
      project: req.params.projectId,
      uploadedBy: req.user._id
    };

    const report = await Report.create(reportData);

    await AuditLog.create({
      user: req.user._id,
      action: 'create_report',
      entityType: 'report',
      entityId: report._id.toString(),
      entityName: report.name,
      details: { project: project.name, type: report.type },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload report file
// @route   POST /api/projects/:projectId/reports/:id/upload
// @access  Private
exports.uploadReportFile = [
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const report = await Report.findById(req.params.id);
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      // Build file URL relative to storage root
      const fileUrl = buildFileUrl('reports', req.file.filename);

      const fileMetadata = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        filePath: req.file.path,
        fileUrl: fileUrl,
        storageType: 'local'
      };

      // Populate format metadata for frontend download-button logic
      const format = detectFormatFromMime(req.file.mimetype, req.file.originalname);
      fileMetadata.format = format;

      // Store in files[] array — replace existing entry of same format or append
      const existingIdx = (report.files || []).findIndex(f => f.format === format);
      if (existingIdx >= 0) {
        report.files[existingIdx] = fileMetadata;
      } else {
        if (!report.files) report.files = [];
        report.files.push(fileMetadata);
      }

      // Keep legacy `file` field in sync (points to latest upload)
      report.file = fileMetadata;
      report.status = report.status === 'draft' ? 'in_review' : report.status;

      await report.save();

      await AuditLog.create({
        user: req.user._id,
        action: 'upload_file',
        entityType: 'report',
        entityId: report._id.toString(),
        entityName: report.name,
        details: { filename: req.file.originalname, size: req.file.size },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });

      res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        data: report
      });
    } catch (error) {
      next(error);
    }
  }
];

// @desc    Update report
// @route   PUT /api/projects/:projectId/reports/:id
// @access  Private
exports.updateReport = async (req, res, next) => {
  try {
    let report = await Report.findById(req.params.id);

    if (!report || report.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check access
    if (req.user.role !== 'admin' && req.user.role !== 'vapt_analyst' && req.user.role !== 'vapt_tl' &&
        report.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this report'
      });
    }

    report = await Report.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    await AuditLog.create({
      user: req.user._id,
      action: 'update_report',
      entityType: 'report',
      entityId: report._id.toString(),
      entityName: report.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete report
// @route   DELETE /api/projects/:projectId/reports/:id
// @access  Private
exports.deleteReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report || report.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Delete file from storage
    if (report.file && report.file.filename) {
      const filePath = path.join(storagePaths.reports, report.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Soft delete
    report.deletedAt = Date.now();
    report.deletedBy = req.user._id;
    await report.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'delete_report',
      entityType: 'report',
      entityId: report._id.toString(),
      entityName: report.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download report file
// @route   GET /api/projects/:projectId/reports/:id/download
// @access  Private
exports.downloadReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report || report.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const requestedFormat = req.query.format || 'original';

    // Find the file entry: if a format is requested, look in files[]; fall back to report.file
    let fileEntry = null;
    if (requestedFormat !== 'original') {
      fileEntry = (report.files || []).find(f => f.format === requestedFormat);
    }
    if (!fileEntry) {
      fileEntry = report.file || (report.files && report.files.length > 0 ? report.files[0] : null);
    }

    if (!fileEntry || !fileEntry.filename) {
      return res.status(404).json({
        success: false,
        message: 'No file attached to this report'
      });
    }

    const filePath = path.join(storagePaths.reports, fileEntry.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    const displayName = fileEntry.originalName || `report.${fileEntry.format || 'bin'}`;
    res.setHeader('Content-Type', fileEntry.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(displayName)}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    return res.download(filePath, displayName);

  } catch (error) {
    console.error('Error in downloadReport:', error);
    next(error);
  }
};

// @desc    Add review to report
// @route   POST /api/projects/:projectId/reports/:id/review
// @access  Private
exports.addReview = async (req, res, next) => {
  try {
    const { status, comments } = req.body;

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    report.reviewedBy.push({
      user: req.user._id,
      reviewedAt: Date.now(),
      comments,
      status
    });

    // Update report status based on reviews
    const approvedCount = report.reviewedBy.filter(r => r.status === 'approved').length;
    const rejectedCount = report.reviewedBy.filter(r => r.status === 'rejected').length;

    if (rejectedCount > 0) {
      report.status = 'in_review';
    } else if (approvedCount >= 2) {
      report.status = 'approved';
    }

    await report.save();

    res.status(200).json({
      success: true,
      message: 'Review added successfully',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// Detect report format from MIME type and/or filename
function detectFormatFromMime(mimeType, fileName) {
  if (!mimeType && !fileName) return 'unknown';
  const mime = String(mimeType || '').toLowerCase().trim();
  const name = String(fileName || '').toLowerCase();
  
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (mime === 'application/json' || name.endsWith('.json')) return 'json';
  if (mime === 'text/html' || name.endsWith('.html') || name.endsWith('.htm')) return 'html';
  return 'unknown';
}

module.exports = { ...exports, upload, detectFormatFromMime, getAvailableFormats };