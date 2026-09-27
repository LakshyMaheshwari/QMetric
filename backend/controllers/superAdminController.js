const College = require('../Model/College');
const User = require('../Model/user');
const Paper = require('../Model/PaperInfo');
const AuditLog = require('../Model/AuditLog');
const { paginate, getPaginationMeta } = require('../utils/pagination');
const { logAudit } = require('../utils/auditLog');
const { getUserId } = require('../utils/currentUser');
const escapeRegex = require('../utils/escapeRegex');

/**
 * POST /super-admin/colleges
 * Create a new college with audit logging.
 */
const createCollege = async (req, res) => {
  try {
    const { name, code, address, city, state, adminIds, isActive } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: true, message: 'College name is required.' });
    if (!code?.trim()) return res.status(400).json({ error: true, message: 'College code is required.' });

    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    const existing = await College.findOne({
      $or: [
        { code: trimmedCode },
        { name: { $regex: `^${trimmedName}$`, $options: 'i' } },
      ],
    });
    if (existing) {
      const conflict = existing.code === trimmedCode ? 'College code' : 'College name';
      return res.status(409).json({ error: true, message: `${conflict} is already registered.` });
    }

    const newCollege = new College({
      name: trimmedName,
      code: trimmedCode,
      address: address?.trim() || '',
      city: city?.trim() || '',
      state: state?.trim() || '',
      adminIds: Array.isArray(adminIds) ? adminIds : [],
      isActive: typeof isActive === 'boolean' ? isActive : true,
      totalPapers: 0,
      totalTeachers: 0,
    });

    await newCollege.save();

    await logAudit({
      userId: getUserId(req),
      action: 'CREATE_COLLEGE',
      resource: `College:${newCollege._id}`,
      changes: { newValue: { name: newCollege.name, code: newCollege.code } },
      request: req,
    });

    return res.status(201).json({
      error: false,
      message: 'College created successfully.',
      college: newCollege,
    });
  } catch (err) {
    console.error('Error creating college:', err);
    return res.status(500).json({ error: true, message: 'Server error creating college.' });
  }
};

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
      totalSuperAdmins,
      totalPapers,
      recentPapers,
      recentUsers,
    ] = await Promise.all([
      College.countDocuments(),
      College.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'teacher' }),
      User.countDocuments({ role: 'reviewer' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'super_admin' }),
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
        totalSuperAdmins,
        totalUsers: totalTeachers + totalReviewers + totalAdmins + totalSuperAdmins,
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
    const { skip, limit, page } = paginate(req);

    const query = {};

    if (search.trim()) {
      const safe = escapeRegex(search.trim().slice(0, 100));
      const regex = new RegExp(safe, 'i');
      query.$or = [
        { name: regex },
        { code: regex },
        { city: regex },
      ];
    }

    if (status === 'active') query.isActive = true;
    else if (status === 'inactive') query.isActive = false;

    const [colleges, total] = await Promise.all([
      College.find(query)
        .populate('adminIds', 'userName fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      College.countDocuments(query),
    ]);

    const collegeIds = colleges.map((c) => c._id);

    // Batch user and paper counts across all returned colleges (avoids N+1)
    const [userCounts, paperCounts] = await Promise.all([
      User.aggregate([
        { $match: { collegeId: { $in: collegeIds }, role: { $in: ['teacher', 'reviewer', 'admin'] } } },
        { $group: { _id: '$collegeId', count: { $sum: 1 } } },
      ]),
      Paper.aggregate([
        { $match: { collegeId: { $in: collegeIds } } },
        { $group: { _id: '$collegeId', count: { $sum: 1 } } },
      ]),
    ]);

    const userCountMap = new Map(userCounts.map((u) => [String(u._id), u.count]));
    const paperCountMap = new Map(paperCounts.map((p) => [String(p._id), p.count]));

    // Enrich each college with live counts in memory
    const enriched = colleges.map((college) => {
      const colIdStr = String(college._id);
      return {
        ...college,
        liveTeacherCount: userCountMap.get(colIdStr) || 0,
        livePaperCount: paperCountMap.get(colIdStr) || (college.totalPapers || 0),
      };
    });

    // System-wide summary (independent of pagination/filter)
    const [totalColleges, activeColleges, totalTeachers, papersAgg] = await Promise.all([
      College.countDocuments(),
      College.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'teacher' }),
      Paper.aggregate([{ $group: { _id: null, total: { $sum: '$totalPapers' } } }]),
    ]);

    return res.json({
      error: false,
      colleges: enriched,
      pagination: getPaginationMeta(total, page, limit),
      summary: {
        totalColleges,
        activeColleges,
        inactiveColleges: totalColleges - activeColleges,
        totalTeachers,
        totalPapers: papersAgg[0]?.total || 0,
      },
    });
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

    const userIds = users.map((u) => u._id);
    const stats = {
      totalUsers: users.length,
      teachers: users.filter((u) => u.role === 'teacher').length,
      reviewers: users.filter((u) => u.role === 'reviewer').length,
      admins: users.filter((u) => u.role === 'admin').length,
      blocked: users.filter((u) => u.isBlocked).length,
    };

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Safe regex — escaped and length-capped to avoid ReDoS
    const safeName = college.name ? escapeRegex(String(college.name).slice(0, 100)) : null;

    const paperQuery = {
      $or: [
        { userId: { $in: userIds } },
        ...(safeName ? [{ 'College Name': new RegExp(safeName, 'i') }] : []),
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

    const oldName = college.name;
    const oldCode = college.code;

    if (name && name.trim()) {
      const conflict = await College.findOne({
        _id: { $ne: id },
        name: { $regex: `^${name.trim()}$`, $options: 'i' },
      });
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

    await logAudit({
      userId: getUserId(req),
      action: 'UPDATE_COLLEGE',
      resource: `College:${id}`,
      changes: {
        oldValue: { name: oldName, code: oldCode },
        newValue: { name: college.name, code: college.code },
        fields: ['name', 'code'],
      },
      request: req,
    });

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

    const isPermanent = req.query.permanent === 'true';
    if (isPermanent) {
      await College.findByIdAndDelete(id);
    } else {
      college.isActive = false;
      await college.save();
    }

    await logAudit({
      userId: getUserId(req),
      action: 'DELETE_COLLEGE',
      resource: `College:${id}`,
      changes: { oldValue: { name: college.name, code: college.code, permanent: isPermanent } },
      request: req,
    });

    return res.json({
      error: false,
      message: isPermanent ? 'College permanently deleted.' : 'College deactivated successfully.',
    });
  } catch (err) {
    console.error('Error deleting college:', err);
    return res.status(500).json({ error: true, message: 'Server error deleting college.' });
  }
};

/**
 * GET /super-admin/audit-logs
 * Paginated audit log listing with optional filters.
 */
const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Number.parseInt(req.query.limit, 10) || 50);
    const skip = (page - 1) * limit;

    const { action, userId, startDate, endDate } = req.query;

    const query = {};
    if (action) query.action = action;
    if (userId) query.userId = userId;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('userId', 'userName email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      error: false,
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

/**
 * GET /super-admin/email/test
 * Send a test email to verify SMTP configuration.
 */
const testEmailConfig = async (req, res) => {
  try {
    const targetEmail = req.query.to || req.user?.email;
    if (!targetEmail) {
      return res.status(400).json({ error: true, message: 'No target email provided.' });
    }

    const { sendMail } = require('../utils/mailer');
    const configured = Boolean(process.env.SMTP_HOST);

    await sendMail({
      to: targetEmail,
      subject: '[QMetric] SMTP configuration test',
      text: `This is a test email from QMetric. If you received it, your SMTP configuration is working.\n\nSent at: ${new Date().toISOString()}`,
      html: `<p>This is a test email from <strong>QMetric</strong>.</p><p>If you received it, your SMTP configuration is working.</p><p style="color:#666;font-size:12px;">Sent at: ${new Date().toISOString()}</p>`,
    });

    return res.json({
      error: false,
      message: 'Test email sent.',
      target: targetEmail,
      smtpConfigured: configured,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('testEmailConfig error:', err);
    res.status(500).json({
      error: true,
      message: 'Failed to send test email.',
      details: err.message,
      smtpConfigured: Boolean(process.env.SMTP_HOST),
    });
  }
};

module.exports = {
  createCollege,
  getGlobalStats,
  getAllColleges,
  getCollegeDetails,
  updateCollege,
  deleteCollege,
  getAuditLogs,
  testEmailConfig,
};