const Project = require('../models/Project');
const Finding = require('../models/Finding');
const AuditLog = require('../models/AuditLog');
const { projectScope } = require('../utils/rbac');

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res, next) => {
  try {
    const { status, priority, assessmentType, search, manager } = req.query;

    const query = projectScope(req.user);

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assessmentType) query.assessmentType = assessmentType;
    if (manager) query.manager = manager;
    if (search) {
      const searchOr = [
        { name: { $regex: search, $options: 'i' } },
        { organization: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const projects = await Project.find(query)
      .populate('manager', 'name email avatar')
      .populate('teamMembers.user', 'name email avatar')
      .sort('-createdAt');

    // Calculate statistics for each project
    const projectIds = projects.map(p => p._id);
    const stats = await Finding.aggregate([
      { $match: { project: { $in: projectIds }, deletedAt: null } },
      {
        $group: {
          _id: '$project',
          totalFindings: { $sum: 1 },
          criticalFindings: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          highFindings: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          mediumFindings: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
          lowFindings: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } },
          openFindings: { $sum: { $cond: [{ $in: ['$status', ['open', 'partial']] }, 1, 0] } },
          closedFindings: { $sum: { $cond: [{ $in: ['$status', ['closed', 'fixed']] }, 1, 0] } },
        }
      }
    ]);

    const statsMap = {};
    stats.forEach(stat => {
      statsMap[stat._id.toString()] = stat;
    });

    const projectsWithStats = projects.map(project => {
      const projectObj = project.toObject ? project.toObject({ virtuals: true }) : { ...project, id: project._id };
      projectObj.statistics = statsMap[project._id.toString()] || {
        totalFindings: 0, criticalFindings: 0, highFindings: 0,
        mediumFindings: 0, lowFindings: 0, openFindings: 0, closedFindings: 0
      };
      return projectObj;
    });

    res.status(200).json({
      success: true,
      count: projectsWithStats.length,
      data: projectsWithStats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('manager', 'name email avatar role')
      .populate('teamMembers.user', 'name email avatar role')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('comments.user', 'name email avatar role');

    if (!project || project.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check access - PMs and Developers can access projects they are allocated to
    if (req.user.role !== 'admin' && req.user.role !== 'vapt_analyst' && req.user.role !== 'vapt_tl') {
      const managerId = project.manager?._id || project.manager;
      const isTeamMember = project.teamMembers.some(m => (m.user?._id || m.user).toString() === req.user._id.toString());
      const UserModel = require('../models/User');
      const allocatedUser = await UserModel.findOne({ _id: req.user._id, allocatedProjects: project._id });
      const isAllocated = allocatedUser !== null;

      if (!isTeamMember && !isAllocated && managerId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this project'
        });
      }
    }

    const stats = await Finding.aggregate([
      { $match: { project: project._id, deletedAt: null } },
      {
        $group: {
          _id: null,
          totalFindings: { $sum: 1 },
          criticalFindings: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          highFindings:     { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          mediumFindings:   { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
          lowFindings:      { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } },
          openFindings:     { $sum: { $cond: [{ $in: ['$status', ['open', 'partial']] }, 1, 0] } },
          closedFindings:   { $sum: { $cond: [{ $in: ['$status', ['closed', 'fixed']] }, 1, 0] } },
        }
      }
    ]);

    const result = project.toObject ? project.toObject() : { ...project };
    result.statistics = stats[0] || {
      totalFindings: 0, criticalFindings: 0, highFindings: 0,
      mediumFindings: 0, lowFindings: 0, openFindings: 0, closedFindings: 0
    };

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
exports.createProject = async (req, res, next) => {
  try {
    const projectData = {
      ...req.body,
      createdBy: req.user._id,
      manager: req.body.manager || req.user._id,
      startDate: req.body.startDate || new Date()
    };

    const project = await Project.create(projectData);

    await AuditLog.create({
      user: req.user._id,
      action: 'create_project',
      entityType: 'project',
      entityId: project._id.toString(),
      entityName: project.name,
      details: { projectCode: project.code },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
exports.updateProject = async (req, res, next) => {
  try {
    let project = await Project.findById(req.params.id);

    if (!project || project.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check access - admin, vapt_analyst, project manager, or allocated users can update
    const isManager = project.manager.toString() === req.user._id.toString();
    const isAllocated = req.user.allocatedProjects?.some(pid => pid.toString() === project._id.toString()) || false;
    
    if (req.user.role !== 'admin' && req.user.role !== 'vapt_analyst' && req.user.role !== 'vapt_tl' && !isManager && !isAllocated) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this project'
      });
    }

    const changes = [];
    const trackChange = (field, newValue) => {
      if (project[field] !== newValue) {
        changes.push({ field, oldValue: project[field], newValue });
      }
    };

    if (req.body.name) trackChange('name', req.body.name);
    if (req.body.status) trackChange('status', req.body.status);
    if (req.body.priority) trackChange('priority', req.body.priority);
    if (req.body.description) trackChange('description', req.body.description);

    project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    project.updatedBy = req.user._id;
    await project.save();

    if (changes.length > 0) {
      await AuditLog.create({
        user: req.user._id,
        action: 'update_project',
        entityType: 'project',
        entityId: project._id.toString(),
        entityName: project.name,
        changes,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: project
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project || project.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Only admin and VAPT analysts can delete
    if (req.user.role !== 'admin' && req.user.role !== 'vapt_analyst' && req.user.role !== 'vapt_tl') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this project'
      });
    }

    const now = Date.now();
    project.deletedAt = now;
    project.deletedBy = req.user._id;
    await project.save();

    // Cascade soft-delete to all findings, milestones, and reports under this project
    const Finding = require('../models/Finding');
    const Milestone = require('../models/Milestone');
    const Report = require('../models/Report');
    await Promise.all([
      Finding.updateMany(
        { project: project._id, deletedAt: null },
        { deletedAt: now, deletedBy: req.user._id }
      ),
      Milestone.updateMany(
        { project: project._id, deletedAt: null },
        { deletedAt: now, deletedBy: req.user._id }
      ),
      Report.updateMany(
        { project: project._id, deletedAt: null },
        { deletedAt: now, deletedBy: req.user._id }
      ),
    ]);

    await AuditLog.create({
      user: req.user._id,
      action: 'delete_project',
      entityType: 'project',
      entityId: project._id.toString(),
      entityName: project.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'Project and all related findings deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add team member to project
// @route   POST /api/projects/:id/team
// @access  Private
exports.addTeamMember = async (req, res, next) => {
  try {
    const { userId, role } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is already a team member
    const isMember = project.teamMembers.some(m => m.user.toString() === userId);
    if (isMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a team member'
      });
    }

    project.teamMembers.push({ user: userId, role: role || 'member', joinedAt: Date.now() });
    await project.save();

    res.status(200).json({
      success: true,
      message: 'Team member added successfully',
      data: project
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove team member from project
// @route   DELETE /api/projects/:id/team/:userId
// @access  Private
exports.removeTeamMember = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    project.teamMembers = project.teamMembers.filter(m => m.user.toString() !== req.params.userId);
    await project.save();

    res.status(200).json({
      success: true,
      message: 'Team member removed successfully',
      data: project
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add comment to project
// @route   POST /api/projects/:id/comments
// @access  Private
exports.addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }
    const project = await Project.findById(req.params.id);
    if (!project || project.deletedAt) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    project.comments.push({ user: req.user._id, text: text.trim(), createdAt: Date.now() });
    await project.save();
    const updated = await Project.findById(project._id)
      .populate('comments.user', 'name email avatar role');
    res.status(200).json({ success: true, data: { comments: updated.comments } });
  } catch (error) {
    next(error);
  }
};
