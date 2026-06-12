const mongoose = require('mongoose');

const ACTIVITY_TYPES = ['Development', 'VAPT', 'Code Review', 'Documentation', 'Meeting', 'Testing', 'Research', 'Deployment', 'Bug Fix', 'Remediation', 'Analysis', 'Support', 'Training', 'Other'];
const WORK_STATUSES = ['Not Started', 'Started', 'In Progress', 'Paused', 'Waiting', 'Under Review', 'Completed', 'Blocked', 'Cancelled'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const WORK_LOCATIONS = ['Office', 'Remote', 'Hybrid'];

const misSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  relatedFinding: { type: mongoose.Schema.Types.ObjectId, ref: 'Finding' },
  relatedTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  activityType: { type: String, enum: ACTIVITY_TYPES, default: 'Other' },
  workCategory: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  date: { type: Date, default: Date.now, required: true },
  startTime: { type: Date },
  endTime: { type: Date },
  duration: { type: Number, default: 0, min: 0 }, // duration in minutes
  workStatus: { type: String, enum: WORK_STATUSES, default: 'Not Started' },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  blockers: { type: String, trim: true, default: '' },
  dependencies: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
  workLocation: { type: String, enum: WORK_LOCATIONS, default: 'Office' },
  tags: { type: [String], default: [] },
  priority: { type: String, enum: PRIORITIES, default: 'Medium' },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

misSchema.index({ user: 1, date: -1 });
misSchema.index({ date: 1 });
misSchema.index({ project: 1 });
misSchema.index({ activityType: 1 });

misSchema.virtual('id').get(function () { return this._id.toString(); });

misSchema.pre('save', function (next) {
  try {
    if (this.startTime && this.endTime) {
      const diff = (new Date(this.endTime)).getTime() - (new Date(this.startTime)).getTime();
      this.duration = Math.max(0, Math.round(diff / 60000));
    } else if (!this.duration) {
      this.duration = 0;
    }

    ['project', 'relatedFinding', 'relatedTask'].forEach((field) => {
      if (this[field] === '') this[field] = null;
    });

    if (typeof this.tags === 'string') {
      this.tags = this.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
  } catch (e) {
    // ignore and let validation handle
  }
  next();
});

module.exports = mongoose.model('Mis', misSchema);
