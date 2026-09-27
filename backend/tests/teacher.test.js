const request = require('supertest');
const app = require('../index');
const Paper = require('../Model/PaperInfo');
const {
  createTestUser,
  createTestCollege,
  createSuperAdmin,
  getCookieString,
} = require('./helpers');

/**
 * Create a paper directly in MongoDB. Going through the /upload endpoint
 * would require a real Excel file + Cloudinary + OCR — too heavy for unit tests.
 */
async function createTestPaper({ userId, collegeId, reviewStatus = 'draft', courseName = 'Test Course' }) {
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

describe('Teacher Endpoints', () => {
  let college, otherCollege;
  let teacher, teacherCookie;
  let otherTeacher, otherTeacherCookie;
  let admin, adminCookie;
  let reviewer, reviewerCookie;
  let superAdmin, superAdminCookie;

  beforeEach(async () => {
    college = await createTestCollege();
    otherCollege = await createTestCollege({ name: 'Other College', code: 'OTH001' });

    teacher = await createTestUser({ role: 'teacher', collegeId: college._id });
    teacherCookie = getCookieString(teacher);

    otherTeacher = await createTestUser({ role: 'teacher', collegeId: otherCollege._id });
    otherTeacherCookie = getCookieString(otherTeacher);

    admin = await createTestUser({ role: 'admin', collegeId: college._id });
    adminCookie = getCookieString(admin);

    reviewer = await createTestUser({ role: 'reviewer', collegeId: college._id });
    reviewerCookie = getCookieString(reviewer);

    superAdmin = await createSuperAdmin();
    superAdminCookie = getCookieString(superAdmin);
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /teacher/papers — list
  // ═══════════════════════════════════════════════════════════════
  describe('GET /teacher/papers', () => {
    it('should list only the teacher\'s own papers', async () => {
      await createTestPaper({ userId: teacher._id, collegeId: college._id, courseName: 'Mine 1' });
      await createTestPaper({ userId: teacher._id, collegeId: college._id, courseName: 'Mine 2' });
      await createTestPaper({ userId: otherTeacher._id, collegeId: otherCollege._id, courseName: 'Not Mine' });

      const res = await request(app)
        .get('/teacher/papers')
        .set('Cookie', teacherCookie);

      expect(res.status).toBe(200);
      expect(res.body.papers.length).toBe(2);
      expect(res.body.papers.every((p) => p['Course Name'].startsWith('Mine'))).toBe(true);
    });

    it('should let a reviewer see their college papers', async () => {
      await createTestPaper({ userId: teacher._id, collegeId: college._id, courseName: 'College Paper' });

      const res = await request(app)
        .get('/teacher/papers')
        .set('Cookie', reviewerCookie);

      expect(res.status).toBe(200);
      expect(res.body.papers.length).toBeGreaterThanOrEqual(1);
    });

    it('should let a reviewer only see their OWN college papers', async () => {
      await createTestPaper({ userId: teacher._id, collegeId: college._id });
      await createTestPaper({ userId: otherTeacher._id, collegeId: otherCollege._id });

      const res = await request(app)
        .get('/teacher/papers')
        .set('Cookie', reviewerCookie);

      expect(res.status).toBe(200);
      expect(res.body.papers.every(
        (p) => String(p.collegeId) === String(college._id)
      )).toBe(true);
    });

    it('should filter by status', async () => {
      await createTestPaper({ userId: teacher._id, collegeId: college._id, reviewStatus: 'draft' });
      await createTestPaper({ userId: teacher._id, collegeId: college._id, reviewStatus: 'approved' });
      await createTestPaper({ userId: teacher._id, collegeId: college._id, reviewStatus: 'approved' });

      const res = await request(app)
        .get('/teacher/papers?status=approved')
        .set('Cookie', teacherCookie);

      expect(res.status).toBe(200);
      expect(res.body.papers.every((p) => p.reviewStatus === 'approved')).toBe(true);
      expect(res.body.papers.length).toBe(2);
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/teacher/papers');
      expect(res.status).toBe(401);
    });

    it('should reject invalid pagination with 400', async () => {
      const res = await request(app)
        .get('/teacher/papers?page=-1&limit=9999')
        .set('Cookie', teacherCookie);
      expect(res.status).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /teacher/papers/:id — single
  // ═══════════════════════════════════════════════════════════════
  describe('GET /teacher/papers/:id', () => {
    it('should allow the owner to view their paper', async () => {
      const paper = await createTestPaper({ userId: teacher._id, collegeId: college._id });

      const res = await request(app)
        .get(`/teacher/papers/${paper._id}`)
        .set('Cookie', teacherCookie);

      expect(res.status).toBe(200);
      expect(res.body.paper._id).toBe(String(paper._id));
    });

    it('should block a different teacher from viewing it (404, not 403)', async () => {
      const paper = await createTestPaper({ userId: teacher._id, collegeId: college._id });

      const res = await request(app)
        .get(`/teacher/papers/${paper._id}`)
        .set('Cookie', otherTeacherCookie);

      // The controller returns 404 when the query doesn't match — correct
      // behaviour (does not confirm existence of the paper).
      expect(res.status).toBe(404);
    });

    it('should allow a reviewer from the same college', async () => {
      const paper = await createTestPaper({ userId: teacher._id, collegeId: college._id });

      const res = await request(app)
        .get(`/teacher/papers/${paper._id}`)
        .set('Cookie', reviewerCookie);

      expect(res.status).toBe(200);
    });

    it('should reject invalid Mongo ID', async () => {
      const res = await request(app)
        .get('/teacher/papers/not-a-real-id')
        .set('Cookie', teacherCookie);
      expect(res.status).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PUT /teacher/papers/:id — edit
  // ═══════════════════════════════════════════════════════════════
  describe('PUT /teacher/papers/:id — role gate', () => {
    it('should reject a reviewer', async () => {
      const paper = await createTestPaper({ userId: teacher._id, collegeId: college._id });

      const res = await request(app)
        .put(`/teacher/papers/${paper._id}`)
        .set('Cookie', reviewerCookie)
        .send({ 'Course Name': 'Attempted Edit' });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /teacher/papers/:id — status guard', () => {
    it('should allow the owner to edit a draft', async () => {
      const paper = await createTestPaper({ userId: teacher._id, collegeId: college._id, reviewStatus: 'draft' });

      const res = await request(app)
        .put(`/teacher/papers/${paper._id}`)
        .set('Cookie', teacherCookie)
        .send({ 'Course Name': 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.paper['Course Name']).toBe('Updated Name');
    });

    it('should allow editing a needs_revision paper', async () => {
      const paper = await createTestPaper({ userId: teacher._id, collegeId: college._id, reviewStatus: 'needs_revision' });

      const res = await request(app)
        .put(`/teacher/papers/${paper._id}`)
        .set('Cookie', teacherCookie)
        .send({ 'Course Name': 'Revision Applied' });

      expect(res.status).toBe(200);
    });

    it('should reject editing an approved paper', async () => {
      const paper = await createTestPaper({ userId: teacher._id, collegeId: college._id, reviewStatus: 'approved' });

      const res = await request(app)
        .put(`/teacher/papers/${paper._id}`)
        .set('Cookie', teacherCookie)
        .send({ 'Course Name': 'Attempted Edit' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/status/i);
    });

    it('should reject editing a pending paper', async () => {
      const paper = await createTestPaper({ userId: teacher._id, collegeId: college._id, reviewStatus: 'pending' });

      const res = await request(app)
        .put(`/teacher/papers/${paper._id}`)
        .set('Cookie', teacherCookie)
        .send({ 'Course Name': 'Attempted Edit' });

      expect(res.status).toBe(400);
    });

    it('should let super_admin edit any paper', async () => {
      const paper = await createTestPaper({ userId: teacher._id, collegeId: college._id, reviewStatus: 'draft' });

      const res = await request(app)
        .put(`/teacher/papers/${paper._id}`)
        .set('Cookie', superAdminCookie)
        .send({ 'Course Name': 'Super Admin Edit' });

      expect(res.status).toBe(200);
    });

    it('should let admin edit a paper in their college', async () => {
      const paper = await createTestPaper({ userId: teacher._id, collegeId: college._id, reviewStatus: 'draft' });

      const res = await request(app)
        .put(`/teacher/papers/${paper._id}`)
        .set('Cookie', adminCookie)
        .send({ 'Course Name': 'Admin Edit' });

      expect(res.status).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PUT /teacher/papers/:id/submit
  // ═══════════════════════════════════════════════════════════════
  describe('PUT /teacher/papers/:id/submit', () => {
    it('should allow the owner to submit a draft', async () => {
      const paper = await createTestPaper({ userId: teacher._id, collegeId: college._id, reviewStatus: 'draft' });

      const res = await request(app)
        .put(`/teacher/papers/${paper._id}/submit`)
        .set('Cookie', teacherCookie);

      expect(res.status).toBe(200);

      const updated = await Paper.findById(paper._id);
      expect(updated.reviewStatus).toBe('pending');
      expect(updated.submittedAt).toBeTruthy();
    });

    it('should reject submission of a non-draft paper', async () => {
      const paper = await createTestPaper({ userId: teacher._id, collegeId: college._id, reviewStatus: 'approved' });

      const res = await request(app)
        .put(`/teacher/papers/${paper._id}/submit`)
        .set('Cookie', teacherCookie);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/draft/i);
    });

    it('should reject submission by a different teacher (404)', async () => {
      const paper = await createTestPaper({ userId: teacher._id, collegeId: college._id });

      const res = await request(app)
        .put(`/teacher/papers/${paper._id}/submit`)
        .set('Cookie', otherTeacherCookie);

      expect(res.status).toBe(404);
    });

    it('should reject a reviewer from submitting', async () => {
      const paper = await createTestPaper({ userId: teacher._id, collegeId: college._id });

      const res = await request(app)
        .put(`/teacher/papers/${paper._id}/submit`)
        .set('Cookie', reviewerCookie);

      // Route restricts to requireRole('teacher') → 403 before ownership is checked
      expect(res.status).toBe(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DELETE /teacher/papers/:id
  // ═══════════════════════════════════════════════════════════════
  describe('DELETE /teacher/papers/:id — role gate', () => {
    it('should reject a reviewer', async () => {
      const paper = await createTestPaper({ userId: teacher._id, collegeId: college._id });

      const res = await request(app)
        .delete(`/teacher/papers/${paper._id}`)
        .set('Cookie', reviewerCookie);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/restricted|permission/i);
    });
  });

  describe('DELETE /teacher/papers/:id — status guard', () => {
    it('should allow the owner to delete a draft', async () => {
      const paper = await createTestPaper({ userId: teacher._id, collegeId: college._id, reviewStatus: 'draft' });

      const res = await request(app)
        .delete(`/teacher/papers/${paper._id}`)
        .set('Cookie', teacherCookie);

      expect(res.status).toBe(200);

      const gone = await Paper.findById(paper._id);
      expect(gone).toBeNull();
    });

    it('should allow the owner to delete a needs_revision paper', async () => {
      const paper = await createTestPaper({ userId: teacher._id, collegeId: college._id, reviewStatus: 'needs_revision' });

      const res = await request(app)
        .delete(`/teacher/papers/${paper._id}`)
        .set('Cookie', teacherCookie);

      expect(res.status).toBe(200);
    });

    it('should reject deleting an approved paper (audit-trail protection)', async () => {
      const paper = await createTestPaper({ userId: teacher._id, collegeId: college._id, reviewStatus: 'approved' });

      const res = await request(app)
        .delete(`/teacher/papers/${paper._id}`)
        .set('Cookie', teacherCookie);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/status/i);

      const stillThere = await Paper.findById(paper._id);
      expect(stillThere).not.toBeNull();
    });

    it('should reject deleting a pending paper', async () => {
      const paper = await createTestPaper({ userId: teacher._id, collegeId: college._id, reviewStatus: 'pending' });

      const res = await request(app)
        .delete(`/teacher/papers/${paper._id}`)
        .set('Cookie', teacherCookie);

      expect(res.status).toBe(400);
    });

    it('should let super_admin delete an approved paper (override)', async () => {
      const paper = await createTestPaper({ userId: teacher._id, collegeId: college._id, reviewStatus: 'approved' });

      const res = await request(app)
        .delete(`/teacher/papers/${paper._id}`)
        .set('Cookie', superAdminCookie);

      expect(res.status).toBe(200);
    });

    it('should let admin delete a draft in their college', async () => {
      const paper = await createTestPaper({ userId: teacher._id, collegeId: college._id, reviewStatus: 'draft' });

      const res = await request(app)
        .delete(`/teacher/papers/${paper._id}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
    });
  });
});