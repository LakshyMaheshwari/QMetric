'use strict';

const request = require('supertest');
const app = require('../index');
const Paper = require('../Model/PaperInfo');
const { createTestUser, getCookieString } = require('./helpers');

describe('Student Endpoints (G1) — /student/papers and /student/stats', () => {
  let student1, student2, cookie1, cookie2, paperS1, paperS2, paperOther;

  beforeEach(async () => {
    student1 = await createTestUser({
      role: 'student',
      email: 'student1@test.com',
      collegeId: null,
      phone: '9876540001',
    });
    cookie1 = getCookieString(student1);

    student2 = await createTestUser({
      role: 'student',
      email: 'student2@test.com',
      collegeId: null,
      phone: '9876540002',
    });
    cookie2 = getCookieString(student2);

    paperS1 = await Paper.create({
      'College Name': 'Independent',
      'Branch': 'CS',
      'Year Of Study': '1',
      'Semester': '1',
      'Course Name': 'Python Programming',
      'Course Code': 'PY101',
      'Course Teacher': 'Self',
      userId: student1._id,
      collegeId: null,
      reviewStatus: 'draft',
      qualityScore: 78,
    });

    paperS2 = await Paper.create({
      'College Name': 'Independent',
      'Branch': 'CS',
      'Year Of Study': '1',
      'Semester': '1',
      'Course Name': 'Discrete Math',
      'Course Code': 'DM101',
      'Course Teacher': 'Self',
      userId: student1._id,
      collegeId: null,
      reviewStatus: 'draft',
      qualityScore: 92,
    });

    paperOther = await Paper.create({
      'College Name': 'Independent',
      'Branch': 'ME',
      'Year Of Study': '2',
      'Semester': '3',
      'Course Name': 'Fluid Mechanics',
      'Course Code': 'FM201',
      'Course Teacher': 'Self',
      userId: student2._id,
      collegeId: null,
      reviewStatus: 'draft',
      qualityScore: 65,
    });
  });

  describe('GET /student/papers', () => {
    it('returns only the papers uploaded by the student', async () => {
      const res = await request(app)
        .get('/student/papers')
        .set('Cookie', cookie1);

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.papers.length).toBe(2);

      const codes = res.body.papers.map((p) => p['Course Code']);
      expect(codes).toContain('PY101');
      expect(codes).toContain('DM101');
      expect(codes).not.toContain('FM201');
    });

    it('supports search query by course name', async () => {
      const res = await request(app)
        .get('/student/papers?search=Python')
        .set('Cookie', cookie1);

      expect(res.status).toBe(200);
      expect(res.body.papers.length).toBe(1);
      expect(res.body.papers[0]['Course Code']).toBe('PY101');
    });
  });

  describe('GET /student/stats', () => {
    it('computes accurate upload statistics for student', async () => {
      const res = await request(app)
        .get('/student/stats')
        .set('Cookie', cookie1);

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.stats.totalPapers).toBe(2);
      expect(res.body.stats.highestQualityScore).toBe(92);
      expect(res.body.stats.lowestQualityScore).toBe(78);
      expect(res.body.stats.averageQualityScore).toBe(85);
    });
  });

  describe('GET /student/papers/:id', () => {
    it('returns own paper details', async () => {
      const res = await request(app)
        .get(`/student/papers/${paperS1._id}`)
        .set('Cookie', cookie1);

      expect(res.status).toBe(200);
      expect(res.body.paper._id.toString()).toBe(paperS1._id.toString());
    });

    it('returns 404 when student attempts to view another student paper', async () => {
      const res = await request(app)
        .get(`/student/papers/${paperOther._id}`)
        .set('Cookie', cookie1);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe(true);
    });
  });
});
