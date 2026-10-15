'use strict';

const request = require('supertest');
const app = require('../index');
const User = require('../Model/user');
const AuditLog = require('../Model/AuditLog');
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const { createTestUser, createTestCollege, createSuperAdmin, getCookieString } = require('./helpers');

describe('Auth Extensions — Forgot/Reset Password, Refresh Token, Revoke Sessions, Bulk Audit', () => {
  let college, user, cookie;

  beforeEach(async () => {
    college = await createTestCollege();
    user = await createTestUser({
      role: 'teacher',
      email: 'teacher.recovery@test.com',
      password: 'OldPassword123!',
      collegeId: college._id,
      phone: '9876543201',
    });
    cookie = getCookieString(user);
  });

  describe('POST /auth/forgot-password', () => {
    it('generates a password reset token and returns success without leaking presence', async () => {
      const res = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'teacher.recovery@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);

      const updatedUser = await User.findById(user._id).select('+passwordResetToken +passwordResetExpires');
      expect(updatedUser.passwordResetToken).toBeDefined();
      expect(updatedUser.passwordResetExpires).toBeDefined();
      expect(new Date(updatedUser.passwordResetExpires).getTime()).toBeGreaterThan(Date.now());

      const audit = await AuditLog.findOne({ userId: user._id, action: 'FORGOT_PASSWORD' });
      expect(audit).toBeDefined();
    });

    it('returns generic 200 message when email does not exist (prevents account enumeration)', async () => {
      const res = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent.ghost@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.message).toMatch(/instructions have been sent/i);
    });

    it('rejects invalid email format with 400', async () => {
      const res = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'invalid-email-address' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(true);
    });
  });

  describe('POST /auth/reset-password/:token', () => {
    it('resets password when a valid token is provided and invalidates old sessions', async () => {
      const rawToken = 'test-raw-reset-token-123456';
      const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.passwordResetToken = hashed;
      user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();

      const newPassword = 'NewSecretPassword456!';
      const res = await request(app)
        .post(`/auth/reset-password/${rawToken}`)
        .send({ password: newPassword });

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.message).toMatch(/successful/i);

      // Verify DB state
      const updated = await User.findById(user._id).select('+password +passwordResetToken +passwordResetExpires');
      expect(updated.passwordResetToken).toBeNull();
      expect(updated.passwordResetExpires).toBeNull();
      expect(updated.passwordChangedAt).toBeDefined();

      const match = await bcrypt.compare(newPassword, updated.password);
      expect(match).toBe(true);

      const audit = await AuditLog.findOne({ userId: user._id, action: 'RESET_PASSWORD' });
      expect(audit).toBeDefined();
    });

    it('rejects expired or invalid reset token with 400', async () => {
      const res = await request(app)
        .post('/auth/reset-password/completely-bogus-token')
        .send({ password: 'ValidNewPass123!' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(true);
      expect(res.body.message).toMatch(/invalid or expired/i);
    });

    it('rejects weak password with 400', async () => {
      const rawToken = 'test-token-weak-check';
      const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
      user.passwordResetToken = hashed;
      user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();

      const res = await request(app)
        .post(`/auth/reset-password/${rawToken}`)
        .send({ password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(true);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates refresh token and issues a new access token', async () => {
      const rawRefresh = crypto.randomBytes(40).toString('hex');
      const hash = crypto.createHash('sha256').update(rawRefresh).digest('hex');

      user.refreshTokenHash = hash;
      user.refreshTokenExpiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      await user.save();

      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: rawRefresh });

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.refreshToken).not.toBe(rawRefresh); // token rotated

      const updated = await User.findById(user._id).select('+refreshTokenHash');
      const newHash = crypto.createHash('sha256').update(res.body.refreshToken).digest('hex');
      expect(updated.refreshTokenHash).toBe(newHash);
    });

    it('rejects invalid or expired refresh token with 401', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'unrecognized-invalid-token' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe(true);
    });
  });

  describe('POST /auth/revoke-all-sessions', () => {
    it('revokes all sessions and invalidates refresh token', async () => {
      const rawRefresh = crypto.randomBytes(40).toString('hex');
      const hash = crypto.createHash('sha256').update(rawRefresh).digest('hex');
      user.refreshTokenHash = hash;
      user.refreshTokenExpiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      await user.save();

      const res = await request(app)
        .post('/auth/revoke-all-sessions')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);

      const updated = await User.findById(user._id).select('+refreshTokenHash');
      expect(updated.refreshTokenHash).toBeNull();
      expect(updated.passwordChangedAt).toBeDefined();

      const audit = await AuditLog.findOne({ userId: user._id, action: 'REVOKE_ALL_SESSIONS' });
      expect(audit).toBeDefined();
    });

    it('rejects unauthenticated request with 401', async () => {
      const res = await request(app).post('/auth/revoke-all-sessions');
      expect(res.status).toBe(401);
    });
  });

  describe('Bulk register audit logging (C4)', () => {
    it('creates an audit log with BULK_REGISTER action when bulk registering users', async () => {
      const adminSecret = process.env.ADMIN_SECRET_KEY || 'test-admin-secret';
      const res = await request(app)
        .post('/auth/bulk-register')
        .set('X-Admin-Secret', adminSecret)
        .send({
          users: [
            {
              email: 'bulk.teacher1@test.com',
              fullName: 'Bulk Teacher One',
              userName: 'bulk_t1',
              phone: '9876543291',
              collegeId: college._id.toString(),
            },
          ],
          defaultPassword: 'TempPassword123!',
        });

      expect([200, 201, 207]).toContain(res.status);

      const audit = await AuditLog.findOne({ action: 'BULK_REGISTER' });
      expect(audit).toBeDefined();
      expect(audit.action).toBe('BULK_REGISTER');
    });
  });
});
