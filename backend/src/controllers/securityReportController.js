const SecurityReport = require('../models/SecurityReport');
const AuditLog = require('../models/AuditLog');
const { getStoragePaths, buildFileUrl } = require('../config/storage');
const { createUploader } = require('../config/upload');

const fs = require('fs');
const path = require('path');

const storagePaths = getStoragePaths();

exports.getReports = async (req, res, next) => {
  try {
    const reports = await SecurityReport.find({ deletedAt: null })
      .sort('-createdAt')
      .populate('uploadedBy', 'name email')
      .lean();

    const data = reports.map(r => ({
      id: r._id?.toString(),
      title: r.title,
      type: r.type,
      description: r.description,
      fileType: r.fileType,
      fileName: r.fileName,
      fileUrl: r.fileUrl,
      createdAt: r.createdAt,
      uploadedBy: r.uploadedByEmail || r.uploadedBy?.email || '',
    }));

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

exports.uploadReport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const report = await SecurityReport.create({
      title: req.body.title,
      type: req.body.type,
      description: req.body.description || '',
      uploadedBy: req.user._id,
      uploadedByEmail: req.user.email,
      fileType: req.file.mimetype,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileUrl: buildFileUrl('reports', req.file.filename),
    });

    await AuditLog.create({
      user: req.user._id,
      action: 'upload_security_report',
      entityType: 'security_report',
      entityId: report._id.toString(),
      entityName: report.title,
      status: 'success',
    });

    res.status(201).json({
      success: true,
      message: 'Security report uploaded successfully',
      data: { id: report._id.toString(), title: report.title, type: report.type, fileName: report.fileName, fileUrl: report.fileUrl, createdAt: report.createdAt, uploadedBy: req.user.email },
    });
  } catch (error) {
    next(error);
  }
};

exports.downloadReport = async (req, res, next) => {
  try {
    const report = await SecurityReport.findOne({ _id: req.params.id, deletedAt: null });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    if (!report.filePath || !fs.existsSync(report.filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on disk' });
    }

    res.download(report.filePath, report.fileName);
  } catch (error) {
    next(error);
  }
};

exports.deleteReport = async (req, res, next) => {
  try {
    const report = await SecurityReport.findOne({ _id: req.params.id, deletedAt: null });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    report.deletedAt = new Date();
    report.deletedBy = req.user._id;
    await report.save();

    if (report.filePath && fs.existsSync(report.filePath)) {
      fs.unlinkSync(report.filePath);
    }

    await AuditLog.create({
      user: req.user._id,
      action: 'delete_security_report',
      entityType: 'security_report',
      entityId: report._id.toString(),
      entityName: report.title,
      status: 'success',
    });

    res.status(200).json({ success: true, message: 'Security report deleted' });
  } catch (error) {
    next(error);
  }
};

const upload = createUploader('reports');

exports.upload = upload.single('file');
