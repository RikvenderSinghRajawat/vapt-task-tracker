const mongoose = require('mongoose');

const FirewallLogSchema = new mongoose.Schema({
  raw: { type: String },
  timestamp: { type: Date, default: Date.now },
  action: { type: String, enum: ['BLOCK', 'ALLOW', 'DROP', 'REJECT', 'LIMIT', 'UNKNOWN'], default: 'UNKNOWN' },
  protocol: { type: String },
  srcIp: { type: String },
  dstIp: { type: String },
  srcPort: { type: Number },
  dstPort: { type: Number },
  length: { type: Number },
  ttl: { type: Number },
  interface_in: { type: String },
  interface_out: { type: String },
  mac: { type: String },
  tos: { type: String },
  prec: { type: String },
  window: { type: Number },
  tcpFlags: { type: String },
  logHash: { type: String, unique: true, sparse: true },
  hostname: { type: String },
  processor: { type: String, default: 'ufw' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

FirewallLogSchema.index({ timestamp: -1 });
FirewallLogSchema.index({ srcIp: 1, timestamp: -1 });
FirewallLogSchema.index({ dstIp: 1, timestamp: -1 });
FirewallLogSchema.index({ action: 1, timestamp: -1 });
FirewallLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

FirewallLogSchema.virtual('id').get(function () { return this._id.toString(); });

module.exports = mongoose.model('FirewallLog', FirewallLogSchema);
