const Paper = require('../Model/PaperInfo');
const logger = require('../config/logger');
const User = require('../Model/user');
const College = require('../Model/College');
const paperFields = require('../core/constants/paperFields');
const { paginate, getPaginationMeta } = require('../utils/pagination');
const { logAudit } = require('../utils/auditLog');
const { sendReviewStatusEmail } = require('../utils/mailer');
const escapeRegex = require('../utils/escapeRegex');
const { getUserId, getUserRole, getCollegeId, isAdmin, isReviewer, isSuperAdmin } = require('../utils/currentUser');
const mongoose = require('mongoose');
const PaperInfo = require('../Model/PaperInfo');
const { createNotification } = require('./notificationController');

/**
 * Helper to build the college query filter for papers.
 * Pure read — no write side effects. Legacy rows are backfilled by
 * scripts/backfillCollegeRefs.js (one-time) instead of per request.
 */
async function buildCollegePaperQuery(userId) {
  const user = await User.findById(userId).select('collegeId role');
  if (!user) {
    return { error: 'User not found', query: null, collegeId: null };
  }

  // Super admin without assigned college can view all papers
  if (user.role === 'super_admin' && !user.collegeId) {
    return { error: null, query: {}, collegeId: null, isSuperAdmin: true };
  }

  const collegeId = user.collegeId;
  if (!collegeId) {
    return { error: 'You are not assigned to any college.', query: null, collegeId: null };
  }

  // Exact collegeId matching only — no regex fallbacks (prevents data leaks)
  const collegeUsers = await User.find({ collegeId }).distinct('_id');

  const paperMatches = [
    { collegeId },
    ...(collegeUsers.length > 0 ? [{ userId: { $in: collegeUsers } }] : []),
  ];

  const baseQuery = { $or: paperMatches };
  const college = await College.findById(collegeId);
  return { error: null, query: baseQuery, collegeId, college };
}

/**
 * Build a MongoDB query from a base query + optional extra condition.
 * Returns the base alone if no extra condition is provided.
 */
function mergeQuery(baseQuery, extraCondition) {
  const hasBase = baseQuery && Object.keys(baseQuery).length > 0;
  if (hasBase && extraCondition) {
    return { $and: [baseQuery, extraCondition] };
  }
  if (hasBase) return baseQuery;
  if (extraCondition) return extraCondition;
  return {};
}

/**
 * Format paper object so both original keys and normalized keys exist
 */
function formatPaper(p) {
  const plain = typeof p?.toObject === 'function' ? p.toObject() : p;
  const collectedData = plain[paperFields.COLLECTED_DATA] || [];
  const questionsList = Array.isArray(collectedData) ? collectedData : (plain.questions || []);
  const questionsCount = questionsList.length;

  return {
    ...plain,
    courseName: plain[paperFields.COURSE_NAME] || plain.courseName || 'Untitled',
    courseCode: plain[paperFields.COURSE_CODE] || plain.courseCode || '',
    courseTeacher: plain[paperFields.COURSE_TEACHER] || plain.courseTeacher || '',
    collegeName: plain[paperFields.COLLEGE_NAME] || plain.collegeName || '',
    branch: plain['Branch'] || plain.branch || '',
    semester: plain['Semester'] || plain.semester || '',
    questions: questionsList,
    questionsCount,
    qualityScore: plain.qualityScore || 0,
    reviewStatus: plain.reviewStatus || 'pending',
  };
}

/**
 * Determine the audit-log action string from a review action.
 * Extracted so the ternary chain below stays flat.
 */
function auditActionFor(reviewAction) {
  if (reviewAction === 'approved') return 'APPROVE_PAPER';
  if (reviewAction === 'rejected') return 'REJECT_PAPER';
  return 'REVIEW_PAPER';
}

// GET /reviewer/papers - Get all papers in reviewer's college
exports.getCollegePapers = async (req, res) => {
  try {
    const { error, query: baseQuery } = await buildCollegePaperQuery(getUserId(req));
    if (error) {
      return res.status(400).json({ error: true, message: error });
    }

    const { status, search } = req.query;
    const { skip, limit, page } = paginate(req, 20, 100);
    const conditions = [];

    // Base college filter
    if (baseQuery && Object.keys(baseQuery).length > 0) {
      conditions.push(baseQuery);
    }

    // Filter by review status — "pending" also matches papers missing the field
    if (status && status !== 'all') {
      if (status === 'pending') {
        conditions.push({
          $or: [
            { reviewStatus: 'pending' },
            { reviewStatus: { $exists: false } },
            { reviewStatus: null },
          ],
        });
      } else {
        conditions.push({ reviewStatus: status });
      }
    }

    // Search by course name, code, or teacher — escaped to prevent ReDoS
    if (search && search.trim()) {
      const safe = escapeRegex(search.trim().slice(0, 100));
      const searchRegex = new RegExp(safe, 'i');
      conditions.push({
        $or: [
          { [paperFields.COURSE_NAME]: searchRegex },
          { [paperFields.COURSE_CODE]: searchRegex },
          { [paperFields.COURSE_TEACHER]: searchRegex },
        ],
      });
    }

    const finalQuery = conditions.length > 1 ? { $and: conditions } : (conditions[0] || {});

    const [rawPapers, total] = await Promise.all([
      Paper.find(finalQuery)
        .populate('userId', 'fullName userName email collegeName department role')
        .populate('reviewedBy', 'fullName userName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Paper.countDocuments(finalQuery),
    ]);

    const papers = rawPapers.map(formatPaper);

    res.json({
      error: false,
      papers,
      pagination: getPaginationMeta(total, page, limit),
    });
  } catch (error) {
    logger.error('Error fetching reviewer papers:', error);
    res.status(500).json({ error: true, message: 'Server error' });
  }
};

// GET /reviewer/papers/:id - Get single paper details
exports.getPaperDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, query: baseQuery } = await buildCollegePaperQuery(getUserId(req));
    if (error) {
      return res.status(400).json({ error: true, message: error });
    }

    const conditions = [{ _id: id }];
    if (baseQuery && Object.keys(baseQuery).length > 0) {
      conditions.push(baseQuery);
    }

    const paper = await Paper.findOne(conditions.length > 1 ? { $and: conditions } : conditions[0])
      .populate('userId', 'fullName userName email collegeName department role')
      .populate('reviewedBy', 'fullName userName email')
      .populate('reviewHistory.reviewerId', 'fullName userName email');

    if (!paper) {
      return res.status(404).json({ error: true, message: 'Paper not found in your college' });
    }

    res.json({
      error: false,
      paper: formatPaper(paper),
    });
  } catch (error) {
    logger.error('Error fetching paper details:', error);
    res.status(500).json({ error: true, message: 'Server error' });
  }
};

// PUT /reviewer/papers/:id/review - Review paper
exports.reviewPaper = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comments } = req.body || {};
    const reviewerId = getUserId(req);

    if (!['approved', 'rejected', 'needs_revision'].includes(action)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid action. Use approved, rejected, or needs_revision',
      });
    }

    const { error, query: baseQuery, collegeId } = await buildCollegePaperQuery(reviewerId);
    if (error) {
      return res.status(400).json({ error: true, message: error });
    }

    const conditions = [{ _id: id }];
    if (baseQuery && Object.keys(baseQuery).length > 0) {
      conditions.push(baseQuery);
    }

    let paper = await Paper.findOne(conditions.length > 1 ? { $and: conditions } : conditions[0]);
    if (!paper) {
      return res.status(404).json({ error: true, message: 'Paper not found in your college' });
    }

    const previousReviewStatus = paper.reviewStatus || 'pending';

    // State-machine guard: only submitted papers can be reviewed.
    if (previousReviewStatus !== 'pending') {
      return res.status(400).json({
        error: true,
        message: `Cannot review a paper with status: ${previousReviewStatus}. Only pending papers can be reviewed.`,
      });
    }

    // Conflict-of-interest guard: nobody reviews their own paper.
    if (String(paper.userId) === String(reviewerId)) {
      return res.status(403).json({
        error: true,
        message: 'You cannot review your own paper.',
      });
    }

    // Atomic check-and-set: if another reviewer got there first (status is no
    // longer 'pending'), this matches nothing and we return 409 instead of
    // silently overwriting their decision.
    const now = new Date();
    const setFields = {
      reviewStatus: action,
      reviewedBy: reviewerId,
      reviewComments: comments || '',
      reviewedAt: now,
    };
    if (!paper.collegeId && collegeId) {
      setFields.collegeId = collegeId;
    }

    const updated = await Paper.findOneAndUpdate(
      { _id: paper._id, reviewStatus: 'pending' },
      {
        $set: setFields,
        $push: {
          reviewHistory: {
            reviewerId,
            action,
            comments: comments || '',
            timestamp: now,
          },
        },
      },
      { new: true }
    );
    if (!updated) {
      return res.status(409).json({
        error: true,
        message: 'This paper was already reviewed by someone else. Refresh and try again.',
      });
    }
    // Use the freshly-updated document for everything below (populate, response).
    paper = updated;

    await logAudit({
      userId: reviewerId,
      action: auditActionFor(action),
      resource: `Paper:${paper._id}`,
      changes: {
        oldValue: { reviewStatus: previousReviewStatus },
        newValue: { reviewStatus: action, comments },
        fields: ['reviewStatus', 'reviewComments'],
      },
      request: req,
    });

    await paper.populate('reviewedBy', 'fullName userName email');
    await paper.populate('reviewHistory.reviewerId', 'fullName userName email');
    await paper.populate('userId', 'fullName email');

        // ── Emit in-app notification to the paper's author ──
    const notifTypeMap = {
      approved: 'paper_approved',
      rejected: 'paper_rejected',
      needs_revision: 'revision_needed',
    };
    const notifTitleMap = {
      approved: 'Paper approved',
      rejected: 'Paper rejected',
      needs_revision: 'Revision requested',
    };
    if (paper.userId?._id) {
      createNotification({
        userId: paper.userId._id,
        type: notifTypeMap[action],
        title: notifTitleMap[action],
        message: `"${paper['Course Name'] || 'Untitled'}" was ${action.replace('_', ' ')} by ${paper.reviewedBy?.fullName || 'a reviewer'}.`,
        relatedDocId: paper._id,
        actionUrl: `/teacher/papers/${paper._id}`,
      }).catch((err) => logger.error('In-app notification dispatch error:', err.message));
    }

    // Notify author asynchronously if email is available
    const authorEmail = paper.userId?.email;
    if (authorEmail) {
      sendReviewStatusEmail({
        to: authorEmail,
        courseName: paper[paperFields.COURSE_NAME] || paper.courseName || 'Untitled',
        reviewStatus: action,
        comments,
      }).catch((err) => logger.error('Notification dispatch error:', err.message));
    }

    res.json({
      error: false,
      message: `Paper ${action.replace('_', ' ')} successfully`,
      paper: formatPaper(paper),
    });
  } catch (error) {
    await logAudit({
      userId: getUserId(req),
      action: 'REVIEW_PAPER',
      resource: `Paper:${req.params.id}`,
      request: req,
      error,
    });
    logger.error('Error reviewing paper:', error);
    res.status(500).json({ error: true, message: 'Server error' });
  }
};

// GET /reviewer/stats - Get review statistics
exports.getReviewStats = async (req, res) => {
  try {
    const { error, query: baseQuery } = await buildCollegePaperQuery(getUserId(req));
    if (error) {
      return res.status(400).json({ error: true, message: error });
    }

    const pendingCond = {
      $or: [
        { reviewStatus: 'pending' },
        { reviewStatus: { $exists: false } },
        { reviewStatus: null },
      ],
    };

    const pendingQuery        = mergeQuery(baseQuery, pendingCond);
    const approvedQuery       = mergeQuery(baseQuery, { reviewStatus: 'approved' });
    const rejectedQuery       = mergeQuery(baseQuery, { reviewStatus: 'rejected' });
    const needsRevisionQuery  = mergeQuery(baseQuery, { reviewStatus: 'needs_revision' });
    const totalQuery          = baseQuery && Object.keys(baseQuery).length > 0 ? baseQuery : {};
    const myReviewsQuery      = mergeQuery(baseQuery, { reviewedBy: getUserId(req) });

    const [pending, approved, rejected, needsRevision, total, myReviews] = await Promise.all([
      Paper.countDocuments(pendingQuery),
      Paper.countDocuments(approvedQuery),
      Paper.countDocuments(rejectedQuery),
      Paper.countDocuments(needsRevisionQuery),
      Paper.countDocuments(totalQuery),
      Paper.countDocuments(myReviewsQuery),
    ]);

    const formattedStats = {
      pending,
      approved,
      rejected,
      needsRevision,
      total,
      myReviews,
      myPending: pending,
    };

    res.json({
      error: false,
      stats: formattedStats,
      ...formattedStats,
    });
  } catch (error) {
    logger.error('Error fetching review stats:', error);
    res.status(500).json({ error: true, message: 'Server error' });
  }
};

// GET /reviewer/pending-count - Get pending papers count (for badge)
exports.getPendingCount = async (req, res) => {
  try {
    const { error, query: baseQuery } = await buildCollegePaperQuery(getUserId(req));
    if (error) {
      return res.status(400).json({ error: true, message: error });
    }

    const pendingCond = {
      $or: [
        { reviewStatus: 'pending' },
        { reviewStatus: { $exists: false } },
        { reviewStatus: null },
      ],
    };

    const query = mergeQuery(baseQuery, pendingCond);
    const count = await Paper.countDocuments(query);

    res.json({ error: false, pending: count });
  } catch (error) {
    logger.error('Error fetching pending count:', error);
    res.status(500).json({ error: true, message: 'Server error' });
  }
};

/**
 * GET /reviewer/papers/:id/recommendations/bloom
 * Returns stored Bloom's recommendations for a paper.
 * The Evaluate() pipeline writes `BloomRecommendations` onto PaperInfo.
 * If it hasn't been generated yet, respond 404 telling the caller to re-evaluate.
 */
async function getBloomRecommendations(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: true, message: 'Invalid paper ID' });
        }

        // `Collected Data` contains a space, so use the object form of select().
        const paper = await PaperInfo.findById(id)
            .select({
                collegeId: 1,
                BloomRecommendations: 1,
                [paperFields.COLLECTED_DATA]: 1,
            })
            .lean();

        if (!paper) {
            return res.status(404).json({ error: true, message: 'Paper not found' });
        }

        // Authorization: ONLY super_admin bypasses; everyone else (incl. college
        // admins) must match the paper's college. isAdmin() is true for both
        // admin and super_admin, so it must not be used here.
        if (
            !isSuperAdmin(req) &&
            (!paper.collegeId || String(paper.collegeId) !== String(getCollegeId(req)))
        ) {
            return res.status(403).json({ error: true, message: 'Forbidden' });
        }

        // The upload pipeline stores recommendations inside Collected Data[0]
        // (top-level fields are not in the PaperInfo schema and are dropped on save).
        const bloomData =
            paper.BloomRecommendations ||
            paper[paperFields.COLLECTED_DATA]?.[0]?.BloomRecommendations;

        if (!bloomData) {
            return res.status(404).json({
                error: true,
                message:
                    'Bloom recommendations not yet generated for this paper. Re-evaluate the paper first.',
            });
        }

        const {
            recommendations = [],
            bloomLevelOverview = {},
        } = bloomData;

        // Aggregate by expected level (1..6)
        const byLevel = {};
        for (let lvl = 1; lvl <= 6; lvl++) {
            const subset = recommendations.filter((r) => r.expectedLevel === lvl);
            byLevel[lvl] = {
                expectedLevel: lvl,
                totalQuestions: subset.length,
                mismatched: subset.filter((r) => r.actualLevel !== r.expectedLevel).length,
                avgGap: subset.length
                    ? Number(
                          (
                              subset.reduce((s, r) => s + (r.gap || 0), 0) / subset.length
                          ).toFixed(2)
                      )
                    : 0,
                overview: bloomLevelOverview[lvl] || null,
            };
        }

        const summary = {
            totalGaps: recommendations.filter((r) => r.gap !== 0).length,
            avgGap: recommendations.length
                ? Number(
                      (
                          recommendations.reduce((s, r) => s + (r.gap || 0), 0) /
                          recommendations.length
                      ).toFixed(2)
                  )
                : 0,
            criticalCount: recommendations.filter((r) => r.severity === 'critical').length,
            estimatedPointsToGain: recommendations.reduce(
                (s, r) => s + (r.estimatedPoints || 0),
                0
            ),
        };

        return res.status(200).json({
            error: false,
            recommendations: {
                byLevel,
                byQuestion: recommendations,
                summary,
            },
        });
    } catch (err) {
        logger.error('[reviewer.getBloomRecommendations]', err);
        return res.status(500).json({ error: true, message: 'Internal server error' });
    }
}

/**
 * POST /reviewer/papers/:id/resend-decision-email
 * Resend the decision email (approved / rejected / needs_revision) to the paper's owner.
 */
exports.resendDecisionEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user?.userId;

    const paper = await Paper.findById(id).populate('userId', 'email fullName');
    if (!paper) {
      return res.status(404).json({ error: true, message: 'Paper not found' });
    }

    const { error, query: baseQuery } = await buildCollegePaperQuery(reviewerId);
    if (error) {
      return res.status(400).json({ error: true, message: error });
    }
    if (baseQuery && Object.keys(baseQuery).length > 0) {
      const allowed = await Paper.findOne({ _id: id, $and: [baseQuery] }).select('_id').lean();
      if (!allowed) {
        return res.status(404).json({ error: true, message: 'Paper not found in your college' });
      }
    }

    const status = paper.reviewStatus;
    if (!['approved', 'rejected', 'needs_revision'].includes(status)) {
      return res.status(400).json({
        error: true,
        message: `Cannot resend decision — paper status is "${status}".`,
      });
    }

    const authorEmail = paper.userId?.email;
    if (!authorEmail) {
      return res.status(400).json({ error: true, message: 'Author has no email on file.' });
    }

    const emailService = require('../utils/emailService');
    const courseName = paper['Course Name'] || 'Untitled';
    const courseCode = paper['Course Code'] || '';

    const reviewer = await User.findById(reviewerId).select('fullName').lean();
    const reviewerName = reviewer?.fullName || '';

    if (status === 'approved') {
      await emailService.sendPaperApprovedEmail({
        to: authorEmail,
        paperTitle: courseName,
        courseCode,
        reviewerName,
        qualityScore: paper.qualityScore,
        paperId: paper._id,
      });
    } else if (status === 'rejected') {
      await emailService.sendPaperRejectedEmail({
        to: authorEmail,
        paperTitle: courseName,
        courseCode,
        reviewerName,
        reason: paper.reviewComments || '',
        comments: paper.reviewComments || '',
        paperId: paper._id,
      });
    } else {
      await emailService.sendPaperNeedsRevisionEmail({
        to: authorEmail,
        paperTitle: courseName,
        courseCode,
        reviewerName,
        changes: paper.reviewComments || '',
        deadline: '',
        paperId: paper._id,
      });
    }

    return res.json({
      error: false,
      message: `Decision email resent to ${authorEmail}.`,
    });
  } catch (err) {
    logger.error('resendDecisionEmail error:', err);
    res.status(500).json({ error: true, message: 'Server error resending decision email' });
  }
};

exports.getBloomRecommendations = getBloomRecommendations;