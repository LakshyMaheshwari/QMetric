const request = require('supertest');
const app = require('../index');
const Paper = require('../Model/PaperInfo');
const {
  createTestUser,
  createTestCollege,
  createTestPaper,
  getCookieString,
} = require('./helpers');

describe('Reviewer Endpoints', () => {
  let college, reviewer, teacher, reviewerCookie;

  beforeEach(async () => {
    college = await createTestCollege();
    reviewer = await createTestUser({ role: 'reviewer', collegeId: college._id });
    teacher = await createTestUser({ role: 'teacher', collegeId: college._id });
    reviewerCookie = getCookieString(reviewer);
  });

  describe('GET /reviewer/papers', () => {
    it("should return only papers from reviewer's college", async () => {
      const otherCollege = await createTestCollege();

      await createTestPaper({
        courseName: 'CS101',
        userId: teacher._id,
        collegeId: college._id,
      });

      const otherTeacher = await createTestUser({
        role: 'teacher',
        collegeId: otherCollege._id,
      });
      await createTestPaper({
        courseName: 'XX999',
        userId: otherTeacher._id,
        collegeId: otherCollege._id,
      });

      const res = await request(app)
        .get('/reviewer/papers')
        .set('Cookie', reviewerCookie);

      expect(res.status).toBe(200);
      expect(res.body.papers).toBeDefined();
      expect(res.body.papers.length).toBe(1);
      expect(res.body.papers[0].courseName).toBe('CS101');
    });

    it('should filter by status', async () => {
      await createTestPaper({
        courseName: 'ApprovedPaper',
        userId: teacher._id,
        collegeId: college._id,
        reviewStatus: 'approved',
      });
      await createTestPaper({
        courseName: 'PendingPaper',
        userId: teacher._id,
        collegeId: college._id,
        reviewStatus: 'pending',
      });

      const res = await request(app)
        .get('/reviewer/papers?status=approved')
        .set('Cookie', reviewerCookie);

      expect(res.status).toBe(200);
      expect(res.body.papers.length).toBe(1);
      expect(res.body.papers[0].courseName).toBe('ApprovedPaper');
    });

    it('should reject teacher role', async () => {
      const teacherCookie = getCookieString(teacher);
      const res = await request(app)
        .get('/reviewer/papers')
        .set('Cookie', teacherCookie);

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /reviewer/papers/:id/review', () => {
    it('should approve a paper', async () => {
      const paper = await createTestPaper({
        courseName: 'ReviewMe',
        userId: teacher._id,
        collegeId: college._id,
      });

      const res = await request(app)
        .put(`/reviewer/papers/${paper._id}/review`)
        .set('Cookie', reviewerCookie)
        .send({ action: 'approved', comments: 'Looks good' });

      expect(res.status).toBe(200);
      const updated = await Paper.findById(paper._id);
      expect(updated.reviewStatus).toBe('approved');
      expect(updated.reviewComments).toBe('Looks good');
    });

    it('should reject invalid action', async () => {
      const paper = await createTestPaper({
        courseName: 'InvalidAction',
        userId: teacher._id,
        collegeId: college._id,
      });

      const res = await request(app)
        .put(`/reviewer/papers/${paper._id}/review`)
        .set('Cookie', reviewerCookie)
        .send({ action: 'invalid_action' });

      expect(res.status).toBe(400);
    });

    it('should reject reviewing paper from another college', async () => {
      const otherCollege = await createTestCollege();
      const otherTeacher = await createTestUser({
        role: 'teacher',
        collegeId: otherCollege._id,
      });
      const paper = await createTestPaper({
        courseName: 'OtherCollege',
        userId: otherTeacher._id,
        collegeId: otherCollege._id,
      });

      const res = await request(app)
        .put(`/reviewer/papers/${paper._id}/review`)
        .set('Cookie', reviewerCookie)
        .send({ action: 'approved' });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /reviewer/papers - ReDoS protection', () => {
    it('should safely handle search input with regex metacharacters without backtracking', async () => {
      await createTestPaper({
        courseName: 'CS101 (Data Structures)',
        userId: teacher._id,
        collegeId: college._id,
      });

      const res = await request(app)
        .get('/reviewer/papers?search=(a+)+$')
        .set('Cookie', reviewerCookie);

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
    });
  });

  describe('DELETE /teacher/papers/:id - Status Guard', () => {
    it('should reject deleting approved or pending papers by teacher', async () => {
      const teacherCookie = getCookieString(teacher);
      const paper = await createTestPaper({
        courseName: 'ApprovedPaper',
        userId: teacher._id,
        collegeId: college._id,
        reviewStatus: 'approved',
      });

      const res = await request(app)
        .delete(`/teacher/papers/${paper._id}`)
        .set('Cookie', teacherCookie);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Only draft or needs_revision papers can be deleted');
    });

    it('should allow deleting draft papers by owning teacher', async () => {
      const teacherCookie = getCookieString(teacher);
      const paper = await createTestPaper({
        courseName: 'DraftPaper',
        userId: teacher._id,
        collegeId: college._id,
        reviewStatus: 'draft',
      });

      const res = await request(app)
        .delete(`/teacher/papers/${paper._id}`)
        .set('Cookie', teacherCookie);

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
    });
  });
});

