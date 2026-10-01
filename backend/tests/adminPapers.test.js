'use strict';

const request = require('supertest');
const app = require('../index');
const Paper = require('../Model/PaperInfo');
const { createTestUser, createTestCollege, getCookieString } = require('./helpers');

describe('Admin Paper-Level Visibility (G5) — /admin/papers', () => {
  let collegeA, collegeB, adminA, teacherA, teacherB, cookieA, paperA1, paperA2, paperB1;

  beforeEach(async () => {
    collegeA = await createTestCollege({ name: 'College A' });
    collegeB = await createTestCollege({ name: 'College B' });

    adminA = await createTestUser({
      role: 'admin',
      collegeId: collegeA._id,
      email: 'admin.a@test.com',
      phone: '9876541001',
    });
    cookieA = getCookieString(adminA);

    teacherA = await createTestUser({
      role: 'teacher',
      collegeId: collegeA._id,
      email: 'teacher.a@test.com',
      phone: '9876541002',
    });

    teacherB = await createTestUser({
      role: 'teacher',
      collegeId: collegeB._id,
      email: 'teacher.b@test.com',
      phone: '9876541003',
    });

    paperA1 = await Paper.create({
      'College Name': collegeA.name,
      'Branch': 'CSE',
      'Year Of Study': '3',
      'Semester': '5',
      'Course Name': 'Algorithms',
      'Course Code': 'CS301',
      'Course Teacher': 'Prof. A',
      userId: teacherA._id,
      collegeId: collegeA._id,
      reviewStatus: 'approved',
      qualityScore: 85,
    });

    paperA2 = await Paper.create({
      'College Name': collegeA.name,
      'Branch': 'ECE',
      'Year Of Study': '2',
      'Semester': '3',
      'Course Name': 'Digital Signals',
      'Course Code': 'EC201',
      'Course Teacher': 'Prof. A',
      userId: teacherA._id,
      collegeId: collegeA._id,
      reviewStatus: 'pending',
      qualityScore: 70,
    });

    paperB1 = await Paper.create({
      'College Name': collegeB.name,
      'Branch': 'MECH',
      'Year Of Study': '4',
      'Semester': '7',
      'Course Name': 'Thermodynamics',
      'Course Code': 'ME401',
      'Course Teacher': 'Prof. B',
      userId: teacherB._id,
      collegeId: collegeB._id,
      reviewStatus: 'approved',
      qualityScore: 90,
    });
  });

  describe('GET /admin/papers', () => {
    it('returns only papers belonging to the admin college', async () => {
      const res = await request(app)
        .get('/admin/papers')
        .set('Cookie', cookieA);

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.papers.length).toBe(2);

      const paperIds = res.body.papers.map((p) => p._id);
      expect(paperIds).toContain(paperA1._id.toString());
      expect(paperIds).toContain(paperA2._id.toString());
      expect(paperIds).not.toContain(paperB1._id.toString());
    });

    it('filters papers by status', async () => {
      const res = await request(app)
        .get('/admin/papers?status=approved')
        .set('Cookie', cookieA);

      expect(res.status).toBe(200);
      expect(res.body.papers.length).toBe(1);
      expect(res.body.papers[0]['Course Code']).toBe('CS301');
    });

    it('filters papers by course code', async () => {
      const res = await request(app)
        .get('/admin/papers?courseCode=EC201')
        .set('Cookie', cookieA);

      expect(res.status).toBe(200);
      expect(res.body.papers.length).toBe(1);
      expect(res.body.papers[0]['Course Code']).toBe('EC201');
    });
  });

  describe('GET /admin/papers/stats', () => {
    it('returns college-scoped aggregate paper metrics', async () => {
      const res = await request(app)
        .get('/admin/papers/stats')
        .set('Cookie', cookieA);

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.stats.total).toBe(2);
      expect(res.body.stats.approved).toBe(1);
      expect(res.body.stats.pending).toBe(1);
      expect(res.body.stats.averageQualityScore).toBe(77.5);
    });
  });

  describe('GET /admin/papers/:id', () => {
    it('returns detailed paper view for a paper in the admin college', async () => {
      const res = await request(app)
        .get(`/admin/papers/${paperA1._id}`)
        .set('Cookie', cookieA);

      expect(res.status).toBe(200);
      expect(res.body.paper._id.toString()).toBe(paperA1._id.toString());
      expect(res.body.paper.userId).toBeDefined();
    });

    it('returns 404 when requesting a paper from another college', async () => {
      const res = await request(app)
        .get(`/admin/papers/${paperB1._id}`)
        .set('Cookie', cookieA);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe(true);
    });
  });
});
