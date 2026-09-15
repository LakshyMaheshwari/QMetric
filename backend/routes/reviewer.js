const express = require('express');
const router = express.Router();
const authenticateToken = require('../core/auth/utilities');
const { requireRole } = require('../middleware/roleMiddleware');
const reviewerController = require('../controllers/reviewerController');

// All routes require authentication and reviewer, admin, or super_admin role
router.use(authenticateToken);
router.use(requireRole('reviewer', 'admin', 'super_admin'));

// Dashboard & Stats
router.get('/stats', reviewerController.getReviewStats);
router.get('/pending-count', reviewerController.getPendingCount);

// Paper management
router.get('/papers', reviewerController.getCollegePapers);
router.get('/papers/:id', reviewerController.getPaperDetails);
router.put('/papers/:id/review', reviewerController.reviewPaper);

module.exports = router;
