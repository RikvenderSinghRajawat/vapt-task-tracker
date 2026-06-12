const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['login', 'password_reset'],
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  maxAttempts: {
    type: Number,
    default: 5,
  },
  resendCount: {
    type: Number,
    default: 0,
  },
  maxResends: {
    type: Number,
    default: 5,
  },
  lastResentAt: Date,
  verified: {
    type: Boolean,
    default: false,
  },
  verifiedAt: Date,
}, {
  timestamps: true,
});

OtpSchema.index({ user: 1, purpose: 1, verified: 1, expiresAt: -1 });
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', OtpSchema);
