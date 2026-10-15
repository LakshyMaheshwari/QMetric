const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../../Model/user');
const { isRevoked } = require('../../utils/tokenBlacklist');

/**
 * Authenticate the request via the accessToken cookie (preferred)
 * or an Authorization: Bearer <token> header (fallback).
 *
 * On success: populates `req.user` with fresh data from the database and
 * calls next(). Rejects blocked users and revoked tokens.
 */
async function authenticateToken(req, res, next) {
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

    try {
        // Reject tokens that were revoked via logout
        if (await isRevoked(token)) {
            return res.status(401).json({
                error: true,
                message: 'Token has been revoked. Please log in again.',
            });
        }
    } catch (blacklistErr) {
        return res.status(503).json({ error: true, message: 'Authentication service is temporarily unavailable.' });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, payload) => {
        // Token invalid or expired
        if (err) {
            return res.status(403).json({
                error: true,
                message: 'Invalid or expired token',
            });
        }

        // This callback is async but jwt.verify does not await it, so a
        // rejected promise here would be an *unhandled rejection* (which
        // terminates the process on Node 22). Everything must be inside
        // try/catch and forwarded to the Express error handler.
        try {
            if (!mongoose.isValidObjectId(payload.userId)) {
                return res.status(401).json({
                    error: true,
                    message: 'Invalid token payload',
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

            // Tokens issued before the last password change are no longer valid
            // (payload.iat is in seconds; passwordChangedAt is truncated to seconds).
            if (
                user.passwordChangedAt &&
                payload.iat * 1000 < user.passwordChangedAt.getTime()
            ) {
                return res.status(401).json({
                    error: true,
                    message: 'Password was changed. Please log in again.',
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
                isBlocked: user.isBlocked,
            };
            return next();
        } catch (dbErr) {
            return next(dbErr);
        }
    });
}

module.exports = authenticateToken;