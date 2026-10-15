const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../Model/user');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dev Auth
 *   description: Development-only authentication bypass (disabled in production)
 */

/**
 * @swagger
 * /dev/login:
 *   post:
 *     summary: Development-only login (bypasses CSRF and Turnstile)
 *     tags: [Dev Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: faculty@wce.ac.in
 *     responses:
 *       200:
 *         description: JWT access token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOi...
 *       400:
 *         description: Email is required
 *       404:
 *         description: User not found or dev auth disabled
 */
router.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_AUTH !== 'true') {
        return res.status(404).json({ error: true, message: 'Not found' });
    }
    next();
});

router.post('/login', async (req, res) => {
    const { email } = req.body || {};

    if (!email || typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({ error: true, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('-password');
    if (!user) {
        return res.status(404).json({ error: true, message: 'User not found' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.ACCESS_TOKEN_SECRET);
    res.json({ error: false, token });
});

module.exports = router;
