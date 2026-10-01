'use strict';

const College = require('../Model/College');

async function syncCollegeMembership({ collegeId, userId, oldRole, newRole, session }) {
  if (!collegeId || !userId || oldRole === newRole) return;

  const options = session ? { session } : {};

  if (oldRole === 'teacher' && newRole !== 'teacher') {
    await College.updateOne(
      { _id: collegeId, totalTeachers: { $gt: 0 } },
      { $inc: { totalTeachers: -1 } },
      options
    );
  } else if (oldRole !== 'teacher' && newRole === 'teacher') {
    await College.updateOne(
      { _id: collegeId },
      { $inc: { totalTeachers: 1 } },
      options
    );
  }

  if (oldRole === 'admin' && newRole !== 'admin') {
    await College.updateOne(
      { _id: collegeId },
      { $pull: { adminIds: userId } },
      options
    );
  } else if (oldRole !== 'admin' && newRole === 'admin') {
    await College.updateOne(
      { _id: collegeId },
      { $addToSet: { adminIds: userId } },
      options
    );
  }
}

module.exports = { syncCollegeMembership };
