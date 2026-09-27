const express = require('express');
const router = express.Router();
const authenticateToken = require('../core/auth/utilities');
const { requireSuperAdmin } = require('../middleware/roleMiddleware');
const superAdminController = require('../controllers/superAdminController');
const learnedVerbController = require('../controllers/learnedVerbController');
const {
  validatePagination,
  validateSearchOnly,
  validateCollegeId,
  validateCollege,
  handleValidationErrors,
} = require('../middleware/validators');

// All /super-admin routes require authentication + super_admin role
router.use(authenticateToken, requireSuperAdmin);

// Global platform stats
router.get('/stats', superAdminController.getGlobalStats);

// College management
router.get(
  '/colleges',
  validatePagination,
  validateSearchOnly,
  handleValidationErrors,
  superAdminController.getAllColleges
);
router.post(
  '/colleges',
  validateCollege,
  handleValidationErrors,
  superAdminController.createCollege
);
router.get(
  '/colleges/:id',
  validateCollegeId,
  handleValidationErrors,
  superAdminController.getCollegeDetails
);
router.put(
  '/colleges/:id',
  validateCollegeId,
  validateCollege,
  handleValidationErrors,
  superAdminController.updateCollege
);
router.delete(
  '/colleges/:id',
  validateCollegeId,
  handleValidationErrors,
  superAdminController.deleteCollege
);

// Audit logs
router.get('/audit-logs', superAdminController.getAuditLogs);

/* -------------------------------------------------------------------------- */
/* LearnedVerb management (super_admin only)                                  */
/* -------------------------------------------------------------------------- */

/**
 * @swagger
 * /super-admin/learned-verbs:
 *   get:
 *     summary: List learned verbs
 *     tags: [SuperAdmin]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: domain
 *         schema: { type: string, enum: [cognitive, affective, psychomotor] }
 *       - in: query
 *         name: collegeId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [usageCount, confidence, createdAt, verb] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200: { description: List of learned verbs }
 */
router.get('/learned-verbs', learnedVerbController.getLearnedVerbs);

/**
 * @swagger
 * /super-admin/learned-verbs/suggestions:
 *   get:
 *     summary: Suggest verbs that appear frequently but aren't learned yet
 *     tags: [SuperAdmin]
 *     parameters:
 *       - in: query
 *         name: collegeId
 *         schema: { type: string }
 *       - in: query
 *         name: minUsage
 *         schema: { type: integer, default: 5 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: List of suggestions }
 */
router.get('/learned-verbs/suggestions', learnedVerbController.getSuggestedVerbs);

/**
 * @swagger
 * /super-admin/learned-verbs:
 *   post:
 *     summary: Create a learned verb
 *     tags: [SuperAdmin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [verb, domain, level, confidence]
 *             properties:
 *               verb: { type: string, maxLength: 50 }
 *               domain: { type: string, enum: [cognitive, affective, psychomotor] }
 *               level: { type: integer, minimum: 1, maximum: 7 }
 *               confidence: { type: number, minimum: 0, maximum: 1 }
 *               context: { type: string }
 *               collegeId: { type: string }
 *     responses:
 *       201: { description: Learned verb created }
 *       409: { description: Verb already exists for this college }
 */
router.post('/learned-verbs', learnedVerbController.createLearnedVerb);

/**
 * @swagger
 * /super-admin/learned-verbs/bulk-import:
 *   post:
 *     summary: Bulk import learned verbs
 *     tags: [SuperAdmin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [verbs]
 *             properties:
 *               verbs:
 *                 type: array
 *                 maxItems: 1000
 *                 items: { type: object }
 *     responses:
 *       200: { description: Import result }
 */
router.post('/learned-verbs/bulk-import', learnedVerbController.bulkImportVerbs);

/**
 * @swagger
 * /super-admin/learned-verbs/{verbId}:
 *   put:
 *     summary: Update a learned verb
 *     tags: [SuperAdmin]
 *     parameters:
 *       - in: path
 *         name: verbId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 */
router.put('/learned-verbs/:verbId', learnedVerbController.updateLearnedVerb);

/**
 * @swagger
 * /super-admin/learned-verbs/{verbId}:
 *   delete:
 *     summary: Delete a learned verb
 *     tags: [SuperAdmin]
 *     parameters:
 *       - in: path
 *         name: verbId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 */
router.delete('/learned-verbs/:verbId', learnedVerbController.deleteLearnedVerb);
/**
 * @swagger
 * /super-admin/email/test:
 *   get:
 *     summary: Send a test email to verify SMTP configuration
 *     tags: [SuperAdmin]
 *     parameters:
 *       - in: query
 *         name: to
 *         schema: { type: string, format: email }
 *     responses:
 *       200: { description: Test email sent }
 *       400: { description: No target email }
 */
router.get('/email/test', superAdminController.testEmailConfig);

module.exports = router;