const request = require('supertest');
const app = require('../index');
const Paper = require('../Model/PaperInfo');
const {
  createTestUser,
  createTestCollege,
  createCollegeAdmin,
  createTestPaper,
  getCookieString
} = require('./helpers');

describe('Contribution Skyline Activity Endpoints', () => {
  let collegeA, collegeB, adminA, superAdmin;

  beforeEach(async () => {
    collegeA = await createTestCollege({ name: 'Alpha Institute' });
    collegeB = await createTestCollege({ name: 'Beta Institute' });
    adminA = await createCollegeAdmin(collegeA);
    superAdmin = await createTestUser({ role: 'super_admin' });
  });

  describe('GET /college-admin/stats/activity', () => {
    it('returns empty activity array safely when no papers exist', async () => {
      const res = await request(app)
        .get('/college-admin/stats/activity')
        .set('Cookie', getCookieString(adminA));

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.scope).toBe('college');
      expect(res.body.meta.collegeId).toBe(collegeA._id.toString());
      expect(res.body.meta.totalUploads).toBe(0);
    });

    it('returns aggregated UTC daily counts strictly scoped to own college', async () => {
      const teacherA = await createTestUser({ role: 'teacher', collegeId: collegeA._id });
      const teacherB = await createTestUser({ role: 'teacher', collegeId: collegeB._id });

      const today = new Date();
      const p1 = await createTestPaper({ userId: teacherA._id, collegeId: collegeA._id });
      const p2 = await createTestPaper({ userId: teacherA._id, collegeId: collegeA._id });
      // Paper for college B should not be counted
      await createTestPaper({ userId: teacherB._id, collegeId: collegeB._id });

      const res = await request(app)
        .get('/college-admin/stats/activity')
        .set('Cookie', getCookieString(adminA));

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const total = res.body.data.reduce((s, d) => s + d.count, 0);
      expect(total).toBe(2);
      expect(res.body.meta.totalUploads).toBe(2);
      expect(res.body.data[0]).toHaveProperty('date');
      expect(res.body.data[0]).toHaveProperty('count');
      expect(typeof res.body.data[0].date).toBe('string');
      expect(/^\d{4}-\d{2}-\d{2}$/.test(res.body.data[0].date)).toBe(true);
    });

    it('enforces college isolation from auth context and ignores client-provided collegeId', async () => {
      const teacherB = await createTestUser({ role: 'teacher', collegeId: collegeB._id });
      await createTestPaper({ userId: teacherB._id, collegeId: collegeB._id });

      // Admin A attempts to pass collegeB in query param
      const res = await request(app)
        .get(`/college-admin/stats/activity?collegeId=${collegeB._id}`)
        .set('Cookie', getCookieString(adminA));

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      // Still scoped strictly to collegeA
      expect(res.body.meta.collegeId).toBe(collegeA._id.toString());
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.totalUploads).toBe(0);
    });

    it('rejects unauthenticated request', async () => {
      const res = await request(app).get('/college-admin/stats/activity');
      expect(res.status).toBe(401);
    });

    it('rejects teacher role from accessing college admin stats', async () => {
      const teacher = await createTestUser({ role: 'teacher', collegeId: collegeA._id });
      const res = await request(app)
        .get('/college-admin/stats/activity')
        .set('Cookie', getCookieString(teacher));
      expect(res.status).toBe(403);
    });
  });

  describe('GET /super-admin/stats/activity', () => {
    it('rejects invalid scope parameter', async () => {
      const res = await request(app)
        .get('/super-admin/stats/activity?scope=invalid_scope')
        .set('Cookie', getCookieString(superAdmin));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(true);
      expect(res.body.message).toContain('Invalid scope');
    });

    it('validates specific_college scope requires valid existing collegeId', async () => {
      // Missing collegeId
      const resMissing = await request(app)
        .get('/super-admin/stats/activity?scope=specific_college')
        .set('Cookie', getCookieString(superAdmin));
      expect(resMissing.status).toBe(400);
      expect(resMissing.body.message).toContain('collegeId is required');

      // Malformed collegeId
      const resInvalid = await request(app)
        .get('/super-admin/stats/activity?scope=specific_college&collegeId=123xyz')
        .set('Cookie', getCookieString(superAdmin));
      expect(resInvalid.status).toBe(400);
      expect(resInvalid.body.message).toContain('Invalid collegeId format');

      // Non-existent collegeId
      const fakeId = '507f1f77bcf86cd799439011';
      const resNotFound = await request(app)
        .get(`/super-admin/stats/activity?scope=specific_college&collegeId=${fakeId}`)
        .set('Cookie', getCookieString(superAdmin));
      expect(resNotFound.status).toBe(404);
      expect(resNotFound.body.message).toContain('College not found');
    });

    it('accurately filters specific_college scope to only that college', async () => {
      const teacherA = await createTestUser({ role: 'teacher', collegeId: collegeA._id });
      const teacherB = await createTestUser({ role: 'teacher', collegeId: collegeB._id });

      await createTestPaper({ userId: teacherA._id, collegeId: collegeA._id });
      await createTestPaper({ userId: teacherA._id, collegeId: collegeA._id });
      await createTestPaper({ userId: teacherB._id, collegeId: collegeB._id });

      const res = await request(app)
        .get(`/super-admin/stats/activity?scope=specific_college&collegeId=${collegeA._id}`)
        .set('Cookie', getCookieString(superAdmin));

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.meta.scope).toBe('specific_college');
      expect(res.body.meta.college.id).toBe(collegeA._id.toString());
      expect(res.body.meta.totalUploads).toBe(2);
    });

    it('filters unaffiliated_teachers scope: includes genuine independent teachers and excludes pending affiliations and students', async () => {
      // 1. Genuine independent teacher (no college, no pending affiliation)
      const indepTeacher = await createTestUser({
        role: 'teacher',
        collegeId: null,
        collegeApprovalStatus: 'approved'
      });
      await createTestPaper({ userId: indepTeacher._id, collegeId: null });

      // 2. Teacher with pending affiliation request to collegeA
      const pendingTeacher = await createTestUser({
        role: 'teacher',
        collegeId: null,
        collegeApprovalStatus: 'pending'
      });
      pendingTeacher.pendingAffiliationRequest = {
        collegeId: collegeA._id,
        requestedAt: new Date()
      };
      await pendingTeacher.save();
      await createTestPaper({ userId: pendingTeacher._id, collegeId: null });

      // 3. College-affiliated teacher
      const affilTeacher = await createTestUser({ role: 'teacher', collegeId: collegeA._id });
      await createTestPaper({ userId: affilTeacher._id, collegeId: collegeA._id });

      // 4. Student (not a teacher)
      const student = await createTestUser({ role: 'student', collegeId: null });
      await createTestPaper({ userId: student._id, collegeId: null });

      // Query unaffiliated_teachers scope
      const res = await request(app)
        .get('/super-admin/stats/activity?scope=unaffiliated_teachers')
        .set('Cookie', getCookieString(superAdmin));

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.meta.scope).toBe('unaffiliated_teachers');
      // Only the genuine independent teacher paper should be counted!
      expect(res.body.meta.totalUploads).toBe(1);
    });

    it('entire_platform aggregates affiliated and unaffiliated activity without double-counting', async () => {
      // Independent teacher
      const indepTeacher = await createTestUser({
        role: 'teacher',
        collegeId: null,
        collegeApprovalStatus: 'approved'
      });
      await createTestPaper({ userId: indepTeacher._id, collegeId: null });

      // College A teacher
      const teacherA = await createTestUser({ role: 'teacher', collegeId: collegeA._id });
      await createTestPaper({ userId: teacherA._id, collegeId: collegeA._id });

      // College B teacher
      const teacherB = await createTestUser({ role: 'teacher', collegeId: collegeB._id });
      await createTestPaper({ userId: teacherB._id, collegeId: collegeB._id });

      // Student paper (should be excluded from teacher upload analytics)
      const student = await createTestUser({ role: 'student', collegeId: null });
      await createTestPaper({ userId: student._id, collegeId: null });

      // Check all_colleges scope
      const resColleges = await request(app)
        .get('/super-admin/stats/activity?scope=all_colleges')
        .set('Cookie', getCookieString(superAdmin));
      expect(resColleges.status).toBe(200);
      expect(resColleges.body.meta.totalUploads).toBe(2);

      // Check unaffiliated_teachers scope
      const resUnaffil = await request(app)
        .get('/super-admin/stats/activity?scope=unaffiliated_teachers')
        .set('Cookie', getCookieString(superAdmin));
      expect(resUnaffil.status).toBe(200);
      expect(resUnaffil.body.meta.totalUploads).toBe(1);

      // Check entire_platform scope (must equal 2 + 1 = 3)
      const resPlatform = await request(app)
        .get('/super-admin/stats/activity?scope=entire_platform')
        .set('Cookie', getCookieString(superAdmin));
      expect(resPlatform.status).toBe(200);
      expect(resPlatform.body.meta.scope).toBe('entire_platform');
      expect(resPlatform.body.meta.totalUploads).toBe(3);
    });

    it('rejects non-super-admin access to super-admin activity endpoint', async () => {
      const res = await request(app)
        .get('/super-admin/stats/activity?scope=entire_platform')
        .set('Cookie', getCookieString(adminA));

      expect(res.status).toBe(403);
    });
  });
});
