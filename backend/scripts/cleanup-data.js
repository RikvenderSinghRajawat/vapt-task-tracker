#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const dbUri = process.env.MONGO_URI || process.env.DB_URI || 'mongodb://127.0.0.1:27017/vapt_tracker';

async function cleanup() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(dbUri, {
    dbName: process.env.MONGO_DB_NAME || 'vapt_tracker',
    serverSelectionTimeoutMS: 10000,
  });
  console.log('Connected.');

  const db = mongoose.connection.db;

  if (!process.env.SUPER_ADMIN_EMAIL) {
  console.error('[Cleanup] SUPER_ADMIN_EMAIL must be set in backend/.env');
  process.exit(1);
}
const ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;

  // Phase 1: Remove demo/test users (keep admin + real users)
  const User = mongoose.model('User', new mongoose.Schema({
    email: String, name: String, role: String, isActive: Boolean,
    isVerified: Boolean, deletedAt: Date
  }, { strict: false }));

  const allUsers = await User.find({}).lean();
  const demoEmails = ['test@test.com', 'demo@demo.com', 'admin@demo.com', 'user@test.com',
    'testuser@test.com', 'demo@vapt.com', 'test@vapt.com', 'admin@test.com',
    'user@demo.com', 'demo.user@test.com'];
  const demoRolePrefixes = ['demo_', 'test_'];

  let removedUsers = 0;
  for (const user of allUsers) {
    const email = (user.email || '').toLowerCase();
    const name = (user.name || '').toLowerCase();
    const shouldRemove = demoEmails.includes(email) ||
      demoRolePrefixes.some(p => email.startsWith(p) || name.startsWith(p)) ||
      (user.isDemo === true) ||
      (user.isTestAccount === true);

    if (shouldRemove) {
      await User.deleteOne({ _id: user._id });
      removedUsers++;
      console.log(`  Removed demo user: ${user.email} (${user.name})`);
    }
  }

  // Also soft-deleted users (recycle bin)
  const deletedUsers = await User.find({ deletedAt: { $ne: null } }).lean();
  for (const user of deletedUsers) {
    if (user.email === ADMIN_EMAIL) {
      await User.updateOne({ _id: user._id }, { $set: { deletedAt: null, isActive: true } });
      console.log(`  Restored admin user from recycle bin: ${user.email}`);
    }
  }
  console.log(`Users processed: ${removedUsers} demo removed`);

  // Phase 2: Remove test projects
  const Project = mongoose.model('Project', new mongoose.Schema({
    name: String, code: String, status: String, deletedAt: Date
  }, { strict: false }));

  const allProjects = await Project.find({}).lean();
  const demoProjectKeywords = ['test', 'demo', 'sample', 'example', 'dummy', 'tutorial', 'sandbox'];

  let removedProjects = 0;
  for (const proj of allProjects) {
    const name = (proj.name || '').toLowerCase();
    const code = (proj.code || '').toLowerCase();
    const shouldRemove = demoProjectKeywords.some(k =>
      name.includes(k) || code.includes(k)
    ) || proj.isDemo === true || proj.isTest === true;

    if (shouldRemove) {
      const fid = proj._id.toString();
      await Project.deleteOne({ _id: proj._id });
      removedProjects++;
      console.log(`  Removed demo project: ${proj.name} (${proj.code})`);

      await db.collection('findings').deleteMany({ project: proj._id });
      await db.collection('reports').deleteMany({ project: proj._id });
      await db.collection('milestones').deleteMany({ project: proj._id });
      await db.collection('notifications').deleteMany({ projectId: proj._id });
      await db.collection('tasks').deleteMany({ project: proj._id });
      await db.collection('reviewrequests').deleteMany({ project: proj._id });
      console.log(`  Cleaned up related data for project: ${proj.name}`);
    }
  }
  console.log(`Projects removed: ${removedProjects}`);

  // Phase 3: Remove orphaned data (no valid project reference)
  const validProjectIds = (await Project.find({}).lean()).map(p => p._id);
  const collections = ['findings', 'reports', 'milestones', 'tasks'];
  for (const collName of collections) {
    const result = await db.collection(collName).deleteMany({
      project: { $nin: validProjectIds },
      deletedAt: null,
    });
    if (result.deletedCount > 0) {
      console.log(`  Removed ${result.deletedCount} orphaned ${collName}`);
    }
  }

  // Phase 4: Clear all notifications (fresh start)
  const notifResult = await db.collection('notifications').deleteMany({});
  console.log(`Notifications cleared: ${notifResult.deletedCount}`);

  // Phase 5: Clear audit logs (fresh start)
  const auditResult = await db.collection('auditlogs').deleteMany({});
  console.log(`Audit logs cleared: ${auditResult.deletedCount}`);

  // Phase 6: Clear review requests
  const reviewResult = await db.collection('reviewrequests').deleteMany({});
  console.log(`Review requests cleared: ${reviewResult.deletedCount}`);

  console.log('\nDatabase cleanup complete.');
  await mongoose.disconnect();
  process.exit(0);
}

cleanup().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
