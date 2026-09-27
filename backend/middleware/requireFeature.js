'use strict';

const { canUseFeature } = require('../utils/features');

/**
 * Require a specific feature for the current request.
 * Must be applied AFTER authenticateToken (needs req.user).
 *
 * Emits specific `reason` codes so the frontend can route users to
 * the right screen:
 *   - 'pending_approval'  → show "awaiting approval" page
 *   - 'no_affiliation'    → show "request affiliation" prompt
 */
const requireFeature = (feature) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: true,
      message: 'Authentication required.',
    });
  }

  // Pending approval — gate everything with a specific reason
  if (req.user.collegeApprovalStatus === 'pending') {
    return res.status(403).json({
      error: true,
      reason: 'pending_approval',
      message: 'Your account is awaiting approval from your college admin. Please wait for confirmation.',
    });
  }

  // Independent teacher trying to submit for review
  if (
    req.user.role === 'teacher' &&
    !req.user.collegeId &&
    feature === 'submit_for_review'
  ) {
    return res.status(403).json({
      error: true,
      reason: 'no_affiliation',
      message: 'Cannot submit for review without a college affiliation. Request affiliation from your profile settings.',
    });
  }

  // General feature check
  if (!canUseFeature(req.user, feature)) {
    return res.status(403).json({
      error: true,
      message: `Feature "${feature}" is not available for your account.`,
    });
  }

  next();
};

module.exports = { requireFeature };