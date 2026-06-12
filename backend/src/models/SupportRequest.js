const mongoose = require('mongoose');

const CATEGORIES = ['bug_report', 'complaint', 'suggestion', 'feature_request', 'account_issue', 'other'];
const STATUSES = ['open', 'in_progress', 'resolved', 'closed', 'reopened'];

const AttachmentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalname: { type: String, required: true },
  url: { type: String, required: true },
  size: { type: Number },
  mimetype: { type: String }
}, { _id: false });

const CommentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  isInternal: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const TimelineSchema = new mongoose.Schema({
  action: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  details: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const supportRequestSchema = new mongoose.Schema({
  requestId: { type: String, unique: true, sparse: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 10000 },
  category: { type: String, enum: CATEGORIES, default: 'other' },
  status: { type: String, enum: STATUSES, default: 'open' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedAt: { type: Date },
  attachments: { type: [AttachmentSchema], default: [] },
  comments: { type: [CommentSchema], default: [] },
  timeline: { type: [TimelineSchema], default: [] },
  resolvedAt: { type: Date },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolutionNotes: { type: String, maxlength: 5000 },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

supportRequestSchema.index({ createdBy: 1, createdAt: -1 });
supportRequestSchema.index({ assignedTo: 1, status: 1 });
supportRequestSchema.index({ status: 1, createdAt: -1 });
supportRequestSchema.index({ requestId: 1 }, { unique: true, partialFilterExpression: { deletedAt: { $eq: null } } });

supportRequestSchema.virtual('id').get(function () { return this._id.toString(); });

supportRequestSchema.pre('validate', async function (next) {
  if (!this.requestId) {
    const count = await mongoose.model('SupportRequest').countDocuments({ deletedAt: null });
    this.requestId = `SUP-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

supportRequestSchema.pre('save', function (next) {
  if (this.status === 'resolved' || this.status === 'closed') {
    if (!this.resolvedAt) this.resolvedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('SupportRequest', supportRequestSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.STATUSES = STATUSES;
