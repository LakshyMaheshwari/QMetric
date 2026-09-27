require('dotenv').config();

require('./config/validateEnv')();

const notificationsRouter = require('./routes/notification');
const csrfRouter = require('./routes/csrf');
const createError = require('http-errors');
const express     = require('express');
const path        = require('node:path');
const cookieParser = require('cookie-parser');
const morgan      = require('morgan');
const cors        = require('cors');
const mongoose    = require('mongoose');
const rateLimit   = require('express-rate-limit');
const helmet      = require('helmet');
const setupSwagger = require('./config/swagger');
const { csrfWithBearerSkip } = require('./middleware/csrf');

const fileRouter  = require('./routes/file');
const usersRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const superAdminRouter = require('./routes/superAdmin');
const collegeAdminRouter = require('./routes/collegeAdmin');
const reviewerRouter = require('./routes/reviewer');
const teacherRouter = require('./routes/teacher');
const devAuthRouter = require('./routes/devAuth');

const app = express();

// ─── Security Headers ──────────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://challenges.cloudflare.com',
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
            ],
            imgSrc: [
                "'self'",
                'data:',
                'https://res.cloudinary.com',
            ],
            connectSrc: [
                "'self'",
                'https://challenges.cloudflare.com',
                ...(process.env.NODE_ENV !== 'production'
                    ? ['http://localhost:3000', 'http://localhost:3001']
                    : [process.env.FRONTEND_URL].filter(Boolean)),
            ],
            frameSrc: [
                "'self'",
                'https://challenges.cloudflare.com',
            ],
            fontSrc: ["'self'", 'data:'],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    hsts: process.env.NODE_ENV === 'production'
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    noSniff: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    ieNoOpen: true,
}));

// ─── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'https://q-metric-3k72.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001'
];
if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}


app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// ─── Logging ───────────────────────────────────────────────────────────
app.use(morgan('dev'));

// ─── Body parsers & static ────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Dev Auth Bypass (never mounts in production) ──────────────
if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_AUTH === 'true') {
    app.use('/dev', devAuthRouter);
    console.log('⚠️  Dev auth ENABLED — POST /dev/login with { email }');
}

// ─── CSRF Protection ──────────────────────────────────────────────────────────
// Apply to all state-changing routes (requires cookieParser)
app.use(csrfWithBearerSkip);
app.use('/api', csrfRouter);
app.use(express.static(path.join(__dirname, 'public')));

// ─── Swagger docs ─────────────────────────────────────────────────────────────
setupSwagger(app);

// ─── Rate Limiters ────────────────────────────────────────────────────────────
// ⚠️ RATE LIMITING IS IN-MEMORY (per-process)
// These counters live inside this Node.js process. If you ever run multiple
// backend instances behind a load balancer, each instance keeps its own
// counter, and an attacker gets (max × instance_count) attempts.
//
// Before scaling horizontally:
//   1. npm install rate-limit-redis redis
//   2. Add REDIS_URL to .env
//   3. Replace each limiter's store with new RedisStore({ ... })
//   See: https://www.npmjs.com/package/rate-limit-redis
//
// Single-instance deployments: no action needed.

// Auth: 10 attempts per 15 minutes per IP (generous for login + register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Too many requests from this IP. Please wait 15 minutes before trying again.',
  },
});

// General limiter for protected admin/reviewer/teacher routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Too many requests from this IP. Please slow down.',
  },
});

// Upload: 20 uploads per hour per IP
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Upload limit reached. You can upload up to 20 files per hour.',
  },
});

// Bulk register: 3 attempts per hour (admin-only but still protect it)
const bulkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Bulk registration limit reached. Maximum 3 batches per hour.',
  },
    skip: (req) => {
    // Only rate-limit the actual write endpoint: POST /auth/bulk-register.
    // GET /bulk-register/template and GET /bulk-register/format are cheap reads.
    if (!req.path.includes('bulk-register')) return true; // not a bulk-register route
    if (req.method !== 'POST') return true;               // read requests are fine
    return false;                                         // rate-limit only the POST
  },
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/upload', uploadLimiter, fileRouter);
app.use('/auth',   authLimiter, bulkLimiter, usersRouter);
app.use('/college-admin', generalLimiter, collegeAdminRouter);
app.use('/admin',                 generalLimiter, adminRouter);
app.use('/super-admin',           generalLimiter, superAdminRouter);
app.use('/reviewer',              generalLimiter, reviewerRouter);
app.use('/teacher',               generalLimiter, teacherRouter);
app.use('/notifications', generalLimiter, notificationsRouter);

// ─── Health check (responds even if DB is not yet connected) ──────────────────
const healthHandler = (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState];
  res.json({ status: 'ok', db: dbStatus, uptime: process.uptime() });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  next(createError(404));
});

// ─── General error handler (also handles Multer errors) ──────────────────────
app.use((err, req, res, next) => {
  // Multer: file too large
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: true,
      message: 'File too large. Maximum allowed size is 25MB.',
    });
  }

  // Multer: file type filter rejection
  if (err.message && (
    err.message.includes('Invalid file type') ||
    err.message.includes('File type not allowed')
  )) {
    return res.status(400).json({
      error: true,
      message: err.message,
    });
  }

  // CSRF failures
  if (err.code === 'EBADCSRFTOKEN' || (err.status === 403 && err.message && err.message.toLowerCase().includes('csrf'))) {
    return res.status(403).json({
      error: true,
      message: 'Invalid or missing CSRF token.',
      code: 'EBADCSRFTOKEN',
    });
  }

  console.error('🔴 Unhandled error:', err);
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    error: true,
    message: isDev ? err.message : 'An internal server error occurred.',
    ...(isDev && { stack: err.stack }),
  });
});

// ─── Start server (skip during Jest — tests use in-memory MongoDB) ───────────
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`✅ Server running on port: ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });

  // ─── Mongo connection with exponential backoff ────────────────
  const MONGO_RETRIES = 5;
  const MONGO_BASE_DELAY_MS = 2000;

  async function connectMongo(attempt = 1) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('✅ Connected to MongoDB');
    } catch (err) {
      console.error(`❌ MongoDB connection attempt ${attempt}/${MONGO_RETRIES} failed:`, err.message);
      if (attempt >= MONGO_RETRIES) {
        console.error('💥 Exhausted all MongoDB connection retries. Exiting.');
        process.exit(1);
      }
      const delay = MONGO_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`⏳ Retrying in ${delay / 1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
      return connectMongo(attempt + 1);
    }
  }

  connectMongo();

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected — Mongoose will attempt to reconnect');
  });
  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
  });
}

module.exports = app;