const bcrypt = require('bcrypt');
const crypto = require('node:crypto');
const validator = require('validator');
const User = require('../Model/user');
const College = require('../Model/College');
const { paginate, getPaginationMeta } = require('../utils/pagination');
const { logAudit } = require('../utils/auditLog');
const {
  BCRYPT_ROUNDS,
  PASSWORD_ERROR_MESSAGE,
  isStrongPassword,
  ASSIGNABLE_ROLES,
} = require('../config/security');
const { getUserId, getUserRole, getCollegeId } = require('../utils/currentUser');

// ─── GET /admin/users — List all users ────────────────────────────────────────
const getUsers = async (req, res) => {
    try {
        const { skip, limit, page } = paginate(req);
        const query = {};
        if (getUserRole(req) === 'super_admin') {
            // super_admin can see all users
        } else if (getCollegeId(req)) {
            query.collegeId = getCollegeId(req);
        } else {
            // Non-super-admin without a college — deny rather than leak
            return res.status(403).json({
                error: true,
                message: 'You are not assigned to any college.',
            });
        }

        const [users, total] = await Promise.all([
            User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            User.countDocuments(query)
        ]);

        res.json({
            error: false,
            users,
            pagination: getPaginationMeta(total, page, limit)
        });
    } catch (err) {
        console.error('Admin getUsers error:', err);
        res.status(500).json({ error: true, message: 'Server error fetching users' });
    }
};

// ─── POST /admin/users — Create new user ──────────────────────────────────────
const createUser = async (req, res) => {
    try {
        const { name, email, password, role, collegeName, department, phone } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ error: true, message: 'Name, email, and password are required' });
        }

        // Validate email format using validator.isEmail (well-vetted, no ReDoS surface)
        if (typeof email !== 'string' || email.length > 254 || !validator.isEmail(email)) {
            return res.status(400).json({ error: true, message: 'Invalid email format' });
        }

        // Enforce same password policy as register/create-admin
        if (!isStrongPassword(password)) {
            return res.status(400).json({ error: true, message: PASSWORD_ERROR_MESSAGE });
        }

        // Only allow assignable roles — super_admin can never be set via HTTP
        if (role && !ASSIGNABLE_ROLES.includes(role)) {
            return res.status(400).json({
                error: true,
                message: `Invalid role. Must be one of: ${ASSIGNABLE_ROLES.join(', ')}`,
            });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ error: true, message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

        // Build user data conditionally — do NOT set phone to a placeholder.
        // The phone field has a sparse unique index; setting it to a literal
        // like '0000000000' (or any non-null value) on multiple accounts
        // causes E11000 duplicate key errors.
        const userData = {
            userName: name.trim(),
            fullName: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: role || 'teacher',
            collegeName: collegeName || 'N/A',
            department: department || 'N/A',
            position: 'Other',
            stream: 'Other',
            collegeIdPhoto: '',
            // Cryptographically random suffix — avoids both collisions and
            // predictable employeeId values. Math.random() is not safe here
            // because the identifier could be guessed or brute-forced.
            employeeId: `ADMIN-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        };

        // Only set phone when the caller supplied one — leaves the field
        // truly unset (not null) so the sparse unique index skips it
        if (phone && String(phone).trim()) {
            userData.phone = String(phone).trim();
        }

        const user = new User(userData);

        if (!user.collegeId && user.role !== 'super_admin') {
            const fallbackCollege = await College.findOne({ isActive: true }).sort({ createdAt: 1 });
            if (fallbackCollege) {
                user.collegeId = fallbackCollege._id;
                user.collegeName = fallbackCollege.name;
            }
        }

        await user.save();

        await logAudit({
            userId: getUserId(req),
            action: 'CREATE_USER',
            resource: `User:${user._id}`,
            changes: {
                newValue: { userName: user.userName, email: user.email, role: user.role },
            },
            request: req,
        });

        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({
            error: false,
            message: 'User created successfully',
            user: userResponse,
        });
    } catch (err) {
        await logAudit({
            userId: getUserId(req),
            action: 'CREATE_USER',
            resource: 'User:new',
            request: req,
            error: err,
        });
        console.error('Admin createUser error:', err);
        res.status(500).json({ error: true, message: 'Server error creating user', details: err.message });
    }
};

// ─── PUT /admin/users/:id/role — Change user role ────────────────────────────
const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role: newRole } = req.body;

        // Defense in depth — the route validator already enforces this,
        // but keep the check here in case the route is ever reused.
        if (!ASSIGNABLE_ROLES.includes(newRole)) {
            return res.status(400).json({
                error: true,
                message: `Invalid role. Must be one of: ${ASSIGNABLE_ROLES.join(', ')}`,
            });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: true, message: 'User not found' });
        }

        const oldRole = user.role;
        user.role = newRole;
        await user.save();

        await logAudit({
            userId: getUserId(req),
            action: 'UPDATE_ROLE',
            resource: `User:${id}`,
            changes: {
                oldValue: { role: oldRole },
                newValue: { role: newRole },
                fields: ['role'],
            },
            request: req,
        });

        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({ error: false, message: 'Role updated', user: userResponse });
    } catch (err) {
        await logAudit({
            userId: getUserId(req),
            action: 'UPDATE_ROLE',
            resource: `User:${req.params.id}`,
            request: req,
            error: err,
        });
        console.error('Admin updateRole error:', err);
        res.status(500).json({ error: true, message: 'Server error updating role' });
    }
};

// ─── PUT /admin/users/:id/block — Block or unblock user ──────────────────────
const toggleBlock = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: true, message: 'User not found' });
        }

        const previousBlocked = user.isBlocked;
        user.isBlocked = !user.isBlocked;
        await user.save();

        await logAudit({
            userId: getUserId(req),
            action: user.isBlocked ? 'BLOCK_USER' : 'UNBLOCK_USER',
            resource: `User:${id}`,
            changes: {
                oldValue: { isBlocked: previousBlocked },
                newValue: { isBlocked: user.isBlocked },
                fields: ['isBlocked'],
            },
            request: req,
        });

        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({
            error: false,
            message: `User ${user.isBlocked ? 'blocked' : 'unblocked'}`,
            user: userResponse,
        });
    } catch (err) {
        await logAudit({
            userId: getUserId(req),
            action: 'BLOCK_USER',
            resource: `User:${req.params.id}`,
            request: req,
            error: err,
        });
        console.error('Admin toggleBlock error:', err);
        res.status(500).json({ error: true, message: 'Server error toggling block status' });
    }
};

// ─── DELETE /admin/users/:id — Delete user ───────────────────────────────────
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: true, message: 'User not found' });
        }

        await User.findByIdAndDelete(id);

        await logAudit({
            userId: getUserId(req),
            action: 'DELETE_USER',
            resource: `User:${id}`,
            changes: { oldValue: { userName: user.userName, email: user.email } },
            request: req,
        });

        res.json({ error: false, message: 'User deleted successfully' });
    } catch (err) {
        await logAudit({
            userId: getUserId(req),
            action: 'DELETE_USER',
            resource: `User:${req.params.id}`,
            request: req,
            error: err,
        });
        console.error('Admin deleteUser error:', err);
        res.status(500).json({ error: true, message: 'Server error deleting user' });
    }
};

module.exports = { getUsers, createUser, updateRole, toggleBlock, deleteUser };