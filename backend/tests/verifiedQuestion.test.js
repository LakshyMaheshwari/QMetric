const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const VerifiedQuestion = require('../Model/VerifiedQuestion');
const {
  createTestUser,
  createTestCollege,
  createTestPaper,
  createSuperAdmin,
  createTestVerifiedQuestion,
  getCookieString,
} = require('./helpers');

describe('VerifiedQuestion Corrections Endpoints', () => {
  let college, reviewer, teacher, paper, reviewerCookie;

  beforeEach(async () => {
    college = await createTestCollege();
    reviewer = await createTestUser({ role: 'reviewer', collegeId: college._id });
    teacher = await createTestUser({ role: 'teacher', collegeId: college._id });
    paper = await createTestPaper({
      userId: teacher._id,
      collegeId: college._id,
      courseName: 'CS101',
    });
    reviewerCookie = getCookieString(reviewer);
  });

  describe('POST /reviewer/papers/:paperId/corrections', () => {
    it('creates a correction for a valid paper', async () => {
      const res = await request(app)
        .post(`/reviewer/papers/${paper._id}/corrections`)
        .set('Cookie', reviewerCookie)
        .send({
          questionIndex: 0,
          correctedDomain: 'cognitive',
          correctedLevel: 3,
          correctedLevelName: 'Apply',
          reason: 'Application level problem',
        });

      expect(res.status).toBe(201);
      expect(res.body.error).toBe(false);
      expect(res.body.correctedQuestion).toBeDefined();
      expect(res.body.correctedQuestion.correctedLevel).toBe(3);
      expect(res.body.correctedQuestion.correctedDomain).toBe('cognitive');

      const inDb = await VerifiedQuestion.findOne({ paperId: paper._id, questionIndex: 0 });
      expect(inDb).not.toBeNull();
      expect(inDb.correctedLevel).toBe(3);
      expect(String(inDb.correctedBy)).toBe(String(reviewer._id));
    });

    it('rejects invalid correctedLevel', async () => {
      const res = await request(app)
        .post(`/reviewer/papers/${paper._id}/corrections`)
        .set('Cookie', reviewerCookie)
        .send({
          questionIndex: 0,
          correctedDomain: 'cognitive',
          correctedLevel: 99,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(true);
      expect(res.body.message).toMatch(/correctedLevel/i);
    });

    it('rejects invalid domain', async () => {
      const res = await request(app)
        .post(`/reviewer/papers/${paper._id}/corrections`)
        .set('Cookie', reviewerCookie)
        .send({
          questionIndex: 0,
          correctedDomain: 'invalid_domain',
          correctedLevel: 2,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(true);
      expect(res.body.message).toMatch(/correctedDomain/i);
    });

    it('rejects unauthenticated request', async () => {
      const res = await request(app)
        .post(`/reviewer/papers/${paper._id}/corrections`)
        .send({
          questionIndex: 0,
          correctedDomain: 'cognitive',
          correctedLevel: 2,
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe(true);
    });

    it('rejects user from a different college', async () => {
      const otherCollege = await createTestCollege();
      const otherReviewer = await createTestUser({
        role: 'reviewer',
        collegeId: otherCollege._id,
      });
      const otherCookie = getCookieString(otherReviewer);

      const res = await request(app)
        .post(`/reviewer/papers/${paper._id}/corrections`)
        .set('Cookie', otherCookie)
        .send({
          questionIndex: 0,
          correctedDomain: 'cognitive',
          correctedLevel: 2,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe(true);
    });

    it('upserts when the same questionIndex is corrected twice', async () => {
      const res1 = await request(app)
        .post(`/reviewer/papers/${paper._id}/corrections`)
        .set('Cookie', reviewerCookie)
        .send({
          questionIndex: 0,
          correctedDomain: 'cognitive',
          correctedLevel: 2,
          reason: 'Initial classification was slightly low',
        });

      expect(res1.status).toBe(201);
      expect(res1.body.correctedQuestion.correctedLevel).toBe(2);

      const res2 = await request(app)
        .post(`/reviewer/papers/${paper._id}/corrections`)
        .set('Cookie', reviewerCookie)
        .send({
          questionIndex: 0,
          correctedDomain: 'cognitive',
          correctedLevel: 4,
          reason: 'Actually requires analysis',
        });

      expect([200, 201]).toContain(res2.status);
      expect(res2.body.correctedQuestion.correctedLevel).toBe(4);

      const count = await VerifiedQuestion.countDocuments({
        paperId: paper._id,
        questionIndex: 0,
      });
      expect(count).toBe(1);

      const updated = await VerifiedQuestion.findOne({
        paperId: paper._id,
        questionIndex: 0,
      });
      expect(updated.correctedLevel).toBe(4);
      expect(updated.reason).toBe('Actually requires analysis');
    });
  });

  describe('GET /reviewer/papers/:paperId/corrections', () => {
    it('returns paginated list', async () => {
      await createTestVerifiedQuestion({
        paperId: paper._id,
        questionIndex: 0,
        correctedBy: reviewer._id,
      });
      await createTestVerifiedQuestion({
        paperId: paper._id,
        questionIndex: 1,
        correctedBy: reviewer._id,
      });

      const res = await request(app)
        .get(`/reviewer/papers/${paper._id}/corrections?page=1&limit=10`)
        .set('Cookie', reviewerCookie);

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(Array.isArray(res.body.corrections)).toBe(true);
      expect(res.body.corrections.length).toBe(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.pagination.page).toBe(1);
    });

    it('returns 404 for unknown paper', async () => {
      const nonExistentPaperId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/reviewer/papers/${nonExistentPaperId}/corrections`)
        .set('Cookie', reviewerCookie);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe(true);
    });
  });

  describe('PUT /reviewer/papers/:paperId/corrections/:questionIndex', () => {
    it('allows the original author to update', async () => {
      await createTestVerifiedQuestion({
        paperId: paper._id,
        questionIndex: 0,
        correctedLevel: 2,
        correctedBy: reviewer._id,
      });

      const res = await request(app)
        .put(`/reviewer/papers/${paper._id}/corrections/0`)
        .set('Cookie', reviewerCookie)
        .send({
          correctedLevel: 5,
          reason: 'Author updated correction',
        });

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);

      const updated = await VerifiedQuestion.findOne({
        paperId: paper._id,
        questionIndex: 0,
      });
      expect(updated.correctedLevel).toBe(5);
      expect(updated.reason).toBe('Author updated correction');
    });

    it('blocks a different reviewer from updating', async () => {
      await createTestVerifiedQuestion({
        paperId: paper._id,
        questionIndex: 0,
        correctedLevel: 2,
        correctedBy: reviewer._id,
      });

      const otherReviewer = await createTestUser({
        role: 'reviewer',
        collegeId: college._id,
      });
      const otherCookie = getCookieString(otherReviewer);

      const res = await request(app)
        .put(`/reviewer/papers/${paper._id}/corrections/0`)
        .set('Cookie', otherCookie)
        .send({
          correctedLevel: 4,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe(true);

      const unchanged = await VerifiedQuestion.findOne({
        paperId: paper._id,
        questionIndex: 0,
      });
      expect(unchanged.correctedLevel).toBe(2);
    });

    it('allows super_admin to update anything', async () => {
      await createTestVerifiedQuestion({
        paperId: paper._id,
        questionIndex: 0,
        correctedLevel: 2,
        correctedBy: reviewer._id,
      });

      const superAdmin = await createSuperAdmin();
      const superAdminCookie = getCookieString(superAdmin);

      const res = await request(app)
        .put(`/reviewer/papers/${paper._id}/corrections/0`)
        .set('Cookie', superAdminCookie)
        .send({
          correctedLevel: 6,
          reason: 'Super admin override',
        });

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);

      const updated = await VerifiedQuestion.findOne({
        paperId: paper._id,
        questionIndex: 0,
      });
      expect(updated.correctedLevel).toBe(6);
      expect(updated.reason).toBe('Super admin override');
    });
  });

  describe('DELETE /reviewer/papers/:paperId/corrections/:questionIndex', () => {
    it('deletes own correction', async () => {
      await createTestVerifiedQuestion({
        paperId: paper._id,
        questionIndex: 0,
        correctedBy: reviewer._id,
      });

      const res = await request(app)
        .delete(`/reviewer/papers/${paper._id}/corrections/0`)
        .set('Cookie', reviewerCookie);

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);

      const inDb = await VerifiedQuestion.findOne({
        paperId: paper._id,
        questionIndex: 0,
      });
      expect(inDb).toBeNull();
    });

    it('returns 404 for missing correction', async () => {
      const res = await request(app)
        .delete(`/reviewer/papers/${paper._id}/corrections/999`)
        .set('Cookie', reviewerCookie);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe(true);
    });
  });
});
