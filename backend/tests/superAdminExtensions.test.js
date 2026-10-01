'use strict';

const request = require('supertest');
const app = require('../index');
const User = require('../Model/user');
const College = require('../Model/College');
const AuditLog = require('../Model/AuditLog');
const Paper = require('../Model/PaperInfo');
const Notification = require('../Model/Notification');
const { createSuperAdmin, createTestCollege, createTestUser, getCookieString } = require('./helpers');

describe('Super Admin Extensions — Global User Management, Audit Resource Filter, College Detail Pagination', () => {
  let superAdmin, cookie, college1, college2, teacher1, reviewer1;

  beforeEach(async () => {
    superAdmin = await createSuperAdmin();
    cookie = getCookieString(superAdmin);

    college1 = await createTestCollege({ name: 'Alpha Institute' });
    college2 = await createTestCollege({ name: 'Beta University' });

    teacher1 = await createTestUser({
      role: 'teacher',
      email: 'teacher.alpha@test.com',
      collegeId: college1._id,
      phone: '9876543101',
    });

    reviewer1 = await createTestUser({
      role: 'reviewer',
      email: 'reviewer.beta@test.com',
      collegeId: college2._id,
      phone: '9876543102',
    });
  });

  describe('GET /super-admin/users', () => {
    it('returns a paginated list of all users across colleges', async () => {
      const res = await request(app)
        .get('/super-admin/users')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.users.length).toBeGreaterThanOrEqual(3);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(3);
    });

    it('filters users by collegeId and role', async () => {
      const res = await request(app)
        .get(`/super-admin/users?collegeId=${college1._id}&role=teacher`)
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBe(1);
      expect(res.body.users[0].email).toBe('teacher.alpha@test.com');
    });

    it('searches users by name or email', async () => {
      const res = await request(app)
        .get('/super-admin/users?search=reviewer.beta')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBe(1);
      expect(res.body.users[0].email).toBe('reviewer.beta@test.com');
    });
  });

  describe('PUT /super-admin/users/:id/role', () => {

    it('does not allow assigning super_admin through the HTTP role endpoint', async () => {
      const teacher = await createTestUser({ role: 'teacher', collegeId: teacher1.collegeId });

      const res = await request(app)
        .put(`/super-admin/users/${teacher._id}/role`)
        .set('Cookie', cookie)
        .send({ role: 'super_admin' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(true);
    });
    it('allows super admin to change user role across colleges and logs audit', async () => {
      const res = await request(app)
        .put(`/super-admin/users/${teacher1._id}/role`)
        .set('Cookie', cookie)
        .send({ role: 'reviewer' });

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.user.role).toBe('reviewer');

      const updated = await User.findById(teacher1._id);
      expect(updated.role).toBe('reviewer');

      const audit = await AuditLog.findOne({ resource: `User:${teacher1._id}`, action: 'UPDATE_ROLE' });
      expect(audit).toBeDefined();
    });

    it('rejects invalid role with 400', async () => {
      const res = await request(app)
        .put(`/super-admin/users/${teacher1._id}/role`)
        .set('Cookie', cookie)
        .send({ role: 'invalid_role_xyz' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(true);
    });
  });

  describe('PUT /super-admin/users/:id/block', () => {
    it('blocks and unblocks a user across colleges and creates audit log', async () => {
      // Block
      const resBlock = await request(app)
        .put(`/super-admin/users/${teacher1._id}/block`)
        .set('Cookie', cookie)
        .send({ isBlocked: true });

      expect(resBlock.status).toBe(200);
      expect(resBlock.body.user.isBlocked).toBe(true);

      const auditBlock = await AuditLog.findOne({ resource: `User:${teacher1._id}`, action: 'BLOCK_USER' });
      expect(auditBlock).toBeDefined();

      // Unblock
      const resUnblock = await request(app)
        .put(`/super-admin/users/${teacher1._id}/block`)
        .set('Cookie', cookie)
        .send({ isBlocked: false });

      expect(resUnblock.status).toBe(200);
      expect(resUnblock.body.user.isBlocked).toBe(false);

      const auditUnblock = await AuditLog.findOne({ resource: `User:${teacher1._id}`, action: 'UNBLOCK_USER' });
      expect(auditUnblock).toBeDefined();
    });

    it('prevents super admin from blocking their own account', async () => {
      const res = await request(app)
        .put(`/super-admin/users/${superAdmin._id}/block`)
        .set('Cookie', cookie)
        .send({ isBlocked: true });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(true);
    });
  });

  describe('DELETE /super-admin/users/:id', () => {
    it('rejects deletion when paper history or notification references the user', async () => {
      const victim = await createTestUser({
        role: 'reviewer',
        email: 'delete-ref-victim@test.com',
        collegeId: college1._id,
      });

      await Paper.create({
        'College Name': college1.name,
        Branch: 'CSE',
        'Year Of Study': '3',
        Semester: '6',
        'Course Name': 'Reference Test',
        'Course Code': 'REF101',
        'Course Teacher': teacher1.fullName || teacher1.userName,
        userId: teacher1._id,
        collegeId: college1._id,
        reviewHistory: [{ reviewerId: victim._id, action: 'approved' }],
      });

      await Notification.create({
        userId: victim._id,
        type: 'system',
        title: 'Reference test',
      });

      const res = await request(app)
        .delete(`/super-admin/users/${victim._id}`)
        .set('Cookie', cookie);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe(true);
      expect(await User.exists({ _id: victim._id })).toBeTruthy();
    });

    it('deletes a user and creates an audit log', async () => {
      const res = await request(app)
        .delete(`/super-admin/users/${teacher1._id}`)
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);

      const found = await User.findById(teacher1._id);
      expect(found).toBeNull();

      const audit = await AuditLog.findOne({ resource: `User:${teacher1._id}`, action: 'DELETE_USER' });
      expect(audit).toBeDefined();
    });

    it('prevents super admin from deleting their own account', async () => {
      const res = await request(app)
        .delete(`/super-admin/users/${superAdmin._id}`)
        .set('Cookie', cookie);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(true);
    });
  });

  describe('GET /super-admin/audit-logs with resource filter (G8)', () => {
    it('filters audit logs by resource string', async () => {
      await AuditLog.create({
        userId: superAdmin._id,
        action: 'UPDATE_ROLE',
        resource: 'Paper:target_special_123',
        timestamp: new Date(),
      });

      await AuditLog.create({
        userId: superAdmin._id,
        action: 'BLOCK_USER',
        resource: 'User:other_special_456',
        timestamp: new Date(),
      });

      const res = await request(app)
        .get('/super-admin/audit-logs?resource=target_special_123')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.logs.length).toBe(1);
      expect(res.body.logs[0].resource).toBe('Paper:target_special_123');
    });
  });

  describe('GET /super-admin/colleges/:id pagination (G2)', () => {
    it('returns paginated users and papers with metadata', async () => {
      const res = await request(app)
        .get(`/super-admin/colleges/${college1._id}?userPage=1&userLimit=10`)
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.usersPagination).toBeDefined();
      expect(res.body.papersPagination).toBeDefined();
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.teachers).toBeGreaterThanOrEqual(1);
    });
  });
});
