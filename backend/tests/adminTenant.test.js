const request = require('supertest');
const app = require('../index');
const User = require('../Model/user');
const { createTestUser, createTestCollege, createCollegeAdmin, getCookieString } = require('./helpers');

describe('Admin tenant isolation (/admin/users/:id ...)', () => {
  let collegeA, collegeB, adminA, teacherA, teacherB, cookieA;

  beforeEach(async () => {
    collegeA = await createTestCollege({ name: 'College A' });
    collegeB = await createTestCollege({ name: 'College B' });
    adminA = await createCollegeAdmin(collegeA);
    teacherA = await createTestUser({ role: 'teacher', collegeId: collegeA._id });
    teacherB = await createTestUser({ role: 'teacher', collegeId: collegeB._id });
    cookieA = getCookieString(adminA);
  });

  it('rejects cross-college role change (404, user untouched)', async () => {
    const res = await request(app).put(`/admin/users/${teacherB._id}/role`).set('Cookie', cookieA).send({ role: 'reviewer' });
    expect(res.status).toBe(404);
    expect((await User.findById(teacherB._id)).role).toBe('teacher');
  });

  it('rejects cross-college block', async () => {
    const res = await request(app).put(`/admin/users/${teacherB._id}/block`).set('Cookie', cookieA);
    expect(res.status).toBe(404);
    expect((await User.findById(teacherB._id)).isBlocked).toBeFalsy();
  });

  it('rejects cross-college delete', async () => {
    const res = await request(app).delete(`/admin/users/${teacherB._id}`).set('Cookie', cookieA);
    expect(res.status).toBe(404);
    expect(await User.findById(teacherB._id)).not.toBeNull();
  });

  it('still allows same-college role change, block and delete', async () => {
    const r1 = await request(app).put(`/admin/users/${teacherA._id}/role`).set('Cookie', cookieA).send({ role: 'reviewer' });
    expect(r1.status).toBe(200);
    const r2 = await request(app).put(`/admin/users/${teacherA._id}/block`).set('Cookie', cookieA);
    expect(r2.status).toBe(200);
    const r3 = await request(app).delete(`/admin/users/${teacherA._id}`).set('Cookie', cookieA);
    expect(r3.status).toBe(200);
  });

  it('prevents an admin from changing/blocking/deleting themselves', async () => {
    const r1 = await request(app).put(`/admin/users/${adminA._id}/role`).set('Cookie', cookieA).send({ role: 'teacher' });
    const r2 = await request(app).put(`/admin/users/${adminA._id}/block`).set('Cookie', cookieA);
    const r3 = await request(app).delete(`/admin/users/${adminA._id}`).set('Cookie', cookieA);
    expect([r1.status, r2.status, r3.status]).toEqual([400, 400, 400]);
  });

  it('returns 403 for an admin with no college (never matches college-less users)', async () => {
    const indep = await createTestUser({ role: 'teacher', collegeId: null });
    await User.updateOne({ _id: adminA._id }, { $unset: { collegeId: 1 } });
    const res = await request(app).delete(`/admin/users/${indep._id}`).set('Cookie', cookieA);
    expect([401, 403]).toContain(res.status);
    expect(await User.findById(indep._id)).not.toBeNull();
  });
});
