const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Server fingerprint: changes every time the server starts.
// All JWT tokens include the current fingerprint.
// When the server restarts, the fingerprint changes,
// invalidating ALL existing tokens and forcing re-login.
const SERVER_FINGERPRINT = crypto
  .createHash('sha256')
  .update(`${process.env.JWT_SECRET || 'dev'}:${Date.now()}`)
  .digest('hex')
  .slice(0, 16);

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  return secret || 'dev-jwt-secret-do-not-use-in-production';
};

const getRefreshSecret = () => {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('REFRESH_TOKEN_SECRET environment variable is required in production');
  }
  return secret || 'dev-refresh-secret-do-not-use-in-production';
};

const generateToken = (payload, options = {}) => {
  const tokenPayload = typeof payload === 'object' ? payload : { id: payload };
  return jwt.sign({ ...tokenPayload, sf: SERVER_FINGERPRINT }, getJwtSecret(), {
    expiresIn: options.expiresIn || process.env.JWT_EXPIRE || '30m'
  });
};

const generateRefreshToken = (payload) => {
  const tokenPayload = typeof payload === 'object' ? payload : { id: payload };
  return jwt.sign({ ...tokenPayload, sf: SERVER_FINGERPRINT }, getRefreshSecret(), {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '12h'
  });
};

const generateMfaToken = (id) => {
  return jwt.sign({ id, purpose: 'mfa_pending', sf: SERVER_FINGERPRINT }, getJwtSecret(), {
    expiresIn: '5m'
  });
};

const generateResetToken = (id) => {
  return jwt.sign({ id, purpose: 'password_reset', sf: SERVER_FINGERPRINT }, getJwtSecret(), {
    expiresIn: '15m'
  });
};

const verifyTokenWithFingerprint = (token) => {
  const decoded = jwt.verify(token, getJwtSecret());
  if (decoded.sf && decoded.sf !== SERVER_FINGERPRINT) {
    const err = new Error('Server fingerprint mismatch — session invalidated by server restart');
    err.name = 'FingerprintMismatchError';
    throw err;
  }
  return decoded;
};

const verifyRefreshTokenWithFingerprint = (token) => {
  const decoded = jwt.verify(token, getRefreshSecret());
  if (decoded.sf && decoded.sf !== SERVER_FINGERPRINT) {
    const err = new Error('Server fingerprint mismatch — session invalidated by server restart');
    err.name = 'FingerprintMismatchError';
    throw err;
  }
  return decoded;
};

const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return true;
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  generateMfaToken,
  generateResetToken,
  verifyToken: verifyTokenWithFingerprint,
  verifyRefreshToken: verifyRefreshTokenWithFingerprint,
  decodeToken,
  isTokenExpired
};
