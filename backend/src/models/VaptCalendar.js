const mongoose = require('mongoose');

const toJSONOptions = {
  virtuals: true,
  versionKey: false,
  transform(doc, ret) {
    ret.id = ret._id?.toString();
    delete ret.__v;
  }
};

const { Schema } = mongoose;

const VaptCalendarSchema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project' },
  projectName: { type: String, required: true, trim: true },
  projectType: { type: String, default: 'Web Application', trim: true },
  assessmentType: { type: String, enum: ['internal', 'external'], default: 'external' },

  lastVaptDate: { type: Date },
  nextVaptDueDate: { type: Date },
  assessmentFrequency: { type: String, enum: ['monthly', 'quarterly', 'half_yearly', 'yearly', 'custom'], default: 'yearly' },

  notes: { type: String, default: '' },
  status: { type: String, enum: ['completed', 'upcoming', 'due_soon', 'overdue'], default: 'upcoming' },

  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: toJSONOptions,
  toObject: { virtuals: true }
});

VaptCalendarSchema.virtual('daysRemaining').get(function () {
  if (!this.nextVaptDueDate) return null;
  const now = new Date();
  const due = new Date(this.nextVaptDueDate);
  return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
});

VaptCalendarSchema.index({ deletedAt: 1 });
VaptCalendarSchema.index({ nextVaptDueDate: 1 });
VaptCalendarSchema.index({ status: 1 });
VaptCalendarSchema.index({ assignedUser: 1 });
VaptCalendarSchema.index({ project: 1 });

module.exports = mongoose.models.VaptCalendar || mongoose.model('VaptCalendar', VaptCalendarSchema);
