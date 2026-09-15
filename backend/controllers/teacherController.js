const mongoose = require('mongoose');
const Paper = require('../Model/PaperInfo');

// GET /teacher/papers - Get all papers uploaded by the teacher
exports.getMyPapers = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, limit = 50, page = 1 } = req.query;

    let query = { userId };

    if (status && status !== 'all') {
      query.reviewStatus = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const papers = await Paper.find(query)
      .populate('reviewedBy', 'fullName email')
      .populate('reviewHistory.reviewerId', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Paper.countDocuments(query);

    // Count by status for stats
    const stats = await Paper.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$reviewStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    const formattedStats = {
      total: total,
      pending: stats.find(s => s._id === 'pending')?.count || 0,
      approved: stats.find(s => s._id === 'approved')?.count || 0,
      rejected: stats.find(s => s._id === 'rejected')?.count || 0,
      needsRevision: stats.find(s => s._id === 'needs_revision')?.count || 0,
    };

    res.json({
      error: false,
      papers,
      stats: formattedStats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
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
    const userId = req.user.userId;

    const paper = await Paper.findOne({ _id: id, userId })
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
