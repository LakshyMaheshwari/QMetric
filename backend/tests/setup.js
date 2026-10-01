const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Mock Cloudflare Turnstile verification for login/register tests.
// Must include ok: true — verifyTurnstile() now checks response.ok before
// calling response.json(), so a mock without it throws and returns 503.
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  })
);
jest.setTimeout(60000);

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.ACCESS_TOKEN_SECRET = 'test-secret-key-for-jest-only-32-chars-minimum';
  process.env.ADMIN_SECRET_KEY = 'test-admin-secret';
  process.env.CSRF_SECRET = 'test-csrf-secret-key-min-32-chars-long-for-testing';
  process.env.TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA';
  process.env.FRONTEND_URL = 'http://localhost:3000';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;

  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  jest.clearAllMocks();
  global.fetch.mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  );
});

