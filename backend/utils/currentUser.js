/**
 * Thin helpers over the `req.user` object populated by authenticateToken.
 *
 * authenticateToken sets req.user = { userId, role, userName, email,
 * collegeId, collegeName } (see core/auth/utilities.js). These accessors
 * provide null-safe reads without changing any business logic.
 */

function getUserId(req) {
    if (!req) return null;
    if (req.user) {
        return req.user.userId ?? req.user._id ?? req.user.id ?? null;
    }
    // If an Express request object was passed without req.user:
    // Do NOT read req.id, because pinoHttp / tracing assigns a UUID string (req.id).
    if (req.headers || req.method) {
        return req.userId ?? null;
    }
    // If a user object / payload was passed directly: getUserId(user)
    return req.userId ?? req._id ?? req.id ?? null;
}

function getUserRole(req) {
    if (!req) return null;
    if (req.user) return req.user.role ?? null;
    if (req.headers || req.method) return req.role ?? null;
    return req.role ?? null;
}

function getCollegeId(req) {
    if (!req) return null;
    if (req.user) return req.user.collegeId ?? null;
    if (req.headers || req.method) return req.collegeId ?? null;
    return req.collegeId ?? null;
}

function isSuperAdmin(req) {
    return getUserRole(req) === 'super_admin';
}

function isAdmin(req) {
    const role = getUserRole(req);
    return role === 'admin' || role === 'super_admin';
}

function isReviewer(req) {
    const role = getUserRole(req);
    return role === 'reviewer' || role === 'admin' || role === 'super_admin';
}

function isTeacher(req) {
    return getUserRole(req) === 'teacher';
}

module.exports = {
    getUserId,
    getUserRole,
    getCollegeId,
    isSuperAdmin,
    isAdmin,
    isReviewer,
    isTeacher,
};
