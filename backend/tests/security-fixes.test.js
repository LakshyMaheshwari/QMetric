/**
 * Regression tests for the fixes from the 2026-09 code review.
 * Each block is tagged with the finding ID it covers (see CHANGES.md).
 */
const request = require('supertest');
const app = require('../index');
const Paper = require('../Model/PaperInfo');
const User = require('../Model/user');
const College = require('../Model/College');
const {
  createTestUser,
  createTestCollege,
  createTestPaper,
  createCollegeAdmin,
  createSuperAdmin,
  getCookieString,
} = require('./helpers');

describe('C1 — role scoping is default-deny', () => {
  let college, teacher, student, paper;

  beforeEach(async () => {
    college = await createTestCollege();
    teacher = await createTestUser({ role: 'teacher', collegeId: college._id });
    student = await createTestUser({ role: 'student', collegeId: null });
    paper = await createTestPaper({ userId: teacher._id, collegeId: college._id });
  });

  it('a student sees no papers on GET /teacher/papers (not everyone else\'s)', async () => {
    const res = await request(app)
      .get('/teacher/papers')
      .set('Cookie', getCookieString(student));

    expect(res.status).toBe(200);
    expect(res.body.papers).toEqual([]);
  });

  it('a student cannot fetch another user\'s paper by id', async () => {
    const res = await request(app)
      .get(`/teacher/papers/${paper._id}`)
      .set('Cookie', getCookieString(student));

    expect(res.status).toBe(404);
  });

  it('a teacher still sees their own papers (no regression)', async () => {
    const res = await request(app)
      .get('/teacher/papers')
      .set('Cookie', getCookieString(teacher));

    expect(res.status).toBe(200);
    expect(res.body.papers).toHaveLength(1);
  });
});

describe('H1 — POST /admin/users is scoped to the caller\'s college', () => {
  it('a college admin cannot plant a user in another college', async () => {
    const collegeA = await createTestCollege({ name: 'College A' });
    const collegeB = await createTestCollege({ name: 'College B' });
    // Make collegeA older so it would have been the old fallback
    await College.findByIdAndUpdate(collegeA._id, { createdAt: new Date('2020-01-01') });

    const adminB = await createCollegeAdmin(collegeB);

    const res = await request(app)
      .post('/admin/users')
      .set('Cookie', getCookieString(adminB))
      .send({
        name: 'Planted Admin',
        email: 'planted@test.com',
        password: 'Password123',
        role: 'admin',
        collegeId: String(collegeA._id), // attempted override — must be ignored
      });

    expect(res.status).toBe(201);
    const created = await User.findOne({ email: 'planted@test.com' });
    expect(String(created.collegeId)).toBe(String(collegeB._id));
  });
});

describe('H2/H3 — Bloom recommendations: authorization and data location', () => {
  it('an admin from another college gets 403, not the data', async () => {
    const collegeA = await createTestCollege();
    const collegeB = await createTestCollege();
    const teacher = await createTestUser({ role: 'teacher', collegeId: collegeA._id });
    const adminB = await createCollegeAdmin(collegeB);
    const paper = await createTestPaper({
      userId: teacher._id,
      collegeId: collegeA._id,
      collectedData: [{ BloomRecommendations: { recommendations: [], bloomLevelOverview: {} } }],
    });

    const res = await request(app)
      .get(`/reviewer/papers/${paper._id}/recommendations/bloom`)
      .set('Cookie', getCookieString(adminB));

    expect(res.status).toBe(403);
  });

  it('reads recommendations from Collected Data[0], where the pipeline actually writes them', async () => {
    const college = await createTestCollege();
    const teacher = await createTestUser({ role: 'teacher', collegeId: college._id });
    const reviewer = await createTestUser({ role: 'reviewer', collegeId: college._id });
    const paper = await createTestPaper({
      userId: teacher._id,
      collegeId: college._id,
      collectedData: [
        {
          BloomRecommendations: {
            recommendations: [{ expectedLevel: 1, actualLevel: 1 }],
            bloomLevelOverview: {},
          },
        },
      ],
    });

    const res = await request(app)
      .get(`/reviewer/papers/${paper._id}/recommendations/bloom`)
      .set('Cookie', getCookieString(reviewer));

    expect(res.status).toBe(200);
  });
});

describe('H6 — independent-teacher affiliation requests are approvable', () => {
  it('appears in the pending list and can be approved by that college\'s admin', async () => {
    const college = await createTestCollege();
    const admin = await createCollegeAdmin(college);
    const independentTeacher = await createTestUser({ role: 'teacher', collegeId: null });

    await User.findByIdAndUpdate(independentTeacher._id, {
      collegeApprovalStatus: 'pending',
      pendingAffiliationRequest: { collegeId: college._id, requestedAt: new Date() },
    });

    const list = await request(app)
      .get('/college-admin/pending-teachers')
      .set('Cookie', getCookieString(admin));
    expect(list.status).toBe(200);
    expect(list.body.teachers.map((t) => String(t._id))).toContain(String(independentTeacher._id));

    const approve = await request(app)
      .put(`/college-admin/pending-teachers/${independentTeacher._id}/approve`)
      .set('Cookie', getCookieString(admin));
    expect(approve.status).toBe(200);

    const updated = await User.findById(independentTeacher._id);
    expect(String(updated.collegeId)).toBe(String(college._id));
    expect(updated.collegeApprovalStatus).toBe('approved');
    expect(updated.pendingAffiliationRequest?.collegeId).toBeFalsy();
  });
});

describe('H9 — needs_revision papers can be resubmitted', () => {
  it('allows resubmission from needs_revision, not only draft', async () => {
    const college = await createTestCollege();
    const teacher = await createTestUser({ role: 'teacher', collegeId: college._id });
    const paper = await createTestPaper({
      userId: teacher._id,
      collegeId: college._id,
      reviewStatus: 'needs_revision',
    });

    const res = await request(app)
      .put(`/teacher/papers/${paper._id}/submit`)
      .set('Cookie', getCookieString(teacher));

    expect(res.status).toBe(200);
    const updated = await Paper.findById(paper._id);
    expect(updated.reviewStatus).toBe('pending');
  });
});

describe('H10 — reviewPaper has a state guard and a self-review guard', () => {
  it('rejects reviewing a paper that is not pending', async () => {
    const college = await createTestCollege();
    const teacher = await createTestUser({ role: 'teacher', collegeId: college._id });
    const reviewer = await createTestUser({ role: 'reviewer', collegeId: college._id });
    const paper = await createTestPaper({
      userId: teacher._id,
      collegeId: college._id,
      reviewStatus: 'draft',
    });

    const res = await request(app)
      .put(`/reviewer/papers/${paper._id}/review`)
      .set('Cookie', getCookieString(reviewer))
      .send({ action: 'approved' });

    expect(res.status).toBe(400);
  });

  it('rejects a reviewer reviewing their own paper', async () => {
    const college = await createTestCollege();
    const reviewer = await createTestUser({ role: 'reviewer', collegeId: college._id });
    const paper = await createTestPaper({
      userId: reviewer._id,
      collegeId: college._id,
      reviewStatus: 'pending',
    });

    const res = await request(app)
      .put(`/reviewer/papers/${paper._id}/review`)
      .set('Cookie', getCookieString(reviewer))
      .send({ action: 'approved' });

    expect(res.status).toBe(403);
  });
});

describe('H12 — authenticated password change', () => {
  it('changes the password and invalidates the old token', async () => {
    const college = await createTestCollege();
    const teacher = await createTestUser({
      role: 'teacher',
      collegeId: college._id,
      password: 'OldPassword123',
    });
    const oldCookie = getCookieString(teacher);

    const res = await request(app)
      .put('/auth/password')
      .set('Cookie', oldCookie)
      .send({ currentPassword: 'OldPassword123', newPassword: 'NewPassword456' });

    expect(res.status).toBe(200);

    // Old token is now revoked, even though it hasn't expired
    const reuse = await request(app)
      .get('/auth/profile')
      .set('Cookie', oldCookie);
    expect(reuse.status).toBe(401);
  });

  it('rejects the wrong current password', async () => {
    const college = await createTestCollege();
    const teacher = await createTestUser({
      role: 'teacher',
      collegeId: college._id,
      password: 'OldPassword123',
    });

    const res = await request(app)
      .put('/auth/password')
      .set('Cookie', getCookieString(teacher))
      .send({ currentPassword: 'WrongPassword', newPassword: 'NewPassword456' });

    expect(res.status).toBe(400);
  });
});

describe('Login timing / state-leak fix', () => {
  it('does not reveal isBlocked before the password is verified', async () => {
    const college = await createTestCollege();
    const teacher = await createTestUser({
      role: 'teacher',
      collegeId: college._id,
      password: 'CorrectPassword123',
    });
    await User.findByIdAndUpdate(teacher._id, { isBlocked: true });

    const wrongPass = await request(app)
      .post('/auth/login')
      .send({ email: teacher.email, password: 'WrongPassword', turnstileToken: 'test-token' });
    // Wrong password on a blocked account looks exactly like a bad login —
    // no separate "blocked" message leaks the account state.
    expect(wrongPass.status).toBe(401);

    const rightPass = await request(app)
      .post('/auth/login')
      .send({ email: teacher.email, password: 'CorrectPassword123', turnstileToken: 'test-token' });
    expect(rightPass.status).toBe(403);
    expect(rightPass.body.message).toMatch(/blocked/i);
  });
});

describe('Regex-injection fix in college lookup', () => {
  it('does not throw or match everything when collegeName contains regex metacharacters', async () => {
    await createTestCollege({ name: 'Normal College' });

    const res = await request(app)
      .post('/auth/create-account')
      .send({
        userName: 'regexuser',
        fullName: 'Regex User',
        email: 'regexuser@test.com',
        password: 'TestPassword123',
        phone: '9333333333',
        role: 'teacher',
        signupIntent: 'affiliated',
        collegeName: '.*', // would match every college name if unescaped
        position: 'Lecturer',
        employeeId: 'EMP-REGEX1',
        department: 'CS',
        stream: 'Engineering',
        turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX',
      });

    // Should fail cleanly with "college not recognized", not 500, and not
    // silently affiliate the user with "Normal College".
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not recognized/i);
  });
});

describe('H4/H5 — bulk register dryRun, rollbackOnError, and unknown colleges', () => {
  it('dryRun creates nothing', async () => {
    const college = await createTestCollege();
    const admin = await createSuperAdmin();

    const res = await request(app)
      .post('/auth/bulk-register')
      .set('x-admin-secret', process.env.ADMIN_SECRET_KEY)
      .send({
        dryRun: true,
        defaultPassword: 'TestPassword123',
        users: [
          {
            userName: 'bulkuser1',
            fullName: 'Bulk User 1',
            email: 'bulkuser1@test.com',
            phone: '9111111111',
            employeeId: 'EMP-B1',
            department: 'CS',
            stream: 'Engineering',
            position: 'Professor',
            collegeId: String(college._id),
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.dryRun).toBe(true);
    const created = await User.findOne({ email: 'bulkuser1@test.com' });
    expect(created).toBeNull();
  });

  it('an unrecognized college is a per-row error, not a silent fallback', async () => {
    await createTestCollege(); // some other active college exists

    const res = await request(app)
      .post('/auth/bulk-register')
      .set('x-admin-secret', process.env.ADMIN_SECRET_KEY)
      .send({
        defaultPassword: 'TestPassword123',
        users: [
          {
            userName: 'bulkuser2',
            fullName: 'Bulk User 2',
            email: 'bulkuser2@test.com',
            phone: '9222222222',
            employeeId: 'EMP-B2',
            department: 'CS',
            stream: 'Engineering',
            position: 'Professor',
            collegeName: 'Totally Unknown College',
          },
        ],
      });

    expect(res.status).toBe(207);
    expect(res.body.summary.totalCreated).toBe(0);
    expect(res.body.failed[0].reason).toMatch(/not recognized/i);
    const created = await User.findOne({ email: 'bulkuser2@test.com' });
    expect(created).toBeNull();
  });
});