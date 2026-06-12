'use strict';

jest.mock('express-validator', () => ({
  validationResult: jest.fn()
}));

const { validationResult } = require('express-validator');
const validate = require('../../../src/middleware/validate');

function mockReq(overrides = {}) {
  return { ip: '127.0.0.1', headers: {}, body: {}, params: {}, query: {}, ...overrides };
}
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
function mockNext() { return jest.fn(); }

describe('validate middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockReq();
    res = mockRes();
    next = mockNext();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when there are no validation errors', () => {
    it('calls next() and does not return a response', () => {
      validationResult.mockReturnValue({
        isEmpty: () => true
      });

      validate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('when validation fails', () => {
    it('responds with 400', () => {
      const mockErrors = [
        { path: 'email', msg: 'Invalid email address' },
        { path: 'password', msg: 'Password must be at least 8 characters' }
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      });

      validate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns errors in the expected format', () => {
      const mockErrors = [
        { path: 'email', msg: 'Invalid email address' },
        { path: 'password', msg: 'Password must be at least 8 characters' }
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      });

      validate(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        errors: [
          { field: 'email', message: 'Invalid email address' },
          { field: 'password', message: 'Password must be at least 8 characters' }
        ]
      });
    });

    it('calls validationResult with the request object', () => {
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ path: 'name', msg: 'Name is required' }]
      });

      validate(req, res, next);

      expect(validationResult).toHaveBeenCalledWith(req);
    });
  });
});
