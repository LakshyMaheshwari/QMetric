const { test, expect } = require('@playwright/test');
const { loginAs, api, unique } = require('./helpers');

test.describe('Super Admin and college management', () => {
  test('super admin dashboard loads global overview', async ({ page }) => {
    await loginAs(page, 'superAdmin', '/super-admin');
    await expect(page.getByText('Super Admin Dashboard')).toBeVisible();
    await expect(page.getByText(/Global overview/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'College Applications' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add College' })).toBeVisible();
  });

  test('super admin colleges page loads', async ({ page }) => {
    await loginAs(page, 'superAdmin', '/super-admin/colleges');
    await expect(page.getByText('Manage Colleges')).toBeVisible();
    await expect(page.getByPlaceholder('Search colleges…')).toBeVisible();
    await expect(page.getByText('QMetric Demo College 1')).toBeVisible();
  });

  test('super admin can filter colleges by active/inactive', async ({ page }) => {
    await loginAs(page, 'superAdmin', '/super-admin/colleges');
    const filter = page.locator('select').filter({ hasText: 'All Statuses' }).first();
    if (await filter.count()) {
      await filter.selectOption('active');
      await filter.selectOption('inactive');
      await filter.selectOption('');
    }
    await expect(page.locator('body')).toContainText(/QMetric Demo College/i);
  });

  test('super admin create-college API validates required fields', async ({ request }) => {
    const result = await api(request, 'superAdmin', 'POST', '/super-admin/colleges', {});
    expect(result.response.status()).toBe(400);
  });

  test('super admin can create, read, update and delete a temporary college', async ({ request }) => {
    const suffix = await unique('College');
    const payload = {
      name: `QMetric ${suffix}`,
      code: `Q${Date.now().toString().slice(-8)}`,
      city: 'Nagpur',
      state: 'Maharashtra',
      address: 'QA Address',
      isActive: true,
    };
    const created = await api(request, 'superAdmin', 'POST', '/super-admin/colleges', payload);
    expect(created.response.status()).toBe(201);
    const id = created.body.college._id;

    const detail = await api(request, 'superAdmin', 'GET', `/super-admin/colleges/${id}`);
    expect(detail.response.status()).toBe(200);
    expect(detail.body.college._id).toBe(id);

    const updated = await api(request, 'superAdmin', 'PUT', `/super-admin/colleges/${id}`, {
      name: `${payload.name} Updated`, isActive: false, city: 'Pune', state: 'Maharashtra', address: 'Changed',
    });
    expect(updated.response.status()).toBe(200);
    expect(updated.body.college.isActive).toBe(false);

    const deleted = await api(request, 'superAdmin', 'DELETE', `/super-admin/colleges/${id}?permanent=true`);
    expect(deleted.response.status()).toBe(200);
  });

  test('super admin can view a seeded college detail', async ({ page, request }) => {
    const list = await api(request, 'superAdmin', 'GET', '/super-admin/colleges?search=QMC01');
    expect(list.response.status()).toBe(200);
    const college = list.body.colleges?.[0];
    expect(college?._id).toBeTruthy();
    await loginAs(page, 'superAdmin', `/super-admin/colleges/${college._id}`);
    await expect(page.getByText(/College Admins|Users|Papers/i).first()).toBeVisible();
  });

  test('super admin global stats endpoint returns aggregate metrics', async ({ request }) => {
    const result = await api(request, 'superAdmin', 'GET', '/super-admin/stats');
    expect(result.response.status()).toBe(200);
    for (const key of ['totalColleges', 'activeColleges', 'totalTeachers', 'totalPapers', 'totalUsers']) {
      expect(typeof result.body.stats[key]).toBe('number');
    }
  });

  test('super admin audit logs endpoint responds', async ({ request }) => {
    const result = await api(request, 'superAdmin', 'GET', '/super-admin/audit-logs?page=1&limit=10');
    expect(result.response.status()).toBe(200);
  });

  test('non-super-admin cannot call super admin colleges API', async ({ request }) => {
    const result = await api(request, 'admin1', 'GET', '/super-admin/colleges');
    expect(result.response.status()).toBe(403);
  });

  test('non-super-admin cannot call super admin stats API', async ({ request }) => {
    const result = await api(request, 'reviewer1', 'GET', '/super-admin/stats');
    expect(result.response.status()).toBe(403);
  });
});
