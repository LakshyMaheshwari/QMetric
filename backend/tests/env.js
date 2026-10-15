process.env.NODE_ENV = 'test';

process.env.MONGO_URI =
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/qmetric_test';

process.env.CLOUDINARY_URL =
    process.env.CLOUDINARY_URL ||
    'cloudinary://test:test@test';

process.env.ACCESS_TOKEN_SECRET =
    process.env.ACCESS_TOKEN_SECRET ||
    'test-access-secret-qmetric-32-characters';

process.env.REFRESH_TOKEN_SECRET =
    process.env.REFRESH_TOKEN_SECRET ||
    'test-refresh-secret-qmetric-32-characters';

process.env.JWT_SECRET =
    process.env.JWT_SECRET ||
    'test-jwt-secret-qmetric-32-characters';

process.env.ADMIN_SECRET_KEY =
    process.env.ADMIN_SECRET_KEY ||
    'test-admin-secret-qmetric-32-characters';

process.env.TURNSTILE_SECRET_KEY =
    process.env.TURNSTILE_SECRET_KEY ||
    '1x0000000000000000000000000000000AA';

process.env.TURNSTILE_SITE_KEY =
    process.env.TURNSTILE_SITE_KEY ||
    '1x00000000000000000000AB';

process.env.ENABLE_DEV_AUTH = 'true';



// process.env.NODE_ENV = 'test';
// process.env.ACCESS_TOKEN_SECRET = 'test-secret-key-for-jest-only-32-chars-minimum';
// process.env.ADMIN_SECRET_KEY = 'test-admin-secret';
// process.env.CSRF_SECRET = 'test-csrf-secret-key-min-32-chars-long-for-testing';
// process.env.TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA';
// process.env.FRONTEND_URL = 'http://localhost:3000';
