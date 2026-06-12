require('dotenv').config({ path: '.env' });

jest.mock('mongoose', () => ({
  Types: {
    ObjectId: jest.fn().mockImplementation((id) => ({
      toString: () => String(id),
      _str: String(id),
    })),
  },
}));

const makeUser = (overrides = {}) => ({
  _id: 'user-abc-123',
  role: 'developer',
  allocatedProjects: [],
  ...overrides,
});

describe('RBAC Utils', () => {
  let rbac;

  beforeEach(() => {
    jest.resetModules();
    rbac = require('../../../src/utils/rbac');
  });

  describe('isAdmin(user)', () => {
    it('should return true for admin role', () => {
      expect(rbac.isAdmin(makeUser({ role: 'admin' }))).toBe(true);
    });

    it('should return true for super_admin role', () => {
      expect(rbac.isAdmin(makeUser({ role: 'super_admin' }))).toBe(true);
    });

    it('should return false for vapt_analyst', () => {
      expect(rbac.isAdmin(makeUser({ role: 'vapt_analyst' }))).toBe(false);
    });

    it('should return false for developer', () => {
      expect(rbac.isAdmin(makeUser({ role: 'developer' }))).toBe(false);
    });

    it('should return false for project_manager', () => {
      expect(rbac.isAdmin(makeUser({ role: 'project_manager' }))).toBe(false);
    });

    it('should return false for null user', () => {
      expect(rbac.isAdmin(null)).toBe(false);
    });

    it('should return false for undefined user', () => {
      expect(rbac.isAdmin(undefined)).toBe(false);
    });

    it('should return false for user without role', () => {
      expect(rbac.isAdmin(makeUser({ role: undefined }))).toBe(false);
    });
  });

  describe('isVapt(user)', () => {
    it('should return true for vapt_analyst', () => {
      expect(rbac.isVapt(makeUser({ role: 'vapt_analyst' }))).toBe(true);
    });

    it('should return true for vapt_tl', () => {
      expect(rbac.isVapt(makeUser({ role: 'vapt_tl' }))).toBe(true);
    });

    it('should return false for admin', () => {
      expect(rbac.isVapt(makeUser({ role: 'admin' }))).toBe(false);
    });

    it('should return false for developer', () => {
      expect(rbac.isVapt(makeUser({ role: 'developer' }))).toBe(false);
    });

    it('should return false for null user', () => {
      expect(rbac.isVapt(null)).toBe(false);
    });
  });

  describe('hasGlobalAccess(user)', () => {
    it('should return true for admin', () => {
      expect(rbac.hasGlobalAccess(makeUser({ role: 'admin' }))).toBe(true);
    });

    it('should return true for super_admin', () => {
      expect(rbac.hasGlobalAccess(makeUser({ role: 'super_admin' }))).toBe(true);
    });

    it('should return true for vapt_analyst', () => {
      expect(rbac.hasGlobalAccess(makeUser({ role: 'vapt_analyst' }))).toBe(true);
    });

    it('should return true for vapt_tl', () => {
      expect(rbac.hasGlobalAccess(makeUser({ role: 'vapt_tl' }))).toBe(true);
    });

    it('should return false for developer', () => {
      expect(rbac.hasGlobalAccess(makeUser({ role: 'developer' }))).toBe(false);
    });

    it('should return false for project_manager', () => {
      expect(rbac.hasGlobalAccess(makeUser({ role: 'project_manager' }))).toBe(false);
    });

    it('should return false for null user', () => {
      expect(rbac.hasGlobalAccess(null)).toBe(false);
    });
  });

  describe('allocatedProjectIds(user)', () => {
    it('should return an empty array when user has no allocatedProjects', () => {
      const ids = rbac.allocatedProjectIds(makeUser());
      expect(ids).toEqual([]);
    });

    it('should return an empty array when allocatedProjects is missing', () => {
      const ids = rbac.allocatedProjectIds({ _id: 'x', role: 'developer' });
      expect(ids).toEqual([]);
    });

    it('should convert string IDs to ObjectId-like objects', () => {
      const ids = rbac.allocatedProjectIds(
        makeUser({ allocatedProjects: ['proj-1', 'proj-2'] })
      );
      expect(ids).toHaveLength(2);
      expect(ids[0].toString()).toBe('proj-1');
      expect(ids[1].toString()).toBe('proj-2');
    });

    it('should filter out falsy values from the array', () => {
      const ids = rbac.allocatedProjectIds(
        makeUser({ allocatedProjects: ['proj-1', null, undefined, '', 'proj-2'] })
      );
      expect(ids).toHaveLength(2);
      expect(ids[0].toString()).toBe('proj-1');
      expect(ids[1].toString()).toBe('proj-2');
    });
  });

  describe('projectScope(user)', () => {
    it('should return { deletedAt: null } for admin (global access)', () => {
      const scope = rbac.projectScope(makeUser({ role: 'admin' }));
      expect(scope).toEqual({ deletedAt: null });
    });

    it('should return { deletedAt: null } for vapt_analyst (global access)', () => {
      const scope = rbac.projectScope(makeUser({ role: 'vapt_analyst' }));
      expect(scope).toEqual({ deletedAt: null });
    });

    it('should return $or conditions for project_manager with allocated projects', () => {
      const scope = rbac.projectScope(
        makeUser({
          role: 'project_manager',
          _id: 'pm-1',
          allocatedProjects: ['proj-a'],
        })
      );
      expect(scope.deletedAt).toBeNull();
      expect(scope.$or).toHaveLength(2);
      expect(scope.$or[0]).toEqual({ manager: 'pm-1' });
      expect(scope.$or[1]._id.$in).toHaveLength(1);
    });

    it('should return only manager condition for project_manager without allocated projects', () => {
      const scope = rbac.projectScope(
        makeUser({
          role: 'project_manager',
          _id: 'pm-2',
          allocatedProjects: [],
        })
      );
      expect(scope.deletedAt).toBeNull();
      expect(scope.$or).toHaveLength(1);
      expect(scope.$or[0]).toEqual({ manager: 'pm-2' });
    });

    it('should return _id $in filter for developer with allocated projects', () => {
      const scope = rbac.projectScope(
        makeUser({
          role: 'developer',
          allocatedProjects: ['proj-x'],
        })
      );
      expect(scope.deletedAt).toBeNull();
      expect(scope._id.$in).toHaveLength(1);
      expect(scope._id.$in[0].toString()).toBe('proj-x');
    });

    it('should return _id $in empty array for developer without allocated projects', () => {
      const scope = rbac.projectScope(
        makeUser({ role: 'developer', allocatedProjects: [] })
      );
      expect(scope.deletedAt).toBeNull();
      expect(scope._id.$in).toEqual([]);
    });

    it('should return _id $in empty array for business_analyst without projects', () => {
      const scope = rbac.projectScope(
        makeUser({ role: 'business_analyst', allocatedProjects: [] })
      );
      expect(scope.deletedAt).toBeNull();
      expect(scope._id.$in).toEqual([]);
    });
  });

  describe('findingScope(user)', () => {
    it('should return { deletedAt: null } for admin', () => {
      const scope = rbac.findingScope(makeUser({ role: 'admin' }));
      expect(scope).toEqual({ deletedAt: null });
    });

    it('should return { deletedAt: null } for vapt_analyst', () => {
      const scope = rbac.findingScope(makeUser({ role: 'vapt_analyst' }));
      expect(scope).toEqual({ deletedAt: null });
    });

    it('should return project $in filter for developer with projects', () => {
      const scope = rbac.findingScope(
        makeUser({
          role: 'developer',
          allocatedProjects: ['proj-1'],
        })
      );
      expect(scope.deletedAt).toBeNull();
      expect(scope.project.$in).toHaveLength(1);
      expect(scope.project.$in[0].toString()).toBe('proj-1');
    });

    it('should return _id $in empty for developer without projects', () => {
      const scope = rbac.findingScope(
        makeUser({ role: 'developer', allocatedProjects: [] })
      );
      expect(scope.deletedAt).toBeNull();
      expect(scope._id.$in).toEqual([]);
    });

    it('should return project $in filter for project_manager with projects', () => {
      const scope = rbac.findingScope(
        makeUser({
          role: 'project_manager',
          allocatedProjects: ['proj-1'],
        })
      );
      expect(scope.deletedAt).toBeNull();
      expect(scope.project.$in).toHaveLength(1);
    });

    it('should return $or with assignee/assignedDevelopers for business_analyst without projects', () => {
      const scope = rbac.findingScope(
        makeUser({
          role: 'business_analyst',
          _id: 'ba-1',
          allocatedProjects: [],
        })
      );
      expect(scope.deletedAt).toBeNull();
      expect(scope.$or).toEqual([
        { assignee: 'ba-1' },
        { assignedDevelopers: 'ba-1' },
      ]);
    });

    it('should include project $in in $or for business_analyst with projects', () => {
      const scope = rbac.findingScope(
        makeUser({
          role: 'business_analyst',
          _id: 'ba-2',
          allocatedProjects: ['proj-a'],
        })
      );
      expect(scope.deletedAt).toBeNull();
      expect(scope.$or).toHaveLength(3);
      expect(scope.$or[0]).toEqual({ assignee: 'ba-2' });
      expect(scope.$or[1]).toEqual({ assignedDevelopers: 'ba-2' });
      expect(scope.$or[2].project.$in[0].toString()).toBe('proj-a');
    });

    it('should include project $in for read_only with projects', () => {
      const scope = rbac.findingScope(
        makeUser({
          role: 'read_only',
          _id: 'ro-1',
          allocatedProjects: ['proj-b'],
        })
      );
      expect(scope.$or).toHaveLength(3);
    });
  });

  describe('taskScope(user)', () => {
    it('should return { deletedAt: null } for admin', () => {
      const scope = rbac.taskScope(makeUser({ role: 'admin' }));
      expect(scope).toEqual({ deletedAt: null });
    });

    it('should return { deletedAt: null } for vapt_analyst', () => {
      const scope = rbac.taskScope(makeUser({ role: 'vapt_analyst' }));
      expect(scope).toEqual({ deletedAt: null });
    });

    it('should return { deletedAt: null } for vapt_tl', () => {
      const scope = rbac.taskScope(makeUser({ role: 'vapt_tl' }));
      expect(scope).toEqual({ deletedAt: null });
    });

    it('should return $or conditions for project_manager with allocated projects', () => {
      const scope = rbac.taskScope(
        makeUser({
          role: 'project_manager',
          _id: 'pm-1',
          allocatedProjects: ['proj-a'],
        })
      );
      expect(scope.deletedAt).toBeNull();
      expect(scope.$or).toHaveLength(4);
      expect(scope.$or[0]).toEqual({ assignedTo: 'pm-1' });
      expect(scope.$or[1]).toEqual({ createdBy: 'pm-1' });
      expect(scope.$or[2]).toEqual({ assignedBy: 'pm-1' });
      expect(scope.$or[3].project.$in[0].toString()).toBe('proj-a');
    });

    it('should return 3 $or conditions for project_manager without allocated projects', () => {
      const scope = rbac.taskScope(
        makeUser({
          role: 'project_manager',
          _id: 'pm-2',
          allocatedProjects: [],
        })
      );
      expect(scope.deletedAt).toBeNull();
      expect(scope.$or).toHaveLength(3);
      expect(scope.$or[0]).toEqual({ assignedTo: 'pm-2' });
      expect(scope.$or[1]).toEqual({ createdBy: 'pm-2' });
      expect(scope.$or[2]).toEqual({ assignedBy: 'pm-2' });
    });

    it('should return self-only conditions for developer', () => {
      const scope = rbac.taskScope(
        makeUser({
          role: 'developer',
          _id: 'dev-1',
          allocatedProjects: ['proj-1'],
        })
      );
      expect(scope.deletedAt).toBeNull();
      expect(scope.$or).toHaveLength(2);
      expect(scope.$or[0]).toEqual({ assignedTo: 'dev-1' });
      expect(scope.$or[1]).toEqual({ createdBy: 'dev-1' });
    });

    it('should return self-only conditions for business_analyst', () => {
      const scope = rbac.taskScope(
        makeUser({
          role: 'business_analyst',
          _id: 'ba-1',
        })
      );
      expect(scope.deletedAt).toBeNull();
      expect(scope.$or).toHaveLength(2);
      expect(scope.$or[0]).toEqual({ assignedTo: 'ba-1' });
      expect(scope.$or[1]).toEqual({ createdBy: 'ba-1' });
    });

    it('should return self-only conditions for read_only', () => {
      const scope = rbac.taskScope(
        makeUser({
          role: 'read_only',
          _id: 'ro-1',
        })
      );
      expect(scope.deletedAt).toBeNull();
      expect(scope.$or).toHaveLength(2);
    });
  });
});
