const request = require('supertest');
const app = require('../index');
const OCRLog = require('../Model/OCRLog');
const User = require('../Model/user');
const {
  createTestUser,
  createTestCollege,
  createCollegeAdmin,
  createTestOcrLog,
  getCookieString,
} = require('./helpers');

describe('Admin OCR Logs Endpoints', () => {
  let college, admin, teacher, adminCookie;

  beforeEach(async () => {
    college = await createTestCollege();
    admin = await createCollegeAdmin(college);
    teacher = await createTestUser({ role: 'teacher', collegeId: college._id });
    adminCookie = getCookieString(admin);
  });

  describe('GET /admin/ocr-logs', () => {
    it("lists logs for the admin's college", async () => {
      const otherCollege = await createTestCollege();
      const otherTeacher = await createTestUser({
        role: 'teacher',
        collegeId: otherCollege._id,
      });

      const ownLog = await createTestOcrLog({
        userId: teacher._id,
        status: 'unverified',
      });
      const otherLog = await createTestOcrLog({
        userId: otherTeacher._id,
        status: 'unverified',
      });

      const res = await request(app)
        .get('/admin/ocr-logs')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(Array.isArray(res.body.ocrLogs)).toBe(true);

      const returnedLogIds = res.body.ocrLogs.map((log) => String(log._id));
      expect(returnedLogIds).toContain(String(ownLog._id));
      expect(returnedLogIds).not.toContain(String(otherLog._id));
    });

    it('filters by status', async () => {
      await createTestOcrLog({
        userId: teacher._id,
        status: 'verified',
      });
      await createTestOcrLog({
        userId: teacher._id,
        status: 'flagged',
      });
      await createTestOcrLog({
        userId: teacher._id,
        status: 'unverified',
      });

      const res = await request(app)
        .get('/admin/ocr-logs?status=verified')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.ocrLogs.length).toBeGreaterThanOrEqual(1);
      expect(res.body.ocrLogs.every((log) => log.status === 'verified')).toBe(true);
    });
  });

  describe('PUT /admin/ocr-logs/:logId/verify', () => {
    it('updates log status and user.idVerification.status', async () => {
      const log = await createTestOcrLog({
        userId: teacher._id,
        status: 'unverified',
      });

      const res = await request(app)
        .put(`/admin/ocr-logs/${log._id}/verify`)
        .set('Cookie', adminCookie)
        .send({ status: 'verified' });

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);

      const updatedLog = await OCRLog.findById(log._id);
      expect(updatedLog.status).toBe('verified');

      const updatedUser = await User.findById(teacher._id);
      expect(updatedUser.idVerification.status).toBe('verified');
    });
  });

  describe('PUT /admin/ocr-logs/:logId/reject', () => {
    it('requires a reason', async () => {
      const log = await createTestOcrLog({
        userId: teacher._id,
        status: 'unverified',
      });

      // Without reason or with empty reason: rejects with 400
      const resNoReason = await request(app)
        .put(`/admin/ocr-logs/${log._id}/reject`)
        .set('Cookie', adminCookie)
        .send({});

      expect(resNoReason.status).toBe(400);
      expect(resNoReason.body.error).toBe(true);
      expect(resNoReason.body.message).toMatch(/reason/i);

      const resEmptyReason = await request(app)
        .put(`/admin/ocr-logs/${log._id}/reject`)
        .set('Cookie', adminCookie)
        .send({ reason: '   ' });

      expect(resEmptyReason.status).toBe(400);
      expect(resEmptyReason.body.error).toBe(true);
      expect(resEmptyReason.body.message).toMatch(/reason/i);

      // With a valid reason: succeeds
      const resWithReason = await request(app)
        .put(`/admin/ocr-logs/${log._id}/reject`)
        .set('Cookie', adminCookie)
        .send({ reason: 'ID photo is illegible' });

      expect(resWithReason.status).toBe(200);
      expect(resWithReason.body.error).toBe(false);

      const updatedLog = await OCRLog.findById(log._id);
      expect(updatedLog.reason).toBe('ID photo is illegible');
    });
  });

  describe('GET /admin/ocr-logs/stats', () => {
    it('returns correct counts by status', async () => {
      await createTestOcrLog({
        userId: teacher._id,
        status: 'verified',
      });
      await createTestOcrLog({
        userId: teacher._id,
        status: 'flagged',
      });
      await createTestOcrLog({
        userId: teacher._id,
        status: 'unverified',
      });

      const res = await request(app)
        .get('/admin/ocr-logs/stats')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.verified).toBe(1);
      expect(res.body.stats.flagged).toBe(1);
      expect(res.body.stats.unverified).toBe(1);
      expect(res.body.stats.total).toBe(3);
    });
  });
});
