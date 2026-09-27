const User = require('../Model/user');
const College = require('../Model/College');
const Paper = require('../Model/PaperInfo');
const OCRLog = require('../Model/OCRLog');
const VerifiedQuestion = require('../Model/VerifiedQuestion');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/**
 * Random, unique phone numbers.
 *
 * Seed the base offset with the Jest worker ID + a random component so
 * parallel workers never generate the same phone (would violate the
 * unique sparse index on User.phone).
 */
const WORKER_OFFSET = (Number.parseInt(process.env.JEST_WORKER_ID || '1', 10) % 100) * 1_000_000;
let phoneCounter = 9_000_000_000 + WORKER_OFFSET + Math.floor(Math.random() * 100_000);

function nextPhone() {
  phoneCounter += 1;
  return String(phoneCounter).slice(-10);
}

/**
 * Short unique suffix for emails / usernames / employee IDs.
 */
function uniqueSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 10000)}`.slice(-12);
}

/**
 * Create a test user.
 */
async function createTestUser({
  role = 'teacher',
  email = null,
  password = 'TestPassword123',
  collegeId,
  collegeApprovalStatus,
  userName = 'testuser',
  phone = null,
} = {}) {
  const suffix = uniqueSuffix();
  const uniqueEmail = email || `${role}-${suffix}@test.com`;
  const hashedPassword = await bcrypt.hash(password, 10);

  const base = {
    userName: `${userName}_${suffix}`.slice(0, 50),
    email: uniqueEmail.toLowerCase(),
    password: hashedPassword,
    role,
    phone: phone || nextPhone(),
  };

  if (role === 'super_admin') {
    return User.create({
      ...base,
      fullName: 'Super Admin',
    });
  }

  // Allow explicit `collegeId: null` for independent teachers/students,
  // but still require a value when the caller omits the field entirely.
  if (collegeId === undefined && role !== 'super_admin') {
    throw new Error('collegeId is required for non-super_admin test users');
  }

  return User.create({
    ...base,
    fullName: `${role} Test User`,
    collegeId,
    collegeName: 'Test College',
    department: 'Computer Science',
    stream: 'Engineering',
    employeeId: `EMP-${suffix}`,
    position: 'Professor',
    ...(collegeApprovalStatus !== undefined ? { collegeApprovalStatus } : {}),
  });
}

/**
 * Create a test college.
 *
 * Always appends a unique suffix to both `name` and `code` so tests
 * can call this repeatedly — or in parallel — without violating the
 * `unique: true` constraints on those fields.
 */
async function createTestCollege({ name = 'Test College', code = null } = {}) {
  const suffix = uniqueSuffix().slice(-6);
  return College.create({
    name: `${name} ${suffix}`,
    code: code ? `${code}${suffix.slice(-3)}` : `TST${suffix}`,
    isActive: true,
  });
}

/**
 * Create a test paper with the required schema fields.
 */
async function createTestPaper({
  userId,
  collegeId,
  courseName = 'CS101',
  reviewStatus = 'pending',
  collectedData = null,
} = {}) {
  const defaultCollectedData = [
    {
      question: 'Define polymorphism with an example.',
      domain: 'cognitive',
      bloomLevel: 1,
      score: 0.8,
    },
    {
      question: 'Design a distributed cache system.',
      domain: 'cognitive',
      bloomLevel: 6,
      score: 0.9,
    },
  ];

  return Paper.create({
    'College Name': 'Test College',
    Branch: 'CSE',
    'Year Of Study': '2024',
    Semester: '1',
    'Course Name': courseName,
    'Course Code': 'CS101',
    'Course Teacher': 'Test Teacher',
    userId,
    collegeId,
    'Collected Data': collectedData !== null ? collectedData : defaultCollectedData,
    reviewStatus,
  });
}

/**
 * Sign a JWT for the given user.
 */
function generateToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  );
}

/**
 * Produce a `Cookie` header string for supertest.
 * (CSRF is disabled in NODE_ENV=test, so no csrf cookie is needed.)
 */
function getCookieString(user) {
  return `accessToken=${generateToken(user)}`;
}

async function createSuperAdmin() {
  return createTestUser({ role: 'super_admin', collegeId: null });
}

async function createCollegeAdmin(college) {
  return createTestUser({
    role: 'admin',
    collegeId: college._id,
  });
}

/**
 * Create a test verified question correction.
 */
async function createTestVerifiedQuestion({
  paperId,
  questionIndex = 0,
  originalDomain = 'cognitive',
  originalLevel = 1,
  originalScore = 0.8,
  correctedDomain = 'cognitive',
  correctedLevel = 3,
  correctedLevelName = 'Apply',
  correctedBy,
  reason = 'Test correction',
} = {}) {
  return VerifiedQuestion.create({
    paperId,
    questionIndex,
    originalDomain,
    originalLevel,
    originalScore,
    correctedDomain,
    correctedLevel,
    correctedLevelName,
    correctedBy,
    reason,
  });
}

/**
 * Create a test OCR verification log.
 */
async function createTestOcrLog({
  userId,
  status = 'unverified',
  userInput = {},
  extractedData = {},
  matchedFields = ['fullName', 'employeeId'],
  confidence = 80,
  ocrRawText = 'Raw OCR Extracted Text',
  imageUrl = 'https://res.cloudinary.com/test/id.jpg',
  reason = '',
} = {}) {
  return OCRLog.create({
    userId,
    status,
    userInput: {
      fullName: 'Test Teacher',
      employeeId: 'EMP-1234',
      collegeName: 'Test College',
      department: 'Computer Science',
      ...userInput,
    },
    extractedData: {
      fullName: 'Test Teacher',
      employeeId: 'EMP-1234',
      collegeName: 'Test College',
      department: 'Computer Science',
      ...extractedData,
    },
    matchedFields,
    confidence,
    ocrRawText,
    imageUrl,
    reason,
  });
}

module.exports = {
  createTestUser,
  createTestCollege,
  createTestPaper,
  createSuperAdmin,
  createCollegeAdmin,
  createTestVerifiedQuestion,
  createTestOcrLog,
  generateToken,
  getCookieString,
};