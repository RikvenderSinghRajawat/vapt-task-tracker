const mongoose = require('mongoose');

const { Schema } = mongoose;

const ReviewRequestSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['close_finding', 'reopen_finding', 'help_request'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    finding: { type: Schema.Types.ObjectId, ref: 'Finding', required: true, index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, default: '' },
    checklist: { type: Schema.Types.Mixed, default: {} },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewReason: { type: String, default: '' },
    resolution: { type: Schema.Types.Mixed, default: {} },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc, ret) {
        ret.id = ret._id?.toString();
        delete ret.__v;
      }
    },
    toObject: { virtuals: true }
  }
);

ReviewRequestSchema.index(
  { type: 1, finding: 1, requestedBy: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending', deletedAt: null } }
);

module.exports = mongoose.models.ReviewRequest || mongoose.model('ReviewRequest', ReviewRequestSchema);
