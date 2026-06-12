const mongoose = require('mongoose');

const CATEGORIES = ['General', 'VAPT', 'Project', 'Meeting', 'Research', 'Development', 'Findings', 'Remediation', 'Commands', 'Checklist', 'Reference', 'Personal', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Draft', 'Active', 'Archived'];

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: '', maxlength: 500 },
  content: { type: String, default: '', maxlength: 50000 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sharedWith: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permission: { type: String, enum: ['view', 'edit'], default: 'view' },
    sharedAt: { type: Date, default: Date.now }
  }],
  category: { type: String, enum: CATEGORIES, default: 'General' },
  priority: { type: String, enum: PRIORITIES, default: 'Medium' },
  status: { type: String, enum: STATUSES, default: 'Draft' },
  tags: { type: [String], default: [] },
  pinned: { type: Boolean, default: false },
  favorite: { type: Boolean, default: false },
  colorLabel: { type: String, default: '' },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  version: { type: Number, default: 0 },
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastEditedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

noteSchema.index({ owner: 1, createdAt: -1 });
noteSchema.index({ owner: 1, pinned: -1 });
noteSchema.index({ 'sharedWith.user': 1 });
noteSchema.index({ category: 1 });
noteSchema.index({ tags: 1 });
noteSchema.index({ deletedAt: 1 });

noteSchema.virtual('id').get(function () { return this._id.toString(); });

noteSchema.virtual('isDeleted').get(function () { return !!this.deletedAt; });

noteSchema.virtual('daysUntilPermanentDelete').get(function () {
  if (!this.deletedAt) return null;
  const retentionDays = 15;
  const elapsed = Math.floor((Date.now() - this.deletedAt.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, retentionDays - elapsed);
});

noteSchema.pre('save', function (next) {
  if (this.isModified('content') || this.isModified('title')) {
    this.version = (this.version || 0) + 1;
    this.lastEditedAt = new Date();
  }
  if (typeof this.tags === 'string') {
    this.tags = this.tags.split(',').map(t => t.trim()).filter(Boolean);
  }
  if (this.tags && Array.isArray(this.tags)) {
    this.tags = [...new Set(this.tags.map(t => t.toLowerCase().trim()).filter(Boolean))];
  }
  if (this.colorLabel === '') this.colorLabel = null;
  next();
});

module.exports = mongoose.model('Note', noteSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.PRIORITIES = PRIORITIES;
module.exports.STATUSES = STATUSES;