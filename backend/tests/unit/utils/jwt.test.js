require('dotenv').config({ path: '.env' });
const jwt = require('jsonwebtoken');

describe('JWT Utils', () => {
  let jwtUtils;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-for-testing';
    process.env.JWT_EXPIRE = '15m';
    process.env.REFRESH_TOKEN_EXPIRE = '7d';
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    jest.resetModules();
    jwtUtils = require('../../../src/utils/jwt');
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
    delete process.env.REFRESH_TOKEN_SECRET;
    delete process.env.JWT_EXPIRE;
    delete process.env.REFRESH_TOKEN_EXPIRE;
    delete process.env.NODE_ENV;
  });

  describe('generateToken(payload, options?)', () => {
    it('should generate a JWT token with an object payload', () => {
      const token = jwtUtils.generateToken({ id: '123', role: 'admin' });
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.decode(token);
      expect(decoded.id).toBe('123');
      expect(decoded.role).toBe('admin');
      expect(decoded.sf).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should convert a string payload to { id: payload }', () => {
      const token = jwtUtils.generateToken('user456');
      const decoded = jwt.decode(token);
      expect(decoded.id).toBe('user456');
      expect(decoded.sf).toBeDefined();
    });

    it('should use the default expiry from JWT_EXPIRE when no options given', () => {
      const token = jwtUtils.generateToken({ id: '1' });
      const decoded = jwt.decode(token);
      const diff = decoded.exp - decoded.iat;
      expect(diff).toBe(900);
    });

    it('should honour a custom expiresIn option', () => {
      const token = jwtUtils.generateToken({ id: '1' }, { expiresIn: '1h' });
      const decoded = jwt.decode(token);
      const diff = decoded.exp - decoded.iat;
      expect(diff).toBe(3600);
    });

    it('should honour a numeric expiresIn option', () => {
      const token = jwtUtils.generateToken({ id: '1' }, { expiresIn: 120 });
      const decoded = jwt.decode(token);
      const diff = decoded.exp - decoded.iat;
      expect(diff).toBe(120);
    });
  });

  describe('generateRefreshToken(payload)', () => {
    it('should generate a refresh token with object payload', () => {
      const token = jwtUtils.generateRefreshToken({ id: 'abc', type: 'refresh' });
      expect(typeof token).toBe('string');
      const decoded = jwt.decode(token);
      expect(decoded.id).toBe('abc');
      expect(decoded.type).toBe('refresh');
      expect(decoded.sf).toBeDefined();
    });

    it('should convert string payload to object', () => {
      const token = jwtUtils.generateRefreshToken('user789');
      const decoded = jwt.decode(token);
      expect(decoded.id).toBe('user789');
    });

    it('should use REFRESH_TOKEN_EXPIRE for expiration', () => {
      const token = jwtUtils.generateRefreshToken({ id: '1' });
      const decoded = jwt.decode(token);
      const diff = decoded.exp - decoded.iat;
      expect(diff).toBe(7 * 24 * 3600);
    });

    it('should sign with the refresh secret (tokens signed with different secrets differ)', () => {
      const refreshToken = jwtUtils.generateRefreshToken({ id: 'test' });
      const accessToken = jwtUtils.generateToken({ id: 'test' });
      const decodedRefresh = jwt.decode(refreshToken);
      const decodedAccess = jwt.decode(accessToken);
      expect(decodedRefresh.id).toBe('test');
      expect(decodedAccess.id).toBe('test');
      // Both decode fine; signature verification is the difference
      expect(refreshToken).not.toBe(accessToken);
    });
  });

  describe('generateMfaToken(id)', () => {
    it('should generate an MFA token with purpose of mfa_pending', () => {
      const token = jwtUtils.generateMfaToken('mfa-user-id');
      const decoded = jwt.decode(token);
      expect(decoded.id).toBe('mfa-user-id');
      expect(decoded.purpose).toBe('mfa_pending');
      expect(decoded.sf).toBeDefined();
    });

    it('should set a 5-minute expiry', () => {
      const token = jwtUtils.generateMfaToken('user-1');
      const decoded = jwt.decode(token);
      const diff = decoded.exp - decoded.iat;
      expect(diff).toBe(300);
    });
  });

  describe('generateResetToken(id)', () => {
    it('should generate a reset token with purpose of password_reset', () => {
      const token = jwtUtils.generateResetToken('reset-user-id');
      const decoded = jwt.decode(token);
      expect(decoded.id).toBe('reset-user-id');
      expect(decoded.purpose).toBe('password_reset');
      expect(decoded.sf).toBeDefined();
    });

    it('should set a 15-minute expiry', () => {
      const token = jwtUtils.generateResetToken('user-1');
      const decoded = jwt.decode(token);
      const diff = decoded.exp - decoded.iat;
      expect(diff).toBe(900);
    });
  });

  describe('verifyToken(token)', () => {
    it('should verify a valid token successfully', () => {
      const token = jwtUtils.generateToken({ id: '456', role: 'user' });
      const decoded = jwtUtils.verifyToken(token);
      expect(decoded.id).toBe('456');
      expect(decoded.role).toBe('user');
    });

    it('should throw JsonWebTokenError for an expired token', () => {
      const secret = process.env.JWT_SECRET;
      const expiredToken = jwt.sign({ id: '1' }, secret, { expiresIn: '0s' });
      expect(() => jwtUtils.verifyToken(expiredToken)).toThrow('jwt expired');
    });

    it('should throw JsonWebTokenError for a tampered token', () => {
      const token = jwtUtils.generateToken({ id: '1' });
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(() => jwtUtils.verifyToken(tampered)).toThrow();
    });

    it('should throw JsonWebTokenError for a token signed with wrong secret', () => {
      const token = jwt.sign({ id: '1' }, 'wrong-secret');
      expect(() => jwtUtils.verifyToken(token)).toThrow('invalid signature');
    });

    it('should throw for a completely invalid token string', () => {
      expect(() => jwtUtils.verifyToken('not-a-jwt')).toThrow();
    });

    it('should throw for an empty string token', () => {
      expect(() => jwtUtils.verifyToken('')).toThrow();
    });
  });

  describe('verifyRefreshToken(token)', () => {
    it('should verify a valid refresh token', () => {
      const token = jwtUtils.generateRefreshToken({ id: 'refresh-1' });
      const decoded = jwtUtils.verifyRefreshToken(token);
      expect(decoded.id).toBe('refresh-1');
    });

    it('should throw for an expired refresh token', () => {
      const secret = process.env.REFRESH_TOKEN_SECRET;
      const expiredToken = jwt.sign({ id: '1' }, secret, { expiresIn: '0s' });
      expect(() => jwtUtils.verifyRefreshToken(expiredToken)).toThrow('jwt expired');
    });

    it('should throw for a tampered refresh token', () => {
      const token = jwtUtils.generateRefreshToken({ id: '1' });
      const tampered = token.slice(0, -3) + 'abc';
      expect(() => jwtUtils.verifyRefreshToken(tampered)).toThrow();
    });

    it('should throw when verifying an access token with the refresh verifier', () => {
      const accessToken = jwtUtils.generateToken({ id: '1' });
      expect(() => jwtUtils.verifyRefreshToken(accessToken)).toThrow('invalid signature');
    });
  });

  describe('decodeToken(token)', () => {
    it('should decode a valid token without verification', () => {
      const token = jwtUtils.generateToken({ id: 'decode-me', role: 'viewer' });
      const decoded = jwtUtils.decodeToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded.id).toBe('decode-me');
      expect(decoded.role).toBe('viewer');
    });

    it('should return null for a malformed token', () => {
      const result = jwtUtils.decodeToken('not-valid');
      expect(result).toBeNull();
    });

    it('should decode an expired token (no signature check)', () => {
      // decodeToken uses jwt.decode which doesn't verify expiry
      const secret = process.env.JWT_SECRET;
      const expiredToken = jwt.sign({ id: 'expired' }, secret, { expiresIn: '0s' });
      const decoded = jwtUtils.decodeToken(expiredToken);
      expect(decoded).not.toBeNull();
      expect(decoded.id).toBe('expired');
    });
  });

  describe('isTokenExpired(token)', () => {
    it('should return false for a non-expired token', () => {
      const token = jwt.sign({ id: '1', exp: Math.floor(Date.now() / 1000) + 3600 }, 'any-secret');
      expect(jwtUtils.isTokenExpired(token)).toBe(false);
    });

    it('should return true for an expired token', () => {
      const token = jwt.sign({ id: '1', exp: Math.floor(Date.now() / 1000) - 3600 }, 'any-secret');
      expect(jwtUtils.isTokenExpired(token)).toBe(true);
    });

    it('should return true for a token without exp claim', () => {
      const token = jwt.sign({ id: '1' }, 'any-secret', { noTimestamp: true });
      expect(jwtUtils.isTokenExpired(token)).toBe(true);
    });

    it('should return true for a malformed token', () => {
      expect(jwtUtils.isTokenExpired('garbage')).toBe(true);
    });

    it('should return true for an empty string', () => {
      expect(jwtUtils.isTokenExpired('')).toBe(true);
    });
  });
});
