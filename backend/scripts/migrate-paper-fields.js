'use strict';

const logger = require('../config/logger');

/**
 * Migration script: Rename / dual-populate PaperInfo space-containing fields to camelCase.
 *
 * Usage:
 *   node scripts/migrate-paper-fields.js           # Run migration
 *   node scripts/migrate-paper-fields.js --dry-run # Dry run without writing
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function migrate() {
  const isDryRun = process.argv.includes('--dry-run');
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    logger.error('❌ MONGO_URI is not set in environment.');
    process.exit(1);
  }

  logger.info(`🔌 Connecting to MongoDB${isDryRun ? ' (DRY RUN)' : ''}...`);
  await mongoose.connect(mongoUri);

  const collection = mongoose.connection.collection('paperinfos');
  const cursor = collection.find({});
  let totalProcessed = 0;
  let totalMigrated = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    totalProcessed++;

    const updates = {};

    if (doc['College Name'] && !doc.collegeName) updates.collegeName = doc['College Name'];
    if (doc['Branch'] && !doc.branch) updates.branch = doc['Branch'];
    if (doc['Year Of Study'] && !doc.yearOfStudy) updates.yearOfStudy = doc['Year Of Study'];
    if (doc['Semester'] && !doc.semester) updates.semester = doc['Semester'];
    if (doc['Course Name'] && !doc.courseName) updates.courseName = doc['Course Name'];
    if (doc['Course Code'] && !doc.courseCode) updates.courseCode = doc['Course Code'];
    if (doc['Course Teacher'] && !doc.courseTeacher) updates.courseTeacher = doc['Course Teacher'];
    if (doc['Collected Data'] && !doc.collectedData) updates.collectedData = doc['Collected Data'];

    if (Object.keys(updates).length > 0) {
      totalMigrated++;
      if (!isDryRun) {
        await collection.updateOne({ _id: doc._id }, { $set: updates });
      }
    }
  }

  logger.info(' Migration summary:');
  logger.info(`   Total papers scanned: ${totalProcessed}`);
  logger.info(`   Total papers migrated: ${totalMigrated}`);
  logger.info(isDryRun ? '   (Dry run completed — no documents were changed)' : '   Migration completed successfully!');

  await mongoose.disconnect();
}

migrate().catch((err) => {
  logger.error('💥 Migration failed:', err);
  process.exit(1);
});
