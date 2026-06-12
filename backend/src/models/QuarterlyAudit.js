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

const QuarterlyAuditSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    quarter: { type: String, required: true, trim: true },
    year: { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedByEmail: { type: String, default: '' },
    uploadedById: { type: String, default: '' },

    fileType: { type: String, default: 'application/pdf' },
    fileName: { type: String, default: '' },

    // Persisted file on disk
    filePath: { type: String, default: '' },
    fileUrl: { type: String, default: '' },

    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  {
    timestamps: true,
    toJSON: toJSONOptions,
    toObject: { virtuals: true }
  }
);

module.exports = mongoose.models.QuarterlyAudit || mongoose.model('QuarterlyAudit', QuarterlyAuditSchema);

