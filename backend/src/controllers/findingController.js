const Finding = require('../models/Finding');
const Project = require('../models/Project');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { applySlaFields } = require('../services/slaService');
const { findingScope, hasGlobalAccess } = require('../utils/rbac');
const { cvssToSeverity, severityFromBody, isActiveStatus } = require('../utils/severity');

// Broadcast helper: emits real-time finding-update events via Socket.IO
const broadcastFindingUpdate = (finding, projectId, action, actorUserId) => {
  try {
    const io = require('../config/socket').getIO();

    // Emit to assignee's user room
    if (finding.assignee) {
      io.to(`user:${finding.assignee}`).emit('finding_updated', {
        findingId: finding._id,
        action,
        projectId,
        updatedBy: actorUserId,
        timestamp: Date.now()
      });
    }

    // Emit to assigned developers' user rooms
    if (finding.assignedDevelopers && finding.assignedDevelopers.length > 0) {
      finding.assignedDevelopers.forEach(devId => {
        if (devId.toString() !== (finding.assignee || '').toString()) {
          io.to(`user:${devId}`).emit('finding_updated', {
            findingId: finding._id,
            action,
            projectId,
            updatedBy: actorUserId,
            timestamp: Date.now()
          });
        }
      });
    }

    // Emit to project room for project-wide updates
    io.to(`project:${projectId}`).emit('finding_updated', {
      findingId: finding._id,
      action,
      projectId,
      updatedBy: actorUserId,
      timestamp: Date.now()
    });

    // Emit to actor's user room for confirmation
    io.to(`user:${actorUserId}`).emit('finding_updated', {
      findingId: finding._id,
      action,
      projectId,
      updatedBy: actorUserId,
      timestamp: Date.now()
    });
  } catch (_) { /* io not available during tests */ }
};

// @desc    Get all findings
// @route   GET /api/projects/:projectId/findings
// @access  Private
exports.getFindings = async (req, res, next) => {
  try {
    const { severity, status, assignee, search } = req.query;

    // checkProjectAccess middleware already verified user is allocated to this project
    // Any user who passed that check gets to see ALL findings in the project
    let query = { project: req.params.projectId };

    // Exclude soft-deleted findings
    query.deletedAt = null;

    // Apply additional filters
    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (assignee) query.assignee = assignee;
    if (search) {
      const searchOr = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const findings = await Finding.find(query)
      .populate('assignee', 'name email avatar')
      .populate('project', 'name code client organization')
      .populate('reviewer', 'name email')
      .populate('closedBy', 'name email')
      .populate('verifiedBy', 'name email')
      .populate('assignedDevelopers', 'name email avatar')
      .sort('-createdAt');

    const project = await Project.findById(req.params.projectId);
    for (const finding of findings) {
      const updatedSla = applySlaFields(finding.toJSON ? finding.toJSON() : finding);
      if (updatedSla.sla_status !== finding.sla_status) {
        finding.sla_status = updatedSla.sla_status;
        finding.sla_deadline = updatedSla.sla_deadline;
        await finding.save();
      }


    }

    res.status(200).json({
      success: true,
      count: findings.length,
      data: findings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single finding
// @route   GET /api/projects/:projectId/findings/:id
// @access  Private
exports.getFinding = async (req, res, next) => {
  try {
    // checkProjectAccess middleware already verified access to this project
    // Simply find by ID and project, no additional scope filtering needed
    const finding = await Finding.findOne({ _id: req.params.id, project: req.params.projectId, deletedAt: null })
      .populate('assignee', 'name email avatar')
      .populate('reviewer', 'name email')
      .populate('closedBy', 'name email')
      .populate('verifiedBy', 'name email')
      .populate('comments.user', 'name email avatar role');

    if (!finding || finding.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Finding not found'
      });
    }

    res.status(200).json({
      success: true,
      data: finding
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new finding
// @route   POST /api/projects/:projectId/findings
// @access  Private
exports.createFinding = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (req.user.role === 'developer' || req.user.role === 'business_analyst' || req.user.role === 'read_only') {
      return res.status(403).json({ success: false, message: 'Not authorized to create findings' });
    }

     const findingBody = { ...req.body };
     findingBody.severity = severityFromBody(findingBody);

     const findingData = {
       ...applySlaFields(findingBody),
       project: req.params.projectId,
       createdBy: req.user._id,
       assignedBy: req.user._id
     };

     // Convert email to ObjectId for assignee if provided
     if (findingData.assignee && typeof findingData.assignee === 'string' && findingData.assignee.includes('@')) {
       const assigneeUser = await User.findOne({ email: findingData.assignee }).select('_id');
       if (!assigneeUser) {
         return res.status(400).json({
           success: false,
           message: `Invalid assignee: ${findingData.assignee}`
         });
       }
       findingData.assignee = assigneeUser._id;
     }

     // Convert emails to ObjectIds for assignedDevelopers if provided
     if (findingData.assignedDevelopers && Array.isArray(findingData.assignedDevelopers)) {
       const convertedDevelopers = [];
       for (const dev of findingData.assignedDevelopers) {
         if (typeof dev === 'string' && dev.includes('@')) {
           const devUser = await User.findOne({ email: dev }).select('_id');
           if (!devUser) {
             return res.status(400).json({
               success: false,
               message: `Invalid developer: ${dev}`
             });
           }
           convertedDevelopers.push(devUser._id);
         } else {
           convertedDevelopers.push(dev);
         }
       }
       findingData.assignedDevelopers = convertedDevelopers;
     }

     const finding = await Finding.create(findingData);

    // Add to project history
    project.versions.push({
      version: project.versions.length + 0.1,
      date: new Date(),
      status: `New finding: ${finding.title}`,
      type: 'other',
      createdBy: req.user._id
    });
    await project.save();

    // Notify assignee if assigned
    if (finding.assignee && finding.assignee.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: finding.assignee,
        type: 'finding_assigned',
        title: 'New Finding Assigned',
        message: `You have been assigned to finding: ${finding.title}`,
        priority: finding.severity === 'critical' ? 'urgent' : 'normal',
        relatedEntity: { type: 'finding', id: finding._id },
        actionUrl: `/projects/${req.params.projectId}/findings/${finding._id}`,
        redirectUrl: `/projects/${req.params.projectId}/findings/${finding._id}`,
        entityType: 'finding',
        entityId: finding._id.toString(),
        deliveryMethods: { inApp: true, email: false }
      });
    }

    // Emit real-time update for finding creation
    broadcastFindingUpdate(finding, req.params.projectId, 'created', req.user._id);

    await AuditLog.create({
      user: req.user._id,
      action: 'create_finding',
      entityType: 'finding',
      entityId: finding._id.toString(),
      entityName: finding.title,
      details: { project: project.name, severity: finding.severity },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(201).json({
      success: true,
      message: 'Finding created successfully',
      data: finding
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update finding
// @route   PUT /api/projects/:projectId/findings/:id
// @access  Private
exports.updateFinding = async (req, res, next) => {
  try {
    let finding = await Finding.findById(req.params.id);

    if (!finding || finding.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Finding not found'
      });
    }

    // Check access - VAPT analysts, PM, assignee, or assigned developers can update.
    const project = await Project.findById(finding.project);
    const canEdit = hasGlobalAccess(req.user) ||
                    finding.assignee?.toString() === req.user._id.toString() ||
                    (finding.assignedDevelopers || []).some(id => id.toString() === req.user._id.toString()) ||
                    project.manager?.toString() === req.user._id.toString() ||
                    (req.user.role === 'project_manager' && (req.user.allocatedProjects || []).some(id => id.toString() === finding.project.toString()));

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this finding'
      });
    }

    const changes = [];
    const trackChange = (field, newValue) => {
      // eslint-disable-next-line security/detect-object-injection -- field is always a literal from hardcoded callers
      if (JSON.stringify(finding[field]) !== JSON.stringify(newValue)) {
        // eslint-disable-next-line security/detect-object-injection -- field is always a literal from hardcoded callers
        changes.push({ field, oldValue: finding[field], newValue });
      }
    };

    // Helper function to convert email to ObjectId if needed
    const convertEmailToId = async (value) => {
      if (typeof value === 'string' && value.includes('@')) {
        const user = await User.findOne({ email: value }).select('_id');
        if (!user) {
          throw new Error(`Invalid user: ${value}`);
        }
        return user._id;
      }
      return value;
    };

    // Handle assignee (single user)
    if (req.body.assignee !== undefined) {
      const convertedAssignee = await convertEmailToId(req.body.assignee);
      trackChange('assignee', convertedAssignee);
      if (convertedAssignee) {
        finding.assignedBy = req.user._id;
      }
      req.body.assignee = convertedAssignee;
    }

    // Handle assignedDevelopers (array of users)
    if (req.body.assignedDevelopers !== undefined) {
      const convertedDevelopers = [];
      for (const dev of req.body.assignedDevelopers) {
        const convertedDev = await convertEmailToId(dev);
        convertedDevelopers.push(convertedDev);
      }
      trackChange('assignedDevelopers', convertedDevelopers);
      req.body.assignedDevelopers = convertedDevelopers;
    }

    // Handle assignedBy (single user)
    if (req.body.assignedBy !== undefined) {
      const convertedAssignedBy = await convertEmailToId(req.body.assignedBy);
      trackChange('assignedBy', convertedAssignedBy);
      req.body.assignedBy = convertedAssignedBy;
    }

    // Handle escalationOwner (single user)
    if (req.body.escalationOwner !== undefined) {
      const convertedEscalationOwner = await convertEmailToId(req.body.escalationOwner);
      trackChange('escalationOwner', convertedEscalationOwner);
      req.body.escalationOwner = convertedEscalationOwner;
    }

    // Handle reviewer (single user)
    if (req.body.reviewer !== undefined) {
      const convertedReviewer = await convertEmailToId(req.body.reviewer);
      trackChange('reviewer', convertedReviewer);
      req.body.reviewer = convertedReviewer;
    }

    if (req.body.cvssScore !== undefined || (req.body.cvss && req.body.cvss.score !== undefined)) {
      req.body.severity = severityFromBody(req.body);
    }

    if (req.body.title) trackChange('title', req.body.title);
    if (req.body.severity) trackChange('severity', req.body.severity);
    if (req.body.cvssScore) trackChange('cvssScore', req.body.cvssScore);
    if (req.body.status) trackChange('status', req.body.status);
    if (req.body.description) trackChange('description', req.body.description);
    if (req.body.category) trackChange('category', req.body.category);
    if (req.body.location) trackChange('location', req.body.location);
    if (req.body.url) trackChange('url', req.body.url);
    if (req.body.method) trackChange('method', req.body.method);
    if (req.body.parameter) trackChange('parameter', req.body.parameter);
    if (req.body.payload) trackChange('payload', req.body.payload);
    if (req.body.impact) trackChange('impact', req.body.impact);
    if (req.body.likelihood) trackChange('likelihood', req.body.likelihood);
    if (req.body.risk) trackChange('risk', req.body.risk);
    if (req.body.remediation) trackChange('remediation', req.body.remediation);
    if (req.body.remediationComplexity) trackChange('remediationComplexity', req.body.remediationComplexity);
    if (req.body.timeToFix !== undefined) trackChange('timeToFix', req.body.timeToFix);
    if (req.body.dueDate) trackChange('dueDate', req.body.dueDate);
    if (req.body.sla_deadline) trackChange('sla_deadline', req.body.sla_deadline);
    if (req.body.sla_status) trackChange('sla_status', req.body.sla_status);
    if (req.body.estimatedCost !== undefined) trackChange('estimatedCost', req.body.estimatedCost);
    if (req.body.actualCost !== undefined) trackChange('actualCost', req.body.actualCost);
    if (req.body.evidence !== undefined) trackChange('evidence', req.body.evidence);
    if (req.body.attachments !== undefined) trackChange('attachments', req.body.attachments);
    if (req.body.tags !== undefined) trackChange('tags', req.body.tags);
    if (req.body.falsePositive !== undefined) trackChange('falsePositive', req.body.falsePositive);
    if (req.body.falsePositiveReason) trackChange('falsePositiveReason', req.body.falsePositiveReason);

    finding = await Finding.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    finding.updatedBy = req.user._id;
    await finding.save();

    // Add to history
    finding.history.push({
      action: 'update_finding',
      changes,
      performedBy: req.user._id,
      performedAt: Date.now()
    });
    await finding.save();

    // Emit real-time update for finding update
    broadcastFindingUpdate(finding, finding.project.toString(), 'updated', req.user._id);

    if (changes.length > 0) {
      await AuditLog.create({
        user: req.user._id,
        action: 'update_finding',
        entityType: 'finding',
        entityId: finding._id.toString(),
        entityName: finding.title,
        changes,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Finding updated successfully',
      data: finding
    });
  } catch (error) {
    console.error('Error in updateFinding:', error);
    next(error);
  }
};

// @desc    Delete finding
// @route   DELETE /api/projects/:projectId/findings/:id
// @access  Private
exports.deleteFinding = async (req, res, next) => {
  try {
    const finding = await Finding.findById(req.params.id);

    if (!finding || finding.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Finding not found'
      });
    }

    // Only VAPT analysts can delete
    if (req.user.role !== 'admin' && req.user.role !== 'vapt_analyst' && req.user.role !== 'vapt_tl') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this finding'
      });
    }

    // Soft delete
    finding.deletedAt = Date.now();
    finding.deletedBy = req.user._id;
    await finding.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'delete_finding',
      entityType: 'finding',
      entityId: finding._id.toString(),
      entityName: finding.title,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Finding deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add comment to finding
// @route   POST /api/projects/:projectId/findings/:id/comments
// @access  Private
exports.addComment = async (req, res, next) => {
  try {
    const { text, isInternal } = req.body;

    const finding = await Finding.findById(req.params.id);
    if (!finding) {
      return res.status(404).json({
        success: false,
        message: 'Finding not found'
      });
    }

    finding.comments.push({
      user: req.user._id,
      text,
      isInternal: isInternal || false,
      createdAt: Date.now()
    });

    await finding.save();

    const mentionTokens = [...new Set((text || '').match(/@[\w.\-+]+(?:@[\w.\-]+\.\w+)?/g) || [])]
      .map(token => token.slice(1).toLowerCase());
    if (mentionTokens.length > 0) {
      const mentionedUsers = await User.find({
        _id: { $ne: req.user._id },
        $or: [
          { email: { $in: mentionTokens } },
          { name: { $in: mentionTokens.map(t => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) } },
        ],
      }).select('_id name');

      await Promise.all(mentionedUsers.map(mentionedUser => Notification.create({
        recipient: mentionedUser._id,
        type: 'mention',
        title: 'You were mentioned in a finding',
        message: `${req.user.name || req.user.email || 'A user'} mentioned you on: ${finding.title}`,
        priority: finding.severity === 'critical' ? 'urgent' : 'normal',
        relatedEntity: { type: 'finding', id: finding._id },
        actionUrl: `/projects/${req.params.projectId}/findings/${finding._id}`,
        redirectUrl: `/projects/${req.params.projectId}/findings/${finding._id}`,
        entityType: 'finding',
        entityId: finding._id.toString(),
        deliveryMethods: { inApp: true, email: false },
      })));
    }

    const updated = await Finding.findById(finding._id)
      .populate('comments.user', 'name email avatar role');

    res.status(200).json({
      success: true,
      message: 'Comment added successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Close finding
// @route   POST /api/projects/:projectId/findings/:id/close
// @access  Private
exports.closeFinding = async (req, res, next) => {
  try {
    const { notes } = req.body;

    const finding = await Finding.findById(req.params.id);
    if (!finding) {
      return res.status(404).json({
        success: false,
        message: 'Finding not found'
      });
    }

    // VAPT analysts, project manager, or the assigned developer can close
    const project = await Project.findById(finding.project);
    const canClose = hasGlobalAccess(req.user) ||
                     project?.manager?.toString() === req.user._id.toString() ||
                     finding.assignee?.toString() === req.user._id.toString() ||
                     (finding.assignedDevelopers || []).some(id => id.toString() === req.user._id.toString());

    if (!canClose) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to close this finding'
      });
    }

    finding.status = 'closed';
    finding.closedBy = req.user._id;
    finding.closedAt = Date.now();
    finding.sla_status = 'resolved';

    await finding.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'close_finding',
      entityType: 'finding',
      entityId: finding._id.toString(),
      entityName: finding.title,
      details: { notes },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Finding closed successfully',
      data: finding
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk upload findings from JSON body or uploaded JSON file
// @route   POST /api/findings/bulk-upload
// @access  Private/Admin/PM
exports.bulkUploadFindings = async (req, res, next) => {
  try {
    const rawRows = req.file
      ? JSON.parse(req.file.buffer.toString('utf8'))
      : req.body.findings || req.body;

    if (!Array.isArray(rawRows)) {
      return res.status(400).json({
        success: false,
        message: 'Bulk upload requires a JSON array of findings'
      });
    }

    const failures = [];
    const validRows = [];

    rawRows.forEach((row, index) => {
      const projectId = row.projectId || row.project || req.body.projectId;
      const title = row.title || row.name || row.vulnerabilityName || row.vulnerability_name;
      const severity = String(row.severity || '').toLowerCase();
      const description = row.description;

      const reasons = [];
      if (!projectId) reasons.push('projectId is required');
      if (!title) reasons.push('title/vulnerabilityName is required');
      if (!description) reasons.push('description is required');
      if (!['critical', 'high', 'medium', 'low', 'info'].includes(severity)) reasons.push('severity is invalid');

      if (reasons.length > 0) {
        failures.push({ row: index + 1, reasons });
        return;
      }

      validRows.push(applySlaFields({
        ...row,
        title,
        severity,
        description,
        project: projectId,
        createdBy: req.user._id
      }));
    });

    const inserted = await Finding.insertMany(validRows, { ordered: false });

    res.status(201).json({
      success: true,
      message: 'Bulk upload processed',
      data: {
        totalSubmitted: rawRows.length,
        totalInserted: inserted.length,
        failedRows: failures
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all findings across all projects (global view)
// @route   GET /api/findings
// @access  Private
exports.getAllFindings = async (req, res, next) => {
  try {
    const { severity, status, search, project } = req.query;
    const user = req.user;

    // Build base query with RBAC filtering
    let query = { deletedAt: null };
    const allowedProjectIds = (user.allocatedProjects || []).filter(Boolean).map(id => id.toString());

    // Admin / VAPT / super_admin see findings scoped by findingScope (all projects or own assigned)
    if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'vapt_analyst' || user.role === 'vapt_tl') {
      query = findingScope(user);
    } else if (user.role === 'project_manager') {
      // PM sees findings in allocated projects
      // Note: PMs are expected to be added to allocatedProjects when assigned
      const projectFilter = allowedProjectIds.length > 0 ? { project: { $in: allowedProjectIds } } : { project: null };
      query = { ...projectFilter, deletedAt: null };
    } else if (user.role === 'developer') {
      // Developer sees all findings in allocated projects (not just assigned ones)
      if (allowedProjectIds.length > 0) {
        query = {
          deletedAt: null,
          project: { $in: allowedProjectIds }
        };
      } else {
        query = {
          deletedAt: null,
          $or: [
            { assignee: user._id },
            { assignedDevelopers: user._id }
          ]
        };
      }
    } else {
      // business_analyst, read_only: only see findings assigned to them
      query = {
        deletedAt: null,
        $or: [
          { assignee: user._id },
          { assignedDevelopers: user._id }
        ]
      };
    }

    // Apply additional filters
    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (project) query.project = project;
    if (search) {
      const searchOr = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const findings = await Finding.find(query)
      .populate('assignee', 'name email avatar')
      .populate('project', 'name code client organization manager')
      .populate('reviewer', 'name email')
      .populate('closedBy', 'name email')
      .populate('verifiedBy', 'name email')
      .populate('assignedDevelopers', 'name email avatar')
      .populate('createdBy', 'name email')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: findings.length,
      data: findings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export findings as CSV (project-scoped)
// @route   GET /api/projects/:projectId/findings/export/csv
// @access  Private
const ExcelJS = require('exceljs');

exports.exportFindingsExcel = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const findings = await Finding.find({ project: projectId, deletedAt: null })
      .populate('project', 'name code')
      .populate('assignee', 'name');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Findings');

    worksheet.columns = [
      { header: 'ID', key: 'findingId', width: 15 },
      { header: 'Title', key: 'title', width: 40 },
      { header: 'Severity', key: 'severity', width: 12 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'CVSS', key: 'cvssScore', width: 10 },
      { header: 'Assignee', key: 'assignee', width: 20 },
      { header: 'Project', key: 'project', width: 25 },
      { header: 'Created At', key: 'createdAt', width: 20 },
    ];

    findings.forEach(f => {
      worksheet.addRow({
        findingId: f.findingId,
        title: f.title,
        severity: f.severity.toUpperCase(),
        status: f.status.replace('_', ' ').toUpperCase(),
        category: f.category,
        cvssScore: f.cvssScore || 'N/A',
        assignee: f.assignee?.name || 'Unassigned',
        project: f.project?.name || 'N/A',
        createdAt: f.createdAt.toISOString().slice(0, 10),
      });
    });

    // Formatting
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=findings-${projectId}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

exports.exportFindingsCSV = async (req, res, next) => {
  try {
    const { severity, status, assignee, search } = req.query;
    let query = { project: req.params.projectId, deletedAt: null };

    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (assignee) query.assignee = assignee;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const findings = await Finding.find(query)
      .populate('assignee', 'name email')
      .populate('project', 'name code')
      .sort('-createdAt');

    const csvRows = [];
    csvRows.push('ID,Title,Severity,Status,CVE,CWE,Category,Assignee,Created Date,Due Date,SLA Status,Project');

    for (const f of findings) {
      const cve = f.cve ? (Array.isArray(f.cve) ? f.cve.join('; ') : String(f.cve)) : '';
      const cwe = f.cwe ? (Array.isArray(f.cwe) ? f.cwe.join('; ') : String(f.cwe)) : '';
      const assigneeName = f.assignee ? f.assignee.name : '';
      const projectName = f.project ? f.project.name : '';
      const row = [
        f.findingId || f._id.toString(),
        `"${(f.title || '').replace(/"/g, '""')}"`,
        f.severity || '',
        f.status || '',
        `"${cve.replace(/"/g, '""')}"`,
        `"${cwe.replace(/"/g, '""')}"`,
        f.category || '',
        assigneeName,
        f.createdAt ? new Date(f.createdAt).toISOString().split('T')[0] : '',
        f.dueDate ? new Date(f.dueDate).toISOString().split('T')[0] : '',
        f.sla_status || '',
        projectName,
      ];
      csvRows.push(row.join(','));
    }

    const csv = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=findings.csv');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

// @desc    Export all findings as CSV (global)
// @route   GET /api/findings/export/csv
// @access  Private
exports.exportAllFindingsCSV = async (req, res, next) => {
  try {
    const { severity, status, search, project } = req.query;
    const user = req.user;
    let query = { deletedAt: null };

    const { findingScope, hasGlobalAccess } = require('../utils/rbac');
    const allowedProjectIds = (user.allocatedProjects || []).filter(Boolean).map(id => id.toString());

    if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'vapt_analyst' || user.role === 'vapt_tl') {
      query = findingScope(user);
    } else if (user.role === 'project_manager') {
      const projectFilter = allowedProjectIds.length > 0 ? { project: { $in: allowedProjectIds } } : { project: null };
      query = { ...projectFilter, deletedAt: null };
    } else if (user.role === 'developer') {
      if (allowedProjectIds.length > 0) {
        query = { deletedAt: null, project: { $in: allowedProjectIds } };
      } else {
        query = { deletedAt: null, $or: [{ assignee: user._id }, { assignedDevelopers: user._id }] };
      }
    } else {
      query = { deletedAt: null, $or: [{ assignee: user._id }, { assignedDevelopers: user._id }] };
    }

    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (project) query.project = project;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const findings = await Finding.find(query)
      .populate('assignee', 'name email')
      .populate('project', 'name code')
      .sort('-createdAt');

    const csvRows = [];
    csvRows.push('ID,Title,Severity,Status,CVE,CWE,Category,Assignee,Created Date,Due Date,SLA Status,Project');

    for (const f of findings) {
      const cve = f.cve ? (Array.isArray(f.cve) ? f.cve.join('; ') : String(f.cve)) : '';
      const cwe = f.cwe ? (Array.isArray(f.cwe) ? f.cwe.join('; ') : String(f.cwe)) : '';
      const assigneeName = f.assignee ? f.assignee.name : '';
      const projectName = f.project ? f.project.name : '';
      const row = [
        f.findingId || f._id.toString(),
        `"${(f.title || '').replace(/"/g, '""')}"`,
        f.severity || '',
        f.status || '',
        `"${cve.replace(/"/g, '""')}"`,
        `"${cwe.replace(/"/g, '""')}"`,
        f.category || '',
        assigneeName,
        f.createdAt ? new Date(f.createdAt).toISOString().split('T')[0] : '',
        f.dueDate ? new Date(f.dueDate).toISOString().split('T')[0] : '',
        f.sla_status || '',
        projectName,
      ];
      csvRows.push(row.join(','));
    }

    const csv = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=findings.csv');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

exports.exportAllFindingsExcel = async (req, res, next) => {
  try {
    const { severity, status, search, project } = req.query;
    const user = req.user;
    let query = { deletedAt: null };

    const { findingScope } = require('../utils/rbac');
    const allowedProjectIds = (user.allocatedProjects || []).filter(Boolean).map(id => id.toString());

    if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'vapt_analyst' || user.role === 'vapt_tl') {
      query = findingScope(user);
    } else if (user.role === 'project_manager') {
      const projectFilter = allowedProjectIds.length > 0 ? { project: { $in: allowedProjectIds } } : { project: null };
      query = { ...projectFilter, deletedAt: null };
    } else if (user.role === 'developer') {
      if (allowedProjectIds.length > 0) {
        query = { deletedAt: null, project: { $in: allowedProjectIds } };
      } else {
        query = { deletedAt: null, $or: [{ assignee: user._id }, { assignedDevelopers: user._id }] };
      }
    } else {
      query = { deletedAt: null, $or: [{ assignee: user._id }, { assignedDevelopers: user._id }] };
    }

    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (project) query.project = project;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const findings = await Finding.find(query)
      .populate('assignee', 'name')
      .populate('project', 'name code')
      .sort('-createdAt');

    const workbook = new (require('exceljs').Workbook)();
    const worksheet = workbook.addWorksheet('Findings');

    worksheet.columns = [
      { header: 'ID', key: 'findingId', width: 15 },
      { header: 'Title', key: 'title', width: 40 },
      { header: 'Severity', key: 'severity', width: 12 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'CVSS', key: 'cvssScore', width: 10 },
      { header: 'Assignee', key: 'assignee', width: 20 },
      { header: 'Project', key: 'project', width: 25 },
      { header: 'Created At', key: 'createdAt', width: 20 },
    ];

    findings.forEach(f => {
      worksheet.addRow({
        findingId: f.findingId,
        title: f.title,
        severity: f.severity?.toUpperCase(),
        status: f.status?.replace(/_/g, ' ').toUpperCase(),
        category: f.category,
        cvssScore: f.cvssScore ?? 'N/A',
        assignee: f.assignee?.name || 'Unassigned',
        project: f.project?.name || 'N/A',
        createdAt: f.createdAt ? new Date(f.createdAt).toISOString().slice(0, 10) : '',
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=all-findings.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk update finding statuses
// @route   PUT /api/findings/bulk-status
// @access  Private
exports.bulkUpdateFindings = async (req, res, next) => {
  try {
    const { findingIds, status, severity, assignee, comment, isDuplicate } = req.body;

    if (!findingIds || !Array.isArray(findingIds) || findingIds.length === 0) {
      return res.status(400).json({ success: false, message: 'findingIds array is required' });
    }

    if (!status && !severity && !assignee && isDuplicate === undefined) {
      return res.status(400).json({ success: false, message: 'At least one update field (status, severity, assignee, isDuplicate) is required' });
    }

    if (status) {
      const validStatuses = ['open', 'in_progress', 'under_review', 'resolved', 'closed', 'reopened', 'duplicate', 'accepted_risk', 'rejected', 'deferred'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
      }
    }

    if (severity) {
      const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
      if (!validSeverities.includes(severity.toLowerCase())) {
        return res.status(400).json({ success: false, message: `Invalid severity: ${severity}` });
      }
    }

    const findings = await Finding.find({ _id: { $in: findingIds }, deletedAt: null })
      .populate('project', 'name manager');

    if (findings.length === 0) {
      return res.status(404).json({ success: false, message: 'No findings found with provided IDs' });
    }

    const user = req.user;
    const { hasGlobalAccess } = require('../utils/rbac');

    // Check permissions for all findings
    for (const finding of findings) {
      const project = finding.project;
      const canEdit = hasGlobalAccess(user) ||
        finding.assignee?.toString() === user._id.toString() ||
        (finding.assignedDevelopers || []).some(id => id.toString() === user._id.toString()) ||
        (project && project.manager?.toString() === user._id.toString());

      if (!canEdit) {
        return res.status(403).json({
          success: false,
          message: `Not authorized to update finding: ${finding.title}`,
        });
      }
    }

    let updatedCount = 0;
    for (const finding of findings) {
      if (status) finding.status = status;
      if (severity) finding.severity = severity.toLowerCase();
      if (assignee !== undefined) finding.assignee = assignee || null;
      if (isDuplicate !== undefined) {
        finding.isDuplicate = !!isDuplicate;
        if (isDuplicate) finding.status = 'duplicate';
      }
      
      finding.updatedBy = user._id;
      
      if (comment) {
        finding.comments.push({
          user: user._id,
          text: `[Bulk Update] ${comment}`,
          createdAt: new Date()
        });
      }

      await finding.save();
      updatedCount++;

      // Log activity
      await AuditLog.create({
        user: user._id,
        action: 'bulk_update_finding',
        entityType: 'finding',
        entityId: finding._id,
        entityName: finding.title,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success',
        details: { status, severity, assignee, isDuplicate }
      });
    }

    res.status(200).json({
      success: true,
      message: `Successfully updated ${updatedCount} findings`,
      updatedCount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reopen finding
// @route   POST /api/projects/:projectId/findings/:id/reopen
// @access  Private
exports.reopenFinding = async (req, res, next) => {
  try {
    const finding = await Finding.findById(req.params.id);
    if (!finding) {
      return res.status(404).json({
        success: false,
        message: 'Finding not found'
      });
    }

    // VAPT analysts, project manager, or the assigned developer can reopen
    const project = await Project.findById(finding.project);
    const canReopen = hasGlobalAccess(req.user) ||
                      project?.manager?.toString() === req.user._id.toString() ||
                      finding.assignee?.toString() === req.user._id.toString() ||
                      (finding.assignedDevelopers || []).some(id => id.toString() === req.user._id.toString());

    if (!canReopen) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reopen this finding'
      });
    }

    finding.status = 'reopened';
    finding.closedBy = undefined;
    finding.closedAt = undefined;
    finding.sla_status = undefined;

    await finding.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'reopen_finding',
      entityType: 'finding',
      entityId: finding._id.toString(),
      entityName: finding.title,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Finding reopened successfully',
      data: finding
    });
  } catch (error) {
    next(error);
  }
};
