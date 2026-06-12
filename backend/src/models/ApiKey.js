const mongoose = require('mongoose');
const crypto = require('crypto');

const ApiKeySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  key: { type: String, required: true, unique: true },
  permissions: [{ type: String, enum: ['read', 'write', 'admin'] }],
  lastUsed: Date,
  expiresAt: Date,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

ApiKeySchema.statics.generateKey = function() {
  return `ek_${crypto.randomBytes(32).toString('hex')}`;
};

module.exports = mongoose.model('ApiKey', ApiKeySchema);
