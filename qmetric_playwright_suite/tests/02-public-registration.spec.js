const { test, expect } = require('@playwright/test');
const { API_URL, unique, DEMO_PASSWORD, api, getCollegeByCode } = require('./helpers');

test.describe('Public registration and college application', () => {

  test('teacher registration page shows affiliation selector and linked college registration', async ({ page }) => {
    await page.goto('/register');

    await expect(
      page.getByText('Create an Account')
    ).toBeVisible();

    await expect(
      page.getByText('Are you a college / exam cell? Register your college')
    ).toBeVisible();

    await expect(
      page.locator('select').filter({
        has: page.locator('option', {
          hasText: 'Affiliated with a College'
        })
      })
    ).toHaveCount(1);
  });

  test('affiliation selector switches between affiliated and independent modes', async ({ page }) => {
    await page.goto('/register');

    const affiliation = page
      .locator('select')
      .filter({
        has: page.locator('option', {
          hasText: 'Affiliated with a College'
        })
      })
      .first();

    await expect(affiliation).toHaveValue('affiliated');

    await expect(
      page.getByText('Select Registered College')
    ).toBeVisible();

    await affiliation.selectOption('independent');

    await expect(
      page.getByText('Select Registered College')
    ).toHaveCount(0);

    await affiliation.selectOption('affiliated');

    await expect(
      page.getByText('Select Registered College')
    ).toBeVisible();
  });

  test('registration form rejects missing required fields before submit', async ({ page }) => {
    await page.goto('/register');

    const submit = page.getByRole('button', {
      name: /^Register$/
    });

    await expect(submit).toBeDisabled();
  });

  test('college code field normalizes to uppercase', async ({ page }) => {
    await page.goto('/register-college');

    const code = page.getByPlaceholder('College Code *');

    await code.fill('abc123');

    await expect(code).toHaveValue('ABC123');
  });

  test('college registration rejects empty form', async ({ page }) => {
    await page.goto('/register-college');

    await page
      .getByRole('button', {
        name: 'Submit College Registration'
      })
      .click();

    await expect(
      page.getByText('Please complete all required fields.')
    ).toBeVisible();
  });

  test('college registration rejects invalid college code', async ({ page }) => {
    await page.goto('/register-college');

    await page
      .getByPlaceholder('College / Institution Name *')
      .fill('Test College');

    await page
      .getByPlaceholder('College Code *')
      .fill('BAD CODE!');

    await page
      .getByPlaceholder('Contact Person Name *')
      .fill('Test Contact');

    await page
      .getByPlaceholder('Official Email *')
      .fill('contact@example.com');

    await page
      .getByPlaceholder('10-digit Phone *')
      .fill('9000000000');

    await page
      .getByPlaceholder('Create Password *')
      .fill(DEMO_PASSWORD);

    await page
      .getByPlaceholder('Confirm Password *')
      .fill(DEMO_PASSWORD);

    await page
      .getByRole('button', {
        name: 'Submit College Registration'
      })
      .click();

    await expect(
      page.getByText(
        'College code must contain only letters and numbers.'
      )
    ).toBeVisible();
  });

  test('college registration rejects invalid email', async ({ page }) => {
    await page.goto('/register-college');

    await page
      .getByPlaceholder('College / Institution Name *')
      .fill('Test College');

    await page
      .getByPlaceholder('College Code *')
      .fill('TEST123');

    await page
      .getByPlaceholder('Contact Person Name *')
      .fill('Test Contact');

    await page
      .getByPlaceholder('Official Email *')
      .fill('not-an-email');

    await page
      .getByPlaceholder('10-digit Phone *')
      .fill('9000000000');

    await page
      .getByPlaceholder('Create Password *')
      .fill(DEMO_PASSWORD);

    await page
      .getByPlaceholder('Confirm Password *')
      .fill(DEMO_PASSWORD);

    await page
      .getByRole('button', {
        name: 'Submit College Registration'
      })
      .click();

    await expect(
      page.getByText(
        'Please enter a valid contact email.'
      )
    ).toBeVisible();
  });

  test('college registration rejects non-10-digit phone', async ({ page }) => {
    await page.goto('/register-college');

    await page
      .getByPlaceholder('College / Institution Name *')
      .fill('Test College');

    await page
      .getByPlaceholder('College Code *')
      .fill('TEST123');

    await page
      .getByPlaceholder('Contact Person Name *')
      .fill('Test Contact');

    await page
      .getByPlaceholder('Official Email *')
      .fill('contact@example.com');

    await page
      .getByPlaceholder('10-digit Phone *')
      .fill('1234');

    await page
      .getByPlaceholder('Create Password *')
      .fill(DEMO_PASSWORD);

    await page
      .getByPlaceholder('Confirm Password *')
      .fill(DEMO_PASSWORD);

    await page
      .getByRole('button', {
        name: 'Submit College Registration'
      })
      .click();

    await expect(
      page.getByText(
        'Contact phone must be exactly 10 digits.'
      )
    ).toBeVisible();
  });

  test('college registration rejects weak password', async ({ page }) => {
    await page.goto('/register-college');

    await page
      .getByPlaceholder('College / Institution Name *')
      .fill('Test College');

    await page
      .getByPlaceholder('College Code *')
      .fill('TEST123');

    await page
      .getByPlaceholder('Contact Person Name *')
      .fill('Test Contact');

    await page
      .getByPlaceholder('Official Email *')
      .fill('contact@example.com');

    await page
      .getByPlaceholder('10-digit Phone *')
      .fill('1234567890');

    await page
      .getByPlaceholder('Create Password *')
      .fill('weakpass');

    await page
      .getByPlaceholder('Confirm Password *')
      .fill('weakpass');

    await page
      .getByRole('button', {
        name: 'Submit College Registration'
      })
      .click();

    await expect(
      page.getByText(
        /Password must be at least 8 characters/i
      )
    ).toBeVisible();
  });

  test('college registration rejects mismatched passwords', async ({ page }) => {
    await page.goto('/register-college');

    await page
      .getByPlaceholder('College / Institution Name *')
      .fill('Test College');

    await page
      .getByPlaceholder('College Code *')
      .fill('TEST124');

    await page
      .getByPlaceholder('Contact Person Name *')
      .fill('Test Contact');

    await page
      .getByPlaceholder('Official Email *')
      .fill('contact@example.com');

    await page
      .getByPlaceholder('10-digit Phone *')
      .fill('1234567890');

    await page
      .getByPlaceholder('Create Password *')
      .fill(DEMO_PASSWORD);

    await page
      .getByPlaceholder('Confirm Password *')
      .fill('Different1');

    await page
      .getByRole('button', {
        name: 'Submit College Registration'
      })
      .click();

    await expect(
      page.getByText('Passwords do not match.')
    ).toBeVisible();
  });

  test('successful college application submission and status lookup', async ({ page }) => {
    const suffix = await unique('E2E');

    const code =
      `QA${suffix.replace(/\D/g, '').slice(-8) || Date.now().toString().slice(-8)}`
        .slice(0, 12);

    const contactEmail =
      `qmetric_${suffix}@example.com`;

    await page.goto('/register-college');

    await page
      .getByPlaceholder('College / Institution Name *')
      .fill(`QMetric QA ${suffix}`);

    await page
      .getByPlaceholder('College Code *')
      .fill(code);

    await page
      .getByPlaceholder('Address')
      .fill('QA Campus');

    await page
      .getByPlaceholder('City')
      .fill('Nagpur');

    await page
      .getByPlaceholder('State')
      .fill('Maharashtra');

    await page
      .getByPlaceholder('Contact Person Name *')
      .fill('QA Contact');

    await page
      .getByPlaceholder('Official Email *')
      .fill(contactEmail);

    await page
      .getByPlaceholder('10-digit Phone *')
      .fill('9012345678');

    await page
      .getByPlaceholder('Create Password *')
      .fill(DEMO_PASSWORD);

    await page
      .getByPlaceholder('Confirm Password *')
      .fill(DEMO_PASSWORD);

    await page
      .getByRole('button', {
        name: 'Submit College Registration'
      })
      .click();

    await expect(
      page.getByText(
        'Application submitted successfully'
      )
    ).toBeVisible();

    const appId = page.locator('.font-mono').first();

    await expect(appId).toHaveText(
      /^[a-f0-9]{24}$/i
    );

    const id = (
      await appId.textContent()
    ).trim();

    await page
      .getByRole('button', {
        name: 'Submit Another Application'
      })
      .click();

    await page
      .getByPlaceholder('Paste application ID')
      .fill(id);

    await page
      .getByRole('button', {
        name: 'Check Status'
      })
      .click();

    await expect(
      page.getByText(`Code: ${code}`, {
        exact: true
      })
    ).toBeVisible();

    await expect(
      page.getByText(/Status:/)
    ).toBeVisible();
  });

  test('college application status lookup validates empty ID', async ({ page }) => {
    await page.goto('/register-college');

    await page
      .getByRole('button', {
        name: 'Check Status'
      })
      .click();

    await expect(
      page.getByText('Enter your application ID.')
    ).toBeVisible();
  });

  test('active colleges are available to affiliated registration', async ({ page }) => {
    await page.goto('/register');

    const collegeOption = page.locator(
      'select option',
      {
        hasText: 'QMetric Demo College 1 (QMC01)'
      }
    );

    await expect(collegeOption).toHaveCount(1);
  });

  test('duplicate college application code is rejected by API', async ({ request }) => {
    const college = await getCollegeByCode(
      request,
      'QMC01'
    );

    const result = await request.post(
      `${API_URL}/auth/college-applications`,
      {
        data: {
          collegeName: college.name,
          collegeCode: college.code,
          address: 'Duplicate Attempt',
          city: 'Nagpur',
          state: 'Maharashtra',
          contactName: 'Duplicate Test',
          contactEmail:
            `duplicate_${Date.now()}@example.com`,
          contactPhone: '9012345679',
          password: DEMO_PASSWORD,
        },
      }
    );

    expect([400, 409]).toContain(
      result.status()
    );
  });

  test('invalid college application ID returns an error', async ({ page }) => {
    await page.goto('/register-college');

    await page
      .getByPlaceholder('Paste application ID')
      .fill('invalid-id');

    await page
      .getByRole('button', {
        name: 'Check Status'
      })
      .click();

    await expect(
      page.locator('p.text-red-400').first()
    ).toBeVisible();
  });
});

// Successful user registration requires a valid Turnstile token/verification environment.
test.describe('Registration success paths (CAPTCHA environment required)', () => {
  test.skip(
    !process.env.RUN_CAPTCHA_TESTS,
    'Set RUN_CAPTCHA_TESTS=1 to run external Turnstile-dependent registration tests.'
  );

  test('API can register a unique independent teacher', async ({ request }) => {
    test.skip(
      !process.env.TURNSTILE_TEST_TOKEN,
      'Set TURNSTILE_TEST_TOKEN when backend requires a server-side token.'
    );

    const suffix = await unique('teacher');

    const result = await request.post(
      `${API_URL}/auth/create-account`,
      {
        multipart: {
          userName: `qa_${suffix}`,
          email: `qa_${suffix}@example.com`,
          password: DEMO_PASSWORD,
          fullName: 'QMetric QA Teacher',
          phone: String(
            Math.floor(
              7000000000 +
              Math.random() * 299999999
            )
          ).slice(0, 10),
          position: 'Other',
          signupIntent: 'independent',
          role: 'teacher',
          turnstileToken:
            process.env.TURNSTILE_TEST_TOKEN,
        },
      }
    );

    expect([201, 409]).toContain(
      result.status()
    );
  });
});