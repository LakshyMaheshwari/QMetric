const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const collegeController = require('../controllers/collegeController');
const authenticateToken = require('../core/auth/utilities');
const upload = require('../config/multer');
const { validateImageSignature } = upload;
const adminAuth = require('../middleware/adminAuth');
const { validateLogin, validateRegister, handleValidationErrors } = require('../middleware/validators');
const { revoke } = require('../utils/tokenBlacklist');
const User = require('../Model/user');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/profile', authenticateToken, userController.getProfile);

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: Update current user profile
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string }
 *               phone: { type: string }
 *               department: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.put('/profile', authenticateToken, userController.updateProfile);

// Authenticated password change (rate-limited in index.js via /auth/password)
router.put('/password', authenticateToken, userController.changePassword);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@qmetric.com
 *               password:
 *                 type: string
 *                 example: Password123
 *               turnstileToken:
 *                 type: string
 *                 example: test-token
 *     responses:
 *       200:
 *         description: Login successful (sets accessToken cookie)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: boolean, example: false }
 *                 message: { type: string, example: 'Login successful' }
 *                 user: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/login', validateLogin, handleValidationErrors, authController.login);

/**
 * @swagger
 * /auth/create-account:
 *   post:
 *     summary: Register a new teacher/reviewer account
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [userName, email, password, fullName, phone, collegeId, position]
 *             properties:
 *               userName:
 *                 type: string
 *                 example: john_doe
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 example: Password123
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               collegeId:
 *                 type: string
 *               position:
 *                 type: string
 *                 enum: [Professor, Associate Professor, Assistant Professor, Lecturer, HoD, Other]
 *               collegeIdPhoto:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Account created (sets accessToken cookie)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: boolean, example: false }
 *                 user: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post(
  '/create-account',
  upload.single('collegeIdPhoto'),
  validateImageSignature,
  validateRegister,
  handleValidationErrors,
  authController.register
);

/**
 * @swagger
 * /auth/verify-email/{token}:
 *   get:
 *     summary: Verify a user's email address
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Email verified }
 *       400: { description: Invalid or expired token }
 */
router.get('/verify-email/:token', authController.verifyEmail);

/**
 * @swagger
 * /auth/resend-verification:
 *   post:
 *     summary: Resend email verification link
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Link sent if account exists }
 */
router.post('/resend-verification', authController.resendVerificationEmail);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset link via email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Reset email sent if user exists }
 *       400: { description: Invalid email format }
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @swagger
 * /auth/reset-password/{token}:
 *   post:
 *     summary: Reset password using received token
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Password reset successfully }
 *       400: { description: Invalid or expired token / weak password }
 */
router.post('/reset-password/:token', authController.resetPassword);

/**
 * @swagger
 * /auth/bulk-register:
 *   post:
 *     summary: Bulk register users via CSV/JSON (admin secret required)
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - in: header
 *         name: X-Admin-Secret
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [users]
 *             properties:
 *               users:
 *                 type: array
 *                 items: { type: object }
 *               defaultPassword: { type: string }
 *               turnstileToken: { type: string }
 *     responses:
 *       207:
 *         description: Bulk registration result (partial success possible)
 */
router.post('/bulk-register', adminAuth, authController.bulkRegister);

/**
 * @swagger
 * /auth/colleges:
 *   get:
 *     summary: List active colleges (for registration dropdown)
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: List of active colleges
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: boolean, example: false }
 *                 colleges:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/College' }
 */
router.get('/colleges', collegeController.getActiveColleges);

/**
 * @swagger
 * /auth/create-admin:
 *   post:
 *     summary: Create an admin account (admin secret required)
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - in: header
 *         name: X-Admin-Secret
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       201:
 *         description: Admin account created
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/create-admin', adminAuth, authController.createAdmin);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout (clears accessToken cookie + revokes token)
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: Logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: boolean, example: false }
 *                 message: { type: string, example: 'Logged out successfully' }
 */
router.post('/logout', async (req, res) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.split(' ')[1];

    if (token && typeof token === 'string') {
      try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        await revoke(token, decoded.exp);
        if (decoded?.userId) {
          await User.findOneAndUpdate(
            { _id: decoded.userId },
            { $set: { refreshTokenHash: null, refreshTokenExpiresAt: null } }
          );
        }
      } catch (tokenErr) {
        // Logout remains idempotent for expired/invalid access tokens.
      }
    }

    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (typeof refreshToken === 'string' && refreshToken) {
      const crypto = require('node:crypto');
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await User.updateOne(
        { refreshTokenHash },
        { $set: { refreshTokenHash: null, refreshTokenExpiresAt: null } }
      );
    }

    const sameSite = process.env.COOKIE_SAME_SITE || 'lax';
    const secure = process.env.NODE_ENV === 'production';

    res.clearCookie('accessToken', {
      httpOnly: true,
      secure,
      sameSite,
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure,
      sameSite,
      path: '/auth',
    });

    return res.json({ error: false, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err.message);
    return res.status(500).json({ error: true, message: 'Logout failed' });
  }
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token cookie or body
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New access and refresh tokens issued
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', authController.refreshToken);

/**
 * @swagger
 * /auth/revoke-all-sessions:
 *   post:
 *     summary: Revoke all active sessions and refresh tokens across devices
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *       - CookieAuth: []
 *     responses:
 *       200:
 *         description: All sessions revoked
 *       401:
 *         description: Unauthenticated
 */
router.post('/revoke-all-sessions', authenticateToken, authController.revokeAllSessions);

/**
 * @swagger
 * /auth/profile/request-affiliation:
 *   post:
 *     summary: Request college affiliation (for independent teachers)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [collegeId]
 *             properties:
 *               collegeId: { type: string }
 *               collegeIdPhoto: { type: string, format: binary }
 *     responses:
 *       200: { description: Request submitted }
 *       400: { description: Invalid input }
 *       403: { description: College inactive }
 */
router.post(
  '/profile/request-affiliation',
  authenticateToken,
  upload.single('collegeIdPhoto'),
  validateImageSignature,
  authController.requestAffiliation
);

/**
 * @swagger
 * /auth/profile/upgrade-to-teacher:
 *   post:
 *     summary: Upgrade a student account to teacher
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [signupIntent]
 *             properties:
 *               signupIntent: { type: string, enum: [affiliated, independent] }
 *               collegeId: { type: string }
 *               collegeIdPhoto: { type: string, format: binary }
 *     responses:
 *       200: { description: Upgrade complete or pending }
 *       400: { description: Invalid input }
 */
router.post(
  '/profile/upgrade-to-teacher',
  authenticateToken,
  upload.single('collegeIdPhoto'),
  validateImageSignature,
  authController.upgradeToTeacher
);

/**
 * @swagger
 * /auth/bulk-register/template:
 *   get:
 *     summary: Download a CSV template for bulk registration
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: CSV template file
 *         content:
 *           text/csv:
 *             schema: { type: string }
 */
router.get('/bulk-register/template', authController.downloadBulkTemplate);

/**
 * @swagger
 * /auth/bulk-register/format:
 *   get:
 *     summary: Get column format documentation for bulk registration
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: Format specification
 */
router.get('/bulk-register/format', authController.getBulkFormat);

module.exports = router;