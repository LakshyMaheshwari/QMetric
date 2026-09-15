const User = require('../Model/user');

/**
 * Role middleware for role-based authorization.
 * Expects `req.user.userId` to be populated by authenticateToken middleware.
 */

// Super Admin guard: only allows users with role 'super_admin'
async function requireSuperAdmin(req, res, next) {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ error: true, message: 'Authentication required.' });
        }

        const user = await User.findById(req.user.userId).select('role isBlocked');
        if (!user) {
            return res.status(404).json({ error: true, message: 'User not found.' });
        }
        if (user.isBlocked) {
            return res.status(403).json({ error: true, message: 'Account is blocked.' });
        }
        if (user.role !== 'super_admin') {
            return res.status(403).json({ error: true, message: 'Super admin access required.' });
        }

        req.currentUser = user;
        next();
    } catch (err) {
        console.error('Super Admin authorization error:', err);
        return res.status(500).json({ error: true, message: 'Server error during authorization check.' });
    }
}

// Admin guard: allows 'admin' or 'super_admin'
async function requireAdmin(req, res, next) {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ error: true, message: 'Authentication required.' });
        }

        const user = await User.findById(req.user.userId).select('role isBlocked collegeId');
        if (!user) {
            return res.status(404).json({ error: true, message: 'User not found.' });
        }
        if (user.isBlocked) {
            return res.status(403).json({ error: true, message: 'Account is blocked.' });
        }
        if (user.role !== 'admin' && user.role !== 'super_admin') {
            return res.status(403).json({ error: true, message: 'Admin access required.' });
        }

        req.currentUser = user;
        next();
    } catch (err) {
        console.error('Admin authorization error:', err);
        return res.status(500).json({ error: true, message: 'Server error during authorization check.' });
    }
}

// General role guard factory
function requireRole(...roles) {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.userId) {
                return res.status(401).json({ error: true, message: 'Authentication required.' });
            }

            const user = await User.findById(req.user.userId).select('role isBlocked collegeId');
            if (!user) {
                return res.status(404).json({ error: true, message: 'User not found.' });
            }
            if (user.isBlocked) {
                return res.status(403).json({ error: true, message: 'Account is blocked.' });
            }
            if (!roles.includes(user.role)) {
                return res.status(403).json({ error: true, message: `Access restricted to: ${roles.join(', ')}` });
            }

            req.currentUser = user;
            next();
        } catch (err) {
            console.error('Role authorization error:', err);
            return res.status(500).json({ error: true, message: 'Server error during authorization check.' });
        }
    };
}

module.exports = {
    requireSuperAdmin,
    requireAdmin,
    requireRole
};
