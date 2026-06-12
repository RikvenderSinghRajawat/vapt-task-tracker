const User = require('../models/User');
const Session = require('../models/Session');
const { verifyToken, decodeToken } = require('../utils/jwt');

const blacklistedTokens = new Set();

exports.blacklistToken = (token) => {
  if (token) blacklistedTokens.add(token);
  if (blacklistedTokens.size > 10000) {
    const iter = blacklistedTokens.values();
    for (let i = 0; i < 1000; i++) {
      const val = iter.next();
      if (val.done) break;
      blacklistedTokens.delete(val.value);
    }
  }
};

exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  if (blacklistedTokens.has(token)) {
    return res.status(401).json({
      success: false,
      message: 'Token has been invalidated. Please login again'
    });
  }

  try {
    const decoded = verifyToken(token);
    const userId = decoded.id || decoded._id || decoded.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive'
      });
    }

    if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'Password was changed recently. Please login again'
      });
    }

    const sessionId = decoded?.sessionId || decoded?.sid;
    if (sessionId) {
      const session = await Session.findOne({ sessionId, status: 'active' });
      if (!session) {
        return res.status(401).json({
          success: false,
          message: 'Session has been invalidated. Please login again'
        });
      }
      session.lastActivity = new Date();
      await session.save();
    }

    req.user = user;
    req.token = token;
    req.sessionId = sessionId;
    next();
  } catch (error) {
    const message = error?.name === 'TokenExpiredError'
      ? 'Authentication token expired'
      : error?.name === 'FingerprintMismatchError'
      ? 'Session invalidated by server restart. Please login again'
      : 'Invalid authentication token';
    return res.status(401).json({
      success: false,
      message
    });
  }
};

const ROLE_ALIASES = {
  vapt_tl: 'vapt_analyst'
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (req.user.role === 'super_admin') return next();
    const alias = ROLE_ALIASES[req.user.role];
    if (roles.includes(req.user.role) || (alias && roles.includes(alias))) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: `User role '${req.user.role}' is not authorized to access this route`
    });
  };
};

exports.requirePermission = (permission) => {
  return (req, res, next) => {
    const { hasPermission } = require('../config/permissions');
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        success: false,
        message: `Permission '${permission}' is required`
      });
    }
    next();
  };
};

exports.checkOwnership = (resourceModel) => {
  return async (req, res, next) => {
    try {
      const resource = await resourceModel.findById(req.params.id);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      if (req.user.role === 'admin' || req.user.role === 'vapt_analyst' || req.user.role === 'vapt_tl') {
        req.resource = resource;
        return next();
      }

      let isOwner = false;

      if (resourceModel.modelName === 'Project') {
        isOwner = resource.manager.toString() === req.user._id.toString() ||
                 resource.teamMembers.some(m => m.user.toString() === req.user._id.toString());
      } else if (resourceModel.modelName === 'Finding') {
        isOwner = resource.assignee?.toString() === req.user._id.toString();
      } else if (resourceModel.modelName === 'Report') {
        isOwner = resource.uploadedBy.toString() === req.user._id.toString();
      }

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this resource'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  };
};

exports.checkProjectAccess = async (req, res, next) => {
  try {
    const Project = require('../models/Project');
    const projectId = req.params.projectId || req.params.id;
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    const project = await Project.findById(projectId);

    if (!project || project.deletedAt) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (req.user.role === 'admin' || req.user.role === 'vapt_analyst' || req.user.role === 'vapt_tl') {
      req.project = project;
      return next();
    }

    const allocatedProjectIds = req.user.allocatedProjects || [];
    const isAllocated = allocatedProjectIds.some(
      pid => pid && pid.toString() === project._id.toString()
    );

    if (req.user.role === 'project_manager') {
      const isManager = project.manager && project.manager.toString() === req.user._id.toString();
      if (isAllocated || isManager) {
        req.project = project;
        return next();
      }
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this project'
      });
    }

    if (isAllocated) {
      req.project = project;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this project'
    });
  } catch (error) {
    return res.status(error.message?.includes('not authorized') ? 403 : 500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
