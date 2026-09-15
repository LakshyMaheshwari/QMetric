const express = require('express');
const router = express.Router();
const authenticateToken = require('../core/auth/utilities');
const adminController = require('../controllers/adminController');
const { requireSuperAdmin } = require('../middleware/roleMiddleware');

// All routes below require a valid JWT AND super_admin role
router.use(authenticateToken, requireSuperAdmin);

// ─── Users CRUD ───────────────────────────────────────────────────────────────
router.get('/users',               adminController.getUsers);
router.post('/users',              adminController.createUser);
router.put('/users/:id/role',      adminController.updateRole);
router.put('/users/:id/block',     adminController.toggleBlock);
router.delete('/users/:id',        adminController.deleteUser);

module.exports = router;
