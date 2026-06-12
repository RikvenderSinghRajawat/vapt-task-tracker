/**
 * Permissions Utility - Centralized RBAC logic
 */

// Permission definitions
export const PERMISSIONS = {
  USERS: {
    CREATE: 'users:create',
    READ: 'users:read',
    UPDATE: 'users:update',
    DELETE: 'users:delete',
    LIST: 'users:list',
    MANAGE: 'users:manage'
  },
  PROJECTS: {
    CREATE: 'projects:create',
    READ: 'projects:read',
    UPDATE: 'projects:update',
    DELETE: 'projects:delete',
    LIST: 'projects:list',
    ASSIGN: 'projects:assign'
  },
  FINDINGS: {
    CREATE: 'findings:create',
    READ: 'findings:read',
    UPDATE: 'findings:update',
    DELETE: 'findings:delete',
    LIST: 'findings:list',
    CLOSE: 'findings:close',
    REOPEN: 'findings:reopen',
    ASSIGN: 'findings:assign',
    BULK_OPERATIONS: 'findings:bulk'
  },
  REPORTS: {
    CREATE: 'reports:create',
    READ: 'reports:read',
    UPDATE: 'reports:update',
    DELETE: 'reports:delete',
    LIST: 'reports:list',
    UPLOAD: 'reports:upload',
    DOWNLOAD: 'reports:download'
  },
  ANALYTICS: {
    READ: 'analytics:read',
    EXPORT: 'analytics:export'
  },
  SETTINGS: {
    READ: 'settings:read',
    UPDATE: 'settings:update'
  },
  AUDIT_LOGS: {
    READ: 'audit_logs:read',
    EXPORT: 'audit_logs:export'
  },
  TEMPLATES: {
    CREATE: 'templates:create',
    READ: 'templates:read',
    UPDATE: 'templates:update',
    DELETE: 'templates:delete',
    LIST: 'templates:list'
  }
};

// Role to permissions mapping
const ROLE_PERMISSIONS = {
  admin: [
    // Admin has all permissions
    ...Object.values(PERMISSIONS.USERS),
    ...Object.values(PERMISSIONS.PROJECTS),
    ...Object.values(PERMISSIONS.FINDINGS),
    ...Object.values(PERMISSIONS.REPORTS),
    ...Object.values(PERMISSIONS.ANALYTICS),
    ...Object.values(PERMISSIONS.SETTINGS),
    ...Object.values(PERMISSIONS.AUDIT_LOGS),
    ...Object.values(PERMISSIONS.TEMPLATES)
  ],
  
  vapt_analyst: [
    PERMISSIONS.USERS.READ,
    PERMISSIONS.USERS.LIST,
    PERMISSIONS.PROJECTS.READ,
    PERMISSIONS.PROJECTS.LIST,
    PERMISSIONS.FINDINGS.CREATE,
    PERMISSIONS.FINDINGS.READ,
    PERMISSIONS.FINDINGS.UPDATE,
    PERMISSIONS.FINDINGS.LIST,
    PERMISSIONS.FINDINGS.CLOSE,
    PERMISSIONS.FINDINGS.REOPEN,
    PERMISSIONS.FINDINGS.ASSIGN,
    PERMISSIONS.FINDINGS.BULK_OPERATIONS,
    PERMISSIONS.REPORTS.CREATE,
    PERMISSIONS.REPORTS.READ,
    PERMISSIONS.REPORTS.LIST,
    PERMISSIONS.REPORTS.UPLOAD,
    PERMISSIONS.REPORTS.DOWNLOAD,
    PERMISSIONS.ANALYTICS.READ,
    PERMISSIONS.SETTINGS.READ,
    PERMISSIONS.AUDIT_LOGS.READ,
    PERMISSIONS.TEMPLATES.CREATE,
    PERMISSIONS.TEMPLATES.READ,
    PERMISSIONS.TEMPLATES.UPDATE,
    PERMISSIONS.TEMPLATES.LIST
  ],
  
  project_manager: [
    PERMISSIONS.USERS.READ,
    PERMISSIONS.USERS.LIST,
    PERMISSIONS.PROJECTS.READ,
    PERMISSIONS.PROJECTS.LIST,
    PERMISSIONS.FINDINGS.READ,
    PERMISSIONS.FINDINGS.LIST,
    PERMISSIONS.FINDINGS.ASSIGN,
    PERMISSIONS.REPORTS.READ,
    PERMISSIONS.REPORTS.LIST,
    PERMISSIONS.REPORTS.UPLOAD,
    PERMISSIONS.REPORTS.DOWNLOAD,
    PERMISSIONS.ANALYTICS.READ,
    PERMISSIONS.TEMPLATES.READ,
    PERMISSIONS.TEMPLATES.LIST
  ],
  
  developer: [
    PERMISSIONS.USERS.READ,
    PERMISSIONS.PROJECTS.READ,
    PERMISSIONS.PROJECTS.LIST,
    PERMISSIONS.FINDINGS.READ,
    PERMISSIONS.FINDINGS.UPDATE,
    PERMISSIONS.FINDINGS.LIST,
    PERMISSIONS.REPORTS.READ,
    PERMISSIONS.REPORTS.DOWNLOAD
  ],
  
  read_only: [
    PERMISSIONS.USERS.READ,
    PERMISSIONS.PROJECTS.READ,
    PERMISSIONS.PROJECTS.LIST,
    PERMISSIONS.FINDINGS.READ,
    PERMISSIONS.FINDINGS.LIST,
    PERMISSIONS.REPORTS.READ,
    PERMISSIONS.REPORTS.DOWNLOAD,
    PERMISSIONS.ANALYTICS.READ
  ]
};

/**
 * Check if user has a specific permission
 * @param {object} user - User object with role
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export const hasPermission = (user, permission) => {
  if (!user || !user.role) return false;
  
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  return permissions.includes(permission);
};

/**
 * Check if user has any of the specified permissions
 * @param {object} user - User object
 * @param {array} permissions - Array of permissions
 * @returns {boolean}
 */
export const hasAnyPermission = (user, permissions = []) => {
  return permissions.some(permission => hasPermission(user, permission));
};

/**
 * Check if user has all of the specified permissions
 * @param {object} user - User object
 * @param {array} permissions - Array of permissions
 * @returns {boolean}
 */
export const hasAllPermissions = (user, permissions = []) => {
  return permissions.every(permission => hasPermission(user, permission));
};

/**
 * Check if user has full access (admin or vapt_analyst)
 * @param {object} user - User object
 * @returns {boolean}
 */
export const hasFullAccess = (user) => {
  return user?.role === 'admin' || user?.role === 'vapt_analyst' || user?.isSuperUser;
};

/**
 * Check if user can access a specific project
 * @param {object} user - User object
 * @param {string} projectId - Project ID
 * @returns {boolean}
 */
export const canAccessProject = (user, projectId) => {
  if (!user) return false;
  if (hasFullAccess(user)) return true;
  
  const allocatedProjects = user.allocatedProjects || [];
  return allocatedProjects.includes(projectId);
};

/**
 * Check if user can manage findings
 * @param {object} user - User object
 * @returns {boolean}
 */
export const canManageFindings = (user) => {
  return hasFullAccess(user);
};

/**
 * Check if user can update a specific finding
 * @param {object} user - User object
 * @param {object} finding - Finding object
 * @returns {boolean}
 */
export const canUpdateFinding = (user, finding) => {
  if (!user || !finding) return false;
  
  // Admin/VAPT can update any finding
  if (hasFullAccess(user)) return true;
  
  // Developer can only update findings assigned to them
  if (user.role === 'developer') {
    return finding.assignee === user.uid || finding.assignee === user.email;
  }
  
  return false;
};

/**
 * Get permissions for a role
 * @param {string} role - User role
 * @returns {array} Array of permissions
 */
export const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Permission check hook helper
 * Returns an object with permission check functions bound to a user
 * @param {object} user - User object
 * @returns {object} Permission checker functions
 */
export const createPermissionChecker = (user) => ({
  can: (permission) => hasPermission(user, permission),
  canAny: (permissions) => hasAnyPermission(user, permissions),
  canAll: (permissions) => hasAllPermissions(user, permissions),
  hasFullAccess: () => hasFullAccess(user),
  canAccessProject: (projectId) => canAccessProject(user, projectId),
  canManageFindings: () => canManageFindings(user),
  canUpdateFinding: (finding) => canUpdateFinding(user, finding),
  getAllPermissions: () => getRolePermissions(user?.role)
});

export default {
  PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasFullAccess,
  canAccessProject,
  canManageFindings,
  canUpdateFinding,
  getRolePermissions,
  createPermissionChecker
};
