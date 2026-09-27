/**
 * middleware/adminAuth.js
 * -----------------------
 * Protects admin-only routes (e.g. /auth/bulk-register, /auth/create-admin).
 *
 * The caller must supply the header:
 *   X-Admin-Secret: <value of ADMIN_SECRET_KEY env var>
 *
 * Exports a single Express middleware function.
 */

const crypto = require('node:crypto');

/**
 * Constant-time comparison of the provided admin secret against the
 * configured one. Both strings are hashed to a fixed 32 bytes first
 * so the length of the real secret is not leaked via timing.
 */
function secretsMatch(provided, expected) {
    const expectedHash = crypto.createHash('sha256').update(String(expected)).digest();
    const providedHash = crypto.createHash('sha256').update(String(provided)).digest();
    return crypto.timingSafeEqual(expectedHash, providedHash);
}

module.exports = function adminAuth(req, res, next) {
    const adminSecret = process.env.ADMIN_SECRET_KEY;

    // Fail closed — if no secret is configured, deny everything
    if (!adminSecret) {
        console.error('[adminAuth] ADMIN_SECRET_KEY is not set in .env — blocking request');
        return res.status(503).json({
            error: true,
            message: 'Admin operations are not configured. Contact the server administrator.',
        });
    }

    const provided = req.headers['x-admin-secret'];

    if (!provided || typeof provided !== 'string') {
        return res.status(401).json({ error: true, message: 'Admin secret header required.' });
    }

    if (!secretsMatch(provided, adminSecret)) {
        return res.status(403).json({ error: true, message: 'Invalid admin secret.' });
    }

    next();
};