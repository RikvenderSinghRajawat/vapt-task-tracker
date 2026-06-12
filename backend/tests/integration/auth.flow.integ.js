/**
 * Integration tests for critical auth flows.
 * Uses mockingoose-style mocks + supertest against the actual Express app.
 *
 * Run: npx jest tests/integration/auth.flow.integ.js --forceExit --detectOpenHandles
 */

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/vapt_tracker_test';
process.env.SMTP_HOST = '';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const request = require('supertest');
const { generateRefreshToken } = require('../../src/utils/jwt');

// ---------------------------------------------------------------------------
// Mock User model
// ---------------------------------------------------------------------------
const mockUserFindOne = jest.fn();
const mockUserFindById = jest.fn();
const mockUserCountDocuments = jest.fn();
const mockUserCreate = jest.fn();

jest.mock('../../src/models/User', () => ({
  findOne: mockUserFindOne,
  findById: mockUserFindById,
  countDocuments: mockUserCountDocuments,
  create: mockUserCreate,
}));

// ---------------------------------------------------------------------------
// Mock Otp model
// ---------------------------------------------------------------------------
jest.mock('../../src/models/Otp', () => ({
  deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  findOne: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue({}),
}));

// ---------------------------------------------------------------------------
// Mock AuditLog model
// ---------------------------------------------------------------------------
jest.mock('../../src/models/AuditLog', () => ({
  create: jest.fn().mockResolvedValue({}),
}));

// ---------------------------------------------------------------------------
// Mock auth middleware — override `protect` to inject a fake user
// ---------------------------------------------------------------------------
jest.mock('../../src/middleware/auth', () => {
  const actual = jest.requireActual('../../src/middleware/auth');
  return {
    ...actual,
    protect: jest.fn((req, _res, next) => {
      req.user = {
        _id: '507f1f77bcf86cd799439011',
        id: '507f1f77bcf86cd799439011',
        name: 'Test User',
        email: 'test@test.com',
        role: 'admin',
        isActive: true,
        isVerified: true,
        mfa_enabled: false,
        preferences: {},
        allocatedProjects: [],
        avatar: '',
        get: jest.fn(),
        toString: () => '507f1f77bcf86cd799439011',
      };
      req.user.populate = jest.fn().mockResolvedValue(req.user);
      next();
    }),
  };
});

// ---------------------------------------------------------------------------
// Import the app AFTER all mocks are registered
// ---------------------------------------------------------------------------
const { app } = require('../../src/app');

// ---------------------------------------------------------------------------
// Helper — build a fake user document
// ---------------------------------------------------------------------------
function buildUser(overrides = {}) {
  return {
    _id: '507f1f77bcf86cd799439011',
    id: '507f1f77bcf86cd799439011',
    name: 'Test User',
    email: 'test@test.com',
    password: '$2a$12$hashedpassword',
    role: 'admin',
    isActive: true,
    isVerified: true,
    mfa_enabled: false,
    preferences: {
      theme: 'light',
      notifications: { email: true, inApp: true, slack: false },
      language: 'en',
    },
    allocatedProjects: [],
    avatar: '',
    lastLogin: new Date(),
    loginAttempts: 0,
    lockUntil: null,
    matchPassword: jest.fn().mockResolvedValue(true),
    isLocked: jest.fn().mockReturnValue(false),
    incLoginAttempts: jest.fn().mockResolvedValue(undefined),
    resetLoginAttempts: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue({}),
    get: jest.fn(),
    populate: jest.fn().mockResolvedValue(null),
    toString: () => '507f1f77bcf86cd799439011',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
  const user = buildUser();
  mockUserFindOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
  mockUserFindById.mockResolvedValue(user);
  mockUserCountDocuments.mockResolvedValue(1);
});

// ===========================================================================
// Tests
// ===========================================================================
describe('Auth Integration Flows', () => {

  /* -----------------------------------------------------------------------
   * 1. Health Check
   * -----------------------------------------------------------------------*/
  describe('Health Check', () => {
    it('GET /api/health returns 200 with correct shape', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('environment');
    });
  });

  /* -----------------------------------------------------------------------
   * 2. Setup Status
   * -----------------------------------------------------------------------*/
  describe('Setup Status', () => {
    it('returns usersExist: false when database is empty', async () => {
      mockUserCountDocuments.mockResolvedValue(0);

      const res = await request(app).get('/api/auth/setup-status');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.usersExist).toBe(false);
    });

    it('returns usersExist: true when users exist', async () => {
      mockUserCountDocuments.mockResolvedValue(5);

      const res = await request(app).get('/api/auth/setup-status');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.usersExist).toBe(true);
    });
  });

  /* -----------------------------------------------------------------------
   * 3. Complete Login Flow
   * -----------------------------------------------------------------------*/
  describe('Complete Login', () => {
    it('logs in with valid credentials and receives tokens + cookies', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'password123', skipOtp: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/login successful/i);

      // --- data.user ---
      expect(res.body.data).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.id).toBe('507f1f77bcf86cd799439011');
      expect(res.body.data.user.email).toBe('test@test.com');
      expect(res.body.data.user.role).toBe('admin');

      // --- accessToken & refreshToken in body ---
      expect(res.body.data.accessToken).toBeDefined();
      expect(typeof res.body.data.accessToken).toBe('string');
      expect(res.body.data.refreshToken).toBeDefined();
      expect(typeof res.body.data.refreshToken).toBe('string');

      // --- httpOnly cookies ---
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const joined = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(joined).toMatch(/refreshToken=/);
      expect(joined).toMatch(/token=/);
      expect(joined).toMatch(/httponly/i);
    });
  });

  /* -----------------------------------------------------------------------
   * 4. Login Failure Flows
   * -----------------------------------------------------------------------*/
  describe('Login Failures', () => {
    it('returns 401 for wrong password', async () => {
      const user = buildUser();
      user.matchPassword.mockResolvedValue(false);
      mockUserFindOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong', skipOtp: true });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid credentials/i);
      expect(user.incLoginAttempts).toHaveBeenCalledTimes(1);
    });

    it('returns 400 for missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 for deactivated account', async () => {
      const user = buildUser({ isActive: false });
      mockUserFindOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'inactive@test.com', password: 'password123', skipOtp: true });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/deactivated/i);
    });

    it('returns 401 for locked account', async () => {
      const user = buildUser();
      user.isLocked.mockReturnValue(true);
      mockUserFindOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'locked@test.com', password: 'password123', skipOtp: true });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/locked/i);
    });
  });

  /* -----------------------------------------------------------------------
   * 5. Get Current User
   * -----------------------------------------------------------------------*/
  describe('Get Current User', () => {
    it('returns the authenticated user profile', async () => {
      const user = buildUser({ name: 'Current User' });
      mockUserFindById.mockResolvedValue(user);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer fake-access-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.email).toBe('test@test.com');
      expect(res.body.data.name).toBe('Current User');
    });
  });

  /* -----------------------------------------------------------------------
   * 6. Refresh Token Flow
   * -----------------------------------------------------------------------*/
  describe('Refresh Token', () => {
    it('returns new access and refresh tokens when given a valid refresh token cookie', async () => {
      const user = buildUser();
      mockUserFindById.mockResolvedValue(user);

      const refreshToken = generateRefreshToken('507f1f77bcf86cd799439011');

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(typeof res.body.data.accessToken).toBe('string');
      expect(res.body.data.refreshToken).toBeDefined();
      expect(typeof res.body.data.refreshToken).toBe('string');

      // A new cookie should be set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const joined = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(joined).toMatch(/refreshToken=/);
    });

    it('returns 401 when no refresh token is provided', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/refresh token required/i);
    });

    it('returns 401 when the user has been deactivated', async () => {
      const user = buildUser({ isActive: false });
      mockUserFindById.mockResolvedValue(user);

      const refreshToken = generateRefreshToken('507f1f77bcf86cd799439011');

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refreshToken=${refreshToken}`)
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/inactive/i);
    });
  });

  /* -----------------------------------------------------------------------
   * 7. Logout Flow
   * -----------------------------------------------------------------------*/
  describe('Logout', () => {
    it('clears cookies and returns success', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/logged out/i);

      const cookies = res.headers['set-cookie'];
      if (cookies) {
        const joined = Array.isArray(cookies) ? cookies.join('; ') : cookies;
        expect(joined).toMatch(/refreshToken=;/);
      }
    });
  });
});
