'use strict';

const Paper = require('../Model/PaperInfo');
const logger = require('../config/logger');
const { paginate, getPaginationMeta, getSortOptions } = require('../utils/pagination');
const { getUserId } = require('../utils/currentUser');
const escapeRegex = require('../utils/escapeRegex');

/**
 * GET /student/papers
 * Returns paginated list of question papers uploaded by the authenticated student.
 */
const getMyPapers = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { page, limit, skip } = paginate(req, 20, 100);
    const { search, courseCode } = req.query;
    const sort = getSortOptions(req, ['createdAt', 'qualityScore', 'Course Name', 'Course Code'], { createdAt: -1 });

    const query = { userId };
    if (courseCode) {
      query['Course Code'] = new RegExp(escapeRegex(courseCode.trim()), 'i');
    }

    if (search && typeof search === 'string') {
      const safe = escapeRegex(search.trim().slice(0, 50));
      query.$or = [
        { 'Course Name': new RegExp(safe, 'i') },
        { 'Course Code': new RegExp(safe, 'i') },
      ];
    }

    const [papers, total] = await Promise.all([
      Paper.find(query)
        .select({ Sequence: 0, 'Collected Data': 0 })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Paper.countDocuments(query),
    ]);

    return res.json({
      error: false,
      papers,
      pagination: getPaginationMeta(total, page, limit),
    });
  } catch (err) {
    logger.error('Student getMyPapers error:', err);
    return res.status(500).json({ error: true, message: 'Server error fetching papers' });
  }
};

/**
 * GET /student/papers/:id
 * Full analysis drill-down for a student's own uploaded paper.
 */
const getPaperDetails = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const paper = await Paper.findOne({ _id: id, userId }).lean();
    if (!paper) {
      return res.status(404).json({ error: true, message: 'Paper not found' });
    }

    return res.json({
      error: false,
      paper,
    });
  } catch (err) {
    logger.error('Student getPaperDetails error:', err);
    return res.status(500).json({ error: true, message: 'Server error fetching paper details' });
  }
};

/**
 * GET /student/stats
 * Aggregate metrics on papers uploaded by the student.
 */
const getStudentStats = async (req, res) => {
  try {
    const userId = getUserId(req);

    const [totalPapers, scoreAgg] = await Promise.all([
      Paper.countDocuments({ userId }),
      Paper.aggregate([
        { $match: { userId, qualityScore: { $ne: null } } },
        {
          $group: {
            _id: null,
            avgScore: { $avg: '$qualityScore' },
            maxScore: { $max: '$qualityScore' },
            minScore: { $min: '$qualityScore' },
          },
        },
      ]),
    ]);

    const stats = {
      totalPapers,
      averageQualityScore: scoreAgg[0] ? Math.round(scoreAgg[0].avgScore * 10) / 10 : 0,
      highestQualityScore: scoreAgg[0] ? Math.round(scoreAgg[0].maxScore * 10) / 10 : 0,
      lowestQualityScore:  scoreAgg[0] ? Math.round(scoreAgg[0].minScore * 10) / 10 : 0,
    };

    return res.json({
      error: false,
      stats,
    });
  } catch (err) {
    logger.error('Student getStudentStats error:', err);
    return res.status(500).json({ error: true, message: 'Server error calculating student stats' });
  }
};

module.exports = {
  getMyPapers,
  getPaperDetails,
  getStudentStats,
};
