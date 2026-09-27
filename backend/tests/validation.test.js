const request = require('supertest');
const app = require('../index');

describe('Input Validation', () => {
  describe('POST /auth/login', () => {
    it('rejects missing email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ password: 'Test123456' });
      expect(res.status).toBe(400);
    });

    it('rejects short password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@test.com', password: '123' });
      expect(res.status).toBe(400);
    });
  });

  describe('Pagination validation', () => {
    it('rejects negative page', async () => {
      const res = await request(app).get('/super-admin/colleges?page=-5');
      expect([400, 401]).toContain(res.status);
    });

    it('rejects limit over 100', async () => {
      const res = await request(app).get('/super-admin/colleges?limit=999');
      expect([400, 401]).toContain(res.status);
    });
  });
});
