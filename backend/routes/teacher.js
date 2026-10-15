const express = require('express');
const router = express.Router();
const authenticateToken = require('../core/auth/utilities');
const { requireRole } = require('../middleware/roleMiddleware');
const teacherController = require('../controllers/teacherController');
const { validatePagination, validatePaperId, handleValidationErrors } = require('../middleware/validators');
const { requireFeature } = require('../middleware/requireFeature');

// All routes require authentication
router.use(authenticateToken);

// Reads — any authenticated role (controller scopes by role internally)
router.get('/papers', validatePagination, handleValidationErrors, teacherController.getMyPapers);
router.get('/papers/:id', validatePaperId, handleValidationErrors, teacherController.getPaperDetails);

// Update — teacher (own), admin (own college), super_admin (any).
// Reviewer is intentionally excluded.
router.put(
  '/papers/:id',
  requireRole('teacher', 'admin', 'super_admin'),
  validatePaperId,
  handleValidationErrors,
  teacherController.updatePaper
);
router.patch(
  '/papers/:id',
  requireRole('teacher', 'admin', 'super_admin'),
  validatePaperId,
  handleValidationErrors,
  teacherController.updatePaper
);

// Submit for review — teacher (owner) only
router.put(
  '/papers/:id/submit',
  requireFeature('submit_for_review'),
  validatePaperId,
  handleValidationErrors,
  teacherController.submitPaperForReview
);

// Delete — teacher (own), admin (own college), super_admin (any).
// Reviewer is intentionally excluded.
router.delete(
  '/papers/:id',
  requireRole('teacher', 'admin', 'super_admin'),
  validatePaperId,
  handleValidationErrors,
  teacherController.deletePaper
);

/**
 * @swagger
 * /teacher/papers/{id}/resend-review-email:
 *   post:
 *     summary: Resend the review-request email to all college reviewers
 *     tags: [Teacher]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Email resent }
 *       400: { description: Paper is not in pending status }
 *       404: { description: Paper not found }
 */
router.post(
  '/papers/:id/resend-review-email',
  requireRole('teacher'),
  validatePaperId,
  handleValidationErrors,
  teacherController.resendPaperReviewEmail
);

module.exports = router;