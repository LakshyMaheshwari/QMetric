const jwt = require('jsonwebtoken');
const User = require('../../Model/user');
const { isRevoked } = require('../../utils/tokenBlacklist');

/**
 * Authenticate the request via the accessToken cookie (preferred)
 * or an Authorization: Bearer <token> header (fallback).
 *
 * On success: populates `req.user` with fresh data from the database and
 * calls next(). Rejects blocked users and revoked tokens.
 */
function authenticateToken(req, res, next) {
    const token =
        req.cookies?.accessToken ||
        req.headers.authorization?.split(' ')[1];

    // No token — unauthorized
    if (!token) {
        return res.status(401).json({
            error: true,
            message: 'Authorization token required',
        });
    }

    // Reject tokens that were revoked via logout
    if (isRevoked(token)) {
        return res.status(401).json({
            error: true,
            message: 'Token has been revoked. Please log in again.',
        });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, payload) => {
        // Token invalid or expired
        if (err) {
            return res.status(403).json({
                error: true,
                message: 'Invalid or expired token',
                details: err.message,
            });
        }

        // Look up the user from the database on every request
        const user = await User.findById(payload.userId).select('-password');
        if (!user) {
            return res.status(401).json({
                error: true,
                message: 'User not found',
            });
        }

        // Blocked users are rejected even with a valid token
        if (user.isBlocked) {
            return res.status(403).json({
                error: true,
                message: 'Your account has been blocked. Please contact your administrator.',
            });
        }

        // Set req.user to fresh DB data instead of the stale JWT payload
        req.user = {
            userId: user._id,
            role: user.role,
            userName: user.userName,
            email: user.email,
            collegeId: user.collegeId,
            collegeName: user.collegeName,
            collegeApprovalStatus: user.collegeApprovalStatus,
        };
        next();
    });
}

module.exports = authenticateToken;