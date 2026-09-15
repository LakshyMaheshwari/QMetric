const bcrypt = require('bcrypt');
const User = require('../Model/user');
const College = require('../Model/College');
const Paper = require('../Model/PaperInfo');

/**
 * GET /college-admin/users - Get all users in the admin's college
 */
const getCollegeUsers = async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.userId).select('collegeId role');
    let collegeId = adminUser?.collegeId;

    if (!collegeId && adminUser?.role === 'super_admin') {
      collegeId = req.query.collegeId || (await College.findOne({ isActive: true }))?._id;
    }

    if (!collegeId) {
      return res.status(400).json({ error: true, message: 'You are not assigned to any college.' });
    }

    const { search, role } = req.query;
    let query = { collegeId };

    if (search && search.trim()) {
      query.$or = [
        { userName: { $regex: search.trim(), $options: 'i' } },
        { fullName: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    if (role && role !== 'all') {
      query.role = role;
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    const stats = {
      total: users.length,
      teachers: users.filter(u => u.role === 'teacher').length,
      reviewers: users.filter(u => u.role === 'reviewer').length,
      admins: users.filter(u => u.role === 'admin').length,
      blocked: users.filter(u => u.isBlocked).length,
    };

    res.json({ error: false, users, stats });
  } catch (error) {
    console.error('Error fetching college users:', error);
    res.status(500).json({ error: true, message: 'Server error' });
  }
};

/**
 * PUT /college-admin/users/:id/role - Change user role (college admin only)
 */
const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    const adminUser = await User.findById(req.user.userId).select('collegeId');
    const collegeId = adminUser?.collegeId;

    if (!collegeId) {
      return res.status(400).json({ error: true, message: 'You are not assigned to any college.' });
    }

    // Validate role
    if (!['teacher', 'reviewer', 'admin'].includes(role)) {
      return res.status(400).json({ error: true, message: 'Invalid role' });
    }

    // Find user in the same college
    const user = await User.findOne({ _id: id, collegeId });
    if (!user) {
      return res.status(404).json({ error: true, message: 'User not found in your college' });
    }

    // Prevent changing own role
    if (id === String(req.user.userId)) {
      return res.status(400).json({ error: true, message: 'Cannot change your own role' });
    }

    user.role = role;
    await user.save();

    res.json({
      error: false,
      message: 'Role updated successfully',
      user: {
        id: user._id,
        name: user.fullName || user.userName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error changing role:', error);
    res.status(500).json({ error: true, message: 'Server error' });
  }
};

/**
 * PUT /college-admin/users/:id/block - Block/unblock user
 */
const toggleBlockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = await User.findById(req.user.userId).select('collegeId');
    const collegeId = adminUser?.collegeId;

    if (!collegeId) {
      return res.status(400).json({ error: true, message: 'You are not assigned to any college.' });
    }

    const user = await User.findOne({ _id: id, collegeId });
    if (!user) {
      return res.status(404).json({ error: true, message: 'User not found in your college' });
    }

    // Prevent blocking self
    if (id === String(req.user.userId)) {
      return res.status(400).json({ error: true, message: 'Cannot block yourself' });
    }

    // Prevent blocking super admins
    if (user.role === 'super_admin') {
      return res.status(403).json({ error: true, message: 'Cannot block super admin' });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({
      error: false,
      message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`,
      user: {
        id: user._id,
        name: user.fullName || user.userName,
        isBlocked: user.isBlocked
      },
    });
  } catch (error) {
    console.error('Error toggling block:', error);
    res.status(500).json({ error: true, message: 'Server error' });
  }
};

/**
 * POST /college-admin/users - Add new user to college
 */
const addCollegeUser = async (req, res) => {
  try {
    const { name, email, password, role, department, phone, position } = req.body;
    const adminUser = await User.findById(req.user.userId).select('collegeId role');
    let collegeId = adminUser?.collegeId;

    if (!collegeId && adminUser?.role === 'super_admin') {
      collegeId = req.body.collegeId || (await College.findOne({ isActive: true }))?._id;
    }

    if (!collegeId) {
      return res.status(400).json({ error: true, message: 'You are not assigned to any college.' });
    }

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: true, message: 'Name, email, and password are required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ error: true, message: 'Email already registered' });
    }

    // Fetch college details for collegeName
    const college = await College.findById(collegeId);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      userName: name.trim(),
      fullName: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || 'teacher',
      collegeId,
      collegeName: college ? college.name : '',
      department: department || '',
      phone: phone || null,
      position: position || 'Professor',
      employeeId: `EMP-${Date.now()}`
    });

    await user.save();

    // Increment totalTeachers if role is teacher
    if (user.role === 'teacher') {
      await College.findByIdAndUpdate(collegeId, { $inc: { totalTeachers: 1 } });
    }

    res.status(201).json({
      error: false,
      message: 'User added successfully',
      user: {
        id: user._id,
        name: user.fullName,
        email: user.email,
        role: user.role
      },
    });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ error: true, message: 'Server error', details: error.message });
  }
};

/**
 * GET /college-admin/stats - Get college statistics
 */
const getCollegeStats = async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.userId).select('collegeId role');
    let collegeId = adminUser?.collegeId;

    if (!collegeId && adminUser?.role === 'super_admin') {
      collegeId = req.query.collegeId || (await College.findOne({ isActive: true }))?._id;
    }

    if (!collegeId) {
      return res.status(400).json({ error: true, message: 'You are not assigned to any college.' });
    }

    const college = await College.findById(collegeId);

    // Get user stats
    const userStats = await User.aggregate([
      { $match: { collegeId } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          blocked: { $sum: { $cond: ['$isBlocked', 1, 0] } },
        },
      },
    ]);

    // Get paper stats
    let paperStats = { total: 0, avgScore: 0, last30Days: 0 };
    try {
      // Find papers associated with users in this college or matching college name
      const collegeUsers = await User.find({ collegeId }).select('_id');
      const userIds = collegeUsers.map(u => u._id);

      const paperMatchQuery = {
        $or: [
          { userId: { $in: userIds } },
          ...(college?.name ? [{ "College Name": { $regex: college.name, $options: 'i' } }] : [])
        ]
      };

      const papers = await Paper.find(paperMatchQuery);
      paperStats.total = papers.length;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      paperStats.last30Days = await Paper.countDocuments({
        ...paperMatchQuery,
        createdAt: { $gte: thirtyDaysAgo },
      });
    } catch (e) {
      console.warn('Paper stats calculation warning:', e.message);
    }

    // Format stats
    const stats = {
      college: {
        id: college?._id,
        name: college?.name,
        code: college?.code,
      },
      users: {
        total: userStats.reduce((sum, s) => sum + s.count, 0),
        teachers: userStats.find(s => s._id === 'teacher')?.count || 0,
        reviewers: userStats.find(s => s._id === 'reviewer')?.count || 0,
        admins: userStats.find(s => s._id === 'admin')?.count || 0,
        blocked: userStats.reduce((sum, s) => sum + (s.blocked || 0), 0),
      },
      papers: paperStats,
    };

    res.json({ error: false, stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: true, message: 'Server error' });
  }
};

module.exports = {
  getCollegeUsers,
  changeUserRole,
  toggleBlockUser,
  addCollegeUser,
  getCollegeStats
};
