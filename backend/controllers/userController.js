const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../Model/user');
const { getUserId } = require('../utils/currentUser');
const { logAudit } = require('../utils/auditLog');
const { revoke } = require('../utils/tokenBlacklist');
const { BCRYPT_ROUNDS, isStrongPassword, PASSWORD_ERROR_MESSAGE } = require('../config/security');

/**
 * GET /auth/profile
 * Returns the authenticated user's profile (password excluded).
 */
const getProfile = async (req, res) => {
  try {
    // req.user is set by the authenticateToken middleware
    const user = await User.findById(getUserId(req))
      .select('-password')
      .populate('collegeId', 'name code city state');

    if (!user) {
      return res.status(404).json({ error: true, message: 'User not found' });
    }

    res.json({ error: false, user });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: true, message: 'Server error fetching profile' });
  }
};

/**
 * PUT /auth/profile
 * Update the authenticated user's profile.
 * Only the fields listed below are mutable; userName and role are not.
 */
const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, collegeName, department } = req.body || {};

    // Validate required field — !fullName?.trim() covers null, undefined, and whitespace
    if (!fullName?.trim()) {
      return res.status(400).json({ error: true, message: 'Name is required' });
    }

    const user = await User.findById(getUserId(req));
    if (!user) {
      return res.status(404).json({ error: true, message: 'User not found' });
    }

    // Update fullName (always — it's the one required field)
    user.fullName = fullName.trim();

    // The following fields are optional. Only overwrite when the caller
    // actually supplied a value; null/undefined leaves the existing value
    // intact. `?.trim() ?? user.x` is used so a caller-supplied null does
    // not crash the request (previous code called .trim() on null).
    if (phone !== undefined) {
      user.phone = phone?.trim() ?? user.phone;
    }
    if (collegeName !== undefined) {
      user.collegeName = collegeName?.trim() ?? user.collegeName;
    }
    if (department !== undefined) {
      user.department = department?.trim() ?? user.department;
    }

    await user.save();

    // Re-fetch without the password field for the response
    const updatedUser = await User.findById(getUserId(req)).select('-password');

    res.json({
      error: false,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({
      error: true,
      message: 'Server error updating profile',
    });
  }
};

/**
 * PUT /auth/password
 * Authenticated password change. Requires the current password, enforces the
 * same strength policy as registration, invalidates every previously issued
 * token (via passwordChangedAt) and issues a fresh session cookie.
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({
        error: true,
        message: 'currentPassword and newPassword are required.',
      });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ error: true, message: PASSWORD_ERROR_MESSAGE });
    }
    // bcrypt silently truncates input at 72 bytes — refuse rather than mislead.
    if (Buffer.byteLength(newPassword, 'utf8') > 72) {
      return res.status(400).json({
        error: true,
        message: 'Password must be at most 72 bytes long.',
      });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({
        error: true,
        message: 'New password must be different from the current password.',
      });
    }

    const user = await User.findById(getUserId(req));
    if (!user) {
      return res.status(404).json({ error: true, message: 'User not found' });
    }

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      await logAudit({
        userId: user._id,
        action: 'CHANGE_PASSWORD',
        resource: `User:${user._id}`,
        request: req,
        error: new Error('Wrong current password'),
      });
      // 400 (not 401) so a frontend interceptor doesn't treat this as "session expired".
      return res.status(400).json({ error: true, message: 'Current password is incorrect.' });
    }

    user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    // Truncate to whole seconds: JWT `iat` has 1-second resolution, and the new
    // token below must not be older than this instant.
    user.passwordChangedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
    await user.save();

    // Revoke the token used for THIS request, then hand back a fresh one.
    const oldToken = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
    if (oldToken) await revoke(oldToken);

    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '72h' }
    );
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 72 * 60 * 60 * 1000,
    });

    await logAudit({
      userId: user._id,
      action: 'CHANGE_PASSWORD',
      resource: `User:${user._id}`,
      request: req,
    });

    return res.json({ error: false, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('changePassword error:', err);
    return res.status(500).json({ error: true, message: 'Server error changing password' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
};