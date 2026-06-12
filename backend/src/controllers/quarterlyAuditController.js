const QuarterlyAudit = require('../models/QuarterlyAudit');
const AuditLog = require('../models/AuditLog');
const { getStoragePaths, buildFileUrl } = require('../config/storage');

const fs = require('fs');
const path = require('path');

const storagePaths = getStoragePaths();

exports.getAudits = async (req, res, next) => {
  try {
    const audits = await QuarterlyAudit.find({ deletedAt: null })
      .sort('-createdAt')
      .lean();

    const data = audits.map(a => ({
      id: a._id?.toString(),
      title: a.title,
      type: a.type,
      quarter: a.quarter,
      year: a.year,
      description: a.description,
      fileType: a.fileType,
      fileName: a.fileName,
      fileUrl: a.fileUrl,
      filePath: a.filePath,
      base64Content: a.base64Content,
      createdAt: a.createdAt,
      uploadedBy: a.uploadedByEmail || a.uploadedBy?.email || '',
      uploadedById: a.uploadedById || a.uploadedBy?.toString?.() || ''
    }));

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

exports.getAudit = async (req, res, next) => {
  try {
    const audit = await QuarterlyAudit.findOne({ _id: req.params.id, deletedAt: null }).lean();
    if (!audit) {
      return res.status(404).json({ success: false, message: 'Audit not found' });
    }
    res.status(200).json({
      success: true,
      data: {
        id: audit._id?.toString(),
        title: audit.title,
        type: audit.type,
        quarter: audit.quarter,
        year: audit.year,
        description: audit.description,
        fileType: audit.fileType,
        fileName: audit.fileName,
        fileUrl: audit.fileUrl,
        filePath: audit.filePath,
        base64Content: audit.base64Content,
        createdAt: audit.createdAt,
        uploadedBy: audit.uploadedByEmail || '',
        uploadedById: audit.uploadedById || ''
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadAudit = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Audit file is required' });
    }

    const { title, type, quarter, year, description } = req.body;

    if (!title || !type || !quarter || !year) {
      return res.status(400).json({ success: false, message: 'Missing required fields (title, type, quarter, year)' });
    }

    const userId = req.user?._id;
    const userEmail = req.user?.email || '';

    const filePath = req.file.path;
    const fileUrl = buildFileUrl('audits', req.file.filename);

    const audit = await QuarterlyAudit.create({
      title,
      type,
      quarter,
      year,
      description: description || '',
      uploadedBy: userId,
      uploadedByEmail: userEmail,
      uploadedById: userId?.toString?.() || '',
      fileType: req.file.mimetype || 'application/pdf',
      fileName: req.file.originalname || 'audit-file',
      filePath,
      fileUrl
    });

    await AuditLog.create({
      user: userId,
      action: 'upload_quarterly_audit',
      entityType: 'quarterly_audit',
      entityId: audit._id.toString(),
      entityName: audit.title,
      details: { fileName: audit.fileName, fileType: audit.fileType },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(201).json({ success: true, message: 'Audit uploaded successfully', data: audit });
  } catch (error) {
    next(error);
  }
};

exports.deleteAudit = async (req, res, next) => {
  try {
    if (!['admin', 'vapt_analyst', 'vapt_tl'].includes(req.user?.role) &&
        req.user?._id?.toString() !== (req.body?.uploadedById || '')) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete audits' });
    }

    const audit = await QuarterlyAudit.findOne({ _id: req.params.id, deletedAt: null });
    if (!audit) {
      return res.status(404).json({ success: false, message: 'Audit not found' });
    }

    audit.deletedAt = Date.now();
    audit.deletedBy = req.user?._id;
    await audit.save();

    try {
      if (audit.filePath && fs.existsSync(audit.filePath)) {
        fs.unlinkSync(audit.filePath);
      }
    } catch (e) {}

    await AuditLog.create({
      user: req.user?._id,
      action: 'delete_quarterly_audit',
      entityType: 'quarterly_audit',
      entityId: audit._id.toString(),
      entityName: audit.title,
      details: {},
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(200).json({ success: true, message: 'Audit deleted successfully' });
  } catch (error) {
    next(error);
  }
};
