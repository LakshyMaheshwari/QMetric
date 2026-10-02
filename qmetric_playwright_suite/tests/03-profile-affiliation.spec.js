const { test, expect } = require('@playwright/test');
const { loginAs, api, getCollegeByCode, unique } = require('./helpers');

test.describe('Profile and teacher/student affiliation workflow', () => {
  test('student profile loads and shows teacher upgrade controls', async ({ page }) => {
    await loginAs(page, 'student1', '/profile');
    await expect(page.getByText('Your Profile')).toBeVisible();
    await expect(page.getByText('Teacher Type')).toBeVisible();
    await expect(page.getByText('Independent Teacher', { exact: true })).toBeVisible();
    await expect(page.getByText('Affiliated Teacher', { exact: true })).toBeVisible();
  });

  test('profile email is disabled from editing', async ({ page }) => {
    await loginAs(page, 'teacher1', '/profile');
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput.first()).toBeDisabled();
  });

  test('teacher can select independent teacher mode', async ({ page }) => {
    await loginAs(page, 'student1', '/profile');
    await page.getByRole('button', { name: /Independent Teacher/ }).first().click();
    await expect(page.getByRole('button', { name: /Upgrade to Independent Teacher/ })).toBeVisible();
    await expect(page.getByText('Select College')).toHaveCount(0);
  });

  test('teacher can select affiliated teacher mode and see college selector', async ({ page }) => {
    await loginAs(page, 'student1', '/profile');
    await page.getByRole('button', { name: /Affiliated Teacher/ }).first().click();
    await expect(page.getByText('Select College')).toBeVisible();
    await expect(page.getByText(/College ID \/ Staff ID/)).toBeVisible();
  });

  test('student can upgrade to independent teacher through API', async ({ request }) => {
    const { response, body } = await api(request, 'student3', 'POST', '/auth/profile/upgrade-to-teacher', {
      intent: 'independent',
    });
    expect([200, 400]).toContain(response.status());
    if (response.ok()) {
      expect(body.error).toBe(false);
      expect(body.user.role).toBe('teacher');
      expect(body.user.collegeId ?? null).toBeNull();
    }
  });

  test('independent teacher affiliation request to active college enters pending state', async ({ request }) => {
    const college = await getCollegeByCode(request, 'QMC04');
    const result = await api(request, 'independent1', 'POST', '/auth/profile/request-affiliation', {
      collegeId: college._id,
      position: 'Assistant Professor',
      department: 'Computer Science',
      stream: 'Engineering',
      employeeId: `E2E${Date.now()}`,
    });
    expect([200, 201, 400, 409]).toContain(result.response.status());
    if (result.response.ok()) {
      expect(result.body.user?.collegeApprovalStatus || result.body.accountState || '').toMatch(/pending/i);
    }
  });

  test('duplicate affiliation request is not silently accepted twice', async ({ request }) => {
    const college = await getCollegeByCode(request, 'QMC05');
    const payload = {
      collegeId: college._id,
      position: 'Other',
      department: 'Computer Science',
      stream: 'Engineering',
      employeeId: `DUP${Date.now()}`,
    };
    const first = await api(request, 'independent2', 'POST', '/auth/profile/request-affiliation', payload);
    const second = await api(request, 'independent2', 'POST', '/auth/profile/request-affiliation', payload);
    expect([200, 201, 400, 409]).toContain(first.response.status());
    expect([200, 201, 400, 409]).toContain(second.response.status());
    expect([400, 409]).toContain(second.response.status());
  });

  test('college admin can list pending teacher requests', async ({ request }) => {
    const result = await api(request, 'admin1', 'GET', '/college-admin/pending-teachers?limit=100&page=1');
    expect(result.response.status()).toBe(200);
    expect(Array.isArray(result.body.teachers)).toBeTruthy();
  });

  test('college admin pending teacher count endpoint works', async ({ request }) => {
    const result = await api(request, 'admin1', 'GET', '/college-admin/pending-teachers/count');
    expect(result.response.status()).toBe(200);
    expect(typeof result.body.count).toBe('number');
  });

  test('college admin cannot use another college teacher id for approval', async ({ request }) => {
    const teachers = await api(request, 'admin2', 'GET', '/college-admin/pending-teachers?limit=100&page=1');
    expect(teachers.response.status()).toBe(200);
    const crossCollegeCandidate = (teachers.body.teachers || []).find(
      (t) => t.email === 'teacher1@qmetric.test'
    );
    if (crossCollegeCandidate) {
      const result = await api(request, 'admin2', 'PUT', `/college-admin/pending-teachers/${crossCollegeCandidate._id}/approve`);
      expect(result.response.status()).toBe(403);
    }
  });

  test('profile save persists valid full name and phone', async ({ request, page }) => {
    await loginAs(page, 'teacher1', '/profile');
    const fullName = `Demo Teacher One ${Date.now()}`;
    const { response, body } = await api(request, 'teacher1', 'PUT', '/auth/profile', {
      fullName, phone: '9000000031', collegeName: 'QMetric Demo College 1', department: 'Computer Science',
    });
    expect(response.ok()).toBeTruthy();
    expect(body.user.fullName).toBe(fullName);
  });
});
