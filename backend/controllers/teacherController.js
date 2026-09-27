const mongoose = require('mongoose');
const Paper = require('../Model/PaperInfo');
const User = require('../Model/user');
const { paginate, getPaginationMeta } = require('../utils/pagination');
const { getUserId, getUserRole, getCollegeId, isTeacher, isReviewer, isAdmin, isSuperAdmin } = require('../utils/currentUser');
const { createNotification } = require('./notificationController');

/**
 * Convert a string ID to an ObjectId for use inside an aggregation $match.
 * Mongoose's aggregate() does not auto-cast strings the way find() does,
 * so we have to build the ObjectId explicitly.
 *
 * Uses createFromHexString (modern API) instead of `new mongoose.Types.ObjectId`
 * and returns null when the input is not a valid ObjectId — callers must skip
 * the filter entirely in that case rather than passing a bogus ID.
 */
function toObjectId(id) {
  if (!id || !mongoose.isValidObjectId(id)) return null;
  return mongoose.Types.ObjectId.createFromHexString(String(id));
}

// GET /teacher/papers - Get all papers uploaded by the teacher (or college-scoped for reviewers/admins)
exports.getMyPapers = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { status } = req.query;
    const { skip, limit, page } = paginate(req, 20, 100);

    const query = {};
    if (isTeacher(req)) {
      query.userId = userId;
    } else if (isReviewer(req)) {
      if (getCollegeId(req)) {
        query.collegeId = getCollegeId(req);
      } else {
        query.userId = userId;
      }
    } else if (isSuperAdmin(req)) {
      if (req.query.collegeId) query.collegeId = req.query.collegeId;
    }

    if (status && status !== 'all') {
      query.reviewStatus = status;
    }

    const [papers, total] = await Promise.all([
      Paper.find(query)
        .populate('reviewedBy', 'fullName email')
        .populate('reviewHistory.reviewerId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Paper.countDocuments(query),
    ]);

    // Count by status for stats — aggregation requires real ObjectIds
    const matchFilter = {};
    const uid = toObjectId(query.userId);
    if (uid) matchFilter.userId = uid;
    const cid = toObjectId(query.collegeId);
    if (cid) matchFilter.collegeId = cid;

    const stats = await Paper.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$reviewStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    const formattedStats = {
      total,
      draft: stats.find((s) => s._id === 'draft')?.count || 0,
      pending: stats.find((s) => s._id === 'pending')?.count || 0,
      approved: stats.find((s) => s._id === 'approved')?.count || 0,
      rejected: stats.find((s) => s._id === 'rejected')?.count || 0,
      needsRevision: stats.find((s) => s._id === 'needs_revision')?.count || 0,
    };

    res.json({
      error: false,
      papers,
      stats: formattedStats,
      pagination: getPaginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error('Error fetching papers:', error);
    res.status(500).json({ error: true, message: 'Server error fetching papers' });
  }
};

// GET /teacher/papers/:id - Get single paper with review details
exports.getPaperDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const query = { _id: id };
    if (isTeacher(req)) {
      query.userId = userId;
    } else if ((isReviewer(req) || isAdmin(req)) && getCollegeId(req)) {
      query.$or = [{ userId }, { collegeId: getCollegeId(req) }];
    }

    const paper = await Paper.findOne(query)
      .populate('reviewedBy', 'fullName email')
      .populate('reviewHistory.reviewerId', 'fullName email');

    if (!paper) {
      return res.status(404).json({ error: true, message: 'Paper not found' });
    }

    res.json({ error: false, paper });
  } catch (error) {
    console.error('Error fetching paper details:', error);
    res.status(500).json({ error: true, message: 'Server error fetching paper details' });
  }
};

// PUT /teacher/papers/:id/submit - Submit paper for review
exports.submitPaperForReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const paper = await Paper.findOne({ _id: id, userId });

    if (!paper) {
      return res.status(404).json({ error: true, message: 'Paper not found' });
    }

    if (paper.reviewStatus !== 'draft') {
      return res.status(400).json({
        error: true,
        message: `Cannot submit paper with status: ${paper.reviewStatus}. Only draft papers can be submitted.`,
      });
    }

    paper.reviewStatus = 'pending';
    paper.submittedAt = new Date();
    await paper.save();

    // ── Notify all reviewers/admins in this college (fire-and-forget) ──
    if (paper.collegeId) {
      const submitterId = String(userId);
      const courseName = paper['Course Name'] || 'Untitled';

      User.find({
        collegeId: paper.collegeId,
        role: { $in: ['reviewer', 'admin'] },
      })
        .select('_id')
        .lean()
        .then((recipients) => {
          for (const r of recipients) {
            if (String(r._id) === submitterId) continue;
            createNotification({
              userId: r._id,
              type: 'review_needed',
              title: 'Paper ready for review',
              message: `"${courseName}" was submitted and is awaiting review.`,
              relatedDocId: paper._id,
              actionUrl: `/reviewer/papers/${paper._id}`,
            }).catch(() => {});
          }
        })
        .catch((err) =>
          console.error('[notification.paperSubmitted]', err.message)
        );
    }

    res.json({
      error: false,
      message: 'Paper submitted for review successfully',
      paper,
    });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ error: true, message: err.message });
  }
};

// PUT /teacher/papers/:id - Update paper metadata
exports.updatePaper = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const role = getUserRole(req);
    const collegeId = getCollegeId(req);

    let query;
    if (role === 'super_admin') {
      query = { _id: id };
    } else if (role === 'teacher') {
      query = { _id: id, userId };
    } else if (role === 'admin') {
      if (!collegeId) {
        return res.status(403).json({ error: true, message: 'You are not assigned to a college.' });
      }
      query = { _id: id, collegeId };
    } else {
      return res.status(403).json({ error: true, message: 'You do not have permission to edit papers.' });
    }

    const paper = await Paper.findOne(query);
    if (!paper) {
      return res.status(404).json({ error: true, message: 'Paper not found or unauthorized' });
    }

    if (!['draft', 'needs_revision'].includes(paper.reviewStatus)) {
      return res.status(400).json({
        error: true,
        message: `Cannot edit paper with status: ${paper.reviewStatus}. Only draft or needs_revision papers can be edited.`,
      });
    }

    const allowedFields = ['Course Name', 'Course Code', 'Branch', 'Semester', 'Year Of Study', 'Course Teacher'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        paper[field] = req.body[field];
      }
    }

    await paper.save();
    res.json({ error: false, message: 'Paper updated successfully', paper });
  } catch (err) {
    console.error('Update paper error:', err);
    res.status(500).json({ error: true, message: err.message });
  }
};

// DELETE /teacher/papers/:id - Delete paper
exports.deletePaper = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const role = getUserRole(req);
    const collegeId = getCollegeId(req);

    let query;
    if (role === 'super_admin') {
      query = { _id: id };
    } else if (role === 'teacher') {
      query = { _id: id, userId };
    } else if (role === 'admin') {
      if (!collegeId) {
        return res.status(403).json({ error: true, message: 'You are not assigned to a college.' });
      }
      query = { _id: id, collegeId };
    } else {
      // reviewer or any other role — never allowed to delete papers
      return res.status(403).json({ error: true, message: 'You do not have permission to delete papers.' });
    }

    const paper = await Paper.findOne(query);

    if (!paper) {
      return res.status(404).json({ error: true, message: 'Paper not found or unauthorized' });
    }

    if (role !== 'super_admin' && !['draft', 'needs_revision'].includes(paper.reviewStatus)) {
      return res.status(400).json({
        error: true,
        message: `Cannot delete paper with status: ${paper.reviewStatus}. Only draft or needs_revision papers can be deleted.`,
      });
    }

    await Paper.findByIdAndDelete(paper._id);

    res.json({ error: false, message: 'Paper deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: true, message: err.message });
  }
};

// POST /teacher/papers/:id/resend-review-email
// Re-send the "new paper submitted" email to all reviewers in the college.
exports.resendPaperReviewEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const paper = await Paper.findOne({ _id: id, userId });
    if (!paper) {
      return res.status(404).json({ error: true, message: 'Paper not found' });
    }

    if (paper.reviewStatus !== 'pending') {
      return res.status(400).json({
        error: true,
        message: `Cannot resend review email — paper status is "${paper.reviewStatus}", expected "pending".`,
      });
    }

    if (!paper.collegeId) {
      return res.status(400).json({ error: true, message: 'Paper has no college assigned.' });
    }

    const reviewers = await User.find({
      collegeId: paper.collegeId,
      role: { $in: ['reviewer', 'admin'] },
    })
      .select('email fullName')
      .lean();

    if (reviewers.length === 0) {
      return res.status(404).json({ error: true, message: 'No reviewers found for this college.' });
    }

    const emailService = require('../utils/emailService');
    const courseName = paper['Course Name'] || 'Untitled';
    const courseCode = paper['Course Code'] || '';
    const teacherName = paper['Course Teacher'] || '';
    const questionCount = (paper['Collected Data']?.[0]?.QuestionData || []).length;

    let sentCount = 0;
    for (const r of reviewers) {
      if (!r.email) continue;
      emailService
        .sendReviewerAssignedEmail({
          to: r.email,
          reviewerName: r.fullName,
          paperTitle: courseName,
          courseCode,
          teacherName,
          questionCount,
          paperId: paper._id,
        })
        .catch(() => {});
      sentCount++;
    }

    try {
      await logAudit({
        userId,
        action: 'RESEND_REVIEW_EMAIL',
        resource: `Paper:${paper._id}`,
        changes: { newValue: { sentCount }, fields: ['reviewEmail'] },
        request: req,
      });
    } catch (auditErr) {
      console.error('Audit log failed (non-blocking):', auditErr.message);
    }

    return res.json({
      error: false,
      message: `Resent review request to ${sentCount} reviewer(s).`,
      sentCount,
    });
  } catch (err) {
    console.error('resendPaperReviewEmail error:', err);
    res.status(500).json({ error: true, message: err.message });
  }
};