const express = require('express');
const router = express.Router();
const authenticateToken = require('../core/auth/utilities');
const adminController = require('../controllers/adminController');
const User = require('../Model/user');

// ─── Role guard: looks up user in DB (JWT only stores userId, not role) ───────
async function requireAdmin(req, res, next) {
    try {
        const user = await User.findById(req.user.userId).select('role isBlocked');
        if (!user) return res.status(404).json({ error: true, message: 'User not found.' });
        if (user.isBlocked) return res.status(403).json({ error: true, message: 'Account is blocked.' });
        if (user.role !== 'admin') return res.status(403).json({ error: true, message: 'Admin access required.' });
        next();
    } catch (err) {
        res.status(500).json({ error: true, message: 'Server error during admin check.' });
    }
}

// All routes below require a valid JWT AND admin role
router.use(authenticateToken, requireAdmin);

// ─── Users CRUD ───────────────────────────────────────────────────────────────
router.get('/users',               adminController.getUsers);
router.post('/users',              adminController.createUser);
router.put('/users/:id/role',      adminController.updateRole);
router.put('/users/:id/block',     adminController.toggleBlock);
router.delete('/users/:id',        adminController.deleteUser);

module.exports = router;
