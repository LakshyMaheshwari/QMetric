'use strict';

const express = require('express');
const router = express.Router();
const authenticateToken = require('../core/auth/utilities');
const { requireRole } = require('../middleware/roleMiddleware');
const studentController = require('../controllers/studentController');
const { validatePagination, validatePaperId, handleValidationErrors } = require('../middleware/validators');

/**
 * @swagger
 * tags:
 *   name: Student
 *   description: Endpoints for unaffiliated students to view their uploaded papers and analysis
 */

// All routes require valid authentication and allow students (as well as teacher/admin for preview)
router.use(authenticateToken, requireRole('student', 'teacher', 'admin', 'super_admin'));

/**
 * @swagger
 * /student/papers:
 *   get:
 *     summary: List papers uploaded by the current student
 *     tags: [Student]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of papers }
 */
router.get('/papers', validatePagination, handleValidationErrors, studentController.getMyPapers);

/**
 * @swagger
 * /student/stats:
 *   get:
 *     summary: Get overall upload and score statistics for the student
 *     tags: [Student]
 *     responses:
 *       200: { description: Student paper stats }
 */
router.get('/stats', studentController.getStudentStats);

/**
 * @swagger
 * /student/papers/{id}:
 *   get:
 *     summary: Get full evaluation details for a specific uploaded paper
 *     tags: [Student]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paper details and Bloom taxonomy evaluation }
 *       404: { description: Paper not found }
 */
router.get('/papers/:id', validatePaperId, handleValidationErrors, studentController.getPaperDetails);

module.exports = router;
