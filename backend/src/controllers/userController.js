const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const auditLog = require('../middleware/auditLog');
const { hasGlobalAccess } = require('../utils/rbac');

// Broadcast helper: emits real-time allocation-change events via Socket.IO
// so PMs and developers see updated project lists immediately.
const broadcastAllocationUpdate = (userId, projectIds, actorUserId) => {
  try {
    const io = require('../config/socket').getIO();
    io.to(`user:${userId}`).emit('allocations_updated', {
      userId, projectIds, updatedBy: actorUserId, timestamp: Date.now()
    });
    projectIds.forEach(pid => io.to(`project:${pid}`).emit('user_allocated', { userId, projectId: pid }));
  } catch (_) { /* io not available during tests */ }
};

// Auto-assign / unassign findings when a developer is allocated to / removed from projects.
// For added projects:  add developer to every open finding's assignedDevelopers.
// For removed projects: remove developer from every finding in that project.
const syncFindingsForAllocation = async (userId, addedProjectIds, removedProjectIds) => {
  try {
    const Finding = require('../models/Finding');
    const User = require('../models/User');

    if (addedProjectIds && addedProjectIds.length > 0) {
      const addedFindings = await Finding.find({
        project: { $in: addedProjectIds },
        status: { $nin: ['closed', 'resolved', 'duplicate', 'rejected', 'accepted_risk'] },
        deletedAt: null
      });
      const addedFindingIds = addedFindings.map(f => f._id);
      if (addedFindingIds.length > 0) {
        await Finding.updateMany(
          { _id: { $in: addedFindingIds } },
          { $addToSet: { assignedDevelopers: userId } }
        );
        await User.findByIdAndUpdate(userId, {
          $addToSet: { assignedFindings: { $each: addedFindingIds } }
        });
      }
    }

    if (removedProjectIds && removedProjectIds.length > 0) {
      const removedFindings = await Finding.find({
        project: { $in: removedProjectIds },
        assignedDevelopers: userId,
        deletedAt: null
      });
      const removedFindingIds = removedFindings.map(f => f._id);
      if (removedFindingIds.length > 0) {
        await Finding.updateMany(
          { _id: { $in: removedFindingIds } },
          { $pull: { assignedDevelopers: userId } }
        );
        await User.findByIdAndUpdate(userId, {
          $pull: { assignedFindings: { $in: removedFindingIds } }
        });
      }
    }
  } catch (_) { /* best-effort */ }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const { role, isActive, search, includeDeleted } = req.query;

    const query = {};

    if (req.user.role === 'project_manager') {
      query.role = 'developer';
      query.deletedAt = null;
      query.isActive = true;
    }

    if (role && req.user.role !== 'project_manager') query.role = role;
    if (isActive !== undefined && req.user.role !== 'project_manager') query.isActive = isActive === 'true';
    if (req.user.role !== 'project_manager' && (!includeDeleted || includeDeleted !== 'true')) {
      query.deletedAt = null;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

     const users = await User.find(query).select('-password').sort('-createdAt');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department, phone } = req.body;

    const isVapt = req.user.role === 'vapt_analyst' || req.user.role === 'vapt_tl';

    // VAPT cannot create Admin or Super Admin users
    if (isVapt && (role === 'admin' || role === 'super_admin')) {
      return res.status(403).json({
        success: false,
        message: 'VAPT users cannot create Admin or Super Admin accounts'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'developer',
      department,
      phone
    });

    await AuditLog.create({
      user: req.user._id,
      action: 'create_user',
      entityType: 'user',
      entityId: user._id.toString(),
      entityName: user.name,
      details: { createdUser: user.email },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, role, department, phone, isActive, preferences, allocatedProjects } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isVapt = req.user.role === 'vapt_analyst' || req.user.role === 'vapt_tl';

    // VAPT cannot modify Admin or Super Admin accounts
    if (isVapt && (user.role === 'admin' || user.role === 'super_admin')) {
      return res.status(403).json({
        success: false,
        message: 'VAPT users cannot modify Admin or Super Admin accounts'
      });
    }

    // VAPT cannot promote users to Admin or Super Admin
    if (isVapt && (role === 'admin' || role === 'super_admin')) {
      return res.status(403).json({
        success: false,
        message: 'VAPT users cannot promote users to Admin or Super Admin roles'
      });
    }

    const requestedProjectIds = (allocatedProjects || []).map(String);

    // PM can only update project allocations for developers inside projects the PM owns/has.
    // (admin and vapt_analyst can update all fields)
    if (req.user.role === 'project_manager') {
      if (allocatedProjects !== undefined) {
        if (user.role !== 'developer') {
          return res.status(403).json({ success: false, message: 'Project managers can allocate only developers' });
        }
        const pmProjectIds = (req.user.allocatedProjects || []).map(String);
        const prevProjects = (user.allocatedProjects || []).map(String);

        // Keep existing allocations from OTHER PMs/admins that are outside this PM's scope
        const nonPMProjects = prevProjects.filter(p => !pmProjectIds.includes(String(p)));

        // Only allow PM to set projects within their own scope
        const pmProjects = requestedProjectIds.filter(p => pmProjectIds.includes(String(p)));

        // Merge: preserve other PMs' allocations + apply this PM's selection
        user.allocatedProjects = [...new Set([...nonPMProjects, ...pmProjects])];
        await user.save();

        // Sync denormalised allocatedUsers on the affected Project documents
        const Project = require('../models/Project');
        const newAllProjects = (user.allocatedProjects || []).map(String);
        const added   = newAllProjects.filter(p => !prevProjects.includes(String(p)));
        const removed = prevProjects.filter(p => !newAllProjects.includes(String(p)));
        if (added.length)   await Project.updateMany({ _id: { $in: added }   }, { $addToSet: { allocatedUsers: user._id } });
        if (removed.length) await Project.updateMany({ _id: { $in: removed } }, { $pull:  { allocatedUsers: user._id } });

        // Auto-assign findings for added/removed projects
        await syncFindingsForAllocation(user._id, added, removed);

        // Push to allocation history
        user.allocationHistory = user.allocationHistory || [];
        user.allocationHistory.push({ action: 'bulk_update', performedBy: req.user._id, projectIds: user.allocatedProjects, performedAt: Date.now() });
        await user.save().catch(() => {});

        broadcastAllocationUpdate(user._id, user.allocatedProjects, req.user._id);

        return res.status(200).json({
          success: true,
          message: 'User updated successfully',
          data: user
        });
      }
      return res.status(403).json({
        success: false,
        message: 'Project managers can only update project allocations'
      });
    }

    // Developers cannot self-allocate projects; that breaks PM/admin visibility controls.
    if (req.user.role === 'developer') {
      return res.status(403).json({
        success: false,
        message: 'Developers cannot change project allocations'
      });
    }

    const changes = [];
    if (name && name !== user.name) changes.push({ field: 'name', oldValue: user.name, newValue: name });
    if (role && role !== user.role) changes.push({ field: 'role', oldValue: user.role, newValue: role });
    if (isActive !== undefined && isActive !== user.isActive) changes.push({ field: 'isActive', oldValue: user.isActive, newValue: isActive });

    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;
    user.department = department || user.department;
    user.phone = phone || user.phone;
    if (isActive !== undefined) user.isActive = isActive;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };
    const prevProjectIds = (user.allocatedProjects || []).map(String);
    if (allocatedProjects !== undefined) user.allocatedProjects = allocatedProjects;

    await user.save();

     // Sync denormalised allocatedUsers if the allocation set changed
     if (allocatedProjects !== undefined) {
       const Project = require('../models/Project');
       const prevIds = prevProjectIds;
       const newIds  = requestedProjectIds;
       const added   = newIds.filter(id => !prevIds.includes(id));
       const removed = prevIds.filter(id => !newIds.includes(id));
       if (added.length)   await Project.updateMany({ _id: { $in: added.map(id => id) }   }, { $addToSet: { allocatedUsers: user._id } });
       if (removed.length) await Project.updateMany({ _id: { $in: removed.map(id => id) } }, { $pull:  { allocatedUsers: user._id } });

       // Auto-assign findings for added/removed projects
       await syncFindingsForAllocation(user._id, added, removed);
     }

     broadcastAllocationUpdate(user._id, user.allocatedProjects, req.user._id);

     await AuditLog.create({
       user: req.user._id,
       action: 'update_user',
       entityType: 'user',
       entityId: user._id.toString(),
       entityName: user.name,
       changes,
       ipAddress: req.ip,
       userAgent: req.get('User-Agent'),
       status: 'success'
     });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // VAPT cannot delete Admin or Super Admin accounts
    const isVapt = req.user.role === 'vapt_analyst' || req.user.role === 'vapt_tl';
    if (isVapt && (user.role === 'admin' || user.role === 'super_admin')) {
      return res.status(403).json({
        success: false,
        message: 'VAPT users cannot delete Admin or Super Admin accounts'
      });
    }

    // Soft delete
    user.deletedAt = Date.now();
    user.isActive = false;
    user.deletedBy = req.user._id;
    await user.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'delete_user',
      entityType: 'user',
      entityId: user._id.toString(),
      entityName: user.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, department, avatar, preferences } = req.body;

    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (department) user.department = department;
    if (avatar) user.avatar = avatar;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};
