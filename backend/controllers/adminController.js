const bcrypt = require('bcrypt');
const logger = require('../config/logger');
const mongoose = require('mongoose');
const crypto = require('node:crypto');
const validator = require('validator');
const User = require('../Model/user');
const College = require('../Model/College');
const Paper = require('../Model/PaperInfo');
const OCRLog = require('../Model/OCRLog');
const VerifiedQuestion = require('../Model/VerifiedQuestion');
const LearnedVerb = require('../Model/LearnedVerb');
const Notification = require('../Model/Notification');
const { paginate, getPaginationMeta, getSortOptions } = require('../utils/pagination');
const { logAudit } = require('../utils/auditLog');
const escapeRegex = require('../utils/escapeRegex');
const {
  BCRYPT_ROUNDS,
  PASSWORD_ERROR_MESSAGE,
  isStrongPassword,
  ASSIGNABLE_ROLES,
} = require('../config/security');
const { getUserId, getUserRole, getCollegeId } = require('../utils/currentUser');
const { withTransaction } = require('../utils/withTransaction');
const { syncCollegeRoleMembership } = require('../utils/syncCollegeCounters');

/**
 * Build a tenant-scoped filter for a target user id.
 *  super_admin: any user
 *  college admin: only users in the admin's own college
 * Returns null when a non-super admin has no college (caller responds 403).
 */
function scopedUserQuery(req, id) {
    if (getUserRole(req) === 'super_admin') return { _id: id };
    const collegeId = getCollegeId(req);
    if (!collegeId) return null;
    return { _id: id, collegeId };
}

function isSelf(req, id) {
    return String(getUserId(req)) === String(id);
}

// ─── GET /admin/users — List all users ────────────────────────────────────────
const getUsers = async (req, res) => {
    try {
        const { skip, limit, page } = paginate(req);
        const query = {};

        if (getUserRole(req) === 'super_admin') {
            // super_admin can see all users
        } else if (getCollegeId(req)) {
            query.collegeId = getCollegeId(req);
        } else {
            // Non-super-admin without a college — deny rather than leak
            return res.status(403).json({
                error: true,
                message: 'You are not assigned to any college.',
            });
        }

        const [users, total] = await Promise.all([
            User.find(query)
                .select('-password')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(query)
        ]);

        res.json({
            error: false,
            users,
            pagination: getPaginationMeta(total, page, limit)
        });
    } catch (err) {
        logger.error('Admin getUsers error:', err);
        res.status(500).json({ error: true, message: 'Server error fetching users' });
    }
};

// ─── POST /admin/users — Create new user ──────────────────────────────────────
const createUser = async (req, res) => {
    try {
        const { name, email, password, role, department, phone } = req.body || {};

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                error: true,
                message: 'Name, email, and password are required'
            });
        }

        // Validate email format using validator.isEmail (well-vetted, no ReDoS surface)
        if (typeof email !== 'string' || email.length > 254 || !validator.isEmail(email)) {
            return res.status(400).json({
                error: true,
                message: 'Invalid email format'
            });
        }

        // Enforce same password policy as register/create-admin
        if (!isStrongPassword(password)) {
            return res.status(400).json({
                error: true,
                message: PASSWORD_ERROR_MESSAGE
            });
        }

        // Only allow assignable roles — super_admin can never be set via HTTP
        if (role && !ASSIGNABLE_ROLES.includes(role)) {
            return res.status(400).json({
                error: true,
                message: `Invalid role. Must be one of: ${ASSIGNABLE_ROLES.join(', ')}`
            });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                error: true,
                message: 'Email already registered'
            });
        }

        // Resolve the target college from the CALLER, never from the request body
        // (unless the caller is super_admin, who may pick one explicitly).
        // College admins always create users inside their own college.
        let targetCollege = null;

        if (getUserRole(req) === 'super_admin') {
            const requested = req.body.collegeId;

            if (requested) {
                if (!mongoose.isValidObjectId(requested)) {
                    return res.status(400).json({
                        error: true,
                        message: 'Invalid collegeId'
                    });
                }

                targetCollege = await College.findById(requested);
            } else {
                targetCollege = await College.findOne({
                    isActive: true
                }).sort({ createdAt: 1 });
            }
        } else {
            const callerCollegeId = getCollegeId(req);

            if (!callerCollegeId) {
                return res.status(403).json({
                    error: true,
                    message: 'You are not assigned to a college.'
                });
            }

            targetCollege = await College.findById(callerCollegeId);
        }

        if (!targetCollege) {
            return res.status(400).json({
                error: true,
                message: 'College not found'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

        // Build user data conditionally — do NOT set phone to a placeholder.
        // The phone field has a sparse unique index; setting it to a literal
        // like '0000000000' (or any non-null value) on multiple accounts
        // causes E11000 duplicate key errors.
        const userData = {
            userName: name.trim(),
            fullName: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: role || 'teacher',
            collegeId: targetCollege._id,
            collegeName: targetCollege.name,
            department: department || 'N/A',
            position: 'Other',
            stream: 'Other',
            collegeIdPhoto: '',
            // Cryptographically random suffix — avoids both collisions and
            // predictable employeeId values. Math.random() is not safe here
            // because the identifier could be guessed or brute-forced.
            employeeId: `ADMIN-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        };

        // Only set phone when the caller supplied one — leaves the field
        // truly unset (not null) so the sparse unique index skips it
        if (phone && String(phone).trim()) {
            userData.phone = String(phone).trim();
        }

        const user = new User(userData);

        await user.save();

        await logAudit({
            userId: getUserId(req),
            action: 'CREATE_USER',
            resource: `User:${user._id}`,
            changes: {
                newValue: {
                    userName: user.userName,
                    email: user.email,
                    role: user.role
                },
            },
            request: req,
        });

        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({
            error: false,
            message: 'User created successfully',
            user: userResponse,
        });
    } catch (err) {
        await logAudit({
            userId: getUserId(req),
            action: 'CREATE_USER',
            resource: 'User:new',
            request: req,
            error: err,
        });

        logger.error('Admin createUser error:', err);
        res.status(500).json({
            error: true,
            message: 'Server error creating user'
        });
    }
};

// ─── PUT /admin/users/:id/role — Change user role ────────────────────────────
const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role: newRole } = req.body || {};

        // Defense in depth — the route validator already enforces this,
        // but keep the check here in case the route is ever reused.
        if (!ASSIGNABLE_ROLES.includes(newRole)) {
            return res.status(400).json({
                error: true,
                message: `Invalid role. Must be one of: ${ASSIGNABLE_ROLES.join(', ')}`,
            });
        }

        const query = scopedUserQuery(req, id);

        if (!query) {
            return res.status(403).json({
                error: true,
                message: 'You are not assigned to a college.'
            });
        }

        if (isSelf(req, id)) {
            return res.status(400).json({
                error: true,
                message: 'You cannot change your own role.'
            });
        }

        const result = await withTransaction(async (session) => {
            const userQuery = User.findOne(query);

            if (session) {
                userQuery.session(session);
            }

            const user = await userQuery;

            if (!user) {
                return { user: null };
            }

            const oldRole = user.role;
            user.role = newRole;

            await user.save(session ? { session } : {});
            await syncCollegeRoleMembership({
                collegeId: user.collegeId,
                userId: user._id,
                oldRole,
                newRole,
                session,
            });

            return { user, oldRole };
        });

        if (!result.user) {
            return res.status(404).json({
                error: true,
                message: 'User not found'
            });
        }

        const { user, oldRole } = result;

        await logAudit({
            userId: getUserId(req),
            action: 'UPDATE_ROLE',
            resource: `User:${id}`,
            changes: {
                oldValue: { role: oldRole },
                newValue: { role: newRole },
                fields: ['role'],
            },
            request: req,
        });

        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({
            error: false,
            message: 'Role updated',
            user: userResponse
        });
    } catch (err) {
        await logAudit({
            userId: getUserId(req),
            action: 'UPDATE_ROLE',
            resource: `User:${req.params.id}`,
            request: req,
            error: err,
        });

        logger.error('Admin updateRole error:', err);
        res.status(500).json({
            error: true,
            message: 'Server error updating role'
        });
    }
};

// ─── PUT /admin/users/:id/block — Block or unblock user ──────────────────────
const toggleBlock = async (req, res) => {
    try {
        const { id } = req.params;

        const query = scopedUserQuery(req, id);

        if (!query) {
            return res.status(403).json({
                error: true,
                message: 'You are not assigned to a college.'
            });
        }

        let { isBlocked } = req.body || {};

        if (isSelf(req, id)) {
            return res.status(400).json({
                error: true,
                message: 'You cannot block yourself.'
            });
        }

        // We first read the current state so that older clients/tests that
        // send no body can continue using this endpoint as a toggle.
        const previous = await User.findOne(query).select('isBlocked');

        if (!previous) {
            return res.status(404).json({
                error: true,
                message: 'User not found'
            });
        }

        // New clients should send an explicit boolean:
        // { "isBlocked": true } or { "isBlocked": false }
        //
        // For backward compatibility, an omitted value toggles the current
        // state instead of returning 400.
        if (typeof isBlocked !== 'boolean') {
            isBlocked = !previous.isBlocked;
        }

        const user = await User.findOneAndUpdate(
            query,
            { $set: { isBlocked } },
            { new: true }
        ).select('userName fullName email role isBlocked collegeId');

        if (!user) {
            return res.status(404).json({
                error: true,
                message: 'User not found'
            });
        }

        await logAudit({
            userId: getUserId(req),
            action: user.isBlocked ? 'BLOCK_USER' : 'UNBLOCK_USER',
            resource: `User:${id}`,
            changes: {
                oldValue: { isBlocked: previous.isBlocked },
                newValue: { isBlocked: user.isBlocked },
                fields: ['isBlocked'],
            },
            request: req,
        });

        res.json({
            error: false,
            message: `User ${user.isBlocked ? 'blocked' : 'unblocked'}`,
            user,
        });
    } catch (err) {
        await logAudit({
            userId: getUserId(req),
            action: 'BLOCK_USER',
            resource: `User:${req.params.id}`,
            request: req,
            error: err,
        });

        logger.error('Admin toggleBlock error:', err);
        res.status(500).json({
            error: true,
            message: 'Server error toggling block status'
        });
    }
};

// ─── DELETE /admin/users/:id — Delete user ───────────────────────────────────
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const query = scopedUserQuery(req, id);

        if (!query) {
            return res.status(403).json({
                error: true,
                message: 'You are not assigned to a college.'
            });
        }

        const user = await User.findOne(query);

        if (!user) {
            return res.status(404).json({
                error: true,
                message: 'User not found'
            });
        }

        if (isSelf(req, id)) {
            return res.status(400).json({
                error: true,
                message: 'You cannot delete your own account.'
            });
        }

        const [
            paperRefs,
            ocrLogs,
            corrections,
            taughtVerbs,
            adminMemberships,
            notifications
        ] = await Promise.all([
            Paper.countDocuments({
                $or: [
                    { userId: user._id },
                    { reviewedBy: user._id },
                    { 'reviewHistory.reviewerId': user._id },
                ],
            }),
            OCRLog.countDocuments({ userId: user._id }),
            VerifiedQuestion.countDocuments({ correctedBy: user._id }),
            LearnedVerb.countDocuments({ taughtBy: user._id }),
            College.countDocuments({ adminIds: user._id }),
            Notification.countDocuments({ userId: user._id }),
        ]);

        if (
            paperRefs > 0 ||
            ocrLogs > 0 ||
            corrections > 0 ||
            taughtVerbs > 0 ||
            adminMemberships > 0 ||
            notifications > 0
        ) {
            return res.status(409).json({
                error: true,
                message:
                    'User cannot be permanently deleted because records still reference this account. Block the account instead.',
            });
        }

        if (user.collegeIdPhotoPublicId) {
            try {
                const cloudinary = require('../config/cloudinary');

                await cloudinary.uploader.destroy(
                    user.collegeIdPhotoPublicId
                );
            } catch (cloudErr) {
                logger.warn(
                    'Cloudinary user photo delete failed (non-blocking):',
                    cloudErr.message
                );
            }
        }

        await User.findByIdAndDelete(user._id);

        await logAudit({
            userId: getUserId(req),
            action: 'DELETE_USER',
            resource: `User:${id}`,
            changes: {
                oldValue: {
                    userName: user.userName,
                    email: user.email
                }
            },
            request: req,
        });

        res.json({
            error: false,
            message: 'User deleted successfully'
        });
    } catch (err) {
        await logAudit({
            userId: getUserId(req),
            action: 'DELETE_USER',
            resource: `User:${req.params.id}`,
            request: req,
            error: err,
        });

        logger.error('Admin deleteUser error:', err);
        res.status(500).json({
            error: true,
            message: 'Server error deleting user'
        });
    }
};

/**
 * Scoped query helper for papers:
 *  super_admin: all papers (or filter by ?collegeId=)
 *  admin: only papers belonging to their assigned college
 */
function scopedPaperQuery(req, extra = {}) {
    const role = getUserRole(req);

    if (role === 'super_admin') {
        const q = { ...extra };

        if (req.query.collegeId) {
            q.collegeId = req.query.collegeId;
        }

        return q;
    }

    const collegeId = getCollegeId(req);

    if (!collegeId) {
        return null;
    }

    return {
        collegeId,
        ...extra
    };
}

/**
 * GET /admin/papers
 * College-scoped list of question papers with status, teacher, course, and search filters.
 */
const getPapers = async (req, res) => {
    try {
        const baseQuery = scopedPaperQuery(req);

        if (!baseQuery) {
            return res.status(403).json({
                error: true,
                message: 'You are not assigned to a college.'
            });
        }

        const { page, limit, skip } = paginate(req, 20, 100);
        const {
            status,
            search,
            courseCode,
            teacherId
        } = req.query;

        const sort = getSortOptions(
            req,
            [
                'createdAt',
                'qualityScore',
                'reviewStatus',
                'Course Name',
                'Course Code'
            ],
            {
                createdAt: -1
            }
        );

        const query = { ...baseQuery };

        if (status) {
            query.reviewStatus = status;
        }

        if (courseCode) {
            query['Course Code'] = new RegExp(
                escapeRegex(courseCode.trim()),
                'i'
            );
        }

        if (teacherId) {
            query.userId = teacherId;
        }

        if (search && typeof search === 'string') {
            const safe = escapeRegex(search.trim().slice(0, 50));

            query.$or = [
                { 'Course Name': new RegExp(safe, 'i') },
                { 'Course Code': new RegExp(safe, 'i') },
                { 'Course Teacher': new RegExp(safe, 'i') },
            ];
        }

        const [papers, total] = await Promise.all([
            Paper.find(query)
                .select({
                    Sequence: 0,
                    'Collected Data': 0
                })
                .populate('userId', 'userName fullName email')
                .populate('reviewedBy', 'userName fullName')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),

            Paper.countDocuments(query),
        ]);

        return res.json({
            error: false,
            papers,
            pagination: getPaginationMeta(
                total,
                page,
                limit
            ),
        });
    } catch (err) {
        logger.error('Admin getPapers error:', err);

        return res.status(500).json({
            error: true,
            message: 'Server error fetching papers'
        });
    }
};

/**
 * GET /admin/papers/stats
 * Aggregate metrics on question papers for the admin dashboard.
 */
const getPaperStats = async (req, res) => {
    try {
        const baseQuery = scopedPaperQuery(req);

        if (!baseQuery) {
            return res.status(403).json({
                error: true,
                message: 'You are not assigned to a college.'
            });
        }

        const [
            total,
            draft,
            pending,
            approved,
            rejected,
            needs_revision,
            avgResult
        ] = await Promise.all([
            Paper.countDocuments(baseQuery),
            Paper.countDocuments({
                ...baseQuery,
                reviewStatus: 'draft'
            }),
            Paper.countDocuments({
                ...baseQuery,
                reviewStatus: 'pending'
            }),
            Paper.countDocuments({
                ...baseQuery,
                reviewStatus: 'approved'
            }),
            Paper.countDocuments({
                ...baseQuery,
                reviewStatus: 'rejected'
            }),
            Paper.countDocuments({
                ...baseQuery,
                reviewStatus: 'needs_revision'
            }),
            Paper.aggregate([
                {
                    $match: {
                        ...baseQuery,
                        qualityScore: { $ne: null }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgScore: { $avg: '$qualityScore' }
                    }
                }
            ]),
        ]);

        return res.json({
            error: false,
            stats: {
                total,
                draft,
                pending,
                approved,
                rejected,
                needs_revision,
                averageQualityScore: avgResult[0]
                    ? Math.round(avgResult[0].avgScore * 10) / 10
                    : 0,
            },
        });
    } catch (err) {
        logger.error('Admin getPaperStats error:', err);

        return res.status(500).json({
            error: true,
            message: 'Server error calculating paper stats'
        });
    }
};

/**
 * GET /admin/papers/:id
 * Retrieve a single paper with review history and creator metadata.
 */
const getPaperById = async (req, res) => {
    try {
        const { id } = req.params;

        const query = scopedPaperQuery(req, {
            _id: id
        });

        if (!query) {
            return res.status(403).json({
                error: true,
                message: 'You are not assigned to a college.'
            });
        }

        const paper = await Paper.findOne(query)
            .populate(
                'userId',
                'userName fullName email department stream'
            )
            .populate(
                'reviewedBy',
                'userName fullName email'
            )
            .lean();

        if (!paper) {
            return res.status(404).json({
                error: true,
                message: 'Paper not found'
            });
        }

        return res.json({
            error: false,
            paper
        });
    } catch (err) {
        logger.error('Admin getPaperById error:', err);

        return res.status(500).json({
            error: true,
            message: 'Server error fetching paper'
        });
    }
};

module.exports = {
    getUsers,
    createUser,
    updateRole,
    toggleBlock,
    deleteUser,
    getPapers,
    getPaperStats,
    getPaperById,
};