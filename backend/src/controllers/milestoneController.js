const Milestone = require('../models/Milestone');
const Project = require('../models/Project');
const AuditLog = require('../models/AuditLog');

// @desc    Get all milestones
// @route   GET /api/projects/:projectId/milestones
// @access  Private
exports.getMilestones = async (req, res, next) => {
  try {
    const { status, priority } = req.query;

    const query = { project: req.params.projectId, deletedAt: null };

    if (status) query.status = status;
    if (priority) query.priority = priority;

    const milestones = await Milestone.find(query)
      .populate('assignees.user', 'name email avatar')
      .populate('dependencies')
      .sort('dueDate');

    res.status(200).json({
      success: true,
      count: milestones.length,
      data: milestones
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single milestone
// @route   GET /api/projects/:projectId/milestones/:id
// @access  Private
exports.getMilestone = async (req, res, next) => {
  try {
    const milestone = await Milestone.findById(req.params.id)
      .populate('assignees.user', 'name email avatar')
      .populate('dependencies')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!milestone || milestone.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found'
      });
    }

    res.status(200).json({
      success: true,
      data: milestone
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new milestone
// @route   POST /api/projects/:projectId/milestones
// @access  Private
exports.createMilestone = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const milestoneData = {
      ...req.body,
      project: req.params.projectId,
      createdBy: req.user._id
    };

    const milestone = await Milestone.create(milestoneData);

    await AuditLog.create({
      user: req.user._id,
      action: 'create_milestone',
      entityType: 'milestone',
      entityId: milestone._id.toString(),
      entityName: milestone.title,
      details: { project: project.name, type: milestone.type },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(201).json({
      success: true,
      message: 'Milestone created successfully',
      data: milestone
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update milestone
// @route   PUT /api/projects/:projectId/milestones/:id
// @access  Private
exports.updateMilestone = async (req, res, next) => {
  try {
    let milestone = await Milestone.findById(req.params.id);

    if (!milestone || milestone.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found'
      });
    }

    const changes = [];
    const trackChange = (field, newValue) => {
      if (milestone[field] !== newValue) {
        changes.push({ field, oldValue: milestone[field], newValue });
      }
    };

    if (req.body.title) trackChange('title', req.body.title);
    if (req.body.status) trackChange('status', req.body.status);
    if (req.body.dueDate) trackChange('dueDate', req.body.dueDate);
    if (req.body.progress !== undefined) trackChange('progress', req.body.progress);

    milestone = await Milestone.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    milestone.updatedBy = req.user._id;
    await milestone.save();

    if (changes.length > 0) {
      await AuditLog.create({
        user: req.user._id,
        action: 'update_milestone',
        entityType: 'milestone',
        entityId: milestone._id.toString(),
        entityName: milestone.title,
        changes,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Milestone updated successfully',
      data: milestone
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete milestone
// @route   DELETE /api/projects/:projectId/milestones/:id
// @access  Private
exports.deleteMilestone = async (req, res, next) => {
  try {
    const milestone = await Milestone.findById(req.params.id);

    if (!milestone || milestone.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found'
      });
    }

    // Soft delete
    milestone.deletedAt = Date.now();
    milestone.deletedBy = req.user._id;
    await milestone.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'delete_milestone',
      entityType: 'milestone',
      entityId: milestone._id.toString(),
      entityName: milestone.title,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Milestone deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete milestone
// @route   POST /api/projects/:projectId/milestones/:id/complete
// @access  Private
exports.completeMilestone = async (req, res, next) => {
  try {
    const { notes } = req.body;

    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found'
      });
    }

    milestone.status = 'completed';
    milestone.progress = 100;
    milestone.completedDate = Date.now();
    milestone.notes = notes || milestone.notes;

    await milestone.save();

    // Update project status if configured
    if (milestone.updateProjectStatus && milestone.suggestedProjectStatus) {
      const project = await Project.findById(milestone.project);
      if (project) {
        project.status = milestone.suggestedProjectStatus;
        project.versions.push({
          version: project.versions.length + 0.1,
          date: new Date(),
          status: milestone.suggestedProjectStatus,
          type: 'other',
          notes: `Milestone completed: ${milestone.title}`,
          createdBy: req.user._id
        });
        await project.save();
      }
    }

    await AuditLog.create({
      user: req.user._id,
      action: 'complete_milestone',
      entityType: 'milestone',
      entityId: milestone._id.toString(),
      entityName: milestone.title,
      details: { notes },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Milestone completed successfully',
      data: milestone
    });
  } catch (error) {
    next(error);
  }
};
