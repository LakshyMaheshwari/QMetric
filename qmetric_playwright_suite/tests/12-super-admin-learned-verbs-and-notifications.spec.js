const { test, expect } = require('@playwright/test');
const { api, unique } = require('./helpers');

test.describe('Backend-only management features exposed as API contract checks', () => {
  test('super admin can list learned verbs', async ({ request }) => {
    const result = await api(request, 'superAdmin', 'GET', '/super-admin/learned-verbs?page=1&limit=20');
    expect(result.response.status()).toBe(200);
    expect(Array.isArray(result.body.verbs)).toBeTruthy();
  });

  test('invalid learned verb domain is rejected', async ({ request }) => {
    const result = await api(request, 'superAdmin', 'POST', '/super-admin/learned-verbs', {
      verb: `qa_${await unique('verb')}`,
      domain: 'invalid',
      level: 2,
      confidence: 0.8,
      context: 'QA',
    });
    expect(result.response.status()).toBe(400);
  });

  test('invalid learned verb confidence is rejected', async ({ request }) => {
    const result = await api(request, 'superAdmin', 'POST', '/super-admin/learned-verbs', {
      verb: `qa_${Date.now()}`,
      domain: 'cognitive',
      level: 2,
      confidence: 2,
    });
    expect(result.response.status()).toBe(400);
  });

  test('learned verb CRUD lifecycle works', async ({ request }) => {
    const verb = `qaverb_${Date.now()}`;
    const created = await api(request, 'superAdmin', 'POST', '/super-admin/learned-verbs', {
      verb,
      domain: 'cognitive',
      level: 3,
      confidence: 0.7,
      context: 'Automated QA',
    });
    expect(created.response.status()).toBe(201);
    const id = created.body.learnedVerb._id;

    const updated = await api(request, 'superAdmin', 'PUT', `/super-admin/learned-verbs/${id}`, {
      level: 4,
      confidence: 0.9,
      context: 'Updated QA',
    });
    expect(updated.response.status()).toBe(200);

    const deleted = await api(request, 'superAdmin', 'DELETE', `/super-admin/learned-verbs/${id}`);
    expect(deleted.response.status()).toBe(200);
  });

  test('non-super-admin cannot manage learned verbs', async ({ request }) => {
    const result = await api(request, 'admin1', 'GET', '/super-admin/learned-verbs?page=1&limit=10');
    expect(result.response.status()).toBe(403);
  });

  test('notification mark-all-read endpoint works', async ({ request }) => {
    const result = await api(request, 'teacher1', 'PUT', '/notifications/read-all');
    expect(result.response.status()).toBe(200);
  });
});
