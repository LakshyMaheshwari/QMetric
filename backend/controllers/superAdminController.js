const College = require('../Model/College');
const User = require('../Model/user');
const Paper = require('../Model/PaperInfo');
const AuditLog = require('../Model/AuditLog');
const OCRLog = require('../Model/OCRLog');
const VerifiedQuestion = require('../Model/VerifiedQuestion');
const LearnedVerb = require('../Model/LearnedVerb');
const Notification = require('../Model/Notification');
const { paginate, getPaginationMeta, getSortOptions } = require('../utils/pagination');
const { logAudit } = require('../utils/auditLog');
const { getUserId } = require('../utils/currentUser');
const { withTransaction } = require('../utils/withTransaction');
const { syncCollegeMembership } = require('../utils/collegeMembership');
const escapeRegex = require('../utils/escapeRegex');

/**
 * POST /super-admin/colleges
 * Create a new college with audit logging.
 */
const createCollege = async (req, res) => {
  try {
    const { name, code, address, city, state, adminIds, isActive } = req.body || {};

    if (!name?.trim()) return res.status(400).json({ error: true, message: 'College name is required.' });
    if (!code?.trim()) return res.status(400).json({ error: true, message: 'College code is required.' });

    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    const existing = await College.findOne({
      $or: [
        { code: trimmedCode },
        { name: { $regex: `^${escapeRegex(trimmedName)}$`, $options: 'i' } },
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
        livePaperCount: paperCountMap.get(colIdStr) ?? 0,
      };
    });

    // System-wide summary (independent of pagination/filter)
    const [totalColleges, activeColleges, totalTeachers, papersAgg] = await Promise.all([
      College.countDocuments(),
      College.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'teacher' }),
      Paper.countDocuments(),
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
        totalPapers: papersAgg,
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

    const userPage = Math.max(1, Number.parseInt(req.query.userPage, 10) || 1);
    const userLimit = Math.min(100, Math.max(1, Number.parseInt(req.query.userLimit, 10) || 20));
    const paperPage = Math.max(1, Number.parseInt(req.query.paperPage, 10) || 1);
    const paperLimit = Math.min(100, Math.max(1, Number.parseInt(req.query.paperLimit, 10) || 20));

    // Efficient stats calculation using countDocuments
    const [totalUsers, teachers, reviewers, admins, blocked] = await Promise.all([
      User.countDocuments({ collegeId: id }),
      User.countDocuments({ collegeId: id, role: 'teacher' }),
      User.countDocuments({ collegeId: id, role: 'reviewer' }),
      User.countDocuments({ collegeId: id, role: 'admin' }),
      User.countDocuments({ collegeId: id, isBlocked: true }),
    ]);

    const stats = {
      totalUsers,
      teachers,
      reviewers,
      admins,
      blocked,
    };

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Safe regex — escaped and length-capped to avoid ReDoS
    const safeName = college.name ? escapeRegex(String(college.name).slice(0, 100)) : null;

    const paperQuery = {
      $or: [
        { collegeId: id },
        ...(safeName ? [{ 'College Name': new RegExp(safeName, 'i') }] : []),
      ],
    };

    const [totalPapers, recentPapers, users, papers] = await Promise.all([
      Paper.countDocuments(paperQuery),
      Paper.countDocuments({ ...paperQuery, createdAt: { $gte: sevenDaysAgo } }),
      User.find({ collegeId: id })
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((userPage - 1) * userLimit)
        .limit(userLimit)
        .lean(),
      Paper.find(paperQuery)
        .populate('userId', 'userName fullName')
        .sort({ createdAt: -1 })
        .skip((paperPage - 1) * paperLimit)
        .limit(paperLimit)
        .lean(),
    ]);

    stats.totalPapers = totalPapers;
    stats.recentPapers = recentPapers;

    return res.json({
      error: false,
      college,
      stats,
      users,
      papers,
      usersPagination: getPaginationMeta(totalUsers, userPage, userLimit),
      papersPagination: getPaginationMeta(totalPapers, paperPage, paperLimit),
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
    const { name, code, address, city, state, isActive } = req.body || {};

    const college = await College.findById(id);
    if (!college) {
      return res.status(404).json({ error: true, message: 'College not found.' });
    }

    const oldName = college.name;
    const oldCode = college.code;

    if (name && name.trim()) {
      const conflict = await College.findOne({
        _id: { $ne: id },
        name: { $regex: `^${escapeRegex(name.trim())}$`, $options: 'i' },
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

    if (oldName !== college.name) {
      await User.updateMany(
        { collegeId: college._id },
        { $set: { collegeName: college.name } }
      );
    }

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
      const [paperCount, learnedVerbCount] = await Promise.all([
        Paper.countDocuments({ collegeId: id }),
        require('../Model/LearnedVerb').countDocuments({ collegeId: id }),
      ]);

      if (paperCount > 0 || learnedVerbCount > 0) {
        return res.status(400).json({
          error: true,
          message: `Cannot permanently delete this college: ${paperCount} paper(s) and ${learnedVerbCount} learned verb(s) still reference it. Deactivate it instead.`,
        });
      }

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

    const { action, userId, startDate, endDate, resource } = req.query;

    const query = {};
    if (action) query.action = action;
    if (userId) query.userId = userId;
    if (resource) query.resource = new RegExp(escapeRegex(resource), 'i');
    if (startDate || endDate) {
      query.timestamp = {};

      if (startDate) {
        const parsedStart = new Date(startDate);
        if (Number.isNaN(parsedStart.getTime())) {
          return res.status(400).json({ error: true, message: 'Invalid startDate.' });
        }
        query.timestamp.$gte = parsedStart;
      }

      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (Number.isNaN(parsedEnd.getTime())) {
          return res.status(400).json({ error: true, message: 'Invalid endDate.' });
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
          parsedEnd.setUTCHours(0, 0, 0, 0);
          parsedEnd.setUTCDate(parsedEnd.getUTCDate() + 1);
        }
        query.timestamp.$lt = parsedEnd;
      }
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
    console.error('getAuditLogs error:', error);
    res.status(500).json({ error: true, message: 'Server error fetching audit logs' });
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
      smtpConfigured: Boolean(process.env.SMTP_HOST),
    });
  }
};

/**
 * GET /super-admin/users
 * Global user listing across all colleges with role, collegeId, search, and status filters.
 */
const getAllUsers = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req, 20, 100);
    const { search, role, collegeId, isBlocked } = req.query;
    const sort = getSortOptions(req, ['userName', 'email', 'role', 'createdAt', 'fullName']);

    const query = {};
    if (role) query.role = role;
    if (collegeId) query.collegeId = collegeId;
    if (isBlocked !== undefined) query.isBlocked = isBlocked === 'true';

    if (search && typeof search === 'string') {
      const safe = escapeRegex(search.trim().slice(0, 50));
      query.$or = [
        { userName: new RegExp(safe, 'i') },
        { email: new RegExp(safe, 'i') },
        { fullName: new RegExp(safe, 'i') },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .populate('collegeId', 'name code')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return res.json({
      error: false,
      users,
      pagination: getPaginationMeta(total, page, limit),
    });
  } catch (err) {
    console.error('Error fetching users for super admin:', err);
    return res.status(500).json({ error: true, message: 'Server error fetching users.' });
  }
};

/**
 * GET /super-admin/users/:id
 * Retrieve single user by ID.
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password').populate('collegeId', 'name code').lean();
    if (!user) {
      return res.status(404).json({ error: true, message: 'User not found.' });
    }
    return res.json({ error: false, user });
  } catch (err) {
    console.error('Error fetching user by ID:', err);
    return res.status(500).json({ error: true, message: 'Server error fetching user.' });
  }
};

/**
 * PUT /super-admin/users/:id/role
 * Change user role across colleges.
 */
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

    const allowedRoles = ['teacher', 'reviewer', 'admin', 'student'];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({
        error: true,
        message: `Invalid role. Allowed roles: ${allowedRoles.join(', ')}`,
      });
    }

    const result = await withTransaction(async (session) => {
      const userQuery = User.findById(id);
      if (session) userQuery.session(session);
      const user = await userQuery;

      if (!user) return { user: null };

      const oldRole = user.role;
      user.role = role;
      await syncCollegeMembership({
        collegeId: user.collegeId,
        userId: user._id,
        oldRole,
        newRole: role,
        session,
      });
      await user.save(session ? { session } : {});

      return { user, oldRole };
    });

    if (!result.user) {
      return res.status(404).json({ error: true, message: 'User not found.' });
    }

    const { user, oldRole } = result;

    await logAudit({
      userId: getUserId(req),
      action: 'UPDATE_ROLE',
      resource: `User:${id}`,
      changes: { oldValue: { role: oldRole }, newValue: { role } },
      request: req,
    });

    const updated = user.toObject();
    delete updated.password;

    return res.json({
      error: false,
      message: `User role updated to ${role}.`,
      user: updated,
    });
  } catch (err) {
    console.error('Error updating user role:', err);
    return res.status(500).json({ error: true, message: 'Server error updating user role.' });
  }
};

/**
 * PUT /super-admin/users/:id/block
 * Toggle or set user blocked status.
 */
const toggleUserBlock = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body || {};

    if (isBlocked === undefined) {
      return res.status(400).json({ error: true, message: 'isBlocked must be provided as a boolean.' });
    }

    if (id === getUserId(req)?.toString()) {
      return res.status(400).json({ error: true, message: 'You cannot block your own account.' });
    }

    const user = await User.findOneAndUpdate(
      { _id: id },
      { $set: { isBlocked: Boolean(isBlocked) } },
      { new: true }
    ).select('userName email isBlocked');

    if (!user) {
      return res.status(404).json({ error: true, message: 'User not found.' });
    }

    await logAudit({
      userId: getUserId(req),
      action: user.isBlocked ? 'BLOCK_USER' : 'UNBLOCK_USER',
      resource: `User:${id}`,
      request: req,
    });

    return res.json({
      error: false,
      message: `User has been ${user.isBlocked ? 'blocked' : 'unblocked'}.`,
      user,
    });
  } catch (err) {
    console.error('Error toggling user block:', err);
    return res.status(500).json({ error: true, message: 'Server error toggling block status.' });
  }
};

/**
 * DELETE /super-admin/users/:id
 * Delete user across colleges.
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === getUserId(req)?.toString()) {
      return res.status(400).json({ error: true, message: 'You cannot delete your own account.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: true, message: 'User not found.' });
    }

    // Do not hard-delete users that are referenced by business/history records.
    const [paperRefs, reviewHistoryRefs, ocrLogs, corrections, taughtVerbs, adminMemberships, notifications] = await Promise.all([
      Paper.countDocuments({ $or: [{ userId: id }, { reviewedBy: id }] }),
      Paper.countDocuments({ 'reviewHistory.reviewerId': id }),
      OCRLog.countDocuments({ userId: id }),
      VerifiedQuestion.countDocuments({ correctedBy: id }),
      LearnedVerb.countDocuments({ taughtBy: id }),
      College.countDocuments({ adminIds: id }),
      Notification.countDocuments({ userId: id }),
    ]);

    if (paperRefs > 0 || reviewHistoryRefs > 0 || ocrLogs > 0 || corrections > 0 || taughtVerbs > 0 || adminMemberships > 0 || notifications > 0) {
      return res.status(409).json({
        error: true,
        message: 'User cannot be permanently deleted because records still reference this account. Block the account instead.',
      });
    }

    if (user.collegeIdPhotoPublicId) {
      try {
        const cloudinary = require('../config/cloudinary');
        await cloudinary.uploader.destroy(user.collegeIdPhotoPublicId);
      } catch (cloudErr) {
        console.warn('Cloudinary photo destroy failed (non-blocking):', cloudErr.message);
      }
    }

    await User.findByIdAndDelete(id);

    await logAudit({
      userId: getUserId(req),
      action: 'DELETE_USER',
      resource: `User:${id}`,
      changes: { oldValue: { userName: user.userName, email: user.email, role: user.role } },
      request: req,
    });

    return res.json({ error: false, message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Error deleting user:', err);
    return res.status(500).json({ error: true, message: 'Server error deleting user.' });
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
  getAllUsers,
  getUserById,
  updateUserRole,
  toggleUserBlock,
  deleteUser,
};