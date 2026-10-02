const { test, expect } = require('@playwright/test');

test.describe('QMetric public pages @smoke', () => {
  const routes = [
    ['home', '/'],
    ['components', '/components'],
    ['credits', '/credits'],
    ['team', '/team'],
    ['register', '/register'],
    ['college registration', '/register-college'],
  ];

  for (const [name, path] of routes) {
    test(`${name} page loads`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('body')).toBeVisible();
      await expect(page).not.toHaveTitle('');
    });
  }

  test('unknown route renders Not Found', async ({ page }) => {
    await page.goto('/definitely-not-a-real-qmetric-route');
    await expect(page.getByText(/404|not found/i).first()).toBeVisible();
  });

  test('home page exposes login entry', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
  });
});
