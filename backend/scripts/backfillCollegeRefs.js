const logger = require('../config/logger');

const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../Model/user');
const Paper = require('../Model/PaperInfo');
const College = require('../Model/College');

/**
 * One-time backfill of collegeId on legacy users and papers.
 * Replaces the opportunistic per-request backfill that used to live
 * in reviewerController.buildCollegePaperQuery.
 *
 * Safe to run multiple times — only touches docs missing collegeId.
 */
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  logger.info('Connected');

  const colleges = await College.find({}).select('_id name').lean();
  logger.info(`Found ${colleges.length} colleges`);

  let usersFixed = 0;
  let papersFixed = 0;

  for (const college of colleges) {
    const collegeUsers = await User.find({ collegeId: college._id }).distinct('_id');

    // Backfill users — those whose collegeName matches but collegeId is missing
    const userResult = await User.updateMany(
      {
        collegeName: college.name,
        $or: [{ collegeId: null }, { collegeId: { $exists: false } }],
      },
      { $set: { collegeId: college._id } }
    );
    usersFixed += userResult.modifiedCount;

    // Backfill papers — those uploaded by users of this college
    if (collegeUsers.length > 0) {
      const paperResult = await Paper.updateMany(
        {
          userId: { $in: collegeUsers },
          $or: [{ collegeId: null }, { collegeId: { $exists: false } }],
        },
        { $set: { collegeId: college._id } }
      );
      papersFixed += paperResult.modifiedCount;
    }
  }

  logger.info(`Users backfilled: ${usersFixed}`);
  logger.info(`Papers backfilled: ${papersFixed}`);

  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  logger.error(err);
  process.exit(1);
});