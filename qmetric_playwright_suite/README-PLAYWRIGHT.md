# QMetric Playwright Test Suite

This suite was generated against the current QMetric frontend + ACMS backend contract in the supplied project files.

## What it covers

- Public pages and 404
- Protected routes and role redirects
- Dev-authenticated browser sessions for every seeded role
- Student dashboard/profile/upgrade paths
- Teacher dashboard, papers, result pages and upload form
- Reviewer dashboard, decision UI and review API validation
- College Admin dashboard, affiliation requests and tenant isolation
- Legacy Admin user management and paper endpoints
- Super Admin dashboard, college CRUD and college application review
- Learned Verb API CRUD
- Notifications API
- Health/readiness
- Cross-role authorization and cross-college data isolation
- Validation and negative cases

The test pack intentionally keeps backend-only features as API contract tests when there is no corresponding frontend screen in the supplied application.

## Demo data expected

The current backend demo seed uses:

- Password: `QMetricDemo@123`
- `superadmin@qmetric.test`
- `admin1@qmetric.test` … `admin5@qmetric.test`
- `reviewer1@qmetric.test` … `reviewer5@qmetric.test`
- `teacher1@qmetric.test` … `teacher5@qmetric.test`
- `independent1@qmetric.test`, `independent2@qmetric.test`
- `student1@qmetric.test`, `student2@qmetric.test`, `student3@qmetric.test`
- Colleges `QMC01` … `QMC05`
- Seeded papers `CS301` approved, `CS302` pending, `CS303` needs_revision, `CS304` rejected per college.

## Install

From the frontend project root:

```bash
npm i -D @playwright/test
npx playwright install
```

Copy this pack's `playwright.config.js`, `global-setup.js`, `tests/`, and `fixtures/` into the frontend project root.

## Run

Start the backend and frontend normally first.

Typical local URLs for the supplied project are:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:5000
```

Then:

```bash
npx playwright test
```

Open the report:

```bash
npx playwright show-report
```

## Cross-browser

Chromium runs the complete suite.

Firefox and WebKit run the tests tagged `@smoke` to avoid repeating destructive/state-changing workflows in three browsers. Run an individual browser explicitly when needed:

```bash
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Re-seeding

Some tests intentionally mutate demo records, such as review decisions, affiliation states, or role changes.

Before a fresh full run, use the backend seed scripts:

```bash
npm run seed:demo
npm run seed:demo-papers
```

Or let Playwright do that for you:

```text
RESET_DEMO=1
QMETRIC_BACKEND_DIR=../backend
```

Windows PowerShell:

```powershell
$env:RESET_DEMO="1"
$env:QMETRIC_BACKEND_DIR="..\backend"
npx playwright test
```

## Dev auth requirement

The seeded browser tests use the development-only `/dev/login` endpoint, so the backend must have:

```text
NODE_ENV != production
ENABLE_DEV_AUTH=true
```

The real login/registration flow uses Cloudflare Turnstile. The suite keeps the external CAPTCHA-dependent success test opt-in:

```powershell
$env:RUN_CAPTCHA_TESTS="1"
$env:TURNSTILE_TEST_TOKEN="..."
```

The rest of the suite does not require the production CAPTCHA service for authentication.

## Important note about a seeded-data test

`06-reviewer.spec.js` contains a direct authorization-negative self-review check. The supplied seeded dataset does not contain a reviewer-owned paper, so a true 403 self-review scenario cannot be produced from the public seeded accounts alone. The test therefore verifies the protected route with a teacher token and documents the missing reviewer-owned seed case. The backend unit/integration tests remain the source of truth for the actual reviewer-self-review rule.

## Known external/infrastructure limits

The supplied frontend has no dedicated screens for every backend feature. Cloudinary OCR, outbound email delivery, password reset token delivery, Redis behavior, real SMTP, and production Turnstile are not fully end-to-end browser-testable from a local deterministic suite without the corresponding external services/credentials. Those areas stay covered by the existing backend test suite and opt-in API checks where practical.
