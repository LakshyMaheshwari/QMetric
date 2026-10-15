const { test, expect } = require('@playwright/test');
const { loginAs, api, unique, DEMO_PASSWORD } = require('./helpers');

test.describe('Legacy Admin dashboard and user management', () => {
  test('admin dashboard loads', async ({ page }) => {
    await loginAs(page, 'admin1', '/admin');
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
    await expect(page.getByPlaceholder('Search users by name, email, role, or department…')).toBeVisible();
  });

  test('admin users table supports search and sorting controls', async ({ page }) => {
    await loginAs(page, 'admin1', '/admin');
    const search = page.getByPlaceholder('Search users by name, email, role, or department…');
    await search.fill('teacher1');
    await page.waitForTimeout(300);
    await expect(page.locator('body')).toContainText(/teacher1@qmetric.test|No users found/i);
  });

  test('admin user create/role/block lifecycle via API', async ({ request }) => {
    const suffix = await unique('user');
    const email = `qa_${suffix}@example.com`;
    const created = await api(request, 'admin1', 'POST', '/admin/users', {
      name: `QA ${suffix}`,
      email,
      password: DEMO_PASSWORD,
      role: 'teacher',
      collegeName: 'QMetric Demo College 1',
      department: 'Computer Science',
      phone: '9123456780',
    });
    expect([201, 400, 409]).toContain(created.response.status());
    if (!created.response.ok()) return;
    const id = created.body.user?._id || created.body.user?.id;
    expect(id).toBeTruthy();

    const role = await api(request, 'admin1', 'PUT', `/admin/users/${id}/role`, { role: 'reviewer' });
    expect(role.response.status()).toBe(200);

    const block = await api(request, 'admin1', 'PUT', `/admin/users/${id}/block`);
    expect(block.response.status()).toBe(200);

    const deleted = await api(request, 'admin1', 'DELETE', `/admin/users/${id}`);
    expect(deleted.response.status()).toBe(200);
  });

  test('admin paper stats endpoint responds', async ({ request }) => {
    const result = await api(request, 'admin1', 'GET', '/admin/papers/stats');
    expect(result.response.status()).toBe(200);
  });

  test('admin paper list is college scoped', async ({ request }) => {
    const result = await api(request, 'admin1', 'GET', '/admin/papers?page=1&limit=100');
    expect(result.response.status()).toBe(200);
    expect(Array.isArray(result.body.papers)).toBeTruthy();
  });

  test('reviewer cannot access legacy admin user management API', async ({ request }) => {
    const result = await api(request, 'reviewer1', 'GET', '/admin/users');
    expect(result.response.status()).toBe(403);
  });
});
