/**
 * middleware/adminAuth.js
 * -----------------------
 * Protects admin-only routes (e.g. /auth/bulk-register).
 *
 * The caller must supply the header:
 *   X-Admin-Secret: <value of ADMIN_SECRET_KEY env var>
 *
 * This keeps the bulk-register endpoint from being publicly abused while
 * avoiding the overhead of a full admin user / role system.
 */

module.exports = function adminAuth(req, res, next) {
    const adminSecret = process.env.ADMIN_SECRET_KEY;

    // Fail safe: if no secret is configured, deny all access
    if (!adminSecret) {
        console.error('[adminAuth] ADMIN_SECRET_KEY is not set in .env — blocking request');
        return res.status(503).json({
            error: true,
            message: 'Admin operations are not configured. Contact the server administrator.'
        });
    }

    const provided = req.headers['x-admin-secret'];

    if (!provided) {
        return res.status(401).json({ error: true, message: 'Admin secret header required.' });
    }

    if (provided !== adminSecret) {
        return res.status(403).json({ error: true, message: 'Invalid admin secret.' });
    }

    next();
};
