const mongoose = require('mongoose');
const logger = require('../config/logger');
const Paper = require('../Model/PaperInfo');
const User = require('../Model/user');
const { paginate, getPaginationMeta } = require('../utils/pagination');
const { getUserId, getUserRole, getCollegeId, isTeacher, isReviewer, isAdmin, isSuperAdmin } = require('../utils/currentUser');
const { createNotification } = require('./notificationController');
const { logAudit } = require('../utils/auditLog');

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

    // Default-deny scoping: every branch narrows the query, and the final
    // `else` (students, unknown roles, reviewers without a college) can only
    // ever see their OWN papers. Never leave `query` empty for a non-super_admin.
    const query = {};
    if (isTeacher(req)) {
      query.userId = userId;
    } else if (isSuperAdmin(req)) {
      // NOTE: must be checked before isReviewer() — isReviewer() also matches super_admin.
      if (req.query.collegeId && mongoose.isValidObjectId(req.query.collegeId)) {
        query.collegeId = req.query.collegeId;
      }
    } else if (isReviewer(req) && getCollegeId(req)) {
      query.collegeId = getCollegeId(req);
    } else {
      query.userId = userId;
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
    logger.error('Error fetching papers:', error);
    res.status(500).json({ error: true, message: 'Server error fetching papers' });
  }
};

// GET /teacher/papers/:id - Get single paper with review details
exports.getPaperDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    // Default-deny scoping (see getMyPapers). Only super_admin is unscoped.
    const query = { _id: id };
    if (isSuperAdmin(req)) {
      // unscoped by design
    } else if (!isTeacher(req) && (isReviewer(req) || isAdmin(req)) && getCollegeId(req)) {
      query.$or = [{ userId }, { collegeId: getCollegeId(req) }];
    } else {
      query.userId = userId;
    }

    const paper = await Paper.findOne(query)
      .populate('reviewedBy', 'fullName email')
      .populate('reviewHistory.reviewerId', 'fullName email');

    if (!paper) {
      return res.status(404).json({ error: true, message: 'Paper not found' });
    }

    res.json({ error: false, paper });
  } catch (error) {
    logger.error('Error fetching paper details:', error);
    res.status(500).json({ error: true, message: 'Server error fetching paper details' });
  }
};

// PUT /teacher/papers/:id/submit - Submit paper for review
exports.submitPaperForReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    // Atomic check-and-set: only drafts and papers sent back for revision can be
    // (re)submitted, and two concurrent submits cannot both win.
    const paper = await Paper.findOneAndUpdate(
      { _id: id, userId, reviewStatus: { $in: ['draft', 'needs_revision'] } },
      { $set: { reviewStatus: 'pending', submittedAt: new Date() } },
      { new: true }
    );

    if (!paper) {
      // Distinguish "doesn't exist / not yours" from "wrong state"
      const existing = await Paper.findOne({ _id: id, userId }).select('reviewStatus').lean();
      if (!existing) {
        return res.status(404).json({ error: true, message: 'Paper not found' });
      }
      return res.status(400).json({
        error: true,
        message: `Cannot submit paper with status: ${existing.reviewStatus}. Only draft or needs_revision papers can be submitted.`,
      });
    }

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
          logger.error('[notification.paperSubmitted]', err.message)
        );
    }

    res.json({
      error: false,
      message: 'Paper submitted for review successfully',
      paper,
    });
  } catch (err) {
    logger.error('Submit error:', err);
    res.status(500).json({ error: true, message: 'Server error submitting paper' });
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
    logger.error('Update paper error:', err);
    res.status(500).json({ error: true, message: 'Server error updating paper' });
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

    if (paper.cloudinaryPublicId) {
      try {
        const cloudinary = require('../config/cloudinary');
        await cloudinary.uploader.destroy(paper.cloudinaryPublicId);
      } catch (cloudErr) {
        logger.warn('Cloudinary paper delete failed (non-blocking):', cloudErr.message);
      }
    }

    await Paper.findByIdAndDelete(paper._id);

    res.json({ error: false, message: 'Paper deleted successfully' });
  } catch (err) {
    logger.error('Delete error:', err);
    res.status(500).json({ error: true, message: 'Server error deleting paper' });
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

    const emailResults = await Promise.allSettled(
      reviewers
        .filter((r) => r.email)
        .map((r) => emailService.sendReviewerAssignedEmail({
          to: r.email,
          reviewerName: r.fullName,
          paperTitle: courseName,
          courseCode,
          teacherName,
          questionCount,
          paperId: paper._id,
        }))
    );
    const sentCount = emailResults.filter(
      (result) => result.status === 'fulfilled' && result.value?.success !== false
    ).length;

    try {
      await logAudit({
        userId,
        action: 'RESEND_REVIEW_EMAIL',
        resource: `Paper:${paper._id}`,
        changes: { newValue: { sentCount }, fields: ['reviewEmail'] },
        request: req,
      });
    } catch (auditErr) {
      logger.error('Audit log failed (non-blocking):', auditErr.message);
    }

    return res.json({
      error: false,
      message: `Resent review request to ${sentCount} reviewer(s).`,
      sentCount,
    });
  } catch (err) {
    logger.error('resendPaperReviewEmail error:', err);
    res.status(500).json({ error: true, message: 'Server error resending review email' });
  }
};