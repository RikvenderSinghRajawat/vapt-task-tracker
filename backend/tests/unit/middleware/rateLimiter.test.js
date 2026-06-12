'use strict';

jest.mock('express-rate-limit', () => {
  const mockMiddleware = jest.fn((req, res, next) => {
    if (next) next();
  });
  return jest.fn(() => mockMiddleware);
});

const rateLimit = require('express-rate-limit');
const rateLimiter = require('../../../src/middleware/rateLimiter');

describe('rateLimiter middleware', () => {
  let apiOpts, authOpts, sensitiveOpts;

  beforeAll(() => {
    // Capture the options passed to each rateLimit() call during module load
    apiOpts = rateLimit.mock.calls[0][0];
    authOpts = rateLimit.mock.calls[1][0];
    sensitiveOpts = rateLimit.mock.calls[2][0];
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('apiLimiter', () => {
    it('is created with default windowMs and max', () => {
      expect(apiOpts.max).toBe(200);
      expect(apiOpts.windowMs).toBe(15 * 60 * 1000);
    });

    it('sets standard headers and disables legacy headers', () => {
      expect(apiOpts.standardHeaders).toBe(true);
      expect(apiOpts.legacyHeaders).toBe(false);
    });

    it('has a default error message', () => {
      expect(apiOpts.message).toEqual({
        success: false,
        message: 'Too many requests, please try again later'
      });
    });

    it('is exported as a middleware function', () => {
      expect(rateLimiter.apiLimiter).toBeDefined();
      expect(typeof rateLimiter.apiLimiter).toBe('function');
    });
  });

  describe('authLimiter', () => {
    it('is created with stricter limits', () => {
      expect(authOpts.max).toBe(10);
      expect(authOpts.windowMs).toBe(15 * 60 * 1000);
    });

    it('has skipSuccessfulRequests enabled', () => {
      expect(authOpts.skipSuccessfulRequests).toBe(true);
    });

    it('has a login-specific error message', () => {
      expect(authOpts.message).toEqual({
        success: false,
        message: 'Too many login attempts, please try again later'
      });
    });

    it('is exported as a middleware function', () => {
      expect(rateLimiter.authLimiter).toBeDefined();
      expect(typeof rateLimiter.authLimiter).toBe('function');
    });
  });

  describe('sensitiveLimiter', () => {
    it('is created with 1-hour window and max 5', () => {
      expect(sensitiveOpts.max).toBe(5);
      expect(sensitiveOpts.windowMs).toBe(60 * 60 * 1000);
    });

    it('has legacyHeaders enabled', () => {
      expect(sensitiveOpts.legacyHeaders).toBe(true);
    });

    it('has a sensitive-operations error message', () => {
      expect(sensitiveOpts.message).toEqual({
        success: false,
        message: 'Too many sensitive operations, please try again later'
      });
    });

    it('is exported as a middleware function', () => {
      expect(rateLimiter.sensitiveLimiter).toBeDefined();
      expect(typeof rateLimiter.sensitiveLimiter).toBe('function');
    });
  });
});
