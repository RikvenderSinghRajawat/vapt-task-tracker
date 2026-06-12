const mongoose = require('mongoose');

const taskCounterSchema = new mongoose.Schema({
  userCode: { type: String, required: true, unique: true },
  sequence: { type: Number, default: 0 },
}, { timestamps: true });

taskCounterSchema.statics.getNextSequence = async function (userCode) {
  const result = await this.findOneAndUpdate(
    { userCode },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );
  return result.sequence;
};

taskCounterSchema.statics.getUserCode = function (role) {
  const roleMap = {
    admin: 'ADMIN',
    super_admin: 'ADMIN',
    vapt_analyst: 'VAPT',
    vapt_tl: 'VAPT',
    project_manager: 'PM',
    developer: 'DEV',
    business_analyst: 'BA',
    read_only: 'EXT',
  };
  return roleMap[role] || 'USR';
};

module.exports = mongoose.model('TaskCounter', taskCounterSchema);
