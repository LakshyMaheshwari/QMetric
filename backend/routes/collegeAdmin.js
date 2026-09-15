const express = require('express');
const router = express.Router();
const authenticateToken = require('../core/auth/utilities');
const { requireRole } = require('../middleware/roleMiddleware');
const collegeAdminController = require('../controllers/collegeAdminController');

// All routes require authentication and admin or super_admin role
router.use(authenticateToken);
router.use(requireRole('admin', 'super_admin'));

// College admin routes
router.get('/users', collegeAdminController.getCollegeUsers);
router.post('/users', collegeAdminController.addCollegeUser);
router.put('/users/:id/role', collegeAdminController.changeUserRole);
router.put('/users/:id/block', collegeAdminController.toggleBlockUser);
router.get('/stats', collegeAdminController.getCollegeStats);

module.exports = router;
