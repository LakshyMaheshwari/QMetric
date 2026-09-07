const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const authenticateToken = require('../core/auth/utilities');
const upload = require('../config/multer');
const adminAuth = require('../middleware/adminAuth');

// ─── Profile ─────────────────────────────────────────────────────────────────
router.get('/profile', authenticateToken, userController.getProfile);
router.put('/profile', authenticateToken, userController.updateProfile);

// ─── Login ───────────────────────────────────────────────────────────────────
router.post('/login', (req, res, next) => {
  console.log(' Auth route /login hit');
  next();
}, authController.login);

// ─── Single user registration (multipart — includes collegeIdPhoto + OCR) ────
router.post('/create-account', upload.single('collegeIdPhoto'), (req, res, next) => {
  console.log(' Auth route /create-account hit');
  next();
}, authController.register);

// ─── Bulk registration — protected by admin secret header ────────────────────
// Caller must send:  X-Admin-Secret: <ADMIN_SECRET_KEY>
router.post('/bulk-register', adminAuth, (req, res, next) => {
  console.log(' Auth route /bulk-register hit, rows:', req.body?.users?.length ?? 0);
  next();
}, authController.bulkRegister);

// ─── Admin account creation — protected by admin secret header ───────────────
// Caller must send:  X-Admin-Secret: <ADMIN_SECRET_KEY>
// Body: { name, email, password }
router.post('/create-admin', adminAuth, authController.createAdmin);

module.exports = router;
