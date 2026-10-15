const { test, expect } = require('@playwright/test');
const { api } = require('./helpers');

test.describe('Multi-tenant data isolation', () => {
  async function getCollegeIds(request) {
    const result = await api(
      request,
      'superAdmin',
      'GET',
      '/super-admin/colleges?page=1&limit=100'
    );

    expect(result.response.status()).toBe(200);

    const colleges = result.body.colleges || [];

    return {
      QMC01: colleges.find((c) => c.code === 'QMC01')?._id,
      QMC02: colleges.find((c) => c.code === 'QMC02')?._id,
      QMC03: colleges.find((c) => c.code === 'QMC03')?._id,
    };
  }

  test('QMC01 admin sees QMC01 users and not QMC02 users', async ({ request }) => {
    const result = await api(
      request,
      'admin1',
      'GET',
      '/college-admin/users?page=1&limit=100'
    );

    expect(result.response.status()).toBe(200);

    const emails = (result.body.users || []).map((u) => u.email);

    expect(emails).toContain('admin1@qmetric.test');
    expect(emails).not.toContain('admin2@qmetric.test');
    expect(emails).not.toContain('teacher2@qmetric.test');
  });

  test('QMC02 admin sees QMC02 users and not QMC01 users', async ({ request }) => {
    const result = await api(
      request,
      'admin2',
      'GET',
      '/college-admin/users?page=1&limit=100'
    );

    expect(result.response.status()).toBe(200);

    const emails = (result.body.users || []).map((u) => u.email);

    expect(emails).toContain('admin2@qmetric.test');
    expect(emails).not.toContain('admin1@qmetric.test');
    expect(emails).not.toContain('teacher1@qmetric.test');
  });

  test('QMC01 reviewer does not see QMC02 reviewer papers', async ({ request }) => {
    const q1 = await api(
      request,
      'reviewer1',
      'GET',
      '/reviewer/papers?page=1&limit=100&status=all'
    );

    const q2 = await api(
      request,
      'reviewer2',
      'GET',
      '/reviewer/papers?page=1&limit=100&status=all'
    );

    expect(q1.response.status()).toBe(200);
    expect(q2.response.status()).toBe(200);

    const collegeIds = await getCollegeIds(request);

    expect(collegeIds.QMC01).toBeTruthy();
    expect(collegeIds.QMC02).toBeTruthy();

    const ids1 = (q1.body.papers || []).map((p) =>
      String(p.collegeId?._id || p.collegeId || '')
    );

    const ids2 = (q2.body.papers || []).map((p) =>
      String(p.collegeId?._id || p.collegeId || '')
    );

    expect(ids1.length).toBeGreaterThan(0);
    expect(ids2.length).toBeGreaterThan(0);

    expect(
      ids1.every((id) => id === String(collegeIds.QMC01))
    ).toBeTruthy();

    expect(
      ids2.every((id) => id === String(collegeIds.QMC02))
    ).toBeTruthy();
  });

  test('super admin sees global colleges', async ({ request }) => {
    const result = await api(
      request,
      'superAdmin',
      'GET',
      '/super-admin/colleges?page=1&limit=100'
    );

    expect(result.response.status()).toBe(200);

    const codes = (result.body.colleges || []).map((c) => c.code);

    expect(codes).toEqual(
      expect.arrayContaining(['QMC01', 'QMC02', 'QMC03'])
    );
  });

  test('teacher cannot read another teacher paper details', async ({ request }) => {
    const q2 = await api(
      request,
      'teacher2',
      'GET',
      '/teacher/papers?page=1&limit=100'
    );

    const id = q2.body.papers?.[0]?._id;

    if (!id) {
      test.skip(true, 'No teacher2 paper found.');
    }

    const q1 = await api(
      request,
      'teacher1',
      'GET',
      `/teacher/papers/${id}`
    );

    expect(q1.response.status()).toBe(404);
  });

  test('admin paper query stays college scoped', async ({ request }) => {
    const result = await api(
      request,
      'admin1',
      'GET',
      '/admin/papers?page=1&limit=100'
    );

    expect(result.response.status()).toBe(200);

    const collegeIds = await getCollegeIds(request);

    expect(collegeIds.QMC01).toBeTruthy();

    const ids = (result.body.papers || []).map((p) =>
      String(p.collegeId?._id || p.collegeId || '')
    );

    expect(ids.length).toBeGreaterThan(0);

    expect(
      ids.every((id) => id === String(collegeIds.QMC01))
    ).toBeTruthy();
  });
});