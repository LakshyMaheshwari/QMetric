const request = require('supertest');
const app = require('../index');
const { createTestUser, createTestCollege, createCollegeAdmin, createTestPaper, getCookieString } = require('./helpers');

describe('GET /college-admin/metadata-analytics', () => {
  it('returns real question/difficulty totals (regression: broken .select projection)', async () => {
    const college = await createTestCollege();
    const admin = await createCollegeAdmin(college);
    const teacher = await createTestUser({ role: 'teacher', collegeId: college._id });
    await createTestPaper({
      userId: teacher._id,
      collegeId: college._id,
      collectedData: [{
        QuestionData: [
          { Question: 'q1', Difficulty: 'Easy', 'Question Type': 'MCQ' },
          { Question: 'q2', Difficulty: 'hard', 'Question Type': 'Essay' },
          { Question: 'q3', Difficulty: 'Medium', 'Question Type': 'MCQ' },
        ],
      }],
    });

    const res = await request(app).get('/college-admin/metadata-analytics').set('Cookie', getCookieString(admin));
    expect(res.status).toBe(200);
    const a = res.body.analytics;
    expect(a.totalPapers).toBe(1);
    expect(a.totalQuestions).toBe(3);
    expect(a.difficultyTotals).toMatchObject({ Easy: 1, Medium: 1, Hard: 1 });
    expect(a.questionTypeTotals.MCQ).toBe(2);
  });

  it("does not include another college's papers", async () => {
    const [c1, c2] = [await createTestCollege(), await createTestCollege()];
    const admin = await createCollegeAdmin(c1);
    const t2 = await createTestUser({ role: 'teacher', collegeId: c2._id });
    await createTestPaper({ userId: t2._id, collegeId: c2._id });
    const res = await request(app).get('/college-admin/metadata-analytics').set('Cookie', getCookieString(admin));
    expect(res.body.analytics.totalPapers).toBe(0);
  });
});
