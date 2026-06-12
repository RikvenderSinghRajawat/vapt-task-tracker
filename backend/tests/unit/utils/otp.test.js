require('dotenv').config({ path: '.env' });
const crypto = require('crypto');

describe('OTP Utils', () => {
  let otpUtils;

  beforeEach(() => {
    otpUtils = require('../../../src/utils/otp');
  });

  describe('generateOtp()', () => {
    it('should return a 6-digit string', () => {
      const otp = otpUtils.generateOtp();
      expect(typeof otp).toBe('string');
      expect(otp).toMatch(/^\d{6}$/);
    });

    it('should generate different OTPs on successive calls', () => {
      const otp1 = otpUtils.generateOtp();
      const otp2 = otpUtils.generateOtp();
      expect(otp1).not.toBe(otp2);
    });
  });

  describe('hashOtp(otp)', () => {
    it('should return a SHA-256 hex string', () => {
      const hash = otpUtils.hashOtp('123456');
      expect(typeof hash).toBe('string');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce the same hash for the same OTP', () => {
      const hash1 = otpUtils.hashOtp('654321');
      const hash2 = otpUtils.hashOtp('654321');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different OTPs', () => {
      const hash1 = otpUtils.hashOtp('111111');
      const hash2 = otpUtils.hashOtp('222222');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyOtp(rawOtp, hashedOtp)', () => {
    it('should return true for a matching OTP', () => {
      const otp = otpUtils.generateOtp();
      const hash = otpUtils.hashOtp(otp);
      expect(otpUtils.verifyOtp(otp, hash)).toBe(true);
    });

    it('should return false for an incorrect OTP', () => {
      const hash = otpUtils.hashOtp('111111');
      expect(otpUtils.verifyOtp('222222', hash)).toBe(false);
    });

    it('should return false when rawOtp is null', () => {
      const hash = otpUtils.hashOtp('111111');
      expect(otpUtils.verifyOtp(null, hash)).toBe(false);
    });

    it('should return false when hashedOtp is null', () => {
      expect(otpUtils.verifyOtp('111111', null)).toBe(false);
    });

    it('should return false when rawOtp is undefined', () => {
      const hash = otpUtils.hashOtp('111111');
      expect(otpUtils.verifyOtp(undefined, hash)).toBe(false);
    });

    it('should return false when hashedOtp is undefined', () => {
      expect(otpUtils.verifyOtp('111111', undefined)).toBe(false);
    });

    it('should return false when rawOtp is empty string', () => {
      const hash = otpUtils.hashOtp('111111');
      expect(otpUtils.verifyOtp('', hash)).toBe(false);
    });

    it('should return false when hashedOtp has a different length', () => {
      expect(otpUtils.verifyOtp('111111', 'short')).toBe(false);
    });
  });

  describe('getExpiryDate(minutes?)', () => {
    it('should return a Date in the future with default minutes', () => {
      const before = Date.now();
      const expiry = otpUtils.getExpiryDate();
      expect(expiry).toBeInstanceOf(Date);
      expect(expiry.getTime()).toBeGreaterThan(before);
    });

    it('should use the provided minutes parameter', () => {
      const before = Date.now();
      const expiry = otpUtils.getExpiryDate(10);
      const diff = expiry.getTime() - before;
      expect(diff).toBeGreaterThanOrEqual(9.5 * 60 * 1000);
      expect(diff).toBeLessThanOrEqual(10.5 * 60 * 1000);
    });

    it('should default to 5 minutes when no argument is passed', () => {
      const before = Date.now();
      const expiry = otpUtils.getExpiryDate();
      const diff = expiry.getTime() - before;
      expect(diff).toBeGreaterThanOrEqual(4.5 * 60 * 1000);
      expect(diff).toBeLessThanOrEqual(5.5 * 60 * 1000);
    });
  });

  describe('isExpired(expiresAt)', () => {
    it('should return true for a past date', () => {
      const past = new Date(Date.now() - 10000);
      expect(otpUtils.isExpired(past)).toBe(true);
    });

    it('should return false for a future date', () => {
      const future = new Date(Date.now() + 10000);
      expect(otpUtils.isExpired(future)).toBe(false);
    });

    it('should return true for a very old date', () => {
      const oldDate = new Date('2020-01-01');
      expect(otpUtils.isExpired(oldDate)).toBe(true);
    });

    it('should accept a timestamp number', () => {
      const past = Date.now() - 5000;
      expect(otpUtils.isExpired(past)).toBe(true);
    });

    it('should accept an ISO string', () => {
      const future = new Date(Date.now() + 60000).toISOString();
      expect(otpUtils.isExpired(future)).toBe(false);
    });
  });

  describe('maskEmail(email)', () => {
    it('should mask email with first character and asterisks', () => {
      expect(otpUtils.maskEmail('john@example.com')).toBe('j*****@example.com');
    });

    it('should handle single-character local part', () => {
      expect(otpUtils.maskEmail('j@example.com')).toBe('j*****@example.com');
    });

    it('should return null when given null', () => {
      expect(otpUtils.maskEmail(null)).toBeNull();
    });

    it('should return undefined when given undefined', () => {
      expect(otpUtils.maskEmail(undefined)).toBeUndefined();
    });

    it('should return the string as-is if it has no @ sign', () => {
      expect(otpUtils.maskEmail('notanemail')).toBe('notanemail');
    });

    it('should handle empty string', () => {
      expect(otpUtils.maskEmail('')).toBe('');
    });

    it('should handle email with dots in domain', () => {
      expect(otpUtils.maskEmail('alice@sub.example.com')).toBe('a*****@sub.example.com');
    });

    it('should handle email with plus addressing', () => {
      expect(otpUtils.maskEmail('user+tag@domain.com')).toBe('u*****@domain.com');
    });

    it('should handle two-character local part', () => {
      expect(otpUtils.maskEmail('ab@domain.com')).toBe('a*****@domain.com');
    });
  });

  describe('exported constants', () => {
    it('should export OTP_LENGTH as 6', () => {
      expect(otpUtils.OTP_LENGTH).toBe(6);
    });

    it('should export OTP_EXPIRY_MINUTES as 5', () => {
      expect(otpUtils.OTP_EXPIRY_MINUTES).toBe(5);
    });

    it('should export MAX_ATTEMPTS as 5', () => {
      expect(otpUtils.MAX_ATTEMPTS).toBe(5);
    });

    it('should export RESEND_COOLDOWN_SECONDS as 30', () => {
      expect(otpUtils.RESEND_COOLDOWN_SECONDS).toBe(30);
    });

    it('should export MAX_RESENDS as 5', () => {
      expect(otpUtils.MAX_RESENDS).toBe(5);
    });
  });
});
