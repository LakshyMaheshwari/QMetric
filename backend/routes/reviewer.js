const express = require('express');
const router = express.Router();
const authenticateToken = require('../core/auth/utilities');
const { requireRole } = require('../middleware/roleMiddleware');
const reviewerController = require('../controllers/reviewerController');
const paperMetadataController = require('../controllers/paperMetadataController');
const {
  validatePaperId,
  validatePaperIdParam,
  validatePagination,
  validateQuestionIndex,
  validateSearch,
  handleValidationErrors,
} = require('../middleware/validators');
const verifiedQuestionController = require('../controllers/verifiedQuestionController');

/**
 * @swagger
 * tags:
 *   name: Reviewer
 *   description: Paper review and approval
 */

// All routes require authentication and reviewer, admin, or super_admin role
router.use(authenticateToken);
router.use(requireRole('reviewer', 'admin', 'super_admin'));

/**
 * @swagger
 * /reviewer/stats:
 *   get:
 *     summary: Get review statistics for the reviewer's college
 *     tags: [Reviewer]
 *     responses:
 *       200:
 *         description: Review stats
 */
router.get('/stats', reviewerController.getReviewStats);

/**
 * @swagger
 * /reviewer/pending-count:
 *   get:
 *     summary: Get count of pending papers (for badge)
 *     tags: [Reviewer]
 *     responses:
 *       200:
 *         description: Pending count
 */
router.get('/pending-count', reviewerController.getPendingCount);

/**
 * @swagger
 * /reviewer/papers:
 *   get:
 *     summary: List all papers in the reviewer's college (paginated)
 *     tags: [Reviewer]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, pending, approved, rejected, needs_revision]
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of papers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: boolean }
 *                 papers:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Paper' }
 *                 pagination: { type: object }
 */
router.get('/papers', validatePagination, validateSearch, handleValidationErrors, reviewerController.getCollegePapers);

/**
 * @swagger
 * /reviewer/papers/{id}:
 *   get:
 *     summary: Get single paper details
 *     tags: [Reviewer]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paper details
 *       404:
 *         description: Paper not found
 */
router.get('/papers/:id', validatePaperId, handleValidationErrors, reviewerController.getPaperDetails);

/**
 * @swagger
 * /reviewer/papers/{id}/review:
 *   put:
 *     summary: Approve, reject, or request revision for a paper
 *     tags: [Reviewer]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approved, rejected, needs_revision]
 *               comments: { type: string, maxLength: 2000 }
 *     responses:
 *       200:
 *         description: Paper reviewed
 */
router.put('/papers/:id/review', validatePaperId, handleValidationErrors, reviewerController.reviewPaper);

/* -------------------------------------------------------------------------- */
/* VerifiedQuestion corrections                                              */
/* -------------------------------------------------------------------------- */

/**
 * @swagger
 * /reviewer/papers/{paperId}/corrections:
 *   post:
 *     summary: Submit a correction for a question's Bloom level
 *     tags: [Reviewer]
 *     parameters:
 *       - in: path
 *         name: paperId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [questionIndex, correctedDomain, correctedLevel]
 *             properties:
 *               questionIndex:      { type: integer, minimum: 0 }
 *               correctedDomain:    { type: string, enum: [cognitive, affective, psychomotor] }
 *               correctedLevel:     { type: integer, minimum: 1, maximum: 7 }
 *               correctedLevelName: { type: string }
 *               reason:             { type: string, maxLength: 500 }
 *     responses:
 *       200: { description: Correction submitted }
 *       400: { description: Validation error }
 *       403: { description: Forbidden }
 *       404: { description: Paper or question not found }
 */
router.post(
  '/papers/:paperId/corrections',
  validatePaperIdParam,
  validateQuestionIndex,
  handleValidationErrors,
  verifiedQuestionController.submitCorrection
);

/**
 * @swagger
 * /reviewer/papers/{paperId}/corrections:
 *   get:
 *     summary: List all corrections for a paper
 *     tags: [Reviewer]
 *     parameters:
 *       - in: path
 *         name: paperId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: List of corrections }
 *       403: { description: Forbidden }
 *       404: { description: Paper not found }
 */
router.get(
  '/papers/:paperId/corrections',
  validatePaperIdParam,
  validatePagination,
  handleValidationErrors,
  verifiedQuestionController.getCorrectionsForPaper
);

/**
 * @swagger
 * /reviewer/papers/{paperId}/corrections/{questionIndex}:
 *   get:
 *     summary: Get a single correction
 *     tags: [Reviewer]
 *     parameters:
 *       - in: path
 *         name: paperId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: questionIndex
 *         required: true
 *         schema: { type: integer, minimum: 0 }
 *     responses:
 *       200: { description: Correction found }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
router.get(
  '/papers/:paperId/corrections/:questionIndex',
  validatePaperIdParam,
  validateQuestionIndex,
  handleValidationErrors,
  verifiedQuestionController.getSingleCorrection
);

/**
 * @swagger
 * /reviewer/papers/{paperId}/corrections/{questionIndex}:
 *   put:
 *     summary: Update an existing correction
 *     tags: [Reviewer]
 *     parameters:
 *       - in: path
 *         name: paperId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: questionIndex
 *         required: true
 *         schema: { type: integer, minimum: 0 }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               correctedDomain:    { type: string, enum: [cognitive, affective, psychomotor] }
 *               correctedLevel:     { type: integer, minimum: 1, maximum: 7 }
 *               correctedLevelName: { type: string }
 *               reason:             { type: string, maxLength: 500 }
 *     responses:
 *       200: { description: Correction updated }
 *       400: { description: Validation error }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
router.put(
  '/papers/:paperId/corrections/:questionIndex',
  validatePaperIdParam,
  validateQuestionIndex,
  handleValidationErrors,
  verifiedQuestionController.updateCorrection
);

/**
 * @swagger
 * /reviewer/papers/{paperId}/corrections/{questionIndex}:
 *   delete:
 *     summary: Delete a correction
 *     tags: [Reviewer]
 *     parameters:
 *       - in: path
 *         name: paperId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: questionIndex
 *         required: true
 *         schema: { type: integer, minimum: 0 }
 *     responses:
 *       200: { description: Correction deleted }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
router.delete(
  '/papers/:paperId/corrections/:questionIndex',
  validatePaperIdParam,
  validateQuestionIndex,
  handleValidationErrors,
  verifiedQuestionController.deleteCorrection
);

/**
 * @swagger
 * /reviewer/papers/{id}/recommendations/bloom:
 *   get:
 *     summary: Get Bloom's-taxonomy recommendations for a paper
 *     tags: [Reviewer]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Bloom recommendations }
 *       403: { description: Forbidden }
 *       404: { description: Paper not found OR recommendations not yet generated }
 */
router.get(
    '/papers/:id/recommendations/bloom',
    validatePaperId,
    handleValidationErrors,
    reviewerController.getBloomRecommendations
);

/**
 * @swagger
 * /reviewer/papers/{id}/metadata:
 *   get:
 *     summary: Get difficulty, question-type, and Bloom metadata for a paper
 *     tags: [Reviewer]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Metadata breakdown }
 *       403: { description: Forbidden }
 *       404: { description: Paper not found }
 */
router.get(
  '/papers/:id/metadata',
  validatePaperId,
  handleValidationErrors,
  paperMetadataController.getPaperMetadata
);

/**
 * @swagger
 * /reviewer/papers/{id}/resend-decision-email:
 *   post:
 *     summary: Resend the decision email to the paper's owner
 *     tags: [Reviewer]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Email resent }
 *       400: { description: Paper not in a decided state }
 *       404: { description: Paper not found }
 */
router.post(
  '/papers/:id/resend-decision-email',
  validatePaperId,
  handleValidationErrors,
  reviewerController.resendDecisionEmail
);

module.exports = router;