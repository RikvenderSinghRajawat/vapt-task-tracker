const crypto = require('crypto');

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;
const MAX_RESENDS = 5;

function generateOtp() {
  const digits = [];
  for (let i = 0; i < OTP_LENGTH; i++) {
    digits.push(crypto.randomInt(0, 10));
  }
  return digits.join('');
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

function verifyOtp(rawOtp, hashedOtp) {
  if (!rawOtp || !hashedOtp) return false;
  const hash = hashOtp(rawOtp);
  if (hash.length !== hashedOtp.length) return false;
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashedOtp));
}

function getExpiryDate(minutes = OTP_EXPIRY_MINUTES) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function isExpired(expiresAt) {
  return Date.now() > new Date(expiresAt).getTime();
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 1) return `${local}*****@${domain}`;
  return `${local[0]}*****@${domain}`;
}

module.exports = {
  OTP_LENGTH,
  OTP_EXPIRY_MINUTES,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_SECONDS,
  MAX_RESENDS,
  generateOtp,
  hashOtp,
  verifyOtp,
  getExpiryDate,
  isExpired,
  maskEmail,
};
