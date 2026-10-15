const request = require('supertest');
const app = require('../index');
const User = require('../Model/user');
const {
  createTestUser,
  createTestCollege,
  createSuperAdmin,
  getCookieString,
} = require('./helpers');

describe('College Admin Endpoints', () => {
  let college, otherCollege;
  let admin, adminCookie;
  let otherAdmin, otherAdminCookie;
  let teacher, teacherCookie;
  let superAdmin, superAdminCookie;

  beforeEach(async () => {
    college = await createTestCollege();
    otherCollege = await createTestCollege({ name: 'Other College', code: 'OTH001' });

    admin = await createTestUser({ role: 'admin', collegeId: college._id });
    adminCookie = getCookieString(admin);

    otherAdmin = await createTestUser({ role: 'admin', collegeId: otherCollege._id });
    otherAdminCookie = getCookieString(otherAdmin);

    teacher = await createTestUser({ role: 'teacher', collegeId: college._id });
    teacherCookie = getCookieString(teacher);

    superAdmin = await createSuperAdmin();
    superAdminCookie = getCookieString(superAdmin);
  });

  // ═══════════════════════════════════════════════════════════════
  // Role gate
  // ═══════════════════════════════════════════════════════════════
  describe('Role gate', () => {
    it('should reject a teacher with 403', async () => {
      const res = await request(app)
        .get('/college-admin/users')
        .set('Cookie', teacherCookie);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe(true);
      expect(res.body.message).toMatch(/restricted/i);
    });

    it('should reject an unauthenticated request with 401', async () => {
      const res = await request(app).get('/college-admin/users');
      expect(res.status).toBe(401);
    });

    it('should allow an admin', async () => {
      const res = await request(app)
        .get('/college-admin/users')
        .set('Cookie', adminCookie);
      expect(res.status).toBe(200);
    });

    it('should allow a super_admin', async () => {
      const res = await request(app)
        .get('/college-admin/users')
        .set('Cookie', superAdminCookie);
      // super_admin without a college may get a different status (200 or 400)
      // depending on how many active colleges exist; we just assert not-403.
      expect(res.status).not.toBe(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /college-admin/users
  // ═══════════════════════════════════════════════════════════════
  describe('GET /college-admin/users', () => {
    it('should only return users from the admin\'s college', async () => {
      await createTestUser({ role: 'teacher', collegeId: college._id });
      await createTestUser({ role: 'teacher', collegeId: otherCollege._id });

      const res = await request(app)
        .get('/college-admin/users')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.users.every(
        (u) => String(u.collegeId) === String(college._id)
      )).toBe(true);
    });

    it('should not leak other-college users into stats', async () => {
      await createTestUser({ role: 'teacher', collegeId: college._id });
      await createTestUser({ role: 'teacher', collegeId: college._id });
      await createTestUser({ role: 'teacher', collegeId: otherCollege._id });

      const res = await request(app)
        .get('/college-admin/users')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      // two teachers in this college + the admin and initial teacher from beforeEach
      expect(res.body.stats.teachers).toBe(3);
    });

    it('should filter by role query param', async () => {
      await createTestUser({ role: 'reviewer', collegeId: college._id });

      const res = await request(app)
        .get('/college-admin/users?role=reviewer')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.users.every((u) => u.role === 'reviewer')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /college-admin/users — privilege escalation guard
  // ═══════════════════════════════════════════════════════════════
  describe('POST /college-admin/users — privilege escalation guard', () => {
    it('should reject role=super_admin', async () => {
      const email = `evil-${Date.now()}@test.com`;

      const res = await request(app)
        .post('/college-admin/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Evil',
          email,
          password: 'Test1234',
          role: 'super_admin',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.details?.some((d) => d.field === 'role')).toBe(true);

      // Confirm no user was created
      const evil = await User.findOne({ email });
      expect(evil).toBeNull();
    });

    it('should reject role=hacker', async () => {
      const res = await request(app)
        .post('/college-admin/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Hacker',
          email: `hacker-${Date.now()}@test.com`,
          password: 'Test1234',
          role: 'hacker',
        });
      expect(res.status).toBe(400);
    });

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/college-admin/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Weak',
          email: `weak-${Date.now()}@test.com`,
          password: 'abc',
          role: 'teacher',
        });
      expect(res.status).toBe(400);
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/college-admin/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'BadEmail',
          email: 'not-an-email',
          password: 'Test1234',
          role: 'teacher',
        });
      expect(res.status).toBe(400);
    });

    it('should create a teacher when input is valid', async () => {
      const email = `newteacher-${Date.now()}@test.com`;
      const res = await request(app)
        .post('/college-admin/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'New Teacher',
          email,
          password: 'Test1234',
          role: 'teacher',
        });

      expect(res.status).toBe(201);

      const created = await User.findOne({ email });
      expect(created).toBeTruthy();
      expect(created.role).toBe('teacher');
      expect(String(created.collegeId)).toBe(String(college._id));
    });

    it('should create a reviewer with role=reviewer', async () => {
      const email = `newreviewer-${Date.now()}@test.com`;
      const res = await request(app)
        .post('/college-admin/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'New Reviewer',
          email,
          password: 'Test1234',
          role: 'reviewer',
        });

      expect(res.status).toBe(201);
      const created = await User.findOne({ email });
      expect(created.role).toBe('reviewer');
    });

    it('should reject duplicate email', async () => {
      const existing = await createTestUser({ role: 'teacher', collegeId: college._id });

      const res = await request(app)
        .post('/college-admin/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Dup',
          email: existing.email,
          password: 'Test1234',
          role: 'teacher',
        });
      expect(res.status).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PUT /college-admin/users/:id/role
  // ═══════════════════════════════════════════════════════════════
  describe('PUT /college-admin/users/:id/role', () => {
    it('should reject promoting a user to super_admin', async () => {
      const res = await request(app)
        .put(`/college-admin/users/${teacher._id}/role`)
        .set('Cookie', adminCookie)
        .send({ role: 'super_admin' });

      expect(res.status).toBe(400);

      const unchanged = await User.findById(teacher._id);
      expect(unchanged.role).toBe('teacher');
    });

    it('should promote a teacher to reviewer', async () => {
      const res = await request(app)
        .put(`/college-admin/users/${teacher._id}/role`)
        .set('Cookie', adminCookie)
        .send({ role: 'reviewer' });

      expect(res.status).toBe(200);

      const updated = await User.findById(teacher._id);
      expect(updated.role).toBe('reviewer');
    });

    it('should reject changing own role', async () => {
      const res = await request(app)
        .put(`/college-admin/users/${admin._id}/role`)
        .set('Cookie', adminCookie)
        .send({ role: 'teacher' });
      expect(res.status).toBe(400);
    });

    it('should not let an admin touch a user from another college (404)', async () => {
      const foreignTeacher = await createTestUser({ role: 'teacher', collegeId: otherCollege._id });

      const res = await request(app)
        .put(`/college-admin/users/${foreignTeacher._id}/role`)
        .set('Cookie', adminCookie)
        .send({ role: 'reviewer' });

      expect(res.status).toBe(404);

      const unchanged = await User.findById(foreignTeacher._id);
      expect(unchanged.role).toBe('teacher');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PUT /college-admin/users/:id/block
  // ═══════════════════════════════════════════════════════════════
  describe('PUT /college-admin/users/:id/block', () => {
    it('should block and unblock a user in the same college', async () => {
      const res1 = await request(app)
        .put(`/college-admin/users/${teacher._id}/block`)
        .set('Cookie', adminCookie);
      expect(res1.status).toBe(200);

      let updated = await User.findById(teacher._id);
      expect(updated.isBlocked).toBe(true);

      const res2 = await request(app)
        .put(`/college-admin/users/${teacher._id}/block`)
        .set('Cookie', adminCookie);
      expect(res2.status).toBe(200);

      updated = await User.findById(teacher._id);
      expect(updated.isBlocked).toBe(false);
    });

    it('should reject blocking yourself', async () => {
      const res = await request(app)
        .put(`/college-admin/users/${admin._id}/block`)
        .set('Cookie', adminCookie);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/yourself/i);
    });

    it('should not let an admin block a user from another college (404)', async () => {
      const foreignTeacher = await createTestUser({ role: 'teacher', collegeId: otherCollege._id });

      const res = await request(app)
        .put(`/college-admin/users/${foreignTeacher._id}/block`)
        .set('Cookie', adminCookie);
      expect(res.status).toBe(404);

      const unchanged = await User.findById(foreignTeacher._id);
      expect(unchanged.isBlocked).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /college-admin/stats
  // ═══════════════════════════════════════════════════════════════
  describe('GET /college-admin/stats', () => {
    it('should return college-scoped stats', async () => {
      await createTestUser({ role: 'teacher', collegeId: college._id });
      await createTestUser({ role: 'teacher', collegeId: college._id });
      await createTestUser({ role: 'reviewer', collegeId: college._id });
      await createTestUser({ role: 'teacher', collegeId: otherCollege._id });

      const res = await request(app)
        .get('/college-admin/stats')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      // beforeEach already created 1 teacher + 1 admin; we added 2 teachers + 1 reviewer
      expect(res.body.stats.users.teachers).toBe(3);
      expect(res.body.stats.users.reviewers).toBe(1);
      expect(res.body.stats.users.admins).toBe(1);
    });

    it('should not count users from other colleges', async () => {
      await createTestUser({ role: 'teacher', collegeId: otherCollege._id });
      await createTestUser({ role: 'teacher', collegeId: otherCollege._id });

      const res = await request(app)
        .get('/college-admin/stats')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      // beforeEach created 1 teacher in our college
      expect(res.body.stats.users.teachers).toBe(1);
    });
  });
});