const fs = require('fs');
const path = require('path');
const AuditLog = require('../Model/AuditLog');
const { logAudit } = require('../utils/auditLog');
const { AUDIT_ACTION_VALUES } = require('../utils/auditActions');
const { createTestUser, createTestCollege } = require('./helpers');

describe('Audit log action registry', () => {
  it('every action literal used in controllers/ is registered in utils/auditActions.js', () => {
    const dir = path.join(__dirname, '..', 'controllers');
    const used = new Set();
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.js'))) {
      const src = fs.readFileSync(path.join(dir, f), 'utf8');
      for (const line of src.split(/\r?\n/)) {
        if (line.trim().startsWith('//')) continue;
        const m = line.match(/^\s*action:\s*(.+),?\s*$/);
        if (!m) continue;
        for (const s of m[1].matchAll(/'([^']+)'/g)) used.add(s[1]);
      }
    }
    expect(used.size).toBeGreaterThan(10);
    const missing = [...used].filter((a) => !AUDIT_ACTION_VALUES.includes(a));
    expect(missing).toEqual([]);
  });

  it('persists previously-dropped actions (no silent validation failure)', async () => {
    const college = await createTestCollege();
    const user = await createTestUser({ role: 'teacher', collegeId: college._id });
    for (const action of ['REGISTER_STUDENT', 'APPROVE_TEACHER', 'RESEND_REVIEW_EMAIL', 'verified_question.correction_submitted', 'LEARNED_VERB_CREATED']) {
      await logAudit({ userId: user._id, action, resource: `User:${user._id}` });
    }
    expect(await AuditLog.countDocuments({ userId: user._id })).toBe(5);
  });
});
