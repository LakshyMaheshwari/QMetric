const express = require('express');
const router = express.Router();
const authenticateToken = require('../core/auth/utilities');
const { requireSuperAdmin } = require('../middleware/roleMiddleware');
const collegeController = require('../controllers/collegeController');

// All /admin/colleges routes require authentication + super_admin role
router.use(authenticateToken, requireSuperAdmin);

router.get('/', collegeController.getColleges);
router.post('/', collegeController.createCollege);
router.put('/:id', collegeController.updateCollege);
router.delete('/:id', collegeController.deleteCollege);

module.exports = router;
