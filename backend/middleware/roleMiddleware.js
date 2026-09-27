const User = require('../Model/user');
const { getUserId, getUserRole, getCollegeId } = require('../utils/currentUser');

/**
 * Role middleware for role-based authorization.
 *
 * Fast path: `authenticateToken` already loads the user and sets `req.user`
 * with `{ userId, role, collegeId, isBlocked? }`. If that data is present,
 * skip the redundant DB hit. Only fall back to a DB query when `req.user`
 * is missing required fields (e.g., mounted without `authenticateToken`).
 */

async function loadUserIfNeeded(req) {
  // If authenticateToken already populated role, reuse it
  if (req.user && req.user.role !== undefined) {
    return {
      _id: getUserId(req),
      role: getUserRole(req),
      collegeId: getCollegeId(req),
      isBlocked: req.user.isBlocked === true,
    };
  }
  // Fallback — only used if the route forgot to run authenticateToken
  return User.findById(getUserId(req)).select('role isBlocked collegeId');
}

async function requireSuperAdmin(req, res, next) {
  try {
    if (!req.user || !getUserId(req)) {
      return res.status(401).json({ error: true, message: 'Authentication required.' });
    }
    const user = await loadUserIfNeeded(req);
    if (!user) return res.status(404).json({ error: true, message: 'User not found.' });
    if (user.isBlocked) return res.status(403).json({ error: true, message: 'Account is blocked.' });
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

async function requireAdmin(req, res, next) {
  try {
    if (!req.user || !getUserId(req)) {
      return res.status(401).json({ error: true, message: 'Authentication required.' });
    }
    const user = await loadUserIfNeeded(req);
    if (!user) return res.status(404).json({ error: true, message: 'User not found.' });
    if (user.isBlocked) return res.status(403).json({ error: true, message: 'Account is blocked.' });
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

function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      if (!req.user || !getUserId(req)) {
        return res.status(401).json({ error: true, message: 'Authentication required.' });
      }
      const user = await loadUserIfNeeded(req);
      if (!user) return res.status(404).json({ error: true, message: 'User not found.' });
      if (user.isBlocked) return res.status(403).json({ error: true, message: 'Account is blocked.' });
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
  requireRole,
};