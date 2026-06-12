const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  details: String,
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const attachmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  path: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now },
  size: Number,
  mimeType: String
}, { _id: false });

const checklistItemSchema = new mongoose.Schema({
  item: { type: String, required: true },
  completed: { type: Boolean, default: false }
}, { _id: false });

const timerSchema = new mongoose.Schema({
  startedAt: { type: Date },
  stoppedAt: { type: Date },
  durationMinutes: { type: Number, default: 0 },
  startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const workLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hours: { type: Number, required: true },
  description: String,
  date: { type: Date, default: Date.now }
}, { _id: false });

const taskSchema = new mongoose.Schema({
  // ── Required ──────────────────────────────────────────────
  title: { type: String, required: true, trim: true },

  // ── Optional core fields ──────────────────────────────────
  description: { type: String, trim: true },

  // ── Ownership & Assignment ────────────────────────────────
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // ── Relationships ─────────────────────────────────────────
  project:     { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  finding:     { type: mongoose.Schema.Types.ObjectId, ref: 'Finding' },
  report:      { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
  linkedReport:  { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
  linkedFinding: { type: mongoose.Schema.Types.ObjectId, ref: 'Finding' },
  linkedProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },

   // ── Classification ────────────────────────────────────────
   taskType: {
     type: String,
     enum: ['assessment', 'remediation', 'review', 'audit', 'documentation', 'compliance', 'infrastructure', 'research', 'client_activity', 'internal', 'meeting', 'testing', 'reporting', 'miscellaneous'],
     default: 'miscellaneous'
   },
   category: { type: String },
   priority: {
     type: String,
     enum: ['critical', 'high', 'medium', 'low', 'informational'],
     default: 'medium'
   },
   severity: {
     type: String,
     enum: ['critical', 'high', 'medium', 'low', 'info'],
     default: 'medium'
   },
   status: {
     type: String,
     enum: ['draft', 'pending', 'queued', 'assigned', 'accepted', 'in_progress', 'under_review', 'waiting_client', 'waiting_dependency', 'blocked', 'escalated', 'reopened', 'completed', 'closed', 'cancelled'],
     default: 'pending'
   },

  // ── Classification helpers ────────────────────────────────
  assets:  [String],
  tags:    [String],
  labels:  [String],
  sprint:  { type: String },
  milestone: { type: String },
  recurrence: { type: String },

  // ── Scheduling ────────────────────────────────────────────
  startDate:    { type: Date },
  dueDate:      { type: Date },
  completedDate:{ type: Date },

  // ── Effort & Progress ─────────────────────────────────────
  estimatedHours: { type: Number, default: 0, min: 0 },
  actualHours:    { type: Number, default: 0, min: 0 },
  progress: { type: Number, min: 0, max: 100, default: 0 },

  // ── Communication ─────────────────────────────────────────
  comments: [commentSchema],
  notes:    { type: String, trim: true },
  reminders:[{ type: Date }],
  workLogs: [workLogSchema],

  // ── Attachments ───────────────────────────────────────────
  attachments: [attachmentSchema],

  // ── Checklist ─────────────────────────────────────────────
  checklist: [checklistItemSchema],

  // ── Dependency tracking ───────────────────────────────────
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],

  // ── Activity log ──────────────────────────────────────────
  activityLogs: [activityLogSchema],

  // ── Task type flags ───────────────────────────────────────
  isSelfTask:  { type: Boolean, default: false },
  isTeamTask:  { type: Boolean, default: false },

  // ── Escalation ────────────────────────────────────────────
  escalationLevel: { type: Number, default: 0 },

  // ── Soft-delete ───────────────────────────────────────────
  isArchived: { type: Boolean, default: false },
  deletedAt:  { type: Date },
  deletedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON:    { virtuals: true },
  toObject:  { virtuals: true }
});

taskSchema.virtual('id').get(function () {
  return this._id.toString();
});

module.exports = mongoose.model('Task', taskSchema);
