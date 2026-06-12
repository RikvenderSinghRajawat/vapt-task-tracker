/**
 * RBAC – role-based access control
 * ─────────────────────────────────────────────────
 * ONLY admin / super_admin has full-org scope.
 * vapt_analyst belongs to a scoped set of projects (allocatedProjects);
 * she sees only her own / assigned tasks AND tasks falling within those
 * projects.
 */

const mongoose = require('mongoose');

const SUPER_ADMIN_ROLES = ['admin', 'super_admin'];
const VAPT_ROLES        = ['vapt_analyst', 'vapt_tl'];

const asObjectIds = (ids = []) => ids.filter(Boolean).map(id => {
  try { return new mongoose.Types.ObjectId(id); } catch (_) { return id; }
});

const isAdmin   = (user) => SUPER_ADMIN_ROLES.includes(user?.role);
const isVapt    = (user) => VAPT_ROLES.includes(user?.role);
/** Global access = only Admin / SuperAdmin / VAPT (full org visibility) */
const hasGlobalAccess = (user) => isAdmin(user) || isVapt(user);

// ── helpers ────────────────────────────────────────────────────────────────

function allocatedProjectIds(user) {
  return asObjectIds(user?.allocatedProjects || []);
}

// ── project scope ───────────────────────────────────────────────────────────

function projectScope(user) {
  if (hasGlobalAccess(user)) return { deletedAt: null };
  const userId = user._id;
  const pIds = allocatedProjectIds(user);

  if (user.role === 'project_manager') {
    // PMs can see projects they manage OR projects they're allocated to
    const orConditions = [
      { manager: userId }
    ];
    if (pIds.length > 0) {
      orConditions.push({ _id: { $in: pIds } });
    }
    return { deletedAt: null, $or: orConditions };
  }

  // For ALL non-admin roles (developer, business_analyst, read_only, etc.):
  // ONLY return projects they're explicitly allocated to
  if (pIds.length > 0) {
    return { deletedAt: null, _id: { $in: pIds } };
  }

  // No allocated projects = see nothing
  return { deletedAt: null, _id: { $in: [] } };
}

// ── finding scope ───────────────────────────────────────────────────────────

function findingScope(user) {
  if (hasGlobalAccess(user)) return { deletedAt: null };
  const projectIds = allocatedProjectIds(user);

  // Developers and PMs see ALL findings in their allocated projects
  if (user.role === 'developer' || user.role === 'project_manager') {
    if (projectIds.length > 0) {
      return { deletedAt: null, project: { $in: projectIds } };
    }
    return { deletedAt: null, _id: { $in: [] } };
  }

  // Other non-global roles (business_analyst, read_only): only assigned findings
  const orConditions = [
    { assignee: user._id },
    { assignedDevelopers: user._id }
  ];
  if (projectIds.length > 0) {
    orConditions.push({ project: { $in: projectIds } });
  }
  return { deletedAt: null, $or: orConditions };
}

// ── task scope ──────────────────────────────────────────────────────────────

/**
 * Returns the Mongoose filter for listing tasks visible to `user`.
 * - Admin           → everything
 * - vapt_analyst   → own + assigned + scoped-project tasks
 * - project_manager → own + assigned + team on allocated projects
 * - developer       → only their own tasks
 */
function taskScope(user) {
  if (hasGlobalAccess(user)) return { deletedAt: null };

  const pIds = allocatedProjectIds(user).map(String);

  if (isVapt(user)) {
    return {
      deletedAt: null,
      $or: [
        { assignedTo: user._id },
        { createdBy:  user._id },
        { assignedBy: user._id },
        // Tasks in their scoped projects (regardless of assignee)
        ...(pIds.length ? [{ project: { $in: pIds } }] : [])
      ]
    };
  }

  if (user.role === 'project_manager') {
    // Find all developers allocated to PM's projects
    return {
      deletedAt: null,
      $or: [
        { assignedTo: user._id },
        { createdBy:  user._id },
        { assignedBy: user._id },
        ...(pIds.length ? [{ project: { $in: pIds } }] : [])
      ]
    };
  }

  // developer / business_analyst / read_only → only self
  return {
    deletedAt: null,
    $or: [{ assignedTo: user._id }, { createdBy: user._id }]
  };
}

// ── export ──────────────────────────────────────────────────────────────────

module.exports = {
  isAdmin,
  isVapt,
  hasGlobalAccess,
  allocatedProjectIds,
  projectScope,
  findingScope,
  taskScope
};
