const { test, expect } = require('@playwright/test');
const { api } = require('./helpers');

test.describe('API authorization, validation and security invariants', () => {
  test('missing authentication is rejected', async ({ request }) => {
    const response = await request.get(`${process.env.QMETRIC_API_URL || 'http://localhost:5000'}/auth/profile`);
    expect([401, 403]).toContain(response.status());
  });

  test('invalid dev login email is rejected', async ({ request }) => {
    const response = await request.post(`${process.env.QMETRIC_API_URL || 'http://localhost:5000'}/dev/login`, {
      data: { email: 'no_such_user@example.com' },
    });
    expect(response.status()).toBe(404);
  });

  test('dev login without email is rejected', async ({ request }) => {
    const response = await request.post(`${process.env.QMETRIC_API_URL || 'http://localhost:5000'}/dev/login`, { data: {} });
    expect(response.status()).toBe(400);
  });

  test('invalid paper id returns validation failure', async ({ request }) => {
    const result = await api(request, 'teacher1', 'GET', '/teacher/papers/not-an-id');
    expect([400, 404]).toContain(result.response.status());
  });

  test('student cannot access reviewer list', async ({ request }) => {
    const result = await api(request, 'student1', 'GET', '/reviewer/papers?page=1&limit=10');
    expect(result.response.status()).toBe(403);
  });

  test('student cannot access super admin list', async ({ request }) => {
    const result = await api(request, 'student1', 'GET', '/super-admin/users?page=1&limit=10');
    expect(result.response.status()).toBe(403);
  });

  test('teacher cannot access college admin users', async ({ request }) => {
    const result = await api(request, 'teacher1', 'GET', '/college-admin/users?page=1&limit=10');
    expect(result.response.status()).toBe(403);
  });

  test('admin cannot access super admin users', async ({ request }) => {
    const result = await api(request, 'admin1', 'GET', '/super-admin/users?page=1&limit=10');
    expect(result.response.status()).toBe(403);
  });

  test('reviewer cannot delete teacher paper through teacher delete API', async ({ request }) => {
    const paperList = await api(request, 'teacher1', 'GET', '/teacher/papers?page=1&limit=1');
    expect(paperList.response.status()).toBe(200);
    const id = paperList.body.papers?.[0]?._id;
    if (!id) test.skip(true, 'No teacher paper found.');
    const result = await api(request, 'reviewer1', 'DELETE', `/teacher/papers/${id}`);
    expect(result.response.status()).toBe(403);
  });

  test('reviewer cannot update teacher paper metadata', async ({ request }) => {
    const paperList = await api(request, 'teacher1', 'GET', '/teacher/papers?page=1&limit=1');
    const id = paperList.body.papers?.[0]?._id;
    if (!id) test.skip(true, 'No teacher paper found.');
    const result = await api(request, 'reviewer1', 'PUT', `/teacher/papers/${id}`, { 'Course Name': 'Should Not Change' });
    expect(result.response.status()).toBe(403);
  });

  test('teacher cannot submit another teacher paper', async ({ request }) => {
    const other = await api(request, 'teacher2', 'GET', '/teacher/papers?page=1&limit=100');
    const id = other.body.papers?.[0]?._id;
    if (!id) test.skip(true, 'No other teacher paper found.');
    const result = await api(request, 'teacher1', 'PUT', `/teacher/papers/${id}/submit`);
    expect([404, 400]).toContain(result.response.status());
  });

  test('student profile password endpoint validates input', async ({ request }) => {
    const result = await api(request, 'student3', 'PUT', '/auth/password', {});
    expect(result.response.status()).toBe(400);
  });

  test('forgot password validates email format', async ({ request }) => {
    const response = await request.post(`${process.env.QMETRIC_API_URL || 'http://localhost:5000'}/auth/forgot-password`, {
      data: { email: 'invalid' },
    });
    expect([400, 429]).toContain(response.status());
  });

  test('notification API is authenticated', async ({ request }) => {
    const response = await request.get(`${process.env.QMETRIC_API_URL || 'http://localhost:5000'}/notifications/unread-count`);
    expect([401, 403]).toContain(response.status());
  });

  test('authenticated notification endpoints respond for a demo user', async ({ request }) => {
    const list = await api(request, 'teacher1', 'GET', '/notifications?page=1&limit=20');
    const count = await api(request, 'teacher1', 'GET', '/notifications/unread-count');
    expect(list.response.status()).toBe(200);
    expect(count.response.status()).toBe(200);
    expect(typeof count.body.unreadCount).toBe('number');
  });

  test('health endpoint reports ok', async ({ request }) => {
    const response = await request.get(`${process.env.QMETRIC_API_URL || 'http://localhost:5000'}/health`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('readiness endpoint returns a structured health response', async ({ request }) => {
    const response = await request.get(`${process.env.QMETRIC_API_URL || 'http://localhost:5000'}/ready`);
    expect([200, 503]).toContain(response.status());
    const body = await response.json();
    expect(['ready', 'not_ready']).toContain(body.status);
    expect(body.db).toBeDefined();
  });
});
