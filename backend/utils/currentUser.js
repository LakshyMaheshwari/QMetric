/**
 * Thin helpers over the `req.user` object populated by authenticateToken.
 *
 * authenticateToken sets req.user = { userId, role, userName, email,
 * collegeId, collegeName } (see core/auth/utilities.js). These accessors
 * provide null-safe reads without changing any business logic.
 */

function getUserId(req) {
    if (!req) return null;
    const target = req.user || req;
    return target.userId ?? target.id ?? target._id ?? null;
}

function getUserRole(req) {
    if (!req) return null;
    const target = req.user || req;
    return target.role ?? null;
}

function getCollegeId(req) {
    if (!req) return null;
    const target = req.user || req;
    return target.collegeId ?? null;
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
