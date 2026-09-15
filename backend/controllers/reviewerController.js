const Paper = require('../Model/PaperInfo');
const User = require('../Model/user');
const College = require('../Model/College');

/**
 * Helper to build the college query filter for papers
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

  const college = await College.findById(collegeId);
  const codePrefix = college?.code ? college.code.replace(/[0-9]/g, '').trim() : '';
  const firstNamePart = college?.name ? college.name.split(' ')[0].trim() : '';

  // Match faculty/users by collegeId or college name / code variations
  const userCollegeMatches = [
    { collegeId: collegeId },
    ...(college?.name ? [{ collegeName: { $regex: college.name, $options: 'i' } }] : []),
    ...(college?.code ? [{ collegeName: { $regex: college.code, $options: 'i' } }] : []),
    ...(codePrefix ? [{ collegeName: { $regex: '^' + codePrefix + '$', $options: 'i' } }] : []),
    ...(firstNamePart && firstNamePart.length > 3 ? [{ collegeName: { $regex: firstNamePart, $options: 'i' } }] : []),
  ];

  const collegeUsers = await User.find({ $or: userCollegeMatches }).distinct('_id');

  // Build match query for papers in this college
  const paperMatches = [
    { collegeId: collegeId },
    ...(collegeUsers.length > 0 ? [{ userId: { $in: collegeUsers } }] : []),
    ...(college?.name ? [{ 'College Name': { $regex: college.name, $options: 'i' } }] : []),
    ...(college?.code ? [{ 'College Name': { $regex: college.code, $options: 'i' } }] : []),
    ...(codePrefix ? [{ 'College Name': { $regex: '^' + codePrefix + '$', $options: 'i' } }] : []),
    ...(firstNamePart && firstNamePart.length > 3 ? [{ 'College Name': { $regex: firstNamePart, $options: 'i' } }] : []),
  ];

  const baseQuery = { $or: paperMatches };

  // Opportunistically backfill collegeId on legacy users & papers
  try {
    if (collegeUsers.length > 0) {
      User.updateMany(
        { _id: { $in: collegeUsers }, $or: [{ collegeId: null }, { collegeId: { $exists: false } }] },
        { $set: { collegeId: collegeId } }
      ).exec().catch(() => {});
    }
    Paper.updateMany(
      { $or: paperMatches, $or: [{ collegeId: null }, { collegeId: { $exists: false } }] },
      { $set: { collegeId: collegeId } }
    ).exec().catch(() => {});
  } catch (e) {
    // Non-blocking backfill
  }

  return { error: null, query: baseQuery, collegeId, college };
}

/**
 * Format paper object so both original keys and normalized keys exist
 */
function formatPaper(p) {
  const plain = typeof p.toObject === 'function' ? p.toObject() : p;
  const collectedData = plain['Collected Data'] || [];
  const questionsList = Array.isArray(collectedData) ? collectedData : (plain.questions || []);
  const questionsCount = questionsList.length;

  return {
    ...plain,
    courseName: plain['Course Name'] || plain.courseName || 'Untitled',
    courseCode: plain['Course Code'] || plain.courseCode || '',
    courseTeacher: plain['Course Teacher'] || plain.courseTeacher || '',
    collegeName: plain['College Name'] || plain.collegeName || '',
    branch: plain['Branch'] || plain.branch || '',
    semester: plain['Semester'] || plain.semester || '',
    questions: questionsList,
    questionsCount,
    qualityScore: plain.qualityScore !== undefined ? plain.qualityScore : (plain.bloomLevelMap ? 85 : 75),
    reviewStatus: plain.reviewStatus || 'pending',
  };
}

// GET /reviewer/papers - Get all papers in reviewer's college
exports.getCollegePapers = async (req, res) => {
  try {
    const { error, query: baseQuery } = await buildCollegePaperQuery(req.user.userId);
    if (error) {
      return res.status(400).json({ error: true, message: error });
    }

    const { status, search, limit = 50, page = 1 } = req.query;
    const conditions = [];

    // Base college filter
    if (baseQuery && Object.keys(baseQuery).length > 0) {
      conditions.push(baseQuery);
    }

    // Filter by review status
    if (status && status !== 'all') {
      if (status === 'pending') {
        conditions.push({
          $or: [
            { reviewStatus: 'pending' },
            { reviewStatus: { $exists: false } },
            { reviewStatus: null }
          ]
        });
      } else {
        conditions.push({ reviewStatus: status });
      }
    }

    // Search by course name, code, or teacher
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      conditions.push({
        $or: [
          { 'Course Name': searchRegex },
          { 'Course Code': searchRegex },
          { 'Course Teacher': searchRegex },
        ]
      });
    }

    const finalQuery = conditions.length > 1 ? { $and: conditions } : (conditions[0] || {});

    const parsedLimit = Math.max(1, parseInt(limit) || 50);
    const parsedPage = Math.max(1, parseInt(page) || 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const [rawPapers, total] = await Promise.all([
      Paper.find(finalQuery)
        .populate('userId', 'fullName userName email collegeName department role')
        .populate('reviewedBy', 'fullName userName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      Paper.countDocuments(finalQuery)
    ]);

    const papers = rawPapers.map(formatPaper);

    res.json({
      error: false,
      papers,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    console.error('Error fetching reviewer papers:', error);
    res.status(500).json({ error: true, message: 'Server error' });
  }
};

// GET /reviewer/papers/:id - Get single paper details
exports.getPaperDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, query: baseQuery } = await buildCollegePaperQuery(req.user.userId);
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
      paper: formatPaper(paper)
    });
  } catch (error) {
    console.error('Error fetching paper details:', error);
    res.status(500).json({ error: true, message: 'Server error' });
  }
};

// PUT /reviewer/papers/:id/review - Review paper
exports.reviewPaper = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comments } = req.body;
    const reviewerId = req.user.userId;

    if (!['approved', 'rejected', 'needs_revision'].includes(action)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid action. Use approved, rejected, or needs_revision'
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

    const paper = await Paper.findOne(conditions.length > 1 ? { $and: conditions } : conditions[0]);
    if (!paper) {
      return res.status(404).json({ error: true, message: 'Paper not found in your college' });
    }

    // Update paper review fields
    paper.reviewStatus = action;
    paper.reviewedBy = reviewerId;
    paper.reviewComments = comments || '';
    paper.reviewedAt = new Date();

    if (!paper.collegeId && collegeId) {
      paper.collegeId = collegeId;
    }

    if (!Array.isArray(paper.reviewHistory)) {
      paper.reviewHistory = [];
    }

    paper.reviewHistory.push({
      reviewerId,
      action,
      comments: comments || '',
      timestamp: new Date(),
    });

    await paper.save();

    await paper.populate('reviewedBy', 'fullName userName email');
    await paper.populate('reviewHistory.reviewerId', 'fullName userName email');

    res.json({
      error: false,
      message: `Paper ${action.replace('_', ' ')} successfully`,
      paper: formatPaper(paper),
    });
  } catch (error) {
    console.error('Error reviewing paper:', error);
    res.status(500).json({ error: true, message: 'Server error' });
  }
};

// GET /reviewer/stats - Get review statistics
exports.getReviewStats = async (req, res) => {
  try {
    const { error, query: baseQuery } = await buildCollegePaperQuery(req.user.userId);
    if (error) {
      return res.status(400).json({ error: true, message: error });
    }

    const hasBase = baseQuery && Object.keys(baseQuery).length > 0;

    const pendingCond = {
      $or: [
        { reviewStatus: 'pending' },
        { reviewStatus: { $exists: false } },
        { reviewStatus: null }
      ]
    };

    const pendingQuery = hasBase ? { $and: [baseQuery, pendingCond] } : pendingCond;
    const approvedQuery = hasBase ? { $and: [baseQuery, { reviewStatus: 'approved' }] } : { reviewStatus: 'approved' };
    const rejectedQuery = hasBase ? { $and: [baseQuery, { reviewStatus: 'rejected' }] } : { reviewStatus: 'rejected' };
    const needsRevisionQuery = hasBase ? { $and: [baseQuery, { reviewStatus: 'needs_revision' }] } : { reviewStatus: 'needs_revision' };
    const totalQuery = hasBase ? baseQuery : {};
    const myReviewsQuery = hasBase ? { $and: [baseQuery, { reviewedBy: req.user.userId }] } : { reviewedBy: req.user.userId };

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
      ...formattedStats
    });
  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({ error: true, message: 'Server error' });
  }
};

// GET /reviewer/pending-count - Get pending papers count (for badge)
exports.getPendingCount = async (req, res) => {
  try {
    const { error, query: baseQuery } = await buildCollegePaperQuery(req.user.userId);
    if (error) {
      return res.status(400).json({ error: true, message: error });
    }

    const hasBase = baseQuery && Object.keys(baseQuery).length > 0;
    const pendingCond = {
      $or: [
        { reviewStatus: 'pending' },
        { reviewStatus: { $exists: false } },
        { reviewStatus: null }
      ]
    };

    const query = hasBase ? { $and: [baseQuery, pendingCond] } : pendingCond;
    const count = await Paper.countDocuments(query);

    res.json({ error: false, pending: count });
  } catch (error) {
    console.error('Error fetching pending count:', error);
    res.status(500).json({ error: true, message: 'Server error' });
  }
};
