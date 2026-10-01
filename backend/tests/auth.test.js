const request = require('supertest');
const app = require('../index');
const { createTestUser, createTestCollege, getCookieString } = require('./helpers');
const User = require('../Model/user');

describe('Auth Endpoints', () => {
  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const college = await createTestCollege();
      await createTestUser({
        role: 'teacher',
        email: 'login@test.com',
        password: 'ValidPass123',
        collegeId: college._id,
        phone: '9876543210',
      });

      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@test.com',
          password: 'ValidPass123',
          turnstileToken: 'test-token',
        });

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('login@test.com');
      expect(res.body.user.role).toBe('teacher');
      expect(res.body.accessToken).toBeUndefined();
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toMatch(/accessToken=/);
      expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'not-an-email',
          password: 'ValidPass123',
          turnstileToken: 'test-token',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(true);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.details[0].field).toBe('email');
    });

    it('should reject wrong password with generic message', async () => {
      const college = await createTestCollege();
      await createTestUser({
        role: 'teacher',
        email: 'wrongpass@test.com',
        password: 'CorrectPass123',
        collegeId: college._id,
        phone: '9876543211',
      });

      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'wrongpass@test.com',
          password: 'WrongPass123',
          turnstileToken: 'test-token',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe(true);
      expect(res.body.message).toMatch(/invalid/i);
      expect(res.body.message).not.toMatch(/user does not exist/i);
    });

    it('should reject non-existent user with same generic message', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'AnyPass123',
          turnstileToken: 'test-token',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid/i);
    });
  });

  describe('POST /auth/logout', () => {
    it('should clear accessToken cookie', async () => {
      const college = await createTestCollege();
      const user = await createTestUser({ role: 'teacher', collegeId: college._id });
      const cookie = getCookieString(user);

      const res = await request(app)
        .post('/auth/logout')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.error).toBe(false);
      expect(res.headers['set-cookie'][0]).toMatch(/accessToken=;/);
    });

    it('does not clear another user refresh state from a forged access token', async () => {
      const college = await createTestCollege();
      const victim = await createTestUser({ role: 'teacher', collegeId: college._id });
      victim.refreshTokenHash = 'victim-refresh-hash';
      victim.refreshTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await victim.save({ validateBeforeSave: false });

      const forgedToken = require('jsonwebtoken').sign(
        { userId: victim._id },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/auth/logout')
        .set('Cookie', `accessToken=${forgedToken}`);

      expect(res.status).toBe(200);
      const reloaded = await User.findById(victim._id).select('+refreshTokenHash +refreshTokenExpiresAt');
      expect(reloaded.refreshTokenHash).toBe('victim-refresh-hash');
    });
  });

  describe('GET /auth/profile', () => {
    it('should return user profile when authenticated', async () => {
      const college = await createTestCollege();
      const user = await createTestUser({ role: 'teacher', collegeId: college._id });
      const cookie = getCookieString(user);

      const res = await request(app)
        .get('/auth/profile')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.user?._id).toBeDefined();
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/auth/profile');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe(true);
      expect(res.body.message).toMatch(/authorization/i);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/auth/profile')
        .set('Cookie', 'accessToken=invalid-token');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe(true);
    });
  });
});
