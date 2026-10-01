const crypto = require('node:crypto');
const logger = require('../config/logger');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const User = require('../Model/user');
const emailService = require('../utils/emailService');
const { logAudit } = require('../utils/auditLog');
const { revoke } = require('../utils/tokenBlacklist');
const { BCRYPT_ROUNDS, isStrongPassword, PASSWORD_ERROR_MESSAGE } = require('../config/security');

// ============================================================
// FORGOT & RESET PASSWORD (C1)
// ============================================================

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email || typeof email !== 'string' || !validator.isEmail(email)) {
            return res.status(400).json({ error: true, message: 'Valid email is required.' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            // Do not leak whether user exists
            return res.json({
                error: false,
                message: 'If an account with that email exists, password reset instructions have been sent.',
            });
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save({ validateBeforeSave: false });

        emailService.sendPasswordResetEmail({
            to: user.email,
            fullName: user.fullName || user.userName,
            resetToken: rawToken,
        }).catch((err) => {
            logger.error('Password reset email failed (non-blocking):', err.message);
        });

        await logAudit({
            userId: user._id,
            action: 'FORGOT_PASSWORD',
            resource: `User:${user._id}`,
            request: req,
        });

        return res.json({
            error: false,
            message: 'If an account with that email exists, password reset instructions have been sent.',
        });
    } catch (err) {
        logger.error('forgotPassword error:', err);
        return res.status(500).json({ error: true, message: 'Server error processing password reset.' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body || {};

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: true, message: 'Reset token is required.' });
        }

        if (!password || !isStrongPassword(password)) {
            return res.status(400).json({ error: true, message: PASSWORD_ERROR_MESSAGE });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: new Date() },
        }).select('+passwordResetToken +passwordResetExpires');

        if (!user) {
            return res.status(400).json({
                error: true,
                message: 'Invalid or expired password reset link. Please request a new one.',
            });
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
        user.password = hashedPassword;
        user.passwordChangedAt = new Date();
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        user.refreshTokenHash = null;
        user.refreshTokenExpiresAt = null;

        await user.save({ validateBeforeSave: false });

        await logAudit({
            userId: user._id,
            action: 'RESET_PASSWORD',
            resource: `User:${user._id}`,
            request: req,
        });

        return res.json({
            error: false,
            message: 'Password reset successful. You can now log in with your new password.',
        });
    } catch (err) {
        logger.error('resetPassword error:', err);
        return res.status(500).json({ error: true, message: 'Server error resetting password.' });
    }
};

// ============================================================
// REFRESH TOKEN & SESSION REVOCATION (C2)
// ============================================================

const refreshToken = async (req, res) => {
    try {
        const tokenFromCookie = req.cookies?.refreshToken;
        const tokenFromBody = req.body?.refreshToken;

        const token = tokenFromCookie || tokenFromBody;

        // Browser requests use the HttpOnly cookie and do not receive
        // credentials in the JSON response.
        // API/test clients that explicitly send the token in the body
        // receive the rotated tokens in the response body.
        const returnTokensInBody =
            !tokenFromCookie &&
            typeof tokenFromBody === 'string';

        if (!token || typeof token !== 'string') {
            return res.status(401).json({
                error: true,
                message: 'Refresh token required.'
            });
        }

        const hashed = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Atomic token rotation prevents two concurrent requests from
        // successfully rotating the same refresh token.
        const newRawRefresh = crypto
            .randomBytes(40)
            .toString('hex');

        const newHash = crypto
            .createHash('sha256')
            .update(newRawRefresh)
            .digest('hex');

        const newRefreshExpiry = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
        );

        const user = await User.findOneAndUpdate(
            {
                refreshTokenHash: hashed,
                refreshTokenExpiresAt: {
                    $gt: new Date()
                },
                isBlocked: {
                    $ne: true
                },
            },
            {
                $set: {
                    refreshTokenHash: newHash,
                    refreshTokenExpiresAt: newRefreshExpiry,
                },
            },
            {
                new: true,
                runValidators: false
            }
        ).select(
            '+refreshTokenHash +refreshTokenExpiresAt'
        );

        if (!user) {
            return res.status(401).json({
                error: true,
                message: 'Invalid or expired refresh token.'
            });
        }

        const accessToken = jwt.sign(
            {
                userId: user._id
            },
            process.env.ACCESS_TOKEN_SECRET,
            {
                expiresIn: '24h'
            }
        );

        res.cookie(
            'accessToken',
            accessToken,
            {
                httpOnly: true,
                secure:
                    process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge:
                    24 * 60 * 60 * 1000,
            }
        );

        res.cookie(
            'refreshToken',
            newRawRefresh,
            {
                httpOnly: true,
                secure:
                    process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge:
                    7 * 24 * 60 * 60 * 1000,
                path: '/auth',
            }
        );

        await logAudit({
            userId: user._id,
            action: 'REFRESH_TOKEN',
            resource: `User:${user._id}`,
            request: req,
        });

        const response = {
            error: false,
            message: 'Token refreshed successfully.',
        };

        if (returnTokensInBody) {
            response.accessToken = accessToken;
            response.refreshToken = newRawRefresh;
        }

        return res.json(response);
    } catch (err) {
        logger.error(
            'refreshToken error:',
            err
        );

        return res.status(500).json({
            error: true,
            message:
                'Server error refreshing token.'
        });
    }
};

const revokeAllSessions = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: true, message: 'Unauthenticated.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: true, message: 'User not found.' });
        }

        user.passwordChangedAt = new Date();
        user.refreshTokenHash = null;
        user.refreshTokenExpiresAt = null;
        await user.save({ validateBeforeSave: false });

        const currentToken = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
        if (currentToken) {
            await revoke(currentToken);
        }

        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/auth',
        });

        await logAudit({
            userId: user._id,
            action: 'REVOKE_ALL_SESSIONS',
            resource: `User:${user._id}`,
            request: req,
        });

        return res.json({
            error: false,
            message: 'All active sessions have been revoked. Please log in again.',
        });
    } catch (err) {
        logger.error('revokeAllSessions error:', err);
        return res.status(500).json({ error: true, message: 'Server error revoking sessions.' });
    }
};

module.exports = {
    forgotPassword,
    resetPassword,
    refreshToken,
    revokeAllSessions,
};
