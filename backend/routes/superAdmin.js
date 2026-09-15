const express = require('express');
const router = express.Router();
const authenticateToken = require('../core/auth/utilities');
const { requireSuperAdmin } = require('../middleware/roleMiddleware');
const superAdminController = require('../controllers/superAdminController');
const collegeController = require('../controllers/collegeController');

// All /super-admin routes require authentication + super_admin role
router.use(authenticateToken, requireSuperAdmin);

// Global platform stats
router.get('/stats', superAdminController.getGlobalStats);

// College management
router.get('/colleges', superAdminController.getAllColleges);
router.post('/colleges', collegeController.createCollege);       // re-use existing create logic
router.get('/colleges/:id', superAdminController.getCollegeDetails);
router.put('/colleges/:id', superAdminController.updateCollege);
router.delete('/colleges/:id', superAdminController.deleteCollege);

module.exports = router;
