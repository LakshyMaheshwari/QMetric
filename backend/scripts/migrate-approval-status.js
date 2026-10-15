const logger = require('../config/logger');

/**
 * One-time migration: grandfather existing users into the new
 * collegeApprovalStatus field.
 *
 * Rules:
 *   - super_admin          → 'not_applicable'
 *   - student              → 'approved' (and collegeId/collegeName cleared)
 *   - teacher with college → 'approved'  (they've been using QMetric already)
 *   - teacher, no college  → 'approved'  (independent)
 *   - reviewer/admin       → 'approved'
 *
 * Idempotent — safe to run multiple times.
 *
 * Usage:
 *   npm run migrate:approval-status
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function migrate() {
  if (!process.env.MONGO_URI) {
    logger.error('❌ MONGO_URI is not set');
    process.exit(1);
  }

  logger.info('🔌 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  logger.info('✅ Connected');

  const User = require('../Model/user');

  // ── 1. Default: everyone gets 'approved' ──────────────
  const r1 = await User.updateMany(
    {
      $or: [
        { collegeApprovalStatus: { $exists: false } },
        { collegeApprovalStatus: null },
      ],
    },
    { $set: { collegeApprovalStatus: 'approved' } }
  );
  logger.info(`✅ Set 'approved' for ${r1.modifiedCount} users`);

  // ── 2. Super admins → 'not_applicable' ────────────────
  const r2 = await User.updateMany(
    { role: 'super_admin' },
    { $set: { collegeApprovalStatus: 'not_applicable' } }
  );
  logger.info(`✅ Set 'not_applicable' for ${r2.modifiedCount} super admins`);

  // ── 3. Defensive: student cleanup (no students should exist yet) ──
  const r3 = await User.updateMany(
    { role: 'student' },
    {
      $set: {
        collegeId: null,
        collegeName: '',
        collegeApprovalStatus: 'approved',
      },
    }
  );
  logger.info(`✅ Normalized ${r3.modifiedCount} student accounts`);

  // ── Summary ───────────────────────────────────────────
  const total = await User.countDocuments({});
  const breakdown = await User.aggregate([
    { $group: { _id: '$collegeApprovalStatus', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  logger.info('\n📊 Final state:');
  logger.info(`   Total users: ${total}`);
  for (const row of breakdown) {
    logger.info(`   ${row._id || '(unset)'}: ${row.count}`);
  }

  await mongoose.disconnect();
  logger.info('\n✅ Migration complete');
  process.exit(0);
}

migrate().catch((err) => {
  logger.error('❌ Migration failed:', err);
  process.exit(1);
});