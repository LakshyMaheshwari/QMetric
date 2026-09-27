const request = require('supertest');
const app = require('../index');
const College = require('../Model/College');
const {
  createSuperAdmin,
  createTestCollege,
  createTestUser,
  getCookieString,
} = require('./helpers');

describe('Super Admin Endpoints', () => {
  let superAdmin, cookie;

  beforeEach(async () => {
    superAdmin = await createSuperAdmin();
    cookie = getCookieString(superAdmin);
  });

  describe('GET /super-admin/stats', () => {
    it('should return global stats', async () => {
      await createTestCollege();
      await createTestCollege();

      const res = await request(app)
        .get('/super-admin/stats')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.stats.totalColleges).toBeGreaterThanOrEqual(2);
    });

    it('should reject non-super-admin', async () => {
      const college = await createTestCollege();
      const teacher = await createTestUser({ role: 'teacher', collegeId: college._id });
      const teacherCookie = getCookieString(teacher);

      const res = await request(app)
        .get('/super-admin/stats')
        .set('Cookie', teacherCookie);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /super-admin/colleges', () => {
    it('should create a college', async () => {
      const res = await request(app)
        .post('/super-admin/colleges')
        .set('Cookie', cookie)
        .send({
          name: 'New College',
          code: 'NC2025',
        });

      expect(res.status).toBe(201);
      expect(res.body.college).toBeDefined();
    });

    it('should reject duplicate college code', async () => {
      // Create the first college directly so we control the exact code.
      // The createTestCollege() helper always appends a unique suffix —
      // using it here would produce two different codes and the test
      // would pass trivially without ever testing duplication.
      await College.create({
        name: 'First College',
        code: 'DUP001',
        isActive: true,
      });

      const res = await request(app)
        .post('/super-admin/colleges')
        .set('Cookie', cookie)
        .send({ name: 'Duplicate College', code: 'DUP001' });

      expect([400, 409]).toContain(res.status);
    });

    it('should reject duplicate college name (case-insensitive)', async () => {
      await College.create({
        name: 'CaseTest College',
        code: 'CT001',
        isActive: true,
      });

      const res = await request(app)
        .post('/super-admin/colleges')
        .set('Cookie', cookie)
        .send({ name: 'casetest college', code: 'CT002' });

      expect([400, 409]).toContain(res.status);
    });

    it('should reject invalid code format', async () => {
      const res = await request(app)
        .post('/super-admin/colleges')
        .set('Cookie', cookie)
        .send({ name: 'Bad Code', code: 'lower-case!' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });
  });

  describe('GET /super-admin/audit-logs', () => {
    it('should return paginated audit logs', async () => {
      const res = await request(app)
        .get('/super-admin/audit-logs?limit=10')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.logs)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });
  });
});