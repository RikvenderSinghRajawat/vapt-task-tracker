const Project = require('../models/Project');
const Report = require('../models/Report');
const Finding = require('../models/Finding');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { getStoragePaths } = require('../config/storage');
const fs = require('fs');
const path = require('path');

const storagePaths = getStoragePaths();


const RETENTION_DAYS = 15;

const normalizeEntityType = (entityType) => {
  if (!entityType) return null;
  const t = String(entityType).toLowerCase();
  if (t === 'projects' || t === 'project') return 'project';
  if (t === 'reports' || t === 'report') return 'report';
  if (t === 'findings' || t === 'finding') return 'finding';
  if (t === 'users' || t === 'user') return 'user';
  return null;
};

const ENTITY_MAP = {
  project: Project,
  report: Report,
  finding: Finding,
  user: User
};

const getModelForEntityType = (entityType) => {
  const normalized = normalizeEntityType(entityType);
  return normalized ? ENTITY_MAP[normalized] : null;
};

const getEntityNameFromDoc = (doc, normalized) => {
  if (!doc) return '';
  if (normalized === 'user') return doc.name || doc.email || '';
  if (normalized === 'report') return doc.name || doc.reportId || '';
  if (normalized === 'finding') return doc.title || doc.findingId || '';
  if (normalized === 'project') return doc.name || doc.code || '';
  return doc.name || doc._id?.toString() || '';
};

const buildRecycleBinItem = async (doc, normalized) => {
  const deletedByUser = doc.deletedBy
    ? (typeof doc.deletedBy === 'object' && doc.deletedBy.name
        ? { id: doc.deletedBy._id?.toString() || doc.deletedBy.toString(), name: doc.deletedBy.name, email: doc.deletedBy.email }
        : null)
    : null;

  const base = {
    id: doc._id.toString(),
    deletedAt: doc.deletedAt,
    expiresAt: new Date(new Date(doc.deletedAt).getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000),
    deletedBy: deletedByUser,
  };

  if (normalized === 'project') {
    return {
      ...base,
      project: {
        id: doc._id.toString(),
        name: doc.name,
        code: doc.code
      }
    };
  }

  if (normalized === 'report') {
    return {
      ...base,
      report: {
        id: doc._id.toString(),
        name: doc.name,
        reportId: doc.reportId,
        type: doc.type,
        status: doc.status,
        file: doc.file
      }
    };
  }

  if (normalized === 'finding') {
    return {
      ...base,
      finding: {
        id: doc._id.toString(),
        title: doc.title,
        findingId: doc.findingId,
        severity: doc.severity,
        status: doc.status
      }
    };
  }

  if (normalized === 'user') {
    return {
      ...base,
      user: {
        id: doc._id.toString(),
        name: doc.name,
        email: doc.email,
        role: doc.role
      }
    };
  }

  return base;
};

const requireRecycleBinAccess = (req) => {
  // Matches frontend ProtectedRoute allowedRoles
  return req.user?.role === 'admin' || req.user?.role === 'vapt_analyst' || req.user?.role === 'vapt_tl' || req.user?.role === 'project_manager';
};

// @desc    List recycle bin items
// @route   GET /api/recycle-bin
exports.getRecycleBinItems = async (req, res, next) => {
  try {
    if (!requireRecycleBinAccess(req)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const { entityType } = req.query;
    const normalized = normalizeEntityType(entityType);

    const filter = { deletedAt: { $ne: null } };

    const queryProjects = normalized === 'project' || !normalized;
    const queryReports = normalized === 'report' || !normalized;
    const queryFindings = normalized === 'finding' || !normalized;
    const queryUsers = normalized === 'user' || !normalized;

    const [projects, reports, findings, users] = await Promise.all([
      queryProjects ? Project.find(filter).sort('-deletedAt').populate('deletedBy', 'name email') : [],
      queryReports ? Report.find(filter).sort('-deletedAt').populate('uploadedBy', 'name email avatar').populate('findingsIncluded').populate('deletedBy', 'name email') : [],
      queryFindings ? Finding.find(filter).sort('-deletedAt').populate('deletedBy', 'name email') : [],
      queryUsers ? User.find(filter).sort('-deletedAt').populate('deletedBy', 'name email') : []
    ]);

    const items = [
      ...await Promise.all(projects.map((d) => buildRecycleBinItem(d, 'project'))),
      ...await Promise.all(reports.map((d) => buildRecycleBinItem(d, 'report'))),
      ...await Promise.all(findings.map((d) => buildRecycleBinItem(d, 'finding'))),
      ...await Promise.all(users.map((d) => buildRecycleBinItem(d, 'user')))
    ]
      .map((it) => {
        // Wrap in parentheses to make intent explicit and
        // avoid any operator-precedence ambiguity with the ternary chain.
        if (it.report) return { ...it, entityType: 'report' };
        if (it.finding) return { ...it, entityType: 'finding' };
        if (it.user) return { ...it, entityType: 'user' };
        return { ...it, entityType: 'project' };
      })
      .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore an entity
// @route   POST /api/recycle-bin/restore/:entityType/:id
exports.restoreItem = async (req, res, next) => {
  try {
    if (!requireRecycleBinAccess(req)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const normalized = normalizeEntityType(req.params.entityType);
    if (!normalized) {
      return res.status(400).json({ success: false, message: 'Invalid entity type' });
    }

    const Model = getModelForEntityType(normalized);
    if (!Model) {
      return res.status(400).json({ success: false, message: 'Invalid entity type' });
    }

    const doc = await Model.findById(req.params.id);
    if (!doc || !doc.deletedAt) {
      return res.status(404).json({ success: false, message: 'Item not found in recycle bin' });
    }

    // Resolve name/key conflicts by auto-appending a numeric suffix
    const uniqueKey = normalized === 'project'   ? 'code'
                    : normalized === 'report'    ? 'reportId'
                    : normalized === 'finding'   ? 'findingId'
                    : normalized === 'user'      ? 'email'
                    : null;
    const displayKey = normalized === 'project'   ? 'name'
                     : normalized === 'report'    ? 'name'
                     : normalized === 'finding'   ? 'title'
                     : normalized === 'user'      ? 'name'
                     : null;

    // Find the first available suffix (1, 2, 3...) so restored name is unique
    let suffix = 0;
    const baseUnique = doc[uniqueKey];
    const baseDisplay = doc[displayKey];
    let conflict = true;
    while (conflict) {
      conflict = false;
      const candidateUnique = suffix === 0 ? baseUnique : `${baseUnique}${suffix}`;
      const candidateDisplay = suffix === 0 ? baseDisplay : `${baseDisplay}${suffix}`;

      // Check unique field conflict (only for non-user entities; email should never suffix)
      if (uniqueKey && candidateUnique && normalized !== 'user') {
        const uConflict = await Model.findOne({ deletedAt: null, [uniqueKey]: candidateUnique, _id: { $ne: doc._id } }).lean();
        if (uConflict) { suffix++; conflict = true; continue; }
      }
      // Check display name conflict among active records
      if (displayKey && candidateDisplay) {
        const dConflict = await Model.findOne({ deletedAt: null, [displayKey]: candidateDisplay, _id: { $ne: doc._id } }).lean();
        if (dConflict) { suffix++; conflict = true; continue; }
      }

      // Apply the chosen names
      if (suffix > 0) {
        if (uniqueKey && candidateUnique && normalized !== 'user') doc[uniqueKey] = candidateUnique;
        if (displayKey && candidateDisplay) doc[displayKey] = candidateDisplay;
      }
    }
    // Restore project code to base if only display name needed suffix
    // (re-generate code via pre-validate hook since unique is on code not name)

    // ---- end conflict check ----

    doc.deletedAt = null;
    if (normalized === 'user') {
      doc.isActive = true;
    }
    await doc.save();

    // Cascade restore all child entities when a project is restored
    if (normalized === 'project') {
      const Finding = require('../models/Finding');
      const Milestone = require('../models/Milestone');
      const Report = require('../models/Report');
      await Promise.all([
        Finding.updateMany(
          { project: doc._id, deletedAt: { $ne: null } },
          { deletedAt: null, deletedBy: null }
        ),
        Milestone.updateMany(
          { project: doc._id, deletedAt: { $ne: null } },
          { deletedAt: null, deletedBy: null }
        ),
        Report.updateMany(
          { project: doc._id, deletedAt: { $ne: null } },
          { deletedAt: null, deletedBy: null }
        ),
      ]);
    }

    await AuditLog.create({
      user: req.user._id,
      action: 'restore_recycle_bin_item',
      entityType: normalized,
      entityId: doc._id.toString(),
      entityName: getEntityNameFromDoc(doc, normalized),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(200).json({ success: true, message: 'Item restored successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Permanent delete an entity
// @route   DELETE /api/recycle-bin/delete/:entityType/:id
exports.permanentDeleteItem = async (req, res, next) => {
  try {
    if (!requireRecycleBinAccess(req)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const normalized = normalizeEntityType(req.params.entityType);
    if (!normalized) {
      return res.status(400).json({ success: false, message: 'Invalid entity type' });
    }

    const Model = getModelForEntityType(normalized);
    if (!Model) {
      return res.status(400).json({ success: false, message: 'Invalid entity type' });
    }

    const doc = await Model.findById(req.params.id);
    if (!doc || !doc.deletedAt) {
      return res.status(404).json({ success: false, message: 'Item not found in recycle bin' });
    }

    // Clean up associated report file if deleting a report
    if (normalized === 'report' && doc.file?.filename) {
      try {
        const filePath = path.join(storagePaths.reports, doc.file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (_) {
        // ignore file cleanup errors
      }
    }

    // Cascade permanent delete for child entities
    if (normalized === 'project') {
      const Finding = require('../models/Finding');
      const Milestone = require('../models/Milestone');
      const Report = require('../models/Report');
      await Promise.all([
        Finding.deleteMany({ project: doc._id }),
        Milestone.deleteMany({ project: doc._id }),
        Report.deleteMany({ project: doc._id }),
      ]);
    }

    await Model.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      user: req.user._id,
      action: 'permanent_delete_recycle_bin_item',
      entityType: normalized,
      entityId: doc._id.toString(),
      entityName: getEntityNameFromDoc(doc, normalized),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    res.status(200).json({ success: true, message: 'Item permanently deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Compute days remaining (front-end helper)
exports.getDaysRemaining = async (req, res, next) => {
  try {
    const days = 15;
    const { deletedAt } = req.body || {};

    if (!deletedAt) {
      return res.status(400).json({ success: false, message: 'deletedAt is required' });
    }

    const msRemaining = days * 24 * 60 * 60 * 1000 - (Date.now() - new Date(deletedAt).getTime());
    const remainingDays = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

    res.status(200).json({ success: true, remainingDays });
  } catch (error) {
    next(error);
  }
};


