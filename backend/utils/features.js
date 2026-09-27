'use strict';

/**
 * Feature matrix — which roles can use which features.
 *
 * Features:
 *   upload_paper         — POST /upload/totext
 *   view_score           — read own analysis results
 *   view_analysis        — read Bloom/CO/domain breakdowns
 *   pdf_export           — download PDF report (client-side; gated for future use)
 *   certificate          — download certificate (client-side; gated for future use)
 *   submit_for_review    — PUT /teacher/papers/:id/submit (affiliated teachers only)
 *   review_papers        — /reviewer/* endpoints
 *   manage_college_users — /college-admin/users/*
 *   approve_teachers     — /college-admin/pending-teachers/*
 */
const FEATURES = {
  student: [
    'upload_paper',
    'view_score',
    'view_analysis',
  ],
  teacher: [
    'upload_paper',
    'view_score',
    'view_analysis',
    'pdf_export',
    'certificate',
    'submit_for_review', // only if affiliated + approved
  ],
  reviewer: [
    'upload_paper',
    'view_score',
    'view_analysis',
    'pdf_export',
    'certificate',
    'review_papers',
  ],
  admin: [
    'upload_paper',
    'view_score',
    'view_analysis',
    'pdf_export',
    'certificate',
    'review_papers',
    'manage_college_users',
    'approve_teachers',
  ],
  super_admin: ['*'],
};

/**
 * Determine whether a user can use a feature.
 * @param {Object} user  — req.user from authenticateToken
 * @param {String} feature
 * @returns {Boolean}
 */
function canUseFeature(user, feature) {
  if (!user || !feature) return false;

  // Super admin bypasses everything
  if (user.role === 'super_admin') return true;

  // Pending approval blocks all features
  if (user.collegeApprovalStatus === 'pending') return false;

  // Role-based feature check
  const roleFeatures = FEATURES[user.role] || [];
  if (roleFeatures.includes('*')) return true;
  if (!roleFeatures.includes(feature)) return false;

  // Independent teachers (no college) cannot submit for review
  if (user.role === 'teacher' && !user.collegeId && feature === 'submit_for_review') {
    return false;
  }

  return true;
}

module.exports = { canUseFeature, FEATURES };