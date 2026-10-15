const { test, expect } = require('@playwright/test');
const { loginAs, api, unique } = require('./helpers');

test.describe('Super Admin college application review', () => {
  async function createApplication(request, suffix) {
    const code = `QA${Date.now().toString().slice(-7)}`;
    const application = await request.post(`${process.env.QMETRIC_API_URL || 'http://localhost:5000'}/auth/college-applications`, {
      data: {
        collegeName: `QMetric Review ${suffix}`,
        collegeCode: code,
        address: 'QA Campus',
        city: 'Nagpur',
        state: 'Maharashtra',
        contactName: 'QA Contact',
        contactEmail: `qa_${suffix}@example.com`,
        contactPhone: '9012345678',
        password: 'QMetricDemo@123',
      },
    });
    expect(application.status()).toBe(201);
    return application.json();
  }

  test('super admin college applications page loads', async ({ page }) => {
    await loginAs(page, 'superAdmin', '/super-admin/college-applications');
    await expect(page.getByText('College Applications')).toBeVisible();
    await expect(page.getByPlaceholder('Search college, code, contact...')).toBeVisible();
  });

  test('college applications page has all status filters', async ({ page }) => {
    await loginAs(page, 'superAdmin', '/super-admin/college-applications');
    const select = page.locator('select').first();
    const text = (await select.locator('option').allTextContents()).join(' ');
    expect(text).toMatch(/Pending/);
    expect(text).toMatch(/Approved/);
    expect(text).toMatch(/Rejected/);
    expect(text).toMatch(/All/);
  });

  test('super admin can approve a new college application', async ({ page, request }) => {
    const created = await createApplication(request, await unique('approve'));
    const appId = created.application._id;
    await loginAs(page, 'superAdmin', '/super-admin/college-applications');
    const row = page.locator('tr').filter({ hasText: created.application.collegeName }).first();
    await expect(row).toBeVisible();
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: 'Approve' }).click();
    await expect(row).toHaveCount(0);

    const lookup = await api(request, 'superAdmin', 'GET', `/auth/college-applications/${appId}`);
    expect(lookup.response.status()).toBe(200);
    expect(lookup.body.application.status).toBe('approved');
  });

  test('super admin can reject a new college application with a reason', async ({ page, request }) => {
  const created = await createApplication(request, await unique('reject'));
  const appId = created.application._id;

  await loginAs(page, 'superAdmin', '/super-admin/college-applications');

  const row = page.locator('tr').filter({ hasText: created.application.collegeName }).first();
  await expect(row).toBeVisible();

  const rejectResponse = page.waitForResponse((response) =>
    response.url().includes(`/super-admin/college-applications/${appId}/reject`) &&
    response.request().method() === 'PUT'
  );

  page.once('dialog', async (dialog) => {
    await dialog.accept('Rejected by automated QA');
  });

  await row.getByRole('button', { name: 'Reject' }).click();

  const response = await rejectResponse;
  expect(response.status()).toBe(200);

  await expect(row).toHaveCount(0);

  const lookup = await api(
    request,
    'superAdmin',
    'GET',
    `/auth/college-applications/${appId}`
  );

  expect(lookup.response.status()).toBe(200);
  expect(lookup.body.application.status).toBe('rejected');
  expect(lookup.body.application.rejectionReason).toContain('automated QA');
});
});
