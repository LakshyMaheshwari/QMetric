require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const College = require('../Model/College');
const User = require('../Model/user');

async function reconcile({ dryRun = false } = {}) {
  await mongoose.connect(process.env.MONGO_URI);

  const colleges = await College.find({}).lean();
  let scanned = 0;
  let corrected = 0;

  for (const college of colleges) {
    scanned++;
    const actualTeachers = await User.countDocuments({
      collegeId: college._id,
      role: 'teacher'
    });

    const stored = college.totalTeachers ?? 0;
    if (stored !== actualTeachers) {
      console.log(
        `[DRIFT] ${college.name} (${college._id}): stored=${stored} actual=${actualTeachers}`
      );
      if (!dryRun) {
        await College.updateOne(
          { _id: college._id },
          { $set: { totalTeachers: actualTeachers } }
        );
      }
      corrected++;
    }
  }

  console.log(
    `\nReconciliation ${dryRun ? '(dry-run) ' : ''}complete. ` +
    `Scanned: ${colleges.length}, drift fixed: ${corrected}`
  );

  await mongoose.disconnect();
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  reconcile({ dryRun }).catch((err) => {
    console.error('Reconciliation failed:', err);
    process.exit(1);
  });
}

module.exports = reconcile;