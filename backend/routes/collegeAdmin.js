const express = require('express');
const router = express.Router();
const authenticateToken = require('../core/auth/utilities');
const { requireRole } = require('../middleware/roleMiddleware');
const collegeAdminController = require('../controllers/collegeAdminController');
const paperMetadataController = require('../controllers/paperMetadataController');
const {
  validatePagination,
  validateSearchOnly,
  validateUserId,
  validateRoleUpdate,
  validateCreateUser,
  handleValidationErrors,
  validateRejectionReason
} = require('../middleware/validators');

router.use(authenticateToken);
router.use(requireRole('admin', 'super_admin'));

router.get(
  '/users',
  validatePagination,
  validateSearchOnly,
  handleValidationErrors,
  collegeAdminController.getCollegeUsers
);

router.post(
  '/users',
  validateCreateUser,
  handleValidationErrors,
  collegeAdminController.addCollegeUser
);

router.put(
  '/users/:id/role',
  validateUserId,
  validateRoleUpdate,
  handleValidationErrors,
  collegeAdminController.changeUserRole
);

router.put(
  '/users/:id/block',
  validateUserId,
  handleValidationErrors,
  collegeAdminController.toggleBlockUser
);

router.get('/stats', collegeAdminController.getCollegeStats);

/**
 * @swagger
 * /college-admin/metadata-analytics:
 *   get:
 *     summary: College-wide difficulty and question-type analytics
 *     tags: [CollegeAdmin]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: branch
 *         schema: { type: string }
 *     responses:
 *       200: { description: Analytics }
 */
router.get('/metadata-analytics', paperMetadataController.getMetadataAnalytics);
/* -------------------------------------------------------------------------- */
/* Pending teacher approvals                                                  */
/* -------------------------------------------------------------------------- */

/**
 * @swagger
 * /college-admin/pending-teachers:
 *   get:
 *     summary: List teachers awaiting approval
 *     tags: [CollegeAdmin]
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
 *         name: collegeId
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of pending teachers }
 */
router.get(
  '/pending-teachers',
  validatePagination,
  handleValidationErrors,
  collegeAdminController.getPendingTeachers
);

/**
 * @swagger
 * /college-admin/pending-teachers/count:
 *   get:
 *     summary: Badge count of pending teachers
 *     tags: [CollegeAdmin]
 *     responses:
 *       200: { description: { error: false, count: N } }
 */
router.get('/pending-teachers/count', collegeAdminController.getPendingTeacherCount);

/**
 * @swagger
 * /college-admin/pending-teachers/{id}:
 *   get:
 *     summary: Get one pending teacher with OCR data
 *     tags: [CollegeAdmin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Teacher details }
 *       403: { description: Not your college }
 *       404: { description: Teacher not found }
 */
router.get(
  '/pending-teachers/:id',
  validateUserId,
  handleValidationErrors,
  collegeAdminController.getPendingTeacherDetail
);

/**
 * @swagger
 * /college-admin/pending-teachers/{id}/approve:
 *   put:
 *     summary: Approve a pending teacher's affiliation
 *     tags: [CollegeAdmin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Teacher approved }
 *       400: { description: Teacher not in pending state }
 *       403: { description: Not your college }
 *       404: { description: Teacher not found }
 */
router.put(
  '/pending-teachers/:id/approve',
  validateUserId,
  handleValidationErrors,
  collegeAdminController.approvePendingTeacher
);

/**
 * @swagger
 * /college-admin/pending-teachers/{id}/reject:
 *   put:
 *     summary: Reject a pending teacher — demotes to independent teacher
 *     tags: [CollegeAdmin]
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
 *             required: [reason]
 *             properties:
 *               reason: { type: string, maxLength: 500 }
 *     responses:
 *       200: { description: Teacher demoted to independent }
 *       400: { description: Missing reason or wrong state }
 *       403: { description: Not your college }
 *       404: { description: Teacher not found }
 */
router.put(
  '/pending-teachers/:id/reject',
  validateUserId,
  validateRejectionReason,
  handleValidationErrors,
  collegeAdminController.rejectPendingTeacher
);
module.exports = router;