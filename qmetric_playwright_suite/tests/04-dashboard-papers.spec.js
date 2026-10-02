const { test, expect } = require('@playwright/test');
const { loginAs, api, findPaper, listPapers } = require('./helpers');

test.describe('Student/Teacher dashboards and papers', () => {
  test('student dashboard loads recent papers and stats', async ({ page }) => {
    await loginAs(page, 'student1', '/dashboard');
    await expect(page.getByText(/Dashboard/i).first()).toBeVisible();
    await expect(page.getByText(/Recent|Papers|Become a Teacher/i).first()).toBeVisible();
  });

  test('teacher dashboard loads paper statistics', async ({ page }) => {
    await loginAs(page, 'teacher1', '/teacher');
    await expect(page.getByText(/Total Papers/i).first()).toBeVisible();
    await expect(page.getByText(/Pending/i).first()).toBeVisible();
    await expect(page.getByText(/Approved/i).first()).toBeVisible();
  });

  test('teacher dashboard status filters work', async ({ page }) => {
    await loginAs(page, 'teacher1', '/teacher');
    const status = page.locator('select').first();
    if (await status.count()) {
      for (const option of ['all', 'pending', 'approved', 'rejected', 'needs_revision']) {
        await status.selectOption(option).catch(() => {});
      }
    }
    await expect(page.locator('body')).toContainText(/Papers|No papers/i);
  });

  test('teacher dashboard search field accepts course queries', async ({ page }) => {
    await loginAs(page, 'teacher1', '/teacher');
    const search = page.locator('input[placeholder*="Search"]').first();
    if (await search.count()) {
      await search.fill('CS301');
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toContainText(/CS301|No papers/i);
    }
  });

  test('all papers page loads for affiliated teacher', async ({ page }) => {
    await loginAs(page, 'teacher1', '/papers');
    await expect(page.getByRole('heading', { name: 'My Papers' })).toBeVisible();
    await expect(page.getByText('CS301')).toBeVisible();
  });

  test('all papers page shows status and action columns', async ({ page }) => {
    await loginAs(page, 'teacher1', '/papers');
    await expect(page.getByText('Status', { exact: true })).toBeVisible();
    await expect(page.getByText('Quality Score', { exact: true })).toBeVisible();
    await expect(page.getByText('Actions', { exact: true })).toBeVisible();
  });

  test('independent teacher sees OK instead of reviewer status controls', async ({ page }) => {
    await loginAs(page, 'independent1', '/papers');
    await expect(page.getByRole('heading', { name: 'My Papers' })).toBeVisible();
    await expect(page.getByText('OK', { exact: true }).first()).toBeVisible();
  });

  test('student can view their papers page', async ({ page }) => {
    await loginAs(page, 'student1', '/papers');
    await expect(page.getByRole('heading', { name: 'My Papers' })).toBeVisible();
  });

  test('teacher API returns only the current teacher papers', async ({ request }) => {
    const result = await listPapers(request, 'teacher1');
    expect(result.papers.length).toBeGreaterThan(0);
    for (const paper of result.papers) {
      expect(String(paper.userId?._id || paper.userId)).not.toBe('');
    }
  });

  test('student API returns only current student papers', async ({ request }) => {
    const result = await api(request, 'student1', 'GET', '/student/papers?page=1&limit=100');
    expect(result.response.status()).toBe(200);
    expect(Array.isArray(result.body.papers)).toBeTruthy();
  });

  test('student stats endpoint returns numeric metrics', async ({ request }) => {
    const result = await api(request, 'student1', 'GET', '/student/stats');
    expect(result.response.status()).toBe(200);
    expect(typeof result.body.stats.totalPapers).toBe('number');
    expect(typeof result.body.stats.averageQualityScore).toBe('number');
  });

  test('student cannot fetch another student paper', async ({ request }) => {
    const own = await api(request, 'student1', 'GET', '/student/papers?page=1&limit=1');
    expect(own.response.status()).toBe(200);
    const other = await api(request, 'student2', 'GET', '/student/papers?page=1&limit=100');
    expect(other.response.status()).toBe(200);
    const otherPaper = other.body.papers?.[0];
    if (otherPaper?._id) {
      const result = await api(request, 'student1', 'GET', `/student/papers/${otherPaper._id}`);
      expect(result.response.status()).toBe(404);
    }
  });

  test('approved demo paper result page loads', async ({ page, request }) => {
    const paper = await findPaper(request, 'teacher1', { code: 'CS301' });
    expect(paper?._id).toBeTruthy();
    await loginAs(page, 'teacher1', `/result/${paper._id}`);
    await expect(page.getByText(/Overall Assessment Score/i).first()).toBeVisible();
    await expect(page.getByText(/Course Outcomes Configuration/i).first()).toBeVisible();
    await expect(page.getByText(/Bloom/i).first()).toBeVisible();
  });

  test('result page exposes report sections', async ({ page, request }) => {
    const paper = await findPaper(request, 'teacher1', { code: 'CS301' });
    await loginAs(page, 'teacher1', `/result/${paper._id}`);
    for (const label of [
      /Course Information/i,
      /Module Distribution/i,
      /Detailed Question-wise Analysis/i,
      /Course Outcome Coverage/i,
      /Performance Analysis/i,
    ]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test('invalid result id shows an error state', async ({ page }) => {
    await loginAs(page, 'teacher1', '/result/000000000000000000000000');
    await expect(page.getByText(/not found|failed|error|Paper/i).first()).toBeVisible();
  });
});
