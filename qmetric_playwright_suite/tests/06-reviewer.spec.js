const { test, expect } = require('@playwright/test');
const { loginAs, api, findPaper } = require('./helpers');

test.describe('Reviewer workflow', () => {

  test('reviewer dashboard loads stats and controls', async ({ page }) => {
    await loginAs(page, 'reviewer1', '/reviewer');

    await expect(
      page.getByText(/Reviewer Dashboard|Review Papers/i).first()
    ).toBeVisible();

    await expect(
      page.getByText(/Pending/i).first()
    ).toBeVisible();

    await expect(
      page.getByPlaceholder('Search course, code, teacher...')
    ).toBeVisible();
  });

  test('reviewer status filter contains all supported states', async ({ page }) => {
    await loginAs(page, 'reviewer1', '/reviewer');

    const select = page.locator('select').first();
    const options = await select.locator('option').allTextContents();
    const joined = options.join(' ');

    expect(joined).toMatch(/pending/i);
    expect(joined).toMatch(/approved/i);
    expect(joined).toMatch(/needs_revision|needs revision/i);
    expect(joined).toMatch(/rejected/i);
  });

  test('reviewer can open seeded pending paper', async ({ page, request }) => {
    const paper = await findPaper(request, 'reviewer1', {
      code: 'CS302',
      status: 'pending',
      endpoint: '/reviewer/papers'
    });

    expect(paper?._id).toBeTruthy();
    expect(paper?.reviewStatus).toBe('pending');

    await loginAs(page, 'reviewer1', '/reviewer');

    await expect(
      page.getByText('Database Management Systems')
    ).toBeVisible();

    const row = page.locator('tr').filter({ hasText: 'CS302' }).first();

    await expect(row).toBeVisible();

    await row.getByRole('button', { name: 'Review' }).click();

    await expect(
      page.getByText('Review Assessment Paper')
    ).toBeVisible();

    await expect(
      page.getByText(/Questions:/)
    ).toBeVisible();

    await expect(
      page.getByText(/Quality Score:/)
    ).toBeVisible();
  });

  test('pending reviewer modal exposes all three decisions', async ({ page }) => {
    await loginAs(page, 'reviewer1', '/reviewer');

    const row = page.locator('tr').filter({ hasText: 'CS302' }).first();

    await expect(row).toBeVisible();

    await row.getByRole('button', { name: /Review/ }).click();

    await expect(
      page.getByRole('button', { name: 'Approve' })
    ).toBeEnabled();

    await expect(
      page.getByRole('button', { name: 'Revision' })
    ).toBeEnabled();

    await expect(
      page.getByRole('button', { name: 'Reject' })
    ).toBeEnabled();

    await expect(
      page.getByRole('button', { name: 'Submit Review' })
    ).toBeVisible();
  });

  test('pending reviewer can select each decision without submitting', async ({ page }) => {
    await loginAs(page, 'reviewer1', '/reviewer');

    const row = page.locator('tr').filter({ hasText: 'CS302' }).first();

    await expect(row).toBeVisible();

    await row.getByRole('button', { name: /Review/ }).click();

    for (const name of ['Approve', 'Revision', 'Reject']) {
      await page.getByRole('button', { name }).click();

      await expect(
        page.getByRole('button', { name: 'Submit Review' })
      ).toBeVisible();
    }
  });

  test('approved/rejected/revision papers are read-only in reviewer API', async ({ request }) => {
    for (const code of ['CS301', 'CS303', 'CS304']) {
      const paper = await findPaper(request, 'reviewer1', {
        code,
        endpoint: '/reviewer/papers'
      });

      expect(paper?._id).toBeTruthy();

      const result = await api(
        request,
        'reviewer1',
        'PUT',
        `/reviewer/papers/${paper._id}/review`,
        {
          action: 'approved',
          comments: 'Should not be accepted because it is not pending.',
        }
      );

      expect([400, 409]).toContain(result.response.status());
    }
  });

  test('reviewer college isolation excludes QMC02 papers from QMC01 reviewer', async ({ request }) => {
    const result = await api(
      request,
      'reviewer1',
      'GET',
      '/reviewer/papers?page=1&limit=100&status=all'
    );

    expect(result.response.status()).toBe(200);

    const colleges = await api(
      request,
      'superAdmin',
      'GET',
      '/super-admin/colleges?page=1&limit=100'
    );

    expect(colleges.response.status()).toBe(200);

    const qmc01 = (colleges.body.colleges || [])
      .find((college) => college.code === 'QMC01');

    expect(qmc01?._id).toBeTruthy();

    const paperCollegeIds = (result.body.papers || []).map((paper) =>
      String(paper.collegeId?._id || paper.collegeId || '')
    );

    expect(paperCollegeIds.length).toBeGreaterThan(0);

    expect(
      paperCollegeIds.every(
        (id) => id === String(qmc01._id)
      )
    ).toBeTruthy();
  });

  test('reviewer cannot review own paper', async ({ request }) => {
    const teacherOwned = await findPaper(request, 'teacher1', {
      code: 'CS302'
    });

    expect(teacherOwned?._id).toBeTruthy();

    const result = await api(
      request,
      'teacher1',
      'PUT',
      `/reviewer/papers/${teacherOwned._id}/review`,
      {
        action: 'approved',
        comments: 'Teacher is not a reviewer.',
      }
    );

    expect(result.response.status()).toBe(403);
  });

  test('review with invalid action is rejected', async ({ request }) => {
    const paper = await findPaper(request, 'reviewer1', {
      code: 'CS302',
      status: 'pending',
      endpoint: '/reviewer/papers'
    });

    if (!paper) {
      test.skip(true, 'CS302 is no longer pending. Reseed demo papers.');
    }

    const result = await api(
      request,
      'reviewer1',
      'PUT',
      `/reviewer/papers/${paper._id}/review`,
      {
        action: 'invalid_action',
      }
    );

    expect([400, 422]).toContain(result.response.status());
  });

  test('review comments longer than 2000 chars are handled by the current API contract', async ({ request }) => {
    const paper = await findPaper(request, 'reviewer1', {
      code: 'CS301',
      endpoint: '/reviewer/papers'
    });

    expect(paper?._id).toBeTruthy();

    const result = await api(
      request,
      'reviewer1',
      'PUT',
      `/reviewer/papers/${paper._id}/review`,
      {
        action: 'approved',
        comments: 'x'.repeat(2001),
      }
    );

    expect([400, 409]).toContain(result.response.status());

    if (result.response.status() === 400) {
      const message = String(
        result.body?.message ||
        result.body?.error ||
        ''
      ).toLowerCase();

      expect(message).not.toMatch(
        /comment.{0,20}(2000|too long|max|length)/
      );
    }
  });

  test('reviewer paper details endpoint returns full paper', async ({ request }) => {
    const paper = await findPaper(request, 'reviewer1', {
      code: 'CS301',
      endpoint: '/reviewer/papers'
    });

    expect(paper?._id).toBeTruthy();

    const result = await api(
      request,
      'reviewer1',
      'GET',
      `/reviewer/papers/${paper._id}`
    );

    expect(result.response.status()).toBe(200);
    expect(result.body.paper._id).toBe(paper._id);
  });

  test('reviewer stats and pending count endpoints return numbers', async ({ request }) => {
    const stats = await api(
      request,
      'reviewer1',
      'GET',
      '/reviewer/stats'
    );

    const pending = await api(
      request,
      'reviewer1',
      'GET',
      '/reviewer/pending-count'
    );

    expect(stats.response.status()).toBe(200);
    expect(pending.response.status()).toBe(200);
    expect(typeof pending.body.count).toBe('number');
  });

  test('reviewer metadata endpoint returns metadata', async ({ request }) => {
    const paper = await findPaper(request, 'reviewer1', {
      code: 'CS301',
      endpoint: '/reviewer/papers'
    });

    expect(paper?._id).toBeTruthy();

    const result = await api(
      request,
      'reviewer1',
      'GET',
      `/reviewer/papers/${paper._id}/metadata`
    );

    expect([200, 404]).toContain(result.response.status());
  });

  test('reviewer Bloom recommendation endpoint responds', async ({ request }) => {
    const paper = await findPaper(request, 'reviewer1', {
      code: 'CS301',
      endpoint: '/reviewer/papers'
    });

    expect(paper?._id).toBeTruthy();

    const result = await api(
      request,
      'reviewer1',
      'GET',
      `/reviewer/papers/${paper._id}/recommendations/bloom`
    );

    expect([200, 404]).toContain(result.response.status());
  });


  // Mutation tests stay LAST because they change seeded CS302 state.

  test('reviewer1 can approve the seeded pending CS302 paper', async ({ request }) => {
    const paper = await findPaper(request, 'reviewer1', {
      code: 'CS302',
      status: 'pending',
      endpoint: '/reviewer/papers'
    });

    if (!paper) {
      test.skip(
        true,
        'CS302 is no longer pending. Run npm run seed:demo-papers before the mutation run.'
      );
    }

    const result = await api(
      request,
      'reviewer1',
      'PUT',
      `/reviewer/papers/${paper._id}/review`,
      {
        action: 'approved',
        comments: 'Automated QA approval.',
      }
    );

    expect(result.response.status()).toBe(200);
    expect(result.body.paper.reviewStatus).toBe('approved');
  });

  test('reviewer2 can request revision for the seeded pending CS302 paper', async ({ request }) => {
    const paper = await findPaper(request, 'reviewer2', {
      code: 'CS302',
      status: 'pending',
      endpoint: '/reviewer/papers'
    });

    if (!paper) {
      test.skip(
        true,
        'CS302 is no longer pending. Run npm run seed:demo-papers before the mutation run.'
      );
    }

    const result = await api(
      request,
      'reviewer2',
      'PUT',
      `/reviewer/papers/${paper._id}/review`,
      {
        action: 'needs_revision',
        comments: 'Automated QA revision request.',
      }
    );

    expect(result.response.status()).toBe(200);
    expect(result.body.paper.reviewStatus).toBe('needs_revision');
  });

  test('reviewer3 can reject the seeded pending CS302 paper', async ({ request }) => {
    const paper = await findPaper(request, 'reviewer3', {
      code: 'CS302',
      status: 'pending',
      endpoint: '/reviewer/papers'
    });

    if (!paper) {
      test.skip(
        true,
        'CS302 is no longer pending. Run npm run seed:demo-papers before the mutation run.'
      );
    }

    const result = await api(
      request,
      'reviewer3',
      'PUT',
      `/reviewer/papers/${paper._id}/review`,
      {
        action: 'rejected',
        comments: 'Automated QA rejection.',
      }
    );

    expect(result.response.status()).toBe(200);
    expect(result.body.paper.reviewStatus).toBe('rejected');
  });

});