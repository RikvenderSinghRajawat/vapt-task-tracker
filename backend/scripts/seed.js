#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

if (!process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD) {
  console.error('[Seed] SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in backend/.env');
  process.exit(1);
}
const ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

async function seed() {
  const dbUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vapt_tracker';
  console.log('[Seed] Connecting to MongoDB...');
  await mongoose.connect(dbUri, {
    dbName: process.env.MONGO_DB_NAME || 'vapt_tracker',
    serverSelectionTimeoutMS: 10000,
  });
  console.log('[Seed] Connected.');

  const db = mongoose.connection.db;

  // Drop all collections to get a clean slate
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    try {
      await db.collection(col.name).drop();
      console.log(`[Seed] Dropped collection: ${col.name}`);
    } catch (e) {
      console.warn(`[Seed] Could not drop ${col.name}: ${e.message}`);
    }
  }

  console.log('[Seed] All collections dropped.');

  // Register the User model manually so the pre-save hook hashes the password
  const bcrypt = require('bcryptjs');
  const Schema = mongoose.Schema;

  const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'vapt_analyst', 'pm', 'developer', 'viewer'], default: 'developer' },
    department: { type: String, default: '' },
    phone: { type: String, default: '' },
    avatar: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: true },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastLogin: { type: Date, default: null },
    preferences: { type: Schema.Types.Mixed, default: {} },
    allocatedProjects: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    passwordChangedAt: { type: Date, default: Date.now },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    deletedAt: { type: Date, default: null },
  }, { timestamps: true, toJSON: { virtuals: true, transform(doc, ret) { ret.id = ret._id?.toString(); delete ret.__v; delete ret.password; delete ret.resetPasswordToken; } } });

  UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, Number(process.env.BCRYPT_ROUNDS || 12));
    next();
  });

  const User = mongoose.models.User || mongoose.model('User', UserSchema);

  const admin = await User.create({
    name: 'Super Admin',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin',
    isActive: true,
    isVerified: true,
  });

  console.log(`[Seed] Super admin created:`);
  console.log(`  Email:    ${admin.email}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log(`  Role:     ${admin.role}`);

  await mongoose.disconnect();
  console.log('[Seed] Done.');
  process.exit(0);
}

seed().catch(err => {
  console.error('[Seed] Failed:', err.message);
  process.exit(1);
});
