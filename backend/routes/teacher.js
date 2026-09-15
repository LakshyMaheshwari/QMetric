const express = require('express');
const router = express.Router();
const authenticateToken = require('../core/auth/utilities');
const { requireRole } = require('../middleware/roleMiddleware');
const teacherController = require('../controllers/teacherController');

// All routes require authentication and teacher role or higher
router.use(authenticateToken);
router.use(requireRole('teacher', 'reviewer', 'admin', 'super_admin'));

router.get('/papers', teacherController.getMyPapers);
router.get('/papers/:id', teacherController.getPaperDetails);

module.exports = router;
