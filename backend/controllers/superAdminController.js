const College = require('../Model/College');
const User = require('../Model/user');
const Paper = require('../Model/PaperInfo');

/**
 * GET /super-admin/stats
 * Global platform statistics for the super admin dashboard.
 */
const getGlobalStats = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalColleges,
      activeColleges,
      totalTeachers,
      totalReviewers,
      totalAdmins,
      totalPapers,
      recentPapers,
      recentUsers,
    ] = await Promise.all([
      College.countDocuments(),
      College.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'teacher' }),
      User.countDocuments({ role: 'reviewer' }),
      User.countDocuments({ role: 'admin' }),
      Paper.countDocuments(),
      Paper.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    ]);

    return res.json({
      error: false,
      stats: {
        totalColleges,
        activeColleges,
        inactiveColleges: totalColleges - activeColleges,
        totalTeachers,
        totalReviewers,
        totalAdmins,
        totalUsers: totalTeachers + totalReviewers + totalAdmins,
        totalPapers,
        recentPapers,
        recentUsers,
      },
    });
  } catch (err) {
    console.error('Error fetching global stats:', err);
    return res.status(500).json({ error: true, message: 'Server error fetching global stats.' });
  }
};

/**
 * GET /super-admin/colleges
 * All colleges with live teacher count, paper count, and admin names.
 */
const getAllColleges = async (req, res) => {
  try {
    const { search = '', status = '' } = req.query;

    const query = {};
    if (search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { code: { $regex: search.trim(), $options: 'i' } },
        { city: { $regex: search.trim(), $options: 'i' } },
      ];
    }
    if (status === 'active') query.isActive = true;
    else if (status === 'inactive') query.isActive = false;

    const colleges = await College.find(query)
      .populate('adminIds', 'userName fullName email')
      .sort({ createdAt: -1 })
      .lean();

    // Enrich each college with live counts
    const enriched = await Promise.all(
      colleges.map(async (college) => {
        const [teacherCount, paperCount] = await Promise.all([
          User.countDocuments({ collegeId: college._id, role: { $in: ['teacher', 'reviewer', 'admin'] } }),
          Paper.countDocuments({
            $or: [
              { userId: { $in: await User.find({ collegeId: college._id }).distinct('_id') } },
              ...(college.name ? [{ 'College Name': { $regex: college.name, $options: 'i' } }] : []),
            ],
          }),
        ]);
        return { ...college, liveTeacherCount: teacherCount, livePaperCount: paperCount };
      })
    );

    return res.json({ error: false, colleges: enriched });
  } catch (err) {
    console.error('Error fetching colleges for super admin:', err);
    return res.status(500).json({ error: true, message: 'Server error fetching colleges.' });
  }
};

/**
 * GET /super-admin/colleges/:id
 * Full drill-down: college details, stats, users list, papers list.
 */
const getCollegeDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const college = await College.findById(id).populate('adminIds', 'userName fullName email').lean();
    if (!college) {
      return res.status(404).json({ error: true, message: 'College not found.' });
    }

    // Fetch all users in the college
    const users = await User.find({ collegeId: id }).select('-password').sort({ createdAt: -1 }).lean();

    // Derive stats from users array
    const userIds = users.map((u) => u._id);
    const stats = {
      totalUsers: users.length,
      teachers: users.filter((u) => u.role === 'teacher').length,
      reviewers: users.filter((u) => u.role === 'reviewer').length,
      admins: users.filter((u) => u.role === 'admin').length,
      blocked: users.filter((u) => u.isBlocked).length,
    };

    // Fetch papers uploaded by users in this college
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const paperQuery = {
      $or: [
        { userId: { $in: userIds } },
        ...(college.name ? [{ 'College Name': { $regex: college.name, $options: 'i' } }] : []),
      ],
    };

    const papers = await Paper.find(paperQuery)
      .populate('userId', 'userName fullName')
      .sort({ createdAt: -1 })
      .lean();

    stats.totalPapers = papers.length;
    stats.recentPapers = papers.filter(
      (p) => p.createdAt && new Date(p.createdAt) >= sevenDaysAgo
    ).length;

    return res.json({
      error: false,
      college,
      stats,
      users,
      papers,
    });
  } catch (err) {
    console.error('Error fetching college details:', err);
    return res.status(500).json({ error: true, message: 'Server error fetching college details.' });
  }
};

/**
 * PUT /super-admin/colleges/:id
 * Update college name, code, address, city, state, isActive.
 */
const updateCollege = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, address, city, state, isActive } = req.body;

    const college = await College.findById(id);
    if (!college) {
      return res.status(404).json({ error: true, message: 'College not found.' });
    }

    if (name && name.trim()) {
      const conflict = await College.findOne({ _id: { $ne: id }, name: { $regex: `^${name.trim()}$`, $options: 'i' } });
      if (conflict) return res.status(409).json({ error: true, message: 'College name already taken.' });
      college.name = name.trim();
    }
    if (code && code.trim()) {
      const conflict = await College.findOne({ _id: { $ne: id }, code: code.trim().toUpperCase() });
      if (conflict) return res.status(409).json({ error: true, message: 'College code already taken.' });
      college.code = code.trim().toUpperCase();
    }
    if (address !== undefined) college.address = address.trim();
    if (city !== undefined) college.city = city.trim();
    if (state !== undefined) college.state = state.trim();
    if (typeof isActive === 'boolean') college.isActive = isActive;

    await college.save();
    return res.json({ error: false, message: 'College updated successfully.', college });
  } catch (err) {
    console.error('Error updating college:', err);
    return res.status(500).json({ error: true, message: 'Server error updating college.' });
  }
};

/**
 * DELETE /super-admin/colleges/:id
 * Soft delete (sets isActive = false). Prevents deletion if users exist.
 */
const deleteCollege = async (req, res) => {
  try {
    const { id } = req.params;

    const college = await College.findById(id);
    if (!college) {
      return res.status(404).json({ error: true, message: 'College not found.' });
    }

    const userCount = await User.countDocuments({ collegeId: id });
    if (userCount > 0) {
      return res.status(400).json({
        error: true,
        message: `Cannot delete: ${userCount} user(s) are assigned to this college. Deactivate it instead.`,
      });
    }

    college.isActive = false;
    await college.save();

    return res.json({ error: false, message: 'College deactivated successfully.' });
  } catch (err) {
    console.error('Error deleting college:', err);
    return res.status(500).json({ error: true, message: 'Server error deleting college.' });
  }
};

module.exports = {
  getGlobalStats,
  getAllColleges,
  getCollegeDetails,
  updateCollege,
  deleteCollege,
};
