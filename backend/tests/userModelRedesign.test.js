'use strict';

const request = require('supertest');
const app = require('../index');
const User = require('../Model/user');
const College = require('../Model/College');
const Paper = require('../Model/PaperInfo');
const Notification = require('../Model/Notification');

const {
  createTestUser,
  createTestCollege,
  getCookieString,
} = require('./helpers');

const PASSWORD = 'TestPassword123';
const TURNSTILE = 'XXXX.DUMMY.TOKEN.XXXX';

async function createPaper({ userId, collegeId, reviewStatus = 'draft', courseName = 'Test Course' }) {
  return Paper.create({
    'College Name': 'Test College',
    'Branch': 'Computer Science',
    'Year Of Study': '3rd Year',
    'Semester': '5',
    'Course Name': courseName,
    'Course Code': 'CS101',
    'Course Teacher': 'Test Teacher',
    userId,
    collegeId,
    reviewStatus,
    'Collected Data': [],
    bloomLevelMap: { remember: 1, understand: 2, apply: 3, analyze: 4, evaluate: 5, create: 6 },
  });
}

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    College.deleteMany({}),
    Notification.deleteMany({}),
    Paper.deleteMany({}),
  ]);
});

// ============================================================================
// SIGNUP FLOWS
// ============================================================================
describe('Signup — student', () => {
  test('creates an active student, sets cookie', async () => {
    const res = await request(app)
      .post('/auth/create-account')
      .send({
        email: 'student@test.com',
        password: PASSWORD,
        fullName: 'Test Student',
        userName: 'student1',
        phone: '9000000001',
        role: 'student',
        turnstileToken: TURNSTILE,
      });

    expect(res.status).toBe(201);
    expect(res.body.accountState).toBe('active');
    expect(res.body.canUseFeatures).toBe(true);
    expect(res.body.user.role).toBe('student');

    const u = await User.findOne({ email: 'student@test.com' });
    expect(u.role).toBe('student');
    expect(u.collegeId).toBeNull();
    expect(u.collegeApprovalStatus).toBe('approved');
  });
});

describe('Signup — independent teacher', () => {
  test('creates an active independent teacher, sets cookie', async () => {
    const res = await request(app)
      .post('/auth/create-account')
      .send({
        email: 'indep@test.com',
        password: PASSWORD,
        fullName: 'Indep Teacher',
        userName: 'indep1',
        phone: '9000000003',
        role: 'teacher',
        signupIntent: 'independent',
        position: 'Lecturer',
        turnstileToken: TURNSTILE,
      });

    expect(res.status).toBe(201);
    expect(res.body.accountState).toBe('active');
    expect(res.body.canUseFeatures).toBe(true);

    const u = await User.findOne({ email: 'indep@test.com' });
    expect(u.collegeId).toBeNull();
    expect(u.collegeApprovalStatus).toBe('approved');
  });
});

describe('Signup — affiliated teacher', () => {
  test('creates a pending teacher, does NOT set cookie, notifies admins', async () => {
    const college = await createTestCollege('College A');
    const admin = await createTestUser({
      role: 'admin',
      email: 'admin@a.test',
      collegeId: college._id,
    });

    const res = await request(app)
      .post('/auth/create-account')
      .send({
        email: 'aff@test.com',
        password: PASSWORD,
        fullName: 'Affiliated Teacher',
        userName: 'aff1',
        phone: '9000000004',
        role: 'teacher',
        signupIntent: 'affiliated',
        collegeId: String(college._id),
        position: 'Lecturer',
        employeeId: 'EMP-A1',
        department: 'CSE',
        stream: 'Engineering',
        turnstileToken: TURNSTILE,
      });

    expect(res.status).toBe(201);
    expect(res.body.requiresApproval).toBe(true);
    expect(res.body.accountState).toBe('pending_approval');

    const u = await User.findOne({ email: 'aff@test.com' });
    expect(u.collegeId).toEqual(college._id);
    expect(u.collegeApprovalStatus).toBe('pending');

    const notif = await Notification.findOne({
      userId: admin._id,
      type: 'pending_teacher_approval',
    });
    expect(notif).toBeTruthy();
  });
});

// ============================================================================
// LOGIN WITH PENDING STATE
// ============================================================================
describe('Login — pending_approval state', () => {
  test('pending teacher can log in but receives pending_approval + no features', async () => {
    const college = await createTestCollege('College B');
    await createTestUser({
      role: 'teacher',
      email: 'pending@test.com',
      password: PASSWORD,
      collegeId: college._id,
      collegeApprovalStatus: 'pending',
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'pending@test.com', password: PASSWORD, turnstileToken: TURNSTILE });

    expect(res.status).toBe(200);
    expect(res.body.accountState).toBe('pending_approval');
    expect(res.body.canUseFeatures).toBe(false);
    expect(res.body.user.collegeApprovalStatus).toBe('pending');
  });

  test('approved teacher logs in with active state', async () => {
    const college = await createTestCollege('College C');
    await createTestUser({
      role: 'teacher',
      email: 'approved@test.com',
      password: PASSWORD,
      collegeId: college._id,
      collegeApprovalStatus: 'approved',
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'approved@test.com', password: PASSWORD, turnstileToken: TURNSTILE });

    expect(res.status).toBe(200);
    expect(res.body.accountState).toBe('active');
    expect(res.body.canUseFeatures).toBe(true);
  });
});

// ============================================================================
// FEATURE GATES
// ============================================================================
describe('Feature gate — submit_for_review', () => {
  test('pending teacher gets 403 pending_approval', async () => {
    const college = await createTestCollege('College D');
    const teacher = await createTestUser({
      role: 'teacher',
      collegeId: college._id,
      collegeApprovalStatus: 'pending',
    });
    const paper = await createPaper({ userId: teacher._id, collegeId: college._id });

    const res = await request(app)
      .put(`/teacher/papers/${paper._id}/submit`)
      .set('Cookie', getCookieString(teacher))
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('pending_approval');
  });

  test('independent teacher gets 403 no_affiliation', async () => {
    const teacher = await createTestUser({
      role: 'teacher',
      collegeId: null,           // ← now allowed by patched helper
      collegeApprovalStatus: 'approved',
    });
    const paper = await createPaper({ userId: teacher._id, collegeId: null });

    const res = await request(app)
      .put(`/teacher/papers/${paper._id}/submit`)
      .set('Cookie', getCookieString(teacher))
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('no_affiliation');
  });

  test('affiliated approved teacher can submit', async () => {
    const college = await createTestCollege('College E');
    const teacher = await createTestUser({
      role: 'teacher',
      collegeId: college._id,
      collegeApprovalStatus: 'approved',
    });
    const paper = await createPaper({ userId: teacher._id, collegeId: college._id });

    const res = await request(app)
      .put(`/teacher/papers/${paper._id}/submit`)
      .set('Cookie', getCookieString(teacher))
      .send({});

    expect(res.status).toBe(200);
    const updated = await Paper.findById(paper._id);
    expect(updated.reviewStatus).toBe('pending');
  });
});

describe('Feature gate — reviewer endpoints', () => {
  test('student is rejected with 403', async () => {
    const student = await createTestUser({
      role: 'student',
      collegeId: null,           // ← now allowed
    });

    const res = await request(app)
      .get('/reviewer/papers')
      .set('Cookie', getCookieString(student));

    expect(res.status).toBe(403);
  });
});

// ============================================================================
// ADMIN APPROVAL QUEUE
// ============================================================================
describe('GET /college-admin/pending-teachers', () => {
  test('lists only pending teachers in admin college', async () => {
    const collegeA = await createTestCollege('College F');
    const collegeB = await createTestCollege('College G');
    const admin = await createTestUser({ role: 'admin', collegeId: collegeA._id });

    await createTestUser({ role: 'teacher', collegeId: collegeA._id, collegeApprovalStatus: 'pending' });
    await createTestUser({ role: 'teacher', collegeId: collegeA._id, collegeApprovalStatus: 'pending' });
    await createTestUser({ role: 'teacher', collegeId: collegeB._id, collegeApprovalStatus: 'pending' });

    const res = await request(app)
      .get('/college-admin/pending-teachers')
      .set('Cookie', getCookieString(admin));

    expect(res.status).toBe(200);
    expect(res.body.teachers).toHaveLength(2);
    expect(res.body.counts.pending).toBe(2);
  });
});

describe('PUT /college-admin/pending-teachers/:id/approve', () => {
  test('approves teacher, sets status', async () => {
    const college = await createTestCollege('College H');
    const admin = await createTestUser({ role: 'admin', collegeId: college._id });
    const teacher = await createTestUser({
      role: 'teacher',
      collegeId: college._id,
      collegeApprovalStatus: 'pending',
    });

    const res = await request(app)
      .put(`/college-admin/pending-teachers/${teacher._id}/approve`)
      .set('Cookie', getCookieString(admin));

    expect(res.status).toBe(200);
    expect(res.body.teacher.collegeApprovalStatus).toBe('approved');

    const updated = await User.findById(teacher._id);
    expect(updated.collegeApprovalStatus).toBe('approved');
  });
});

describe('PUT /college-admin/pending-teachers/:id/reject', () => {
  test('requires reason', async () => {
    const college = await createTestCollege('College I');
    const admin = await createTestUser({ role: 'admin', collegeId: college._id });
    const teacher = await createTestUser({
      role: 'teacher',
      collegeId: college._id,
      collegeApprovalStatus: 'pending',
    });

    const res = await request(app)
      .put(`/college-admin/pending-teachers/${teacher._id}/reject`)
      .set('Cookie', getCookieString(admin))
      .send({});

    expect(res.status).toBe(400);
  });

  test('demotes to independent teacher, keeps papers', async () => {
    const college = await createTestCollege('College J');
    const admin = await createTestUser({ role: 'admin', collegeId: college._id });
    const teacher = await createTestUser({
      role: 'teacher',
      collegeId: college._id,
      collegeApprovalStatus: 'pending',
    });
    const paper = await createPaper({ userId: teacher._id, collegeId: college._id });

    const res = await request(app)
      .put(`/college-admin/pending-teachers/${teacher._id}/reject`)
      .set('Cookie', getCookieString(admin))
      .send({ reason: 'Documents incomplete' });

    expect(res.status).toBe(200);

    const updated = await User.findById(teacher._id);
    expect(updated.collegeId).toBeNull();
    expect(updated.collegeApprovalStatus).toBe('approved');

    const stillThere = await Paper.findById(paper._id);
    expect(stillThere).toBeTruthy();
  });
});

// ============================================================================
// PROFILE UPGRADES
// ============================================================================
describe('POST /auth/profile/request-affiliation', () => {
  test('independent teacher → pending, DB reflects correctly', async () => {
    const college = await createTestCollege('College K');
    const teacher = await createTestUser({
      role: 'teacher',
      collegeId: null,
      collegeApprovalStatus: 'approved',
    });

    const res = await request(app)
      .post('/auth/profile/request-affiliation')
      .set('Cookie', getCookieString(teacher))
      .field('collegeId', String(college._id));

    expect(res.status).toBe(200);
    expect(res.body.requiresApproval).toBe(true);

    const updated = await User.findById(teacher._id);
    expect(updated.collegeId).toBeNull();
    expect(updated.collegeApprovalStatus).toBe('pending');
    expect(updated.pendingAffiliationRequest.collegeId).toEqual(college._id);
  });

  test('rejects if already pending', async () => {
    const college = await createTestCollege('College L');
    const teacher = await createTestUser({
      role: 'teacher',
      collegeId: null,
      collegeApprovalStatus: 'pending',
    });

    const res = await request(app)
      .post('/auth/profile/request-affiliation')
      .set('Cookie', getCookieString(teacher))
      .field('collegeId', String(college._id));

    expect(res.status).toBe(400);
  });
});

describe('POST /auth/profile/upgrade-to-teacher', () => {
  test('student → independent teacher (instant)', async () => {
    const student = await createTestUser({
      role: 'student',
      collegeId: null,
    });

    const res = await request(app)
      .post('/auth/profile/upgrade-to-teacher')
      .set('Cookie', getCookieString(student))
      .field('signupIntent', 'independent');

    expect(res.status).toBe(200);
    expect(res.body.canUseFeatures).toBe(true);

    const updated = await User.findById(student._id);
    expect(updated.role).toBe('teacher');
    expect(updated.collegeId).toBeNull();
    expect(updated.collegeApprovalStatus).toBe('approved');
  });

  test('student → affiliated teacher (pending approval)', async () => {
    const college = await createTestCollege('College M');
    const student = await createTestUser({
      role: 'student',
      collegeId: null,
    });

    const res = await request(app)
      .post('/auth/profile/upgrade-to-teacher')
      .set('Cookie', getCookieString(student))
      .field('signupIntent', 'affiliated')
      .field('collegeId', String(college._id));

    expect(res.status).toBe(200);
    expect(res.body.requiresApproval).toBe(true);

    const updated = await User.findById(student._id);
    expect(updated.role).toBe('teacher');
    expect(updated.collegeId).toEqual(college._id);
    expect(updated.collegeApprovalStatus).toBe('pending');
  });

  test('non-student cannot upgrade', async () => {
    const teacher = await createTestUser({
      role: 'teacher',
      collegeId: null,
    });

    const res = await request(app)
      .post('/auth/profile/upgrade-to-teacher')
      .set('Cookie', getCookieString(teacher))
      .field('signupIntent', 'independent');

    expect(res.status).toBe(400);
  });
});