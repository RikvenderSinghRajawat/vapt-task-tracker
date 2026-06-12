'use strict';

const errorHandler = require('../../../src/middleware/errorHandler');

function mockReq(overrides = {}) {
  return { ip: '127.0.0.1', headers: {}, body: {}, params: {}, query: {}, id: 'req-001', ...overrides };
}
function mockRes() {
  const res = {};
  res.locals = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
function mockNext() { return jest.fn(); }

describe('errorHandler middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockReq();
    res = mockRes();
    next = mockNext();
  });

  describe('CastError (MongoDB ObjectId)', () => {
    it('responds with 400', () => {
      const err = { name: 'CastError', value: 'abc123', path: '_id' };
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          status: 400,
          message: 'Invalid identifier: abc123',
          requestId: 'req-001',
          details: expect.objectContaining({ path: '_id' })
        })
      );
    });
  });

  describe('11000 duplicate key error', () => {
    it('responds with 409', () => {
      const err = { code: 11000, keyValue: { email: 'test@test.com' } };
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          status: 409,
          message: 'email already exists',
          requestId: 'req-001'
        })
      );
    });

    it('falls back to keyPattern when keyValue is absent', () => {
      const err = { code: 11000, keyPattern: { username: 1 } };
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'username already exists' })
      );
    });

    it('uses "field" fallback when neither keyValue nor keyPattern exist', () => {
      const err = { code: 11000 };
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'field already exists' })
      );
    });
  });

  describe('ValidationError (Mongoose)', () => {
    it('responds with 422', () => {
      const err = {
        name: 'ValidationError',
        errors: {
          email: { message: 'Email is required' },
          name: { message: 'Name is required' }
        }
      };
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          status: 422,
          message: 'Email is required, Name is required',
          requestId: 'req-001',
          details: expect.objectContaining({ errors: err.errors })
        })
      );
    });

    it('falls back to default message when errors object is empty', () => {
      const err = { name: 'ValidationError', errors: {} };
      errorHandler(err, req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Validation failed' })
      );
    });
  });

  describe('JsonWebTokenError', () => {
    it('responds with 401 and the error message', () => {
      const err = { name: 'JsonWebTokenError', message: 'jwt malformed' };
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          status: 401,
          message: 'jwt malformed'
        })
      );
    });

    it('provides default message when no message on error', () => {
      const err = { name: 'JsonWebTokenError' };
      errorHandler(err, req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid authentication token' })
      );
    });
  });

  describe('TokenExpiredError', () => {
    it('responds with 401 and expiry message', () => {
      const err = { name: 'TokenExpiredError', message: 'jwt expired' };
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          status: 401,
          message: 'Authentication token expired'
        })
      );
    });
  });

  describe('SyntaxError / URIError', () => {
    it('responds with 400 for SyntaxError', () => {
      const err = new SyntaxError('Unexpected token');
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          status: 400,
          message: 'Malformed JSON request body'
        })
      );
    });
  });

  describe('ECONNREFUSED / ETIMEDOUT', () => {
    it('responds with 503 for ECONNREFUSED', () => {
      const err = { code: 'ECONNREFUSED', message: 'connect ECONNREFUSED 127.0.0.1:27017' };
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          status: 503,
          message: 'Database unavailable',
          details: expect.objectContaining({ details: err.message })
        })
      );
    });

    it('responds with 503 for ETIMEDOUT', () => {
      const err = { code: 'ETIMEDOUT', message: 'connection timed out' };
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 503 }));
    });
  });

  describe('generic Error', () => {
    it('responds with 500 and default message', () => {
      const err = new Error('Something broke');
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          status: 500,
          message: 'Internal server error'
        })
      );
    });
  });

  describe('response body structure', () => {
    it('includes success, message, status, and requestId', () => {
      const err = new Error('test');
      errorHandler(err, req, res, next);
      const body = res.json.mock.calls[0][0];
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('requestId', 'req-001');
    });

    it('uses "unknown" when no requestId is available', () => {
      const err = new Error('test');
      errorHandler(err, { id: undefined, ip: '127.0.0.1' }, res, next);
      const body = res.json.mock.calls[0][0];
      expect(body).toHaveProperty('requestId', 'unknown');
    });
  });

  describe('development / LOG_ERRORS', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...OLD_ENV };
    });

    afterAll(() => {
      process.env = OLD_ENV;
    });

    it('includes stack and name when NODE_ENV=development', () => {
      process.env.NODE_ENV = 'development';
      const handler = require('../../../src/middleware/errorHandler');
      const err = new Error('dev error');
      handler(err, req, res, next);
      const body = res.json.mock.calls[0][0];
      expect(body).toHaveProperty('stack');
      expect(body).toHaveProperty('name', 'Error');
    });

    it('includes stack and name when LOG_ERRORS=true', () => {
      process.env.LOG_ERRORS = 'true';
      const handler = require('../../../src/middleware/errorHandler');
      const err = new Error('logged error');
      handler(err, req, res, next);
      const body = res.json.mock.calls[0][0];
      expect(body).toHaveProperty('stack');
      expect(body).toHaveProperty('name', 'Error');
    });
  });
});
