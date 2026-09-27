const User = require('../Model/user');
const { getUserId } = require('../utils/currentUser');

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
    const { fullName, phone, collegeName, department } = req.body;

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
      details: err.message,
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
};