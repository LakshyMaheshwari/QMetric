const { body, query, param, validationResult } = require('express-validator');
const { ASSIGNABLE_ROLES, PASSWORD_REGEX, PASSWORD_ERROR_MESSAGE } = require('../config/security');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg
    }));
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      details
    });
  }
  next();
};

const validateLogin = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  body('turnstileToken')
    .optional({ nullable: true })
    .notEmpty().withMessage('Turnstile token is required'),
];

const validateRegister = [
  body('userName')
    .notEmpty().withMessage('Username is required')
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .matches(PASSWORD_REGEX).withMessage(PASSWORD_ERROR_MESSAGE),
  body('fullName')
    .notEmpty().withMessage('Full name is required')
    .trim(),
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9]{10}$/).withMessage('Phone number must be exactly 10 digits'),
  body('role')
    .optional()
    .isIn(['teacher', 'student']).withMessage('Role must be teacher or student'),
  body('signupIntent')
    .optional()
    .isIn(['affiliated', 'independent']).withMessage('signupIntent must be affiliated or independent'),
  body('position')
    .custom((value, { req }) => {
      const role = req.body.role || 'teacher';
      if (role === 'student') return true;
      if (!value) throw new Error('Position is required for teachers');
      const allowed = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'HoD', 'Other'];
      if (!allowed.includes(value)) throw new Error('Invalid position');
      return true;
    }),
  body('collegeId')
    .custom((value, { req }) => {
      const role = req.body.role || 'teacher';
      const intent = req.body.signupIntent;
      if (role === 'student') return true;
      if (role === 'teacher' && intent === 'independent') return true;
      // Affiliated teacher — require college info
      if (!value && !req.body.collegeCode && !req.body.collegeName) {
        throw new Error('College is required for affiliated teachers');
      }
      return true;
    }),
];

// role is OPTIONAL — defaults to 'teacher' in the controller
const validateCreateUser = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .trim(),
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .matches(PASSWORD_REGEX).withMessage(PASSWORD_ERROR_MESSAGE),
  body('role')
    .optional()
    .isIn(ASSIGNABLE_ROLES)
    .withMessage(`Invalid role. Must be one of: ${ASSIGNABLE_ROLES.join(', ')}`),
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
];

const validateMongoId = (fieldName = 'id') => [
  param(fieldName)
    .notEmpty().withMessage(`${fieldName} is required`)
    .isMongoId().withMessage(`Invalid ${fieldName} format`),
];

const validatePaperId = validateMongoId('id');
const validatePaperIdParam = validateMongoId('paperId'); // for routes using :paperId
const validateUserId = validateMongoId('id');
const validateCollegeId = validateMongoId('id');

const validateSearch = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Search query too long'),
  query('status')
    .optional()
    .isIn(['all', 'pending', 'approved', 'rejected', 'needs_revision']).withMessage('Invalid status'),
];

const validateSearchOnly = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Search query too long'),
];

const validateRoleUpdate = [
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(ASSIGNABLE_ROLES)
    .withMessage(`Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`),
];

const validateCollege = [
  body('name')
    .notEmpty().withMessage('College name is required')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('College name must be 2-100 characters'),
  body('code')
    .notEmpty().withMessage('College code is required')
    .trim()
    .isLength({ min: 2, max: 20 }).withMessage('College code must be 2-20 characters')
    .matches(/^[A-Z0-9]+$/).withMessage('College code must be uppercase alphanumeric'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Address too long'),
  body('city')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('City name too long'),
  body('state')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('State name too long'),
];

// ---------------------------------------------------------------------------
// validateQuestionIndex
//   Reads questionIndex from body (POST) or path (GET/PUT/DELETE).
//   Emits a 400 directly — express-validator's validationResult() does not
//   read ad-hoc error arrays, so bypass handleValidationErrors.
//   Normalizes the accepted value back into req.params / req.body as a Number.
// ---------------------------------------------------------------------------
function validateQuestionIndex(req, res, next) {
  const raw =
    req.body && req.body.questionIndex !== undefined
      ? req.body.questionIndex
      : req.params.questionIndex;

  if (raw === undefined || raw === null || raw === '') {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      details: [{ field: 'questionIndex', message: 'questionIndex is required' }],
    });
  }

  const asNumber = Number(raw);
  if (!Number.isInteger(asNumber) || asNumber < 0 || asNumber > 1000) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      details: [
        { field: 'questionIndex', message: 'must be an integer between 0 and 1000' },
      ],
    });
  }

  if (req.body && req.body.questionIndex !== undefined) {
    req.body.questionIndex = asNumber;
  } else {
    req.params.questionIndex = asNumber;
  }

  return next();
}

// ---------------------------------------------------------------------------
// validateRejectionReason
//   Used on PUT /college-admin/pending-teachers/:id/reject
// ---------------------------------------------------------------------------
const validateRejectionReason = [
  body('reason')
    .notEmpty().withMessage('Rejection reason is required')
    .trim()
    .isLength({ min: 1, max: 500 }).withMessage('Reason must be 1-500 characters'),
];

module.exports = {
  handleValidationErrors,
  validateRejectionReason,
  validateLogin,
  validateRegister,
  validateCreateUser,
  validatePagination,
  validateMongoId,
  validatePaperId,
  validatePaperIdParam,
  validateUserId,
  validateCollegeId,
  validateSearch,
  validateSearchOnly,
  validateRoleUpdate,
  validateCollege,
  validateQuestionIndex,
};