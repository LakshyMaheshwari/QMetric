const bcrypt = require('bcrypt');
const User = require('../Model/user');

// ─── GET /admin/users — List all users ────────────────────────────────────────
const getUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        res.json({ error: false, users });
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

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: true, message: 'Invalid email format' });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({ error: true, message: 'Password must be at least 6 characters' });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ error: true, message: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user — only setting fields that are not marked required in the schema
        const user = new User({
            userName: name.trim(),
            fullName: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: role || 'teacher',
            collegeName: collegeName || 'N/A',
            department: department || 'N/A',
            phone: phone || '0000000000',
            position: 'Other',
            stream: 'Other',
            collegeIdPhoto: '',
            employeeId: `ADMIN-${Date.now()}`,
        });

        await user.save();

        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({
            error: false,
            message: 'User created successfully',
            user: userResponse,
        });
    } catch (err) {
        console.error('Admin createUser error:', err);
        res.status(500).json({ error: true, message: 'Server error creating user', details: err.message });
    }
};

// ─── PUT /admin/users/:id/role — Change user role ────────────────────────────
const updateRole = async (req, res) => {
    try {
        const { role } = req.body;
        if (!['teacher', 'reviewer', 'admin'].includes(role)) {
            return res.status(400).json({ error: true, message: 'Invalid role' });
        }
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true, select: '-password' }
        );
        if (!user) return res.status(404).json({ error: true, message: 'User not found' });
        res.json({ error: false, message: 'Role updated', user });
    } catch (err) {
        console.error('Admin updateRole error:', err);
        res.status(500).json({ error: true, message: 'Server error updating role' });
    }
};

// ─── PUT /admin/users/:id/block — Block or unblock user ──────────────────────
const toggleBlock = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ error: true, message: 'User not found' });

        user.isBlocked = !user.isBlocked;
        await user.save();

        res.json({ error: false, message: `User ${user.isBlocked ? 'blocked' : 'unblocked'}`, user });
    } catch (err) {
        console.error('Admin toggleBlock error:', err);
        res.status(500).json({ error: true, message: 'Server error toggling block status' });
    }
};

// ─── DELETE /admin/users/:id — Delete user ───────────────────────────────────
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: true, message: 'User not found' });
        res.json({ error: false, message: 'User deleted successfully' });
    } catch (err) {
        console.error('Admin deleteUser error:', err);
        res.status(500).json({ error: true, message: 'Server error deleting user' });
    }
};

module.exports = { getUsers, createUser, updateRole, toggleBlock, deleteUser };
