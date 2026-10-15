const request = require('supertest');
const app = require('../index');
const {
  createTestUser,
  createTestCollege,
  getCookieString,
} = require('./helpers');
const User = require('../Model/user');
const College = require('../Model/College');
const Paper = require('../Model/PaperInfo');
const Notification = require('../Model/Notification');
const { revoke, isRevoked } = require('../utils/tokenBlacklist');

const PASSWORD = 'TestPassword123';
const TURNSTILE = 'test-token';

describe('Audit hardening regressions', () => {
  test('student welcome notification points to the student area', async () => {
    const res = await request(app)
      .post('/auth/create-account')
      .send({
        email: 'hardening-student@test.com',
        password: PASSWORD,
        fullName: 'Hardening Student',
        userName: 'hardeningstudent',
        phone: '9000000011',
        role: 'student',
        turnstileToken: TURNSTILE,
      });

    expect(res.status).toBe(201);
    const user = await User.findOne({ email: 'hardening-student@test.com' });
    const notification = await Notification.findOne({ userId: user._id, type: 'welcome' });
    expect(notification.actionUrl).toBe('/student/papers');
  });

  test('bulk registration preserves an explicit reviewer role', async () => {
    const college = await createTestCollege();
    const res = await request(app)
      .post('/auth/bulk-register')
      .set('X-Admin-Secret', process.env.ADMIN_SECRET_KEY)
      .send({
        defaultPassword: PASSWORD,
        users: [{
          userName: 'bulk-reviewer',
          fullName: 'Bulk Reviewer',
          email: 'bulk-reviewer@test.com',
          phone: '9000000012',
          employeeId: 'EMP-HARDENING-1',
          department: 'CSE',
          stream: 'Engineering',
          position: 'Professor',
          collegeId: String(college._id),
          collegeName: college.name,
          role: 'reviewer',
        }],
      });

    expect(res.status).toBe(207);
    expect(res.body.summary.totalCreated).toBe(1);
    const user = await User.findOne({ email: 'bulk-reviewer@test.com' });
    expect(user.role).toBe('reviewer');
  });

  test('admin user list honors role filter', async () => {
    const college = await createTestCollege();
    const admin = await createTestUser({ role: 'admin', collegeId: college._id });
    await createTestUser({ role: 'reviewer', collegeId: college._id, email: 'filter-reviewer@test.com' });
    await createTestUser({ role: 'teacher', collegeId: college._id, email: 'filter-teacher@test.com' });

    const res = await request(app)
      .get('/admin/users?role=reviewer')
      .set('Cookie', getCookieString(admin));

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0].role).toBe('reviewer');
  });

  test('super-admin role changes keep college teacher/admin counters synchronized', async () => {
    const college = await createTestCollege();
    const superAdmin = await createTestUser({ role: 'super_admin', collegeId: null });
    const target = await createTestUser({ role: 'teacher', collegeId: college._id });
    await College.updateOne({ _id: college._id }, { $set: { totalTeachers: 1, adminIds: [] } });

    let res = await request(app)
      .put(`/super-admin/users/${target._id}/role`)
      .set('Cookie', getCookieString(superAdmin))
      .send({ role: 'admin' });
    expect(res.status).toBe(200);

    let updatedCollege = await College.findById(college._id).lean();
    expect(updatedCollege.totalTeachers).toBe(0);
    expect(updatedCollege.adminIds.map(String)).toContain(String(target._id));

    res = await request(app)
      .put(`/super-admin/users/${target._id}/role`)
      .set('Cookie', getCookieString(superAdmin))
      .send({ role: 'teacher' });
    expect(res.status).toBe(200);

    updatedCollege = await College.findById(college._id).lean();
    expect(updatedCollege.totalTeachers).toBe(1);
    expect(updatedCollege.adminIds.map(String)).not.toContain(String(target._id));
  });

  test('super-admin deletion blocks users referenced by review history and notifications', async () => {
    const college = await createTestCollege();
    const superAdmin = await createTestUser({ role: 'super_admin', collegeId: null });
    const target = await createTestUser({ role: 'teacher', collegeId: college._id });
    const owner = await createTestUser({ role: 'teacher', collegeId: college._id, email: 'review-owner@test.com' });

    await Paper.create({
      'College Name': college.name,
      Branch: 'CSE',
      'Year Of Study': '2026',
      Semester: '1',
      'Course Name': 'Hardening Test',
      'Course Code': 'HARD101',
      'Course Teacher': owner.fullName,
      userId: owner._id,
      collegeId: college._id,
      reviewStatus: 'approved',
      reviewHistory: [{ reviewerId: target._id, action: 'approved', comments: 'ok' }],
    });

    await Notification.create({
      userId: target._id,
      type: 'system',
      title: 'Reference',
      message: 'Referenced user',
    });

    const res = await request(app)
      .delete(`/super-admin/users/${target._id}`)
      .set('Cookie', getCookieString(superAdmin));

    expect(res.status).toBe(409);
    expect(await User.findById(target._id)).not.toBeNull();
  });

  test('token blacklist works with the async interface', async () => {
    const token = `hardening-token-${Date.now()}`;
    expect(await isRevoked(token)).toBe(false);
    await revoke(token, Math.floor(Date.now() / 1000) + 60);
    expect(await isRevoked(token)).toBe(true);
  });

  test('admin-secret bulk registration audit does not invent a user actor', async () => {
    const college = await createTestCollege();
    const res = await request(app)
      .post('/auth/bulk-register')
      .set('X-Admin-Secret', process.env.ADMIN_SECRET_KEY)
      .send({
        defaultPassword: PASSWORD,
        users: [{
          userName: 'bulk-audit-actor',
          fullName: 'Bulk Audit Actor',
          email: 'bulk-audit-actor@test.com',
          phone: '9000000013',
          employeeId: 'EMP-HARDENING-2',
          department: 'CSE',
          stream: 'Engineering',
          position: 'Professor',
          collegeId: String(college._id),
          collegeName: college.name,
        }],
      });

    expect(res.status).toBe(207);
    const AuditLog = require('../Model/AuditLog');
    const audit = await AuditLog.findOne({ action: 'BULK_REGISTER' }).sort({ timestamp: -1 }).lean();
    expect(audit).toBeDefined();
    expect(audit.actorType).toBe('admin_secret');
    expect(audit.userId).toBeUndefined();
  });

});
