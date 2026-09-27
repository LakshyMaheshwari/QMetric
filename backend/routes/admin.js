const express = require('express');
const router = express.Router();
const authenticateToken = require('../core/auth/utilities');
const adminController = require('../controllers/adminController');
const { requireRole } = require('../middleware/roleMiddleware');
const { validatePagination, validateCreateUser, validateUserId, validateRoleUpdate, handleValidationErrors } = require('../middleware/validators');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin/College-level user management
 */

// All routes below require a valid JWT AND admin or super_admin role
router.use(authenticateToken, requireRole('admin', 'super_admin'));

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List all users in the college (paginated)
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [teacher, reviewer, admin] }
 *     responses:
 *       200:
 *         description: List of users with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: boolean }
 *                 users:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/User' }
 *                 pagination: { type: object }
 */
router.get('/users', validatePagination, handleValidationErrors, adminController.getUsers);

/**
 * @swagger
 * /admin/users:
 *   post:
 *     summary: Create a new user (teacher/reviewer/admin)
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               role: { type: string, enum: [teacher, reviewer, admin] }
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error
 */
router.post('/users', validateCreateUser, handleValidationErrors, adminController.createUser);

/**
 * @swagger
 * /admin/users/{id}/role:
 *   put:
 *     summary: Update a user's role
 *     tags: [Admin]
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
 *             properties:
 *               role: { type: string, enum: [teacher, reviewer, admin] }
 *     responses:
 *       200:
 *         description: Role updated
 */
router.put('/users/:id/role', validateUserId, validateRoleUpdate, handleValidationErrors, adminController.updateRole);

/**
 * @swagger
 * /admin/users/{id}/block:
 *   put:
 *     summary: Block or unblock a user
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User blocked/unblocked
 */
router.put('/users/:id/block', validateUserId, handleValidationErrors, adminController.toggleBlock);

/**
 * @swagger
 * /admin/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User deleted
 *       404:
 *         description: User not found
 */
router.delete('/users/:id', validateUserId, handleValidationErrors, adminController.deleteUser);

/* -------------------------------------------------------------------------- */
/* OCR Logs                                                                  */
/* -------------------------------------------------------------------------- */
const ocrLogController = require('../controllers/ocrLogController');

router.get('/ocr-logs', validatePagination, handleValidationErrors, ocrLogController.listOcrLogs);
router.get('/ocr-logs/stats', ocrLogController.getOcrStats);
router.get('/ocr-logs/:logId', ocrLogController.getOcrLog);
router.put('/ocr-logs/:logId/verify', ocrLogController.verifyOcrLog);
router.put('/ocr-logs/:logId/reject', ocrLogController.rejectOcrLog);

module.exports = router;
