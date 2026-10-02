# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 06-reviewer.spec.js >> Reviewer workflow >> reviewer can open seeded pending paper
- Location: tests\06-reviewer.spec.js:35:3

# Error details

```
Error: expect(received).toBeTruthy()

Received: undefined
```

# Test source

```ts
  1   | const { test, expect } = require('@playwright/test');
  2   | const { loginAs, api, findPaper } = require('./helpers');
  3   | 
  4   | test.describe('Reviewer workflow', () => {
  5   | 
  6   |   test('reviewer dashboard loads stats and controls', async ({ page }) => {
  7   |     await loginAs(page, 'reviewer1', '/reviewer');
  8   | 
  9   |     await expect(
  10  |       page.getByText(/Reviewer Dashboard|Review Papers/i).first()
  11  |     ).toBeVisible();
  12  | 
  13  |     await expect(
  14  |       page.getByText(/Pending/i).first()
  15  |     ).toBeVisible();
  16  | 
  17  |     await expect(
  18  |       page.getByPlaceholder('Search course, code, teacher...')
  19  |     ).toBeVisible();
  20  |   });
  21  | 
  22  |   test('reviewer status filter contains all supported states', async ({ page }) => {
  23  |     await loginAs(page, 'reviewer1', '/reviewer');
  24  | 
  25  |     const select = page.locator('select').first();
  26  |     const options = await select.locator('option').allTextContents();
  27  |     const joined = options.join(' ');
  28  | 
  29  |     expect(joined).toMatch(/pending/i);
  30  |     expect(joined).toMatch(/approved/i);
  31  |     expect(joined).toMatch(/needs_revision|needs revision/i);
  32  |     expect(joined).toMatch(/rejected/i);
  33  |   });
  34  | 
  35  |   test('reviewer can open seeded pending paper', async ({ page, request }) => {
  36  |     const paper = await findPaper(request, 'reviewer1', {
  37  |       code: 'CS302',
  38  |       status: 'pending',
  39  |       endpoint: '/reviewer/papers'
  40  |     });
  41  | 
> 42  |     expect(paper?._id).toBeTruthy();
      |                        ^ Error: expect(received).toBeTruthy()
  43  |     expect(paper?.reviewStatus).toBe('pending');
  44  | 
  45  |     await loginAs(page, 'reviewer1', '/reviewer');
  46  | 
  47  |     await expect(
  48  |       page.getByText('Database Management Systems')
  49  |     ).toBeVisible();
  50  | 
  51  |     const row = page.locator('tr').filter({ hasText: 'CS302' }).first();
  52  | 
  53  |     await expect(row).toBeVisible();
  54  | 
  55  |     await row.getByRole('button', { name: 'Review' }).click();
  56  | 
  57  |     await expect(
  58  |       page.getByText('Review Assessment Paper')
  59  |     ).toBeVisible();
  60  | 
  61  |     await expect(
  62  |       page.getByText(/Questions:/)
  63  |     ).toBeVisible();
  64  | 
  65  |     await expect(
  66  |       page.getByText(/Quality Score:/)
  67  |     ).toBeVisible();
  68  |   });
  69  | 
  70  |   test('pending reviewer modal exposes all three decisions', async ({ page }) => {
  71  |     await loginAs(page, 'reviewer1', '/reviewer');
  72  | 
  73  |     const row = page.locator('tr').filter({ hasText: 'CS302' }).first();
  74  | 
  75  |     await expect(row).toBeVisible();
  76  | 
  77  |     await row.getByRole('button', { name: /Review/ }).click();
  78  | 
  79  |     await expect(
  80  |       page.getByRole('button', { name: 'Approve' })
  81  |     ).toBeEnabled();
  82  | 
  83  |     await expect(
  84  |       page.getByRole('button', { name: 'Revision' })
  85  |     ).toBeEnabled();
  86  | 
  87  |     await expect(
  88  |       page.getByRole('button', { name: 'Reject' })
  89  |     ).toBeEnabled();
  90  | 
  91  |     await expect(
  92  |       page.getByRole('button', { name: 'Submit Review' })
  93  |     ).toBeVisible();
  94  |   });
  95  | 
  96  |   test('pending reviewer can select each decision without submitting', async ({ page }) => {
  97  |     await loginAs(page, 'reviewer1', '/reviewer');
  98  | 
  99  |     const row = page.locator('tr').filter({ hasText: 'CS302' }).first();
  100 | 
  101 |     await expect(row).toBeVisible();
  102 | 
  103 |     await row.getByRole('button', { name: /Review/ }).click();
  104 | 
  105 |     for (const name of ['Approve', 'Revision', 'Reject']) {
  106 |       await page.getByRole('button', { name }).click();
  107 | 
  108 |       await expect(
  109 |         page.getByRole('button', { name: 'Submit Review' })
  110 |       ).toBeVisible();
  111 |     }
  112 |   });
  113 | 
  114 |   test('approved/rejected/revision papers are read-only in reviewer API', async ({ request }) => {
  115 |     for (const code of ['CS301', 'CS303', 'CS304']) {
  116 |       const paper = await findPaper(request, 'reviewer1', {
  117 |         code,
  118 |         endpoint: '/reviewer/papers'
  119 |       });
  120 | 
  121 |       expect(paper?._id).toBeTruthy();
  122 | 
  123 |       const result = await api(
  124 |         request,
  125 |         'reviewer1',
  126 |         'PUT',
  127 |         `/reviewer/papers/${paper._id}/review`,
  128 |         {
  129 |           action: 'approved',
  130 |           comments: 'Should not be accepted because it is not pending.',
  131 |         }
  132 |       );
  133 | 
  134 |       expect([400, 409]).toContain(result.response.status());
  135 |     }
  136 |   });
  137 | 
  138 |   test('reviewer college isolation excludes QMC02 papers from QMC01 reviewer', async ({ request }) => {
  139 |     const result = await api(
  140 |       request,
  141 |       'reviewer1',
  142 |       'GET',
```