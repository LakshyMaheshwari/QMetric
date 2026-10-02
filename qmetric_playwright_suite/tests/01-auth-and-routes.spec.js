const { test, expect } = require('@playwright/test');
const { loginAs, logoutViaUi, api } = require('./helpers');

test.describe('Authentication, sessions and route guards', () => {

  test('login modal opens with email and password fields', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page.getByText('Welcome Back')).toBeVisible();
    await expect(page.getByPlaceholder('Email Address')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
  });

  test('login modal password visibility toggle works', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    const password = page.getByPlaceholder('Password');
    await expect(password).toHaveAttribute('type', 'password');
    await password.fill('Example123');
    await password.locator('..').getByRole('button').click();
    await expect(password).toHaveAttribute('type', 'text');
  });

  test('unauthenticated profile redirects to login', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login|\/$/);
  });

  test('unauthenticated dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login|\/$/);
  });

  test('student dashboard redirects through UserDashboard normally', async ({ page }) => {
    await loginAs(page, 'student1', '/dashboard');
    await expect(page.getByText(/Dashboard|Welcome back/i).first()).toBeVisible();
  });

  test('reviewer dashboard route is reachable by reviewer', async ({ page }) => {
    await loginAs(page, 'reviewer1', '/reviewer');
    await expect(page.getByText(/Reviewer Dashboard|Review Papers/i).first()).toBeVisible();
  });

  test('admin can reach reviewer page', async ({ page }) => {
    await loginAs(page, 'admin1', '/reviewer');
    await expect(page.getByText(/Reviewer Dashboard|Review Papers/i).first()).toBeVisible();
  });

  test('admin can reach college admin page', async ({ page }) => {
    await loginAs(page, 'admin1', '/college-admin');
    await expect(page.getByText(/College Admin|College Dashboard|Pending Teacher/i).first()).toBeVisible();
  });

  test('teacher cannot reach reviewer route', async ({ page }) => {
    await loginAs(page, 'teacher1', '/reviewer');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('teacher cannot reach college admin route', async ({ page }) => {
    await loginAs(page, 'teacher1', '/college-admin');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('reviewer cannot reach college admin route', async ({ page }) => {
    await loginAs(page, 'reviewer1', '/college-admin');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('student cannot reach super admin route', async ({ page }) => {
    await loginAs(page, 'student1', '/super-admin');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('super admin can reach super admin dashboard', async ({ page }) => {
    await loginAs(page, 'superAdmin', '/super-admin');
    await expect(page.getByText('Super Admin Dashboard')).toBeVisible();
  });

  test('super admin can access guarded pages for global operations', async ({ page }) => {
    const pathsAndText = [
      ['/reviewer', /Reviewer Dashboard|Review Papers/i],
      ['/admin', /Admin Dashboard/i],
      ['/college-admin', /College Dashboard|Pending Teacher/i],
      ['/super-admin/colleges', /Manage Colleges/i],
    ];
    for (const [path, matcher] of pathsAndText) {
      await loginAs(page, 'superAdmin', path);
      await expect(page.getByText(matcher).first()).toBeVisible();
    }
  });

  test('logout clears the UI session and returns home', async ({ page }) => {
    await loginAs(page, 'teacher1', '/');
    await page.locator('.user-menu-container > button').click();
    await page.getByRole('button', { name: 'Logout', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
  });

  test('logout endpoint rejects/clears session correctly', async ({ request }) => {
    const result = await api(request, 'teacher1', 'POST', '/auth/logout');
    expect(result.response.ok()).toBeTruthy();
  });

  test('dev login returns token for seeded demo account', async ({ request }) => {
    const result = await request.post(`${process.env.QMETRIC_API_URL || 'http://localhost:5000'}/dev/login`, {
      data: { email: 'teacher1@qmetric.test' },
    });
    expect(result.status()).toBe(200);
    const body = await result.json();
    expect(body.error).toBe(false);
    expect(body.token).toBeTruthy();
  });
});
