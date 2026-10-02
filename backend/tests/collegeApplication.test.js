const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../index');
const College = require('../Model/College');
const CollegeApplication = require('../Model/CollegeApplication');
const User = require('../Model/user');
const {
  createSuperAdmin,
  getCookieString,
} = require('./helpers');

describe('College Registration Applications', () => {
  let superAdmin;
  let cookie;

  beforeEach(async () => {
    superAdmin = await createSuperAdmin();
    cookie = getCookieString(superAdmin);
  });

  const validApplication = {
    collegeName: 'QMetric Engineering College',
    collegeCode: 'QMET001',
    address: 'Main Road',
    city: 'Nagpur',
    state: 'Maharashtra',
    contactName: 'Exam Cell Admin',
    contactEmail: 'examcell@qmetriccollege.test',
    contactPhone: '9876543210',
    password: 'StrongPass123',
  };

  it('submits a public college application', async () => {
    const res = await request(app)
      .post('/auth/college-applications')
      .send(validApplication);

    expect(res.status).toBe(201);
    expect(res.body.error).toBe(false);
    expect(res.body.application.status).toBe('pending');
    expect(res.body.application._id).toBeDefined();

    const stored = await CollegeApplication.findById(res.body.application._id).select('+adminPasswordHash');
    expect(stored).toBeTruthy();
    expect(stored.status).toBe('pending');
    expect(stored.adminPasswordHash).not.toBe(validApplication.password);
    expect(await bcrypt.compare(validApplication.password, stored.adminPasswordHash)).toBe(true);
  });

  it('rejects a duplicate pending application', async () => {
    await request(app).post('/auth/college-applications').send(validApplication);

    const res = await request(app)
      .post('/auth/college-applications')
      .send({
        ...validApplication,
        contactEmail: 'different@qmetriccollege.test',
      });

    expect(res.status).toBe(409);
  });

  it('returns the public status of an application without exposing the password', async () => {
    const created = await request(app)
      .post('/auth/college-applications')
      .send(validApplication);

    const res = await request(app)
      .get(`/auth/college-applications/${created.body.application._id}`);

    expect(res.status).toBe(200);
    expect(res.body.application.status).toBe('pending');
    expect(res.body.application.adminPasswordHash).toBeUndefined();
  });

  it('requires super admin authentication for the application queue', async () => {
    const res = await request(app).get('/super-admin/college-applications');
    expect(res.status).toBe(401);
  });

  it('allows super admin to list pending applications', async () => {
    await request(app).post('/auth/college-applications').send(validApplication);

    const res = await request(app)
      .get('/super-admin/college-applications')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.error).toBe(false);
    expect(res.body.applications).toHaveLength(1);
    expect(res.body.applications[0].contactEmail).toBe(validApplication.contactEmail);
    expect(res.body.applications[0].adminPasswordHash).toBeUndefined();
  });

  it('approves an application and creates the college and admin account', async () => {
    const created = await request(app)
      .post('/auth/college-applications')
      .send(validApplication);

    const res = await request(app)
      .put(`/super-admin/college-applications/${created.body.application._id}/approve`)
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.error).toBe(false);
    expect(res.body.college.code).toBe('QMET001');
    expect(res.body.admin.email).toBe(validApplication.contactEmail);

    const college = await College.findOne({ code: 'QMET001' });
    expect(college).toBeTruthy();
    expect(college.adminIds).toHaveLength(1);

    const admin = await User.findOne({ email: validApplication.contactEmail });
    expect(admin).toBeTruthy();
    expect(admin.role).toBe('admin');
    expect(String(admin.collegeId)).toBe(String(college._id));
    expect(await bcrypt.compare(validApplication.password, admin.password)).toBe(true);

    const application = await CollegeApplication.findById(created.body.application._id);
    expect(application.status).toBe('approved');
    expect(String(application.createdCollegeId)).toBe(String(college._id));
    expect(String(application.createdAdminId)).toBe(String(admin._id));
  });

  it('rejects an application only with a reason', async () => {
    const created = await request(app)
      .post('/auth/college-applications')
      .send(validApplication);

    const missingReason = await request(app)
      .put(`/super-admin/college-applications/${created.body.application._id}/reject`)
      .set('Cookie', cookie)
      .send({});

    expect(missingReason.status).toBe(400);

    const res = await request(app)
      .put(`/super-admin/college-applications/${created.body.application._id}/reject`)
      .set('Cookie', cookie)
      .send({ reason: 'Please provide valid institutional authorization.' });

    expect(res.status).toBe(200);
    expect(res.body.application.status).toBe('rejected');
    expect(res.body.application.rejectionReason).toContain('institutional authorization');

    expect(await College.findOne({ code: 'QMET001' })).toBeNull();
    expect(await User.findOne({ email: validApplication.contactEmail })).toBeNull();
  });
});
