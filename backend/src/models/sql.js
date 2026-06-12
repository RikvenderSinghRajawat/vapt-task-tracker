require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { calculateSlaDeadline, calculateSlaStatus } = require('../services/slaService');


mongoose.set('strictQuery', false);

const toJSONOptions = {
  virtuals: true,
  versionKey: false,
  transform(doc, ret) {
    ret.id = ret._id?.toString();
    delete ret.__v;
    if (ret.password) delete ret.password;
    if (ret.resetPasswordToken) delete ret.resetPasswordToken;
    if (ret.mfa_secret) delete ret.mfa_secret;
    if (ret.mfa_recovery_codes) delete ret.mfa_recovery_codes;
  }
};

const baseOptions = {
  timestamps: true,
  toJSON: toJSONOptions,
  toObject: { virtuals: true }
};

const Schema = mongoose.Schema;

// ─── Sub-schemas (defined before they are referenced) ────────────────────────
const TeamMemberSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  role: { type: String, default: 'member' },
  addedAt: { type: Date, default: Date.now }
}, { _id: false });

const AllocationHistorySchema = new Schema({
  action:    { type: String, enum: ['assigned','unassigned','bulk_update'], required: true },
  performedBy:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  projectIds:   [{ type: Schema.Types.ObjectId, ref: 'Project' }],  // 'Project' resolved lazily by Mongoose
  notes: String,
  performedAt:  { type: Date, default: Date.now }
}, { _id: false });

const AssignmentHistorySchema = new Schema({
  action:      { type: String, enum: ['assigned','unassigned','reassigned'], required: true },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fromUser:    { type: Schema.Types.ObjectId, ref: 'User' },
  toUser:      { type: Schema.Types.ObjectId, ref: 'User' },
  notes: String,
  performedAt: { type: Date, default: Date.now }
}, { _id: false });

const CommentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  text: String,
  isInternal: { type: Boolean, default: false },
  createdAt:  { type: Date, default: Date.now }
}, { _id: false });

const ReviewSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  comment: String,
  reviewedAt: Date,
  status: String
}, { _id: false });

const AuditDeltaSchema = new Schema({
  version: Number,
  date: Date,
  status: String,
  type: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: String
}, { _id: false });
// ─── End of sub-schemas ──────────────────────────────────────────────────────

const UserSchema = new Schema({
   name: { type: String, required: true, trim: true },
   email: { type: String, required: true, unique: true, lowercase: true, trim: true },
   password: { type: String, required: true, select: false },
   role: { type: String, enum: ['admin', 'vapt_analyst', 'vapt_tl', 'developer', 'project_manager', 'business_analyst', 'super_admin', 'read_only'], default: 'developer' },
   avatar: { type: String, default: '' },
   phone: { type: String, default: '' },
   department: { type: String, default: '' },
   isActive: { type: Boolean, default: true },
   isVerified: { type: Boolean, default: false },
   lastLogin: Date,
   loginAttempts: { type: Number, default: 0 },
   lockUntil: Date,
   passwordChangedAt: { type: Date, default: Date.now },
   permissions: { type: [String], default: [] },
   preferences: { type: Schema.Types.Mixed, default: { theme: 'light', notifications: { email: true, inApp: true, slack: false }, language: 'en' } },
   // Canonical project allocation field - used by all frontend and backend routes
   allocatedProjects: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
   // Findings directly assigned to the user
   assignedFindings: [{ type: Schema.Types.ObjectId, ref: 'Finding' }],
   // Workload tracking
   workloadCapacity: { type: Number, default: 100 }, // Percentage capacity
   activeAssignments: { type: Number, default: 0 }, // Count of active finding assignments
   // Allocation history for audit trail
   allocationHistory: { type: [AllocationHistorySchema], default: [] },
   mfa_enabled: { type: Boolean, default: false },
   mfa_secret: String,
   mfa_recovery_codes: { type: [String], default: [] },
   resetPasswordToken: String,
   resetPasswordExpire: Date,
   deletedAt: Date,
   deletedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, baseOptions);

UserSchema.index({ email: 1 }, { unique: true });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, Number(process.env.BCRYPT_ROUNDS || 12));
  this.passwordChangedAt = new Date();
  next();
});

UserSchema.methods.matchPassword = function (password) {
  return bcrypt.compare(password, this.password);
};

UserSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > new Date();
};

UserSchema.methods.incLoginAttempts = async function () {
  this.loginAttempts = (this.loginAttempts || 0) + 1;
  if (this.loginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
  }
  await this.save();
};

UserSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = null;
  await this.save();
};

UserSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (!this.passwordChangedAt) return false;
  return Math.floor(new Date(this.passwordChangedAt).getTime() / 1000) > jwtTimestamp;
};

UserSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);
  return resetToken;
};

const ProjectSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  assessmentType: { type: String, default: 'VAPT' },
  description: String,
  organization: { type: String, required: true },
  client: String,
  manager: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  teamMembers: { type: [TeamMemberSchema], default: [] },
  // Denormalised list of userIds allocated to this project (enables
  // fast `{ manager/teamMembers/allocatedUsers }` queries without
  // joining the User collection every request).
  allocatedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  allocationHistory: { type: [AllocationHistorySchema], default: [] },
  // True workload snapshot, recalculated whenever allocations change.
  // Each entry is `{ userId, assignedFindings, overdueFindings, criticalFindings, workloadScore }`.
  workloadMetadata: { type: Schema.Types.Mixed, default: {} },
  accessControl:  { type: Schema.Types.Mixed, default: { public: false, requireApproval: false } },
  status: { type: String, default: 'received' },
  priority: { type: String, default: 'medium' },
  scope: String,
  technologies: { type: [String], default: [] },
  startDate: { type: Date, required: true },
  endDate: Date,
  targetCompletionDate: Date,
  progress: { type: Number, default: 0 },
  budget: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  contractNumber: String,
  sla: { type: Schema.Types.Mixed, default: { resolutionTime: 7, criticalResolutionTime: 3 } },
  tags: { type: [String], default: [] },
  versions: { type: [Schema.Types.Mixed], default: [] },
  statistics: { type: Schema.Types.Mixed, default: { totalFindings: 0, criticalFindings: 0, highFindings: 0, mediumFindings: 0, lowFindings: 0, openFindings: 0, closedFindings: 0, resolvedFindings: 0 } },
  settings: { type: Schema.Types.Mixed, default: { allowPublicAccess: false, requireApprovalForChanges: false, autoAssignFindings: true } },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt: Date,
  deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  comments: { type: [CommentSchema], default: [] }
}, baseOptions);

ProjectSchema.index(
  { code: 1 },
  { unique: true, partialFilterExpression: { deletedAt: { $eq: null } } }
);

const ORG_ABBREVIATIONS = {
  'yourcompany': 'YC',
  'your company': 'YC',
};

const ASSESSMENT_PREFIXES = /^(pentest|sast|dast|vapt|codereview|code_review|redteam|red_team|blueteam|blue_team|security|audit|assessment|review|scan|test)/i;

const SKIP_WORDS = new Set([
  'web', 'app', 'api', 'ui', 'ux', 'v2', 'v3', 'v4', 'v5',
  'site', 'platform', 'system', 'portal', 'application',
  'pentest', 'sast', 'dast', 'vapt', 'codereview', 'code_review',
  'redteam', 'red_team', 'blueteam', 'blue_team',
  'security', 'audit', 'assessment', 'scan', 'test',
]);

function extractProjectKeyword(name) {
  if (!name) return 'PROJ';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'PROJ';
  // Pick last meaningful word (skip generic suffix words)
  let keyword = null;
  for (let i = words.length - 1; i >= 0; i--) {
    // eslint-disable-next-line security/detect-object-injection -- i is numeric loop index
    const w = words[i].replace(/[^a-zA-Z0-9]/g, '');
    if (w && !SKIP_WORDS.has(w.toLowerCase())) {
      keyword = w;
      break;
    }
  }
  if (!keyword) {
    const last = words[words.length - 1].replace(/[^a-zA-Z0-9]/g, '');
    keyword = last || 'PROJ';
  }
  // Strip leading assessment type prefix (e.g. PentestMongoDB → MongoDB)
  return keyword.replace(ASSESSMENT_PREFIXES, '').toUpperCase() || keyword.toUpperCase();
}

const ORG_ABBREVIATIONS_MAP = new Map(Object.entries(ORG_ABBREVIATIONS));

ProjectSchema.pre('validate', async function (next) {
  if (!this.code && this.organization) {
    const orgKey = this.organization.toLowerCase().trim();
    const orgAbbr = ORG_ABBREVIATIONS_MAP.get(orgKey) || orgKey.substring(0, 2).toUpperCase();
    const nameAbbr = extractProjectKeyword(this.name);
    const prefix = `${orgAbbr}-${nameAbbr}-`;
    const existing = await mongoose.model('Project').countDocuments({
      code: { $regex: `^${prefix}` },
      deletedAt: null
    });
    const seq = String(existing + 1).padStart(3, '0');
    this.code = `${prefix}${seq}`;
  }
  next();
});

const FindingSchema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  findingId: { type: String },
  title: { type: String, required: true },
  description: { type: String, required: true },
  severity: { type: String, required: true },
  severityScore: { type: Number, default: 5 },
  cvssScore: { type: Number, min: 0, max: 10 },
  cvss: Schema.Types.Mixed,
  cwe: Schema.Types.Mixed,
  cve: Schema.Types.Mixed,
  category: { type: String, default: 'other' },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'under_review', 'resolved', 'closed', 'reopened', 'duplicate', 'accepted_risk', 'rejected', 'deferred', 'fixed', 'retest_passed', 'retest_failed'],
    default: 'open'
  },
  retestNotes: String,
  retestEvidence: { type: [Schema.Types.Mixed], default: [] },
  retestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  retestedAt: Date,
  assignee:     { type: Schema.Types.ObjectId, ref: 'User' },
  assignedBy:   { type: Schema.Types.ObjectId, ref: 'User' },
  assignedDevelopers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  escalationOwner: { type: Schema.Types.ObjectId, ref: 'User' },
  assignmentHistory: { type: [AssignmentHistorySchema], default: [] },
  reviewer: { type: Schema.Types.ObjectId, ref: 'User' },
  // ─── End of duplicate sub-schemas ─────────────────────────────────────────

  location: String,
  url: String,
  method: String,
  parameter: String,
  payload: String,
  impact: String,
  likelihood: { type: String, default: 'possible' },
  risk: { type: String, default: 'medium' },
  remediation: String,
  remediationComplexity: { type: String, default: 'medium' },
  timeToFix: { type: Number, default: 7 },
  dueDate: Date,
  sla_deadline: Date,
  sla_status: { type: String, default: 'on_track' },
  estimatedCost: { type: Number, default: 0 },
  actualCost: { type: Number, default: 0 },
  evidence: { type: [Schema.Types.Mixed], default: [] },
  comments: { type: [CommentSchema], default: [] },
  attachments: { type: [Schema.Types.Mixed], default: [] },
  history: { type: [Schema.Types.Mixed], default: [] },
  tags: { type: [String], default: [] },
  falsePositive: { type: Boolean, default: false },
  falsePositiveReason: String,
  duplicates: { type: [Schema.Types.ObjectId], ref: 'Finding', default: [] },
  isDuplicateOf: { type: Schema.Types.ObjectId, ref: 'Finding' },
  closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  closedAt: Date,
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt: Date,
  deletedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, baseOptions);

FindingSchema.index(
  { findingId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: { $eq: null } } }
);
FindingSchema.index({ project: 1, status: 1 });
FindingSchema.index({ severity: 1, status: 1 });
FindingSchema.index({ status: 1, severity: 1 });

FindingSchema.pre('validate', async function (next) {
  const { cvssToSeverity } = require('../utils/severity');

  if (this.cvssScore !== undefined && this.cvssScore !== null && this.cvssScore !== '') {
    const autoSeverity = cvssToSeverity(this.cvssScore);
    if (autoSeverity) this.severity = autoSeverity;
  } else if (this.cvss && this.cvss.score !== undefined && this.cvss.score !== null) {
    const autoSeverity = cvssToSeverity(this.cvss.score);
    if (autoSeverity) this.severity = autoSeverity;
  }

  if (!this.findingId && this.project) {
    const Project = mongoose.model('Project');
    const project = await Project.findById(this.project);
    const sevLetter = (this.severity || 'm')[0].toLowerCase();
    const count = await mongoose.model('Finding').countDocuments({
      project: this.project,
      severity: this.severity,
      deletedAt: null
    });
    this.findingId = `${project?.code || 'VULN'}-${sevLetter}${String(count + 1).padStart(3, '0')}`;
  }
  if (!this.sla_deadline) {
    this.sla_deadline = calculateSlaDeadline(this);
  }
  this.sla_status = calculateSlaStatus(this);
  next();
});

const MilestoneAssigneeSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  role: String
}, { _id: false });

const MilestoneSchema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true },
  description: String,
  type: { type: String, default: 'custom' },
  status: { type: String, default: 'pending' },
  dueDate: { type: Date, required: true },
  completedDate: Date,
  progress: { type: Number, default: 0 },
  priority: { type: String, default: 'medium' },
  dependencies: [{ type: Schema.Types.ObjectId, ref: 'Milestone' }],
  assignees: { type: [MilestoneAssigneeSchema], default: [] },
  deliverables: { type: [Schema.Types.Mixed], default: [] },
  notes: String,
  attachments: { type: [Schema.Types.Mixed], default: [] },
  comments: { type: [Schema.Types.Mixed], default: [] },
  tags: { type: [String], default: [] },
  updateProjectStatus: { type: Boolean, default: true },
  suggestedProjectStatus: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt: Date,
  deletedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, baseOptions);

const ReportSchema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  reportId: { type: String },
  name: { type: String, required: true },
  type: { type: String, required: true },
  version: { type: String, default: '1.0' },
  status: { type: String, default: 'draft', enum: ['draft', 'in_review', 'approved', 'published', 'archived'] },
  summary: String,
  findingsIncluded: [{ type: Schema.Types.ObjectId, ref: 'Finding' }],
   statistics: { type: Schema.Types.Mixed, default: { totalFindings: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 } },
   file: Schema.Types.Mixed,
   files: { type: [Schema.Types.Mixed], default: [] },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reviewedBy: { type: [ReviewSchema], default: [] },
  publishedAt: Date,
  expiryDate: Date,
  isConfidential: { type: Boolean, default: false },
  watermark: { type: Boolean, default: false },
  distribution: { type: Schema.Types.Mixed, default: { internal: true, client: false, public: false } },
  template: { type: String, default: 'standard' },
  customFields: Schema.Types.Mixed,
  comments: { type: [Schema.Types.Mixed], default: [] },
  history: { type: [Schema.Types.Mixed], default: [] },
  tags: { type: [String], default: [] },
  deletedAt: Date,
  deletedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, baseOptions);

ReportSchema.index(
  { reportId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: { $eq: null } } }
);

ReportSchema.pre('validate', async function (next) {
  if (!this.reportId && this.project) {
    const Project = mongoose.model('Project');
    const project = await Project.findById(this.project);
    const count = await mongoose.model('Report').countDocuments({ project: this.project, deletedAt: null });
    this.reportId = `RPT-${project?.code || 'PROJECT'}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const NotificationSchema = new Schema({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  priority: { type: String, default: 'normal' },
  relatedEntity: Schema.Types.Mixed,
  actionUrl: String,
  redirectUrl: String,
  entityType: String,
  entityId: String,
  data: Schema.Types.Mixed,
  isRead: { type: Boolean, default: false },
  readAt: Date,
  projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
  findingId: { type: Schema.Types.ObjectId, ref: 'Finding' },
  taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
  parentReplyId: { type: Schema.Types.ObjectId, ref: 'Notification' },
  messageType: { type: String, enum: ['notification', 'reply', 'mention', 'system'], default: 'notification' },
  readStatus: { type: Map, of: Boolean, default: {} },
  mentionedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  deliveryMethods: { type: Schema.Types.Mixed, default: { inApp: true, email: false, slack: false } },
  deliveryStatus: { type: Schema.Types.Mixed, default: { inApp: { delivered: true, deliveredAt: new Date() }, email: { sent: false }, slack: { sent: false } } },
  expiresAt: Date,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt: Date,
  deletedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, baseOptions);

NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ parentReplyId: 1 });
NotificationSchema.index({ projectId: 1, findingId: 1 });

NotificationSchema.post('save', async function (doc) {
  try {
    const io = require('../config/socket').getIO();
    const payload = doc.toObject();
    io.to(`user:${doc.recipient}`).emit('notification', payload);
    if (doc.sender) {
      io.to(`user:${doc.sender}`).emit('notification_receipt', { id: doc._id, status: 'sent' });
    }
    if (doc.mentionedUsers && doc.mentionedUsers.length > 0) {
      doc.mentionedUsers.forEach(uid => {
        if (uid.toString() !== doc.recipient.toString()) {
          io.to(`user:${uid}`).emit('notification_mention', payload);
        }
      });
    }
  } catch (_) {}
});

const AuditLogSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  entityType: String,
  entityId: String,
  entityName: String,
  details: Schema.Types.Mixed,
  changes: { type: [Schema.Types.Mixed], default: [] },
  ipAddress: String,
  userAgent: String,
  status: { type: String, default: 'success' },
  errorMessage: String,
  metadata: Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
}, baseOptions);

AuditLogSchema.post('save', async function() {
  try {
    const count = await mongoose.model('AuditLog').countDocuments();
    if (count > 500) {
      const excess = count - 500;
      const oldest = await mongoose.model('AuditLog').find().sort({ timestamp: 1 }).limit(excess).select('_id');
      await mongoose.model('AuditLog').deleteMany({ _id: { $in: oldest.map(o => o._id) } });
    }
  } catch (_) {}
});

const TaskCommentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  text: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const TaskTimerSchema = new Schema({
  startedAt: Date,
  stoppedAt: Date,
  durationMinutes: { type: Number, default: 0 },
  startedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const TaskSchema = new Schema({
   title: { type: String, required: true, trim: true },
   taskCode: { type: String, unique: true, sparse: true },
   description: { type: String, default: '' },
   priority: { type: String, enum: ['critical', 'high', 'medium', 'low', 'informational'], default: 'medium' },
   status: { type: String, enum: ['draft', 'pending', 'queued', 'assigned', 'accepted', 'in_progress', 'under_review', 'waiting_client', 'waiting_dependency', 'blocked', 'escalated', 'reopened', 'completed', 'closed', 'cancelled'], default: 'draft' },
   taskType: { type: String, enum: ['assessment', 'remediation', 'review', 'audit', 'documentation', 'compliance', 'infrastructure', 'research', 'client_activity', 'internal', 'meeting', 'testing', 'reporting', 'miscellaneous'], default: 'miscellaneous' },
   category: { type: String, default: '' },
   assets: { type: [String], default: [] },
   tags: { type: [String], default: [] },
   startDate: Date,
   dueDate: Date,
   completedDate: Date,
   estimatedHours: { type: Number, default: 0 },
   actualHours: { type: Number, default: 0 },
   progress: { type: Number, default: 0, min: 0, max: 100 },
   dependencies: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
   comments: { type: [Schema.Types.Mixed], default: [] }, // Simplified from TaskCommentSchema
   attachments: { type: [Schema.Types.Mixed], default: [] },
   reminders: { type: [Date], default: [] },
   checklist: { type: [Schema.Types.Mixed], default: [] }, // Array of {item: string, completed: boolean, completedAt: Date}
   activityLogs: { type: [Schema.Types.Mixed], default: [] }, // Array of {action: string, by: userId, at: Date, details: Schema.Types.Mixed}
   escalationLevel: { type: Number, default: 0, min: 0, max: 5 },
   slaDeadline: Date,
   isSelfTask: { type: Boolean, default: false },
   isTeamTask: { type: Boolean, default: false },
   isArchived: { type: Boolean, default: false },
   project: { type: Schema.Types.ObjectId, ref: 'Project' },
   finding: { type: Schema.Types.ObjectId, ref: 'Finding' },
   report: { type: Schema.Types.ObjectId, ref: 'Report' },
   assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
   assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
   createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
   timer: { 
     startedAt: Date,
     stoppedAt: Date,
     durationMinutes: { type: Number, default: 0 },
     startedBy: { type: Schema.Types.ObjectId, ref: 'User' }
   },
   activity: { type: [Schema.Types.Mixed], default: [] }, // Legacy activity field for backward compatibility
   deletedAt: Date,
   deletedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, baseOptions);

TaskSchema.index({ assignedTo: 1, status: 1, dueDate: 1 });
TaskSchema.index({ project: 1, status: 1 });
TaskSchema.index({ finding: 1 });

TaskSchema.pre('validate', function (next) {
  if (!this.slaDeadline && this.dueDate) this.slaDeadline = this.dueDate;
  const closed = ['done', 'cancelled'].includes(String(this.status || '').toLowerCase());
  if (closed) this.slaStatus = 'resolved';
  else if (this.slaDeadline && new Date(this.slaDeadline).getTime() < Date.now()) this.slaStatus = 'breached';
  else if (this.slaDeadline && new Date(this.slaDeadline).getTime() - Date.now() <= 24 * 60 * 60 * 1000) this.slaStatus = 'at_risk';
  else this.slaStatus = 'on_track';
  next();
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Project = mongoose.models.Project || mongoose.model('Project', ProjectSchema);
const Finding = mongoose.models.Finding || mongoose.model('Finding', FindingSchema);
const Milestone = mongoose.models.Milestone || mongoose.model('Milestone', MilestoneSchema);
const Report = mongoose.models.Report || mongoose.model('Report', ReportSchema);
const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);

module.exports = {
  mongoose,
  User,
  Project,
  Finding,
  Milestone,
  Report,
  Notification,
  AuditLog,
  Task
};
