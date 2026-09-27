const request = require('supertest');
const app = require('../index');
const User = require('../Model/user');
const {
  createTestUser,
  createTestCollege,
  createSuperAdmin,
  getCookieString,
} = require('./helpers');

describe('Admin Endpoints', () => {
  let college, superAdmin, cookie;

  beforeEach(async () => {
    college = await createTestCollege();
    superAdmin = await createSuperAdmin();
    cookie = getCookieString(superAdmin);
  });

  describe('GET /admin/users', () => {
    it('should list users with pagination', async () => {
      for (let i = 0; i < 15; i++) {
        await createTestUser({
          role: 'teacher',
          email: `teacher${i}@test.com`,
          collegeId: college._id,
        });
      }

      const res = await request(app)
        .get('/admin/users?page=1&limit=10')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBe(10);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(15);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
      expect(res.body.pagination.pages).toBeGreaterThanOrEqual(2);
    });

    it('should reject invalid pagination', async () => {
      const res = await request(app)
        .get('/admin/users?page=-1&limit=9999')
        .set('Cookie', cookie);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/admin/users');
      expect(res.status).toBe(401);
    });

    it('should reject teacher role', async () => {
      const teacher = await createTestUser({ role: 'teacher', collegeId: college._id });
      const teacherCookie = getCookieString(teacher);

      const res = await request(app)
        .get('/admin/users')
        .set('Cookie', teacherCookie);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe(true);
      expect(res.body.message).toMatch(/restricted/i);
    });
  });

  describe('POST /admin/users', () => {
    it('should create a new user', async () => {
      const res = await request(app)
        .post('/admin/users')
        .set('Cookie', cookie)
        .send({
          name: 'New Teacher',
          email: 'newteacher@test.com',
          password: 'Password123',
          role: 'teacher',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      await createTestUser({
        role: 'teacher',
        email: 'duplicate@test.com',
        collegeId: college._id,
      });

      const res = await request(app)
        .post('/admin/users')
        .set('Cookie', cookie)
        .send({
          name: 'Another',
          email: 'duplicate@test.com',
          password: 'Password123',
          role: 'teacher',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already/i);
    });

    it('should reject invalid role', async () => {
      const res = await request(app)
        .post('/admin/users')
        .set('Cookie', cookie)
        .send({
          name: 'Bad Role',
          email: 'badrole@test.com',
          password: 'Password123',
          role: 'hacker',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/admin/users')
        .set('Cookie', cookie)
        .send({
          name: 'Weak Pass',
          email: 'weak@test.com',
          password: '123',
          role: 'teacher',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /admin/users/:id/role', () => {
    it('should update a user role', async () => {
      const user = await createTestUser({
        role: 'teacher',
        email: 'promote@test.com',
        collegeId: college._id,
      });

      const res = await request(app)
        .put(`/admin/users/${user._id}/role`)
        .set('Cookie', cookie)
        .send({ role: 'reviewer' });

      expect(res.status).toBe(200);

      const updated = await User.findById(user._id);
      expect(updated.role).toBe('reviewer');
    });

    it('should reject invalid role', async () => {
      const user = await createTestUser({ role: 'teacher', collegeId: college._id });

      const res = await request(app)
        .put(`/admin/users/${user._id}/role`)
        .set('Cookie', cookie)
        .send({ role: 'super_hacker' });

      expect(res.status).toBe(400);
    });

    it('should reject invalid Mongo ID', async () => {
      const res = await request(app)
        .put('/admin/users/not-a-real-id/role')
        .set('Cookie', cookie)
        .send({ role: 'reviewer' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /admin/users/:id/block', () => {
    it('should toggle block status', async () => {
      const user = await createTestUser({
        role: 'teacher',
        email: 'blockme@test.com',
        collegeId: college._id,
      });

      const res1 = await request(app)
        .put(`/admin/users/${user._id}/block`)
        .set('Cookie', cookie);

      expect(res1.status).toBe(200);
      let updated = await User.findById(user._id);
      expect(updated.isBlocked).toBe(true);

      const res2 = await request(app)
        .put(`/admin/users/${user._id}/block`)
        .set('Cookie', cookie);

      expect(res2.status).toBe(200);
      updated = await User.findById(user._id);
      expect(updated.isBlocked).toBe(false);
    });
  });
});
