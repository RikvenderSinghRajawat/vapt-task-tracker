const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  loginTime: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  ip: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  refreshTokenHash: {
    type: String,
    default: ''
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

SessionSchema.index({ userId: 1, status: 1 });
SessionSchema.index({ sessionId: 1, status: 1 });

module.exports = mongoose.model('Session', SessionSchema);
