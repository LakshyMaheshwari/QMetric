const bcrypt = require('bcrypt');
const logger = require('../config/logger');
const crypto = require('node:crypto');
const User = require('../Model/user');
const College = require('../Model/College');
const Paper = require('../Model/PaperInfo');
const { paginate, getPaginationMeta } = require('../utils/pagination');
const { logAudit } = require('../utils/auditLog');
const escapeRegex = require('../utils/escapeRegex');
const { withTransaction } = require('../utils/withTransaction');
const { syncCollegeRoleMembership } = require('../utils/syncCollegeCounters');
const {
  BCRYPT_ROUNDS,
  PASSWORD_ERROR_MESSAGE,
  isStrongPassword,
  ASSIGNABLE_ROLES,
} = require('../config/security');
const { getUserId } = require('../utils/currentUser');
const Notification = require('../Model/Notification');
const emailService = require('../utils/emailService');

/**
 * GET /college-admin/users
 */
const getCollegeUsers = async (req, res) => {
  try {
    const adminUser = await User.findById(getUserId(req)).select('collegeId role');
    let collegeId = adminUser?.collegeId;

    if (!collegeId && adminUser?.role === 'super_admin') {
      collegeId =
        req.query.collegeId ||
        (await College.findOne({ isActive: true }))?._id;
    }

    if (!collegeId) {
      return res.status(400).json({
        error: true,
        message: 'You are not assigned to any college.'
      });
    }

    const { search, role } = req.query;
    const { skip, limit, page } = paginate(req);

    const baseQuery = {
      collegeId
    };

    if (search && search.trim()) {
      const safe = escapeRegex(
        search.trim().slice(0, 100)
      );

      const regex = new RegExp(
        safe,
        'i'
      );

      baseQuery.$or = [
        { userName: regex },
        { fullName: regex },
        { email: regex },
      ];
    }

    const listQuery = {
      ...baseQuery
    };

    if (role && role !== 'all') {
      listQuery.role = role;
    }

    const [
      users,
      total,
      statsAgg
    ] = await Promise.all([
      User.find(listQuery)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments(listQuery),

      User.aggregate([
        {
          $match: baseQuery
        },
        {
          $group: {
            _id: null,
            teachers: {
              $sum: {
                $cond: [
                  { $eq: ['$role', 'teacher'] },
                  1,
                  0
                ]
              }
            },
            reviewers: {
              $sum: {
                $cond: [
                  { $eq: ['$role', 'reviewer'] },
                  1,
                  0
                ]
              }
            },
            admins: {
              $sum: {
                $cond: [
                  { $eq: ['$role', 'admin'] },
                  1,
                  0
                ]
              }
            },
            blocked: {
              $sum: {
                $cond: ['$isBlocked', 1, 0]
              }
            },
          },
        },
      ]),
    ]);

    const agg = statsAgg[0] || {};

    const stats = {
      total,
      teachers: agg.teachers || 0,
      reviewers: agg.reviewers || 0,
      admins: agg.admins || 0,
      blocked: agg.blocked || 0,
    };

    res.json({
      error: false,
      users,
      stats,
      pagination: getPaginationMeta(
        total,
        page,
        limit
      )
    });
  } catch (error) {
    logger.error(
      'Error fetching college users:',
      error
    );

    res.status(500).json({
      error: true,
      message: 'Server error'
    });
  }
};

/**
 * PUT /college-admin/users/:id/role
 */
const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

    const adminUser = await User.findById(
      getUserId(req)
    ).select('collegeId');

    const collegeId = adminUser?.collegeId;

    if (!collegeId) {
      return res.status(400).json({
        error: true,
        message: 'You are not assigned to any college.'
      });
    }

    if (!ASSIGNABLE_ROLES.includes(role)) {
      return res.status(400).json({
        error: true,
        message:
          `Invalid role. Must be one of: ${ASSIGNABLE_ROLES.join(', ')}`
      });
    }

    if (id === String(getUserId(req))) {
      return res.status(400).json({
        error: true,
        message: 'Cannot change your own role'
      });
    }

    const result = await withTransaction(
      async (session) => {
        const userQuery = User.findOne({
          _id: id,
          collegeId
        });

        if (session) {
          userQuery.session(session);
        }

        const user = await userQuery;

        if (!user) {
          return {
            user: null
          };
        }

        const oldRole = user.role;
        user.role = role;

        await user.save(
          session ? { session } : {}
        );
        await syncCollegeRoleMembership({
          collegeId: user.collegeId,
          userId: user._id,
          oldRole,
          newRole: role,
          session,
        });

        return {
          user,
          oldRole
        };
      }
    );

    if (!result.user) {
      return res.status(404).json({
        error: true,
        message: 'User not found in your college'
      });
    }

    const {
      user,
      oldRole
    } = result;

    await logAudit({
      userId: getUserId(req),
      action: 'UPDATE_ROLE',
      resource: `User:${user._id}`,
      changes: {
        oldValue: oldRole,
        newValue: role,
        fields: ['role']
      },
      request: req,
    });

    res.json({
      error: false,
      message: 'Role updated successfully',
      user: {
        id: user._id,
        name: user.fullName || user.userName,
        role: user.role
      }
    });
  } catch (error) {
    logger.error(
      'Error changing role:',
      error
    );

    res.status(500).json({
      error: true,
      message: 'Server error'
    });
  }
};

/**
 * PUT /college-admin/users/:id/block
 */
const toggleBlockUser = async (req, res) => {
  try {
    const { id } = req.params;

    const adminUser = await User.findById(
      getUserId(req)
    ).select('collegeId');

    const collegeId = adminUser?.collegeId;

    if (!collegeId) {
      return res.status(400).json({
        error: true,
        message: 'You are not assigned to any college.'
      });
    }

    let { isBlocked } = req.body || {};

    if (id === String(getUserId(req))) {
      return res.status(400).json({
        error: true,
        message: 'Cannot block yourself'
      });
    }

    const currentUser = await User.findOne({
      _id: id,
      collegeId
    }).select('isBlocked role');

    if (!currentUser) {
      return res.status(404).json({
        error: true,
        message: 'User not found in your college'
      });
    }

    if (currentUser.role === 'super_admin') {
      return res.status(403).json({
        error: true,
        message: 'Cannot block super admin'
      });
    }

    // New clients should send an explicit boolean:
    // { "isBlocked": true } or { "isBlocked": false }.
    //
    // Existing clients/tests that omit the body continue to work by
    // toggling the user's current state.
    if (typeof isBlocked !== 'boolean') {
      isBlocked = !currentUser.isBlocked;
    }

    const user = await User.findOneAndUpdate(
      {
        _id: id,
        collegeId
      },
      {
        $set: {
          isBlocked
        }
      },
      {
        new: true
      }
    ).select(
      'userName fullName email role isBlocked collegeId'
    );

    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found in your college'
      });
    }

    await logAudit({
      userId: getUserId(req),
      action: user.isBlocked
        ? 'BLOCK_USER'
        : 'UNBLOCK_USER',
      resource: `User:${user._id}`,
      changes: {
        oldValue: {
          isBlocked: currentUser.isBlocked
        },
        newValue: {
          isBlocked: user.isBlocked
        },
        fields: ['isBlocked']
      },
      request: req,
    });

    res.json({
      error: false,
      message:
        `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`,
      user: {
        id: user._id,
        name: user.fullName || user.userName,
        isBlocked: user.isBlocked
      },
    });
  } catch (error) {
    logger.error(
      'Error toggling block:',
      error
    );

    res.status(500).json({
      error: true,
      message: 'Server error'
    });
  }
};

/**
 * POST /college-admin/users
 *
 * Note on transactions: `withTransaction` falls back to a no-session path
 * when the deployment doesn't support them (e.g. mongodb-memory-server in
 * tests). The `withSession()` helper attaches a session only when one is
 * actually provided, avoiding Mongoose 8's `.session(undefined)` throw.
 */
const addCollegeUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      department,
      phone,
      position,
      stream,
      collegeId: reqCollegeId,
    } = req.body || {};

    const result = await withTransaction(
      async (session) => {
        // Attach the session to a query only when it exists.
        const withSession = (query) => {
          if (session) {
            query.session(session);
          }

          return query;
        };

        const adminUser = await withSession(
          User.findById(
            getUserId(req)
          ).select('collegeId role')
        );

        let collegeId = adminUser?.collegeId;

        if (
          !collegeId &&
          adminUser?.role === 'super_admin'
        ) {
          collegeId =
            reqCollegeId ||
            (
              await withSession(
                College.findOne({
                  isActive: true
                })
              )
            )?._id;
        }

        if (!collegeId) {
          return {
            error: true,
            message:
              'You are not assigned to any college.',
            status: 400
          };
        }

        if (
          !name ||
          !email ||
          !password
        ) {
          return {
            error: true,
            message:
              'Name, email, and password are required',
            status: 400
          };
        }

        const requestedRole =
          role || 'teacher';

        if (
          !ASSIGNABLE_ROLES.includes(
            requestedRole
          )
        ) {
          return {
            error: true,
            message:
              `Invalid role. Must be one of: ${ASSIGNABLE_ROLES.join(', ')}`,
            status: 400,
          };
        }

        if (!isStrongPassword(password)) {
          return {
            error: true,
            message:
              PASSWORD_ERROR_MESSAGE,
            status: 400
          };
        }

        const existingUser =
          await withSession(
            User.findOne({
              email:
                email
                  .toLowerCase()
                  .trim()
            })
          );

        if (existingUser) {
          return {
            error: true,
            message:
              'Email already registered',
            status: 400
          };
        }

        const college =
          await withSession(
            College.findById(collegeId)
          );

        if (!college) {
          return {
            error: true,
            message: 'College not found',
            status: 400
          };
        }

        const hashedPassword =
          await bcrypt.hash(
            password,
            BCRYPT_ROUNDS
          );

        // Build user data conditionally — do NOT set phone to null when absent.
        // The sparse unique index skips missing fields but indexes explicit nulls,
        // which would cause E11000 on the second phone-less user.
        const userData = {
          userName: name.trim(),
          fullName: name.trim(),
          email:
            email
              .toLowerCase()
              .trim(),
          password: hashedPassword,
          role: requestedRole,
          collegeId,
          collegeName:
            college?.name || '',
          department:
            department ||
            'Not specified',
          position:
            position ||
            'Professor',

          // `stream` is required for teacher role; default to 'Other' so
          // callers that don't supply it still get a valid document.
          stream:
            stream ||
            'Other',

          // Cryptographically random suffix — avoids both collisions and
          // predictable employeeId values.
          employeeId:
            `EMP-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        };

        if (
          phone &&
          String(phone).trim()
        ) {
          userData.phone =
            String(phone).trim();
        }

        const user =
          new User(userData);

        await user.save(
          session
            ? { session }
            : {}
        );

        if (user.role === 'teacher') {
          await College.findByIdAndUpdate(
            collegeId,
            {
              $inc: {
                totalTeachers: 1
              }
            },
            session
              ? { session }
              : {}
          );
        }

        return {
          user,
          collegeName:
            college?.name || ''
        };
      }
    );

    if (result.error) {
      return res.status(
        result.status || 500
      ).json({
        error: true,
        message: result.message
      });
    }

    const { user } = result;

    await logAudit({
      userId: getUserId(req),
      action: 'CREATE_USER',
      resource: `User:${user._id}`,
      changes: {
        fields: [
          'userName',
          'email',
          'role',
          'collegeId'
        ]
      },
      request: req,
    });

    res.status(201).json({
      error: false,
      message: 'User added successfully',
      user: {
        id: user._id,
        name: user.fullName,
        email: user.email,
        role: user.role
      },
    });
  } catch (error) {
    logger.error(
      'Error adding user:',
      error
    );

    res.status(500).json({
      error: true,
      message: 'Server error'
    });
  }
};

/**
 * GET /college-admin/stats
 */
const getCollegeStats = async (req, res) => {
  try {
    const adminUser = await User.findById(
      getUserId(req)
    ).select('collegeId role');

    let collegeId =
      adminUser?.collegeId;

    if (
      !collegeId &&
      adminUser?.role === 'super_admin'
    ) {
      collegeId =
        req.query.collegeId ||
        (
          await College.findOne({
            isActive: true
          })
        )?._id;
    }

    if (!collegeId) {
      return res.status(400).json({
        error: true,
        message:
          'You are not assigned to any college.'
      });
    }

    const college =
      await College.findById(
        collegeId
      );

    const userStats =
      await User.aggregate([
        {
          $match: {
            collegeId
          }
        },
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
            blocked: {
              $sum: {
                $cond: [
                  '$isBlocked',
                  1,
                  0
                ]
              }
            },
          },
        },
      ]);

    let paperStats = {
      total: 0,
      avgScore: 0,
      last30Days: 0
    };

    try {
      const collegeUsers =
        await User.find({
          collegeId
        }).select('_id');

      const userIds =
        collegeUsers.map(
          (u) => u._id
        );

      // Tenant identity must come from stable identifiers, never the free-text
      // 'College Name' field stored inside a paper.
      const paperMatchQuery = {
        $or: [
          { collegeId },
          ...(userIds.length > 0
            ? [
                {
                  userId: {
                    $in: userIds
                  }
                }
              ]
            : []),
        ],
      };

      const papers =
        await Paper.find(
          paperMatchQuery
        )
          .select(
            'qualityScore createdAt'
          )
          .lean();

      paperStats.total =
        papers.length;

      const scored =
        papers.filter(
          (p) =>
            typeof p.qualityScore ===
              'number' &&
            !Number.isNaN(
              p.qualityScore
            ) &&
            p.qualityScore > 0
        );

      if (scored.length > 0) {
        const sum =
          scored.reduce(
            (acc, p) =>
              acc +
              p.qualityScore,
            0
          );

        paperStats.avgScore =
          Math.round(
            (sum /
              scored.length) *
              10
          ) / 10;
      }

      const thirtyDaysAgo =
        new Date();

      thirtyDaysAgo.setDate(
        thirtyDaysAgo.getDate() -
          30
      );

      paperStats.last30Days =
        papers.filter(
          (p) =>
            p.createdAt &&
            new Date(
              p.createdAt
            ) >= thirtyDaysAgo
        ).length;
    } catch (e) {
      logger.warn(
        'Paper stats calculation warning:',
        e.message
      );
    }

    const stats = {
      college: {
        id: college?._id,
        name: college?.name,
        code: college?.code,
      },

      users: {
        total: userStats.reduce(
          (sum, s) =>
            sum + s.count,
          0
        ),

        teachers:
          userStats.find(
            (s) =>
              s._id === 'teacher'
          )?.count || 0,

        reviewers:
          userStats.find(
            (s) =>
              s._id === 'reviewer'
          )?.count || 0,

        admins:
          userStats.find(
            (s) =>
              s._id === 'admin'
          )?.count || 0,

        blocked:
          userStats.reduce(
            (sum, s) =>
              sum +
              (s.blocked || 0),
            0
          ),
      },

      papers: paperStats,
    };

    res.json({
      error: false,
      stats
    });
  } catch (error) {
    logger.error(
      'Error fetching stats:',
      error
    );

    res.status(500).json({
      error: true,
      message: 'Server error'
    });
  }
};

/* ============================================================ */
/* PENDING TEACHER APPROVAL QUEUE                                */
/* ============================================================ */

/**
 * GET /college-admin/pending-teachers
 * List all teachers awaiting approval for the admin's college.
 */
exports.getPendingTeachers = async (
  req,
  res
) => {
  try {
    const collegeId =
      req.user.collegeId;

    if (
      !collegeId &&
      req.user.role !== 'super_admin'
    ) {
      return res.status(403).json({
        error: true,
        message:
          'You are not assigned to a college.'
      });
    }

    // Super admins can filter by collegeId query param
    const targetCollegeId =
      req.user.role === 'super_admin'
        ? (
            req.query.collegeId ||
            null
          )
        : collegeId;

    const query = {
      role: 'teacher',
      collegeApprovalStatus:
        'pending',
    };

    // Two shapes of "pending teacher" share this status:
    //   1. affiliated-at-signup: collegeId is already set
    //   2. independent teacher requesting affiliation later: collegeId is null,
    //      the target college lives in pendingAffiliationRequest.collegeId
    if (targetCollegeId) {
      query.$or = [
        { collegeId: targetCollegeId },
        {
          'pendingAffiliationRequest.collegeId':
            targetCollegeId
        },
      ];
    }

    // Optional search on name/email. Keep it as a second condition so the
    // tenant-scoping $or above cannot be overwritten.
    if (
      req.query.search &&
      typeof req.query.search ===
        'string' &&
      req.query.search.trim()
    ) {
      const safe =
        req.query.search
          .trim()
          .slice(0, 100)
          .replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&'
          );

      const re =
        new RegExp(
          safe,
          'i'
        );

      const searchCondition = {
        $or: [
          { fullName: re },
          { email: re },
          { userName: re }
        ],
      };

      if (query.$or) {
        query.$and = [
          {
            $or: query.$or
          },
          searchCondition,
        ];

        delete query.$or;
      } else {
        query.$or =
          searchCondition.$or;
      }
    }

    const {
      skip,
      limit,
      page
    } = paginate(
      req,
      20,
      100
    );

    const [
      teachers,
      total
    ] = await Promise.all([
      User.find(query)
        .select(
          'userName email fullName phone position employeeId department stream collegeId collegeName collegeIdPhoto idVerification pendingAffiliationRequest createdAt'
        )
        .populate(
          'collegeId',
          'name code'
        )
        .sort({
          createdAt: -1
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments(
        query
      ),
    ]);

    return res.json({
      error: false,
      teachers,
      pagination:
        getPaginationMeta(
          total,
          page,
          limit
        ),
      counts: {
        pending:
          total
      },
    });
  } catch (err) {
    logger.error(
      '[collegeAdmin.getPendingTeachers]',
      err
    );

    return res.status(500).json({
      error: true,
      message:
        'Server error fetching pending teachers.'
    });
  }
};

/**
 * GET /college-admin/pending-teachers/:id
 * Detailed view of one pending teacher, including OCR data.
 */
exports.getPendingTeacherDetail =
  async (req, res) => {
    try {
      const {
        id
      } = req.params;

      const teacher =
        await User.findById(
          id
        )
          .select(
            'userName email fullName phone position employeeId department stream collegeId collegeName collegeIdPhoto idVerification pendingAffiliationRequest collegeApprovalStatus createdAt'
          )
          .populate(
            'collegeId',
            'name code'
          )
          .lean();

      if (!teacher) {
        return res.status(404).json({
          error: true,
          message:
            'Teacher not found.'
        });
      }

      // Scope check — the effective target college is either collegeId (set at
      // signup) or pendingAffiliationRequest.collegeId (set by a later request).
      const effectiveCollegeId =
        teacher.collegeId?._id ||
        teacher.collegeId ||
        teacher
          .pendingAffiliationRequest
          ?.collegeId;

      if (
        req.user.role !==
          'super_admin' &&
        String(
          effectiveCollegeId
        ) !==
          String(
            req.user.collegeId
          )
      ) {
        return res.status(403).json({
          error: true,
          message:
            'Forbidden: not your college.'
        });
      }

      if (
        teacher.collegeApprovalStatus !==
        'pending'
      ) {
        return res.status(400).json({
          error: true,
          message:
            `Teacher is not pending approval (current status: ${teacher.collegeApprovalStatus}).`,
        });
      }

      return res.json({
        error: false,
        teacher
      });
    } catch (err) {
      logger.error(
        '[collegeAdmin.getPendingTeacherDetail]',
        err
      );

      return res.status(500).json({
        error: true,
        message:
          'Server error fetching teacher details.'
      });
    }
  };

/**
 * PUT /college-admin/pending-teachers/:id/approve
 * Approve a pending teacher's college affiliation.
 */
exports.approvePendingTeacher =
  async (req, res) => {
    try {
      const {
        id
      } = req.params;

      const reviewerId =
        req.user.userId;

      const teacher =
        await User.findById(id);

      if (!teacher) {
        return res.status(404).json({
          error: true,
          message:
            'Teacher not found.'
        });
      }

      // Effective target college: already-set collegeId (affiliated-at-signup),
      // or the college the independent teacher asked to join later.
      const requestedCollegeId =
        teacher
          .pendingAffiliationRequest
          ?.collegeId;

      const effectiveCollegeId =
        teacher.collegeId ||
        requestedCollegeId;

      if (
        req.user.role !==
          'super_admin' &&
        String(
          effectiveCollegeId
        ) !==
          String(
            req.user.collegeId
          )
      ) {
        return res.status(403).json({
          error: true,
          message:
            'Forbidden: not your college.'
        });
      }

      if (!effectiveCollegeId) {
        return res.status(400).json({
          error: true,
          message:
            'Teacher has no target college to approve.'
        });
      }

      // If this is an affiliation REQUEST (collegeId not yet set), resolve the
      // college now so we can stamp collegeId/collegeName atomically.
      let targetCollege = null;

      if (!teacher.collegeId) {
        targetCollege =
          await College.findById(
            requestedCollegeId
          );

        if (!targetCollege) {
          return res.status(400).json({
            error: true,
            message:
              'Requested college no longer exists.'
          });
        }
      }

      // Atomically approve the teacher and maintain the denormalized teacher
      // counter. `withTransaction` uses Mongo transactions on replica-set/sharded
      // deployments and safely falls back for standalone test databases.
      const result =
        await withTransaction(
          async (
            session
          ) => {
            const options = session
              ? {
                  session,
                  new: true
                }
              : {
                  new: true
                };

            const updateFields = {
              collegeApprovalStatus:
                'approved'
            };

            const update = {
              $set: updateFields
            };

            if (targetCollege) {
              updateFields.collegeId =
                targetCollege._id;

              updateFields.collegeName =
                targetCollege.name;

              update.$unset = {
                pendingAffiliationRequest:
                  ''
              };
            }

            const approved =
              await User.findOneAndUpdate(
                {
                  _id: id,
                  collegeApprovalStatus:
                    'pending'
                },
                update,
                options
              );

            if (!approved) {
              return {
                approved: null
              };
            }

            const counterResult =
              await College.updateOne(
                {
                  _id:
                    approved.collegeId
                },
                {
                  $inc: {
                    totalTeachers: 1
                  }
                },
                session
                  ? {
                      session
                    }
                  : {}
              );

            if (
              counterResult.matchedCount !==
              1
            ) {
              throw new Error(
                'Target college disappeared during teacher approval.'
              );
            }

            return {
              approved
            };
          }
        );

      const {
        approved
      } = result;

      if (!approved) {
        return res.status(409).json({
          error: true,
          message:
            'Teacher is no longer pending (already approved or rejected by another admin).',
        });
      }

      teacher.collegeApprovalStatus =
        approved.collegeApprovalStatus;

      teacher.collegeId =
        approved.collegeId;

      teacher.collegeName =
        approved.collegeName;

      // Audit
      try {
        await logAudit({
          userId: reviewerId,
          action:
            'APPROVE_TEACHER',
          resource:
            `User:${teacher._id}`,
          changes: {
            oldValue: {
              collegeApprovalStatus:
                'pending'
            },
            newValue: {
              collegeApprovalStatus:
                'approved'
            },
            fields: [
              'collegeApprovalStatus'
            ],
          },
          request: req,
        });
      } catch (auditErr) {
        logger.error(
          'Audit log failed (non-blocking):',
          auditErr.message
        );
      }

      // Notify the teacher
      try {
        await Notification.create(
          {
            userId:
              teacher._id,
            type:
              'teacher_approved',
            title:
              'Account Approved',
            message:
              `Your affiliation with ${teacher.collegeName} has been approved. You can now submit papers for review.`,
            relatedDocId:
              teacher._id,
            actionUrl:
              '/teacher/papers',
          }
        );
      } catch (
        notifErr
      ) {
        logger.error(
          'Notification create failed (non-blocking):',
          notifErr.message
        );
      }

      // Email the teacher (fire-and-forget)
      emailService
        .sendTeacherApprovedEmail(
          teacher.email,
          teacher.fullName,
          teacher.collegeName
        )
        .catch(
          (err) =>
            logger.error(
              'Approval email failed:',
              err.message
            )
        );

      return res.json({
        error: false,
        message:
          'Teacher approved successfully.',
        teacher: {
          _id:
            teacher._id,
          fullName:
            teacher.fullName,
          email:
            teacher.email,
          collegeId:
            teacher.collegeId,
          collegeName:
            teacher.collegeName,
          collegeApprovalStatus:
            teacher.collegeApprovalStatus,
        },
      });
    } catch (err) {
      logger.error(
        '[collegeAdmin.approvePendingTeacher]',
        err
      );

      return res.status(500).json({
        error: true,
        message:
          'Server error approving teacher.'
      });
    }
  };

/**
 * PUT /college-admin/pending-teachers/:id/reject
 * Reject a pending teacher — demote to independent teacher.
 * Papers and account are preserved; only the college affiliation is removed.
 */
exports.rejectPendingTeacher =
  async (req, res) => {
    try {
      const {
        id
      } = req.params;

      const {
        reason
      } = req.body || {};

      const reviewerId =
        req.user.userId;

      if (
        !reason ||
        typeof reason !==
          'string' ||
        reason.trim().length === 0
      ) {
        return res.status(400).json({
          error: true,
          message:
            'Rejection reason is required.'
        });
      }

      if (reason.length > 500) {
        return res.status(400).json({
          error: true,
          message:
            'Reason must be 500 characters or less.'
        });
      }

      const teacher =
        await User.findById(id);

      if (!teacher) {
        return res.status(404).json({
          error: true,
          message:
            'Teacher not found.'
        });
      }

      const requestedCollegeId =
        teacher
          .pendingAffiliationRequest
          ?.collegeId;

      const effectiveCollegeId =
        teacher.collegeId ||
        requestedCollegeId;

      if (
        req.user.role !==
          'super_admin' &&
        String(
          effectiveCollegeId
        ) !==
          String(
            req.user.collegeId
          )
      ) {
        return res.status(403).json({
          error: true,
          message:
            'Forbidden: not your college.'
        });
      }

      // Capture the college name for the notification message (before clearing)
      const rejectedCollegeName =
        teacher.collegeName ||
        (
          await College.findById(
            requestedCollegeId
          ).lean()
        )?.name;

      // Atomic check-and-update: prevents race with a concurrent approve/reject.
      // Affiliated-at-signup teachers get demoted to independent (collegeId cleared);
      // independent teachers whose REQUEST was rejected simply have the request
      // cleared — they were already independent and stay that way.
      const demoted =
        await User.findOneAndUpdate(
          {
            _id: id,
            collegeApprovalStatus:
              'pending'
          },
          teacher.collegeId
            ? {
                $set: {
                  collegeApprovalStatus:
                    'approved',
                  collegeId: null,
                  collegeName: ''
                }
              }
            : {
                $set: {
                  collegeApprovalStatus:
                    'approved'
                },
                $unset: {
                  pendingAffiliationRequest:
                    ''
                }
              },
          {
            new: true
          }
        );

      if (!demoted) {
        return res.status(409).json({
          error: true,
          message:
            'Teacher is no longer pending (already approved or rejected by another admin).',
        });
      }

      teacher.collegeId =
        demoted.collegeId;

      teacher.collegeName =
        demoted.collegeName;

      teacher.collegeApprovalStatus =
        demoted.collegeApprovalStatus;

      // Audit
      try {
        await logAudit({
          userId: reviewerId,
          action:
            'REJECT_TEACHER',
          resource:
            `User:${teacher._id}`,
          changes: {
            oldValue: {
              collegeApprovalStatus:
                'pending',
              collegeId:
                teacher.collegeId
            },
            newValue: {
              collegeApprovalStatus:
                'approved',
              collegeId: null,
              reason
            },
            fields: [
              'collegeApprovalStatus',
              'collegeId'
            ],
          },
          request: req,
        });
      } catch (
        auditErr
      ) {
        logger.error(
          'Audit log failed (non-blocking):',
          auditErr.message
        );
      }

      // Notify the teacher
      try {
        await Notification.create(
          {
            userId:
              teacher._id,
            type:
              'teacher_rejected',
            title:
              'Affiliation Request Not Approved',
            message:
              `Your affiliation with ${rejectedCollegeName} was not approved. Reason: ${reason}. You can continue using QMetric as an independent teacher.`,
            relatedDocId:
              teacher._id,
            actionUrl:
              '/profile',
          }
        );
      } catch (
        notifErr
      ) {
        logger.error(
          'Notification create failed (non-blocking):',
          notifErr.message
        );
      }

      // Email the teacher (fire-and-forget)
      emailService
        .sendTeacherRejectedEmail(
          teacher.email,
          teacher.fullName,
          rejectedCollegeName,
          reason
        )
        .catch(
          (err) =>
            logger.error(
              'Rejection email failed:',
              err.message
            )
        );

      return res.json({
        error: false,
        message:
          'Teacher rejected and demoted to independent teacher.',
        teacher: {
          _id:
            teacher._id,
          fullName:
            teacher.fullName,
          email:
            teacher.email,
          collegeId:
            null,
          collegeName:
            '',
          collegeApprovalStatus:
            teacher.collegeApprovalStatus,
        },
      });
    } catch (err) {
      logger.error(
        '[collegeAdmin.rejectPendingTeacher]',
        err
      );

      return res.status(500).json({
        error: true,
        message:
          'Server error rejecting teacher.'
      });
    }
  };

/**
 * GET /college-admin/pending-teachers/count
 * Badge count for the admin dashboard.
 */
exports.getPendingTeacherCount =
  async (req, res) => {
    try {
      const collegeId =
        req.user.collegeId;

      if (
        !collegeId &&
        req.user.role !==
          'super_admin'
      ) {
        return res.status(403).json({
          error: true,
          message:
            'You are not assigned to a college.'
        });
      }

      const query = {
        role: 'teacher',
        collegeApprovalStatus:
          'pending'
      };

      if (
        req.user.role !==
        'super_admin'
      ) {
        query.collegeId =
          collegeId;
      } else if (
        req.query.collegeId
      ) {
        query.collegeId =
          req.query.collegeId;
      }

      const count =
        await User.countDocuments(
          query
        );

      return res.json({
        error: false,
        count
      });
    } catch (err) {
      logger.error(
        '[collegeAdmin.getPendingTeacherCount]',
        err
      );

      return res.status(500).json({
        error: true,
        message:
          'Server error fetching count.'
      });
    }
  };

module.exports = {
  ...module.exports,
  getCollegeUsers,
  changeUserRole,
  toggleBlockUser,
  addCollegeUser,
  getCollegeStats,
};