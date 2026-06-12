require('dotenv').config({ path: '.env' });

const mockingoose = require('mockingoose');
const mongoose = require('mongoose');

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-signed'),
  verify: jest.fn(),
  decode: jest.fn(),
}));

jest.mock('../../../src/config/smtp', () => ({
  getSmtpStatus: jest.fn(),
}));

jest.mock('../../../src/services/mailService', () => ({
  sendOtpMail: jest.fn().mockResolvedValue({}),
  sendPasswordResetMail: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../../src/models/AuditLog', () => ({
  create: jest.fn().mockResolvedValue({}),
  deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
}));

jest.mock('../../../src/utils/jwt', () => ({
  generateToken: jest.fn().mockReturnValue('mock-access-token'),
  generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
  generateMfaToken: jest.fn().mockReturnValue('mock-mfa-token'),
  verifyToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
}));

const { getSmtpStatus } = require('../../../src/config/smtp');
const AuditLog = require('../../../src/models/AuditLog');
const User = require('../../../src/models/User');
const Otp = require('../../../src/models/Otp');
const jwtUtils = require('../../../src/utils/jwt');

const {
  setupStatus,
  register,
  login,
  getMe,
  logout,
  refreshToken,
} = require('../../../src/controllers/authController');

// ── Test helpers ─────────────────────────────────────────────────────────────

function mockReq(overrides = {}) {
  return {
    ip: '127.0.0.1',
    headers: {},
    get: jest.fn(),
    body: {},
    params: {},
    query: {},
    cookies: {},
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
}

function createMockUser(overrides = {}) {
  const defaults = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Test User',
    email: 'test@example.com',
    password: '$2a$12$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12',
    role: 'developer',
    department: 'Engineering',
    phone: '1234567890',
    isActive: true,
    mfa_enabled: false,
    loginAttempts: 0,
    lockUntil: null,
    lastLogin: null,
    avatar: '',
    preferences: {},
    allocatedProjects: [],
    matchPassword: jest.fn().mockResolvedValue(true),
    isLocked: jest.fn().mockReturnValue(false),
    incLoginAttempts: jest.fn().mockResolvedValue(undefined),
    resetLoginAttempts: jest.fn().mockResolvedValue(undefined),
  };
  const user = { ...defaults, ...overrides };
  user.save = jest.fn().mockResolvedValue(user);
  return user;
}

function mockFindOne(user) {
  return jest.spyOn(User, 'findOne').mockReturnValue({
    select: jest.fn().mockResolvedValue(user),
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('authController', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockReq();
    res = mockRes();
    next = jest.fn();
    mockingoose.resetAll();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('setupStatus', () => {
    it('should return usersExist: false when no users exist', async () => {
      jest.spyOn(User, 'countDocuments').mockResolvedValue(0);

      await setupStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { usersExist: false },
      });
    });

    it('should return usersExist: true when users exist', async () => {
      jest.spyOn(User, 'countDocuments').mockResolvedValue(1);

      await setupStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { usersExist: true },
      });
    });

    it('should forward errors to next', async () => {
      const error = new Error('DB error');
      jest.spyOn(User, 'countDocuments').mockRejectedValue(error);

      await setupStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('register', () => {
    const validBody = {
      name: 'New User',
      email: 'new@example.com',
      password: 'password123',
      role: 'developer',
      department: 'Engineering',
      phone: '9876543210',
    };

    it('should create user and return tokens on successful registration', async () => {
      req.body = validBody;
      jest.spyOn(User, 'findOne').mockResolvedValue(null);

      const createdUser = {
        _id: new mongoose.Types.ObjectId().toString(),
        name: 'New User',
        email: 'new@example.com',
        role: 'developer',
      };
      jest.spyOn(User, 'create').mockResolvedValue(createdUser);

      await register(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'mock-refresh-token', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('token', 'mock-access-token', expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'User registered successfully',
          data: expect.objectContaining({
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            user: expect.objectContaining({
              id: createdUser._id,
              name: 'New User',
              email: 'new@example.com',
              role: 'developer',
            }),
          }),
        })
      );
    });

    it('should return 400 when email already exists', async () => {
      req.body = validBody;
      jest.spyOn(User, 'findOne').mockResolvedValue({ email: 'new@example.com' });

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'User already exists with this email',
        })
      );
    });

    it('should handle MongoError 11000 on create', async () => {
      req.body = validBody;
      jest.spyOn(User, 'findOne').mockResolvedValue(null);

      const mongoError = new Error('E11000 duplicate key error collection');
      mongoError.code = 11000;
      jest.spyOn(User, 'create').mockRejectedValue(mongoError);

      await register(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0].code).toBe(11000);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials, return tokens and set cookies', async () => {
      req.body = { email: 'test@example.com', password: 'correct-password', skipOtp: true };
      const mockUser = createMockUser();
      mockFindOne(mockUser);

      await login(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'mock-refresh-token', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('token', 'mock-access-token', expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Login successful',
          data: expect.objectContaining({
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
          }),
        })
      );
    });

    it('should return 401 for non-existent email', async () => {
      req.body = { email: 'unknown@example.com', password: 'password' };
      jest.spyOn(User, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Invalid credentials' })
      );
    });

    it('should return 401 for wrong password', async () => {
      req.body = { email: 'test@example.com', password: 'wrong-password' };
      const mockUser = createMockUser({ matchPassword: jest.fn().mockResolvedValue(false) });
      mockFindOne(mockUser);

      await login(req, res, next);

      expect(mockUser.incLoginAttempts).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Invalid credentials' })
      );
    });

    it('should return 401 for deactivated account', async () => {
      req.body = { email: 'test@example.com', password: 'password' };
      const mockUser = createMockUser({ isActive: false });
      mockFindOne(mockUser);

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Your account has been deactivated' })
      );
    });

    it('should return 401 for locked account', async () => {
      req.body = { email: 'test@example.com', password: 'password' };
      const mockUser = createMockUser({ isLocked: jest.fn().mockReturnValue(true) });
      mockFindOne(mockUser);

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringContaining('locked') })
      );
    });

    it('should return 200 with OTP required when SMTP is configured', async () => {
      req.body = { email: 'test@example.com', password: 'correct-password' };
      const mockUser = createMockUser();
      mockFindOne(mockUser);
      getSmtpStatus.mockReturnValue({ configured: true });
      jest.spyOn(Otp, 'findOne').mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });
      jest.spyOn(Otp, 'create').mockResolvedValue({});

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'OTP sent to your email',
          data: expect.objectContaining({ otpRequired: true }),
        })
      );
    });

    it('should return 200 with MFA required when user has MFA enabled', async () => {
      req.body = { email: 'test@example.com', password: 'correct-password' };
      const mockUser = createMockUser({ mfa_enabled: true });
      mockFindOne(mockUser);

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'MFA validation required',
          data: expect.objectContaining({ mfaRequired: true, mfaToken: 'mock-mfa-token' }),
        })
      );
    });

    it('should call AuditLog.create with correct data on successful login', async () => {
      req.body = { email: 'test@example.com', password: 'correct-password', skipOtp: true };
      const mockUser = createMockUser();
      mockFindOne(mockUser);

      await login(req, res, next);

      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser._id,
          action: 'login',
          entityType: 'user',
          entityId: mockUser._id.toString(),
          entityName: mockUser.name,
          ipAddress: '127.0.0.1',
          status: 'success',
        })
      );
    });
  });

  describe('getMe', () => {
    it('should return the user from req.user', async () => {
      const mockUser = createMockUser();
      req.user = { _id: mockUser._id };
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      await getMe(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
      });
    });

    it('should forward errors to next', async () => {
      req.user = { _id: 'nonexistent' };
      const error = new Error('User not found');
      jest.spyOn(User, 'findById').mockRejectedValue(error);

      await getMe(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('logout', () => {
    it('should clear refreshToken cookie and return success', async () => {
      req.user = { _id: 'user123', name: 'Test User' };
      await logout(req, res, next);

      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'Logged out successfully' })
      );
    });

    it('should handle errors gracefully without throwing', async () => {
      AuditLog.create.mockRejectedValueOnce(new Error('DB error'));
      req.user = { _id: 'user123', name: 'Test User' };

      await expect(logout(req, res, next)).resolves.not.toThrow();

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'Logged out successfully' })
      );
    });

    it('should work without req.user', async () => {
      delete req.user;
      await logout(req, res, next);

      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'Logged out successfully' })
      );
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh tokens with valid refreshToken cookie', async () => {
      req.cookies = { refreshToken: 'valid-refresh-token' };
      jwtUtils.verifyRefreshToken.mockReturnValue({ id: 'user123' });
      const mockUser = createMockUser();
      jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

      await refreshToken(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'mock-refresh-token', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('token', 'mock-access-token', expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Token refreshed successfully',
          data: expect.objectContaining({
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
          }),
        })
      );
    });

    it('should return 401 when refreshToken is missing', async () => {
      req.cookies = {};

      await refreshToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Refresh token required' })
      );
    });

    it('should return 401 with invalid token', async () => {
      req.cookies = { refreshToken: 'invalid-token' };
      jwtUtils.verifyRefreshToken.mockImplementation(() => {
        const err = new Error('jwt malformed');
        err.name = 'JsonWebTokenError';
        throw err;
      });

      await refreshToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Invalid refresh token' })
      );
    });
  });
});
