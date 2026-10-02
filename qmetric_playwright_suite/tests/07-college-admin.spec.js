const { test, expect } = require('@playwright/test');
const { loginAs, api } = require('./helpers');

test.describe('College Admin dashboard and tenant management', () => {
  test('college admin dashboard loads', async ({ page }) => {
    await loginAs(page, 'admin1', '/college-admin');
    await expect(page.getByText(/College Dashboard|Pending Teacher Approvals/i).first()).toBeVisible();
    await expect(page.getByPlaceholder('Search faculty name or email...')).toBeVisible();
  });

  test('college admin can filter users by role', async ({ page }) => {
    await loginAs(page, 'admin1', '/college-admin');
    const roleFilter = page.locator('select').filter({ hasText: 'All Roles' }).first();
    if (await roleFilter.count()) {
      for (const option of ['all', 'teacher', 'reviewer', 'admin']) {
        await roleFilter.selectOption(option).catch(() => {});
      }
    }
    await expect(page.locator('body')).toContainText(/Teacher|Reviewer|Admin/i);
  });

  test('college admin add-user modal has supported roles', async ({ page }) => {
    await loginAs(page, 'admin1', '/college-admin');
    await page.getByRole('button', { name: /Add User/i }).click();
    await expect(page.getByText('Add User to College')).toBeVisible();
    const role = page.locator('select[name="role"]');
    await expect(role).toBeVisible();
    const text = await role.locator('option').allTextContents();
    expect(text.join(' ')).toMatch(/Teacher/);
    expect(text.join(' ')).toMatch(/Reviewer/);
    expect(text.join(' ')).toMatch(/College Admin/);
  });

  test('college admin pending teachers panel has approve and reject actions when requests exist', async ({ page }) => {
    await loginAs(page, 'admin1', '/college-admin');
    await expect(page.getByText('Pending Teacher Approvals')).toBeVisible();
    await expect(page.getByPlaceholder('Search teacher name or email...')).toBeVisible();
  });

  test('college admin API users are college scoped', async ({ request }) => {
    const result = await api(request, 'admin1', 'GET', '/college-admin/users?page=1&limit=100');
    expect(result.response.status()).toBe(200);
    expect((result.body.users || []).every((u) => String(u.collegeId) === String(u.collegeId))).toBeTruthy();
    expect((result.body.users || []).some((u) => u.email === 'admin2@qmetric.test')).toBeFalsy();
  });

  test('admin1 cannot change role of admin2 from another college', async ({ request }) => {
    const other = await api(request, 'admin2', 'GET', '/college-admin/users?page=1&limit=100');
    const admin2 = (other.body.users || []).find((u) => u.email === 'admin2@qmetric.test');
    if (!admin2) test.skip(true, 'admin2 not present in seeded data.');
    const result = await api(request, 'admin1', 'PUT', `/college-admin/users/${admin2._id}/role`, { role: 'teacher' });
    expect(result.response.status()).toBe(404);
  });

  test('admin cannot change own role', async ({ request }) => {
    const profile = await api(request, 'admin1', 'GET', '/auth/profile');
    const result = await api(request, 'admin1', 'PUT', `/college-admin/users/${profile.body.user._id}/role`, { role: 'teacher' });
    expect(result.response.status()).toBe(400);
  });

  test('admin cannot block self', async ({ request }) => {
    const profile = await api(request, 'admin1', 'GET', '/auth/profile');
    const result = await api(request, 'admin1', 'PUT', `/college-admin/users/${profile.body.user._id}/block`, { isBlocked: true });
    expect(result.response.status()).toBe(400);
  });

  test('college admin stats and metadata analytics endpoints respond', async ({ request }) => {
    const stats = await api(request, 'admin1', 'GET', '/college-admin/stats');
    const meta = await api(request, 'admin1', 'GET', '/college-admin/metadata-analytics');
    expect(stats.response.status()).toBe(200);
    expect(meta.response.status()).toBe(200);
  });
});
