# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 06-reviewer.spec.js >> Reviewer workflow >> pending reviewer modal exposes all three decisions
- Location: tests\06-reviewer.spec.js:70:3

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('tr').filter({ hasText: 'CS302' }).first().getByRole('button', { name: /Review/ })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e6]:
      - generic [ref=e7] [cursor=pointer]: QMetric
      - generic [ref=e13]:
        - button "Home" [ref=e14] [cursor=pointer]
        - link "Features" [ref=e19] [cursor=pointer]:
          - /url: "#features"
        - link "About" [ref=e20] [cursor=pointer]:
          - /url: "#about"
        - button "Credits" [ref=e21] [cursor=pointer]
      - button "D" [ref=e30] [cursor=pointer]
  - generic [ref=e32]:
    - generic [ref=e33]:
      - generic [ref=e34]:
        - generic [ref=e35]:
          - generic [ref=e36]: QMetric Demo College 1
          - generic [ref=e40]: Reviewer Portal
        - heading "📋 Paper Reviewer Dashboard" [level=1] [ref=e41]
        - paragraph [ref=e42]: Welcome, Demo Reviewer 1. Audit assessments, examine Bloom taxonomy compliance, and submit feedback.
      - button "Refresh papers" [ref=e44] [cursor=pointer]
    - generic [ref=e50]:
      - generic [ref=e51]:
        - generic [ref=e52]: Pending
        - generic [ref=e57]: "0"
        - paragraph [ref=e58]: Awaiting audit
      - generic [ref=e59]:
        - generic [ref=e60]: Approved
        - generic [ref=e65]: "2"
        - paragraph [ref=e66]: Validated
      - generic [ref=e67]:
        - generic [ref=e68]: Revision
        - generic [ref=e73]: "2"
        - paragraph [ref=e74]: Changes requested
      - generic [ref=e75]:
        - generic [ref=e76]: Rejected
        - generic [ref=e82]: "1"
        - paragraph [ref=e83]: Non-compliant
      - generic [ref=e84]:
        - generic [ref=e85]: Total
        - generic [ref=e90]: "8"
        - paragraph [ref=e91]: College papers
      - generic [ref=e92]:
        - generic [ref=e93]: My Reviews
        - generic [ref=e99]: "5"
        - paragraph [ref=e100]: Reviewed by you
    - generic [ref=e101]:
      - generic [ref=e102]:
        - textbox "Search course, code, teacher..." [ref=e107]
        - combobox [ref=e111]:
          - option "All Review Statuses" [selected]
          - option "⏳ Pending Review"
          - option "✅ Approved"
          - option "🔄 Needs Revision"
          - option "❌ Rejected"
      - generic [ref=e112]:
        - text: Showing
        - strong [ref=e113]: "8"
        - text: papers
    - table [ref=e116]:
      - rowgroup [ref=e117]:
        - row [ref=e118]:
          - columnheader "Course / Subject" [ref=e119]
          - columnheader "Uploaded By" [ref=e120]
          - columnheader "Questions" [ref=e121]
          - columnheader "Quality Score" [ref=e122]
          - columnheader "Review Status" [ref=e123]
          - columnheader "Action" [ref=e124]
      - rowgroup [ref=e125]:
        - row [ref=e126]:
          - cell "DBMS 1111 Sem 2" [ref=e127]:
            - generic [ref=e132]:
              - generic [ref=e133]: DBMS
              - generic [ref=e134]:
                - generic [ref=e135]: "1111"
                - generic [ref=e136]: Sem 2
          - cell "Demo Teacher One 1790968309657 Computer Science" [ref=e137]:
            - generic [ref=e138]: Demo Teacher One 1790968309657
            - generic [ref=e143]: Computer Science
          - cell "3items" [ref=e144]
          - cell "70.03%" [ref=e145]
          - cell "Needs Revision by Demo Reviewer 1" [ref=e151]:
            - generic [ref=e152]: Needs Revision
            - generic [ref=e157]: by Demo Reviewer 1
          - cell [ref=e158]:
            - button "👁️ View" [ref=e159] [cursor=pointer]:
              - generic [ref=e160]: 👁️
              - generic [ref=e161]: View
        - row [ref=e162]:
          - cell "DBMS 1111 Sem 2" [ref=e163]:
            - generic [ref=e168]:
              - generic [ref=e169]: DBMS
              - generic [ref=e170]:
                - generic [ref=e171]: "1111"
                - generic [ref=e172]: Sem 2
          - cell "Demo Teacher One 1790968309657 Computer Science" [ref=e173]:
            - generic [ref=e174]: Demo Teacher One 1790968309657
            - generic [ref=e179]: Computer Science
          - cell "3items" [ref=e180]
          - cell "67.5%" [ref=e181]
          - cell "Pending" [ref=e187]
          - cell [ref=e193]:
            - button "👁️ View" [ref=e194] [cursor=pointer]:
              - generic [ref=e195]: 👁️
              - generic [ref=e196]: View
        - row [ref=e197]:
          - cell "DBMS 1111 Sem 2" [ref=e198]:
            - generic [ref=e203]:
              - generic [ref=e204]: DBMS
              - generic [ref=e205]:
                - generic [ref=e206]: "1111"
                - generic [ref=e207]: Sem 2
          - cell "Demo Teacher One 1790968309657 Computer Science" [ref=e208]:
            - generic [ref=e209]: Demo Teacher One 1790968309657
            - generic [ref=e214]: Computer Science
          - cell "3items" [ref=e215]
          - cell "69.79%" [ref=e216]
          - cell "Pending" [ref=e222]
          - cell [ref=e228]:
            - button "👁️ View" [ref=e229] [cursor=pointer]:
              - generic [ref=e230]: 👁️
              - generic [ref=e231]: View
        - row [ref=e232]:
          - cell "DBMS 1111 Sem 2" [ref=e233]:
            - generic [ref=e238]:
              - generic [ref=e239]: DBMS
              - generic [ref=e240]:
                - generic [ref=e241]: "1111"
                - generic [ref=e242]: Sem 2
          - cell "Demo Teacher One 1790968309657 Computer Science" [ref=e243]:
            - generic [ref=e244]: Demo Teacher One 1790968309657
            - generic [ref=e249]: Computer Science
          - cell "3items" [ref=e250]
          - cell "76.39%" [ref=e251]
          - cell "Pending" [ref=e257]
          - cell [ref=e263]:
            - button "👁️ View" [ref=e264] [cursor=pointer]:
              - generic [ref=e265]: 👁️
              - generic [ref=e266]: View
        - row [ref=e267]:
          - cell "Computer Networks CS304 Sem 6" [ref=e268]:
            - generic [ref=e273]:
              - generic [ref=e274]: Computer Networks
              - generic [ref=e275]:
                - generic [ref=e276]: CS304
                - generic [ref=e277]: Sem 6
          - cell "Demo Teacher One 1790968309657 Computer Science" [ref=e278]:
            - generic [ref=e279]: Demo Teacher One 1790968309657
            - generic [ref=e284]: Computer Science
          - cell "1items" [ref=e285]
          - cell "61%" [ref=e286]
          - cell "Rejected by Demo Reviewer 1" [ref=e292]:
            - generic [ref=e293]: Rejected
            - generic [ref=e299]: by Demo Reviewer 1
          - cell [ref=e300]:
            - button "👁️ View" [ref=e301] [cursor=pointer]:
              - generic [ref=e302]: 👁️
              - generic [ref=e303]: View
        - row [ref=e304]:
          - cell "Operating Systems CS303 Sem 6" [ref=e305]:
            - generic [ref=e310]:
              - generic [ref=e311]: Operating Systems
              - generic [ref=e312]:
                - generic [ref=e313]: CS303
                - generic [ref=e314]: Sem 6
          - cell "Demo Teacher One 1790968309657 Computer Science" [ref=e315]:
            - generic [ref=e316]: Demo Teacher One 1790968309657
            - generic [ref=e321]: Computer Science
          - cell "1items" [ref=e322]
          - cell "68%" [ref=e323]
          - cell "Needs Revision by Demo Reviewer 1" [ref=e329]:
            - generic [ref=e330]: Needs Revision
            - generic [ref=e335]: by Demo Reviewer 1
          - cell [ref=e336]:
            - button "👁️ View" [ref=e337] [cursor=pointer]:
              - generic [ref=e338]: 👁️
              - generic [ref=e339]: View
        - row [ref=e340]:
          - cell "Database Management Systems CS302 Sem 5" [ref=e341]:
            - generic [ref=e346]:
              - generic [ref=e347]: Database Management Systems
              - generic [ref=e348]:
                - generic [ref=e349]: CS302
                - generic [ref=e350]: Sem 5
          - cell "Demo Teacher One 1790968309657 Computer Science" [ref=e351]:
            - generic [ref=e352]: Demo Teacher One 1790968309657
            - generic [ref=e357]: Computer Science
          - cell "1items" [ref=e358]
          - cell "76%" [ref=e359]
          - cell "Approved by Demo Reviewer 1" [ref=e365]:
            - generic [ref=e366]: Approved
            - generic [ref=e371]: by Demo Reviewer 1
          - cell [ref=e372]:
            - button "👁️ View" [ref=e373] [cursor=pointer]:
              - generic [ref=e374]: 👁️
              - generic [ref=e375]: View
        - row [ref=e376]:
          - cell "Data Structures and Algorithms CS301 Sem 5" [ref=e377]:
            - generic [ref=e382]:
              - generic [ref=e383]: Data Structures and Algorithms
              - generic [ref=e384]:
                - generic [ref=e385]: CS301
                - generic [ref=e386]: Sem 5
          - cell "Demo Teacher One 1790968309657 Computer Science" [ref=e387]:
            - generic [ref=e388]: Demo Teacher One 1790968309657
            - generic [ref=e393]: Computer Science
          - cell "1items" [ref=e394]
          - cell "88%" [ref=e395]
          - cell "Approved by Demo Reviewer 1" [ref=e401]:
            - generic [ref=e402]: Approved
            - generic [ref=e407]: by Demo Reviewer 1
          - cell [ref=e408]:
            - button "👁️ View" [ref=e409] [cursor=pointer]:
              - generic [ref=e410]: 👁️
              - generic [ref=e411]: View
  - contentinfo [ref=e412]:
    - generic [ref=e413]:
      - generic [ref=e414]:
        - generic [ref=e415]:
          - generic [ref=e416]: QMetric
          - paragraph [ref=e422]: Ensuring academic excellence through systematic question paper quality analysis for engineering education.
        - generic [ref=e423]:
          - heading "Analysis Features" [level=4] [ref=e424]
          - generic [ref=e425]:
            - link "CO Mapping" [ref=e426] [cursor=pointer]:
              - /url: "#"
            - link "Bloom's Taxonomy" [ref=e427] [cursor=pointer]:
              - /url: "#"
            - link "Module Coverage" [ref=e428] [cursor=pointer]:
              - /url: "#"
        - generic [ref=e429]:
          - heading "Support" [level=4] [ref=e430]
          - generic [ref=e431]:
            - link "User Guide" [ref=e432] [cursor=pointer]:
              - /url: "#"
            - link "Technical Support" [ref=e433] [cursor=pointer]:
              - /url: "#"
            - link "Quality Standards" [ref=e434] [cursor=pointer]:
              - /url: "#"
        - generic [ref=e435]:
          - heading "Company" [level=4] [ref=e436]
          - generic [ref=e437]:
            - link "About Project" [ref=e438] [cursor=pointer]:
              - /url: "#about"
            - link "Research" [ref=e439] [cursor=pointer]:
              - /url: "#"
            - link "Our Team" [ref=e440] [cursor=pointer]:
              - /url: /team
      - generic [ref=e441]:
        - generic [ref=e442]: © 2025 QMetric — Automated Question Paper Quality Analysis System. All rights reserved.
        - generic [ref=e443]:
          - generic [ref=e444]: Built
          - generic [ref=e445]: by the QMetric Team
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
  42  |     expect(paper?._id).toBeTruthy();
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
> 77  |     await row.getByRole('button', { name: /Review/ }).click();
      |                                                       ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
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
  143 |       '/reviewer/papers?page=1&limit=100&status=all'
  144 |     );
  145 | 
  146 |     expect(result.response.status()).toBe(200);
  147 | 
  148 |     const colleges = await api(
  149 |       request,
  150 |       'superAdmin',
  151 |       'GET',
  152 |       '/super-admin/colleges?page=1&limit=100'
  153 |     );
  154 | 
  155 |     expect(colleges.response.status()).toBe(200);
  156 | 
  157 |     const qmc01 = (colleges.body.colleges || [])
  158 |       .find((college) => college.code === 'QMC01');
  159 | 
  160 |     expect(qmc01?._id).toBeTruthy();
  161 | 
  162 |     const paperCollegeIds = (result.body.papers || []).map((paper) =>
  163 |       String(paper.collegeId?._id || paper.collegeId || '')
  164 |     );
  165 | 
  166 |     expect(paperCollegeIds.length).toBeGreaterThan(0);
  167 | 
  168 |     expect(
  169 |       paperCollegeIds.every(
  170 |         (id) => id === String(qmc01._id)
  171 |       )
  172 |     ).toBeTruthy();
  173 |   });
  174 | 
  175 |   test('reviewer cannot review own paper', async ({ request }) => {
  176 |     const teacherOwned = await findPaper(request, 'teacher1', {
  177 |       code: 'CS302'
```