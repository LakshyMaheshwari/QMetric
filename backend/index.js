require('dotenv').config();

require('./config/validateEnv')();

const notificationsRouter = require('./routes/notification');
const csrfRouter = require('./routes/csrf');
const createError = require('http-errors');
const express     = require('express');
const path        = require('node:path');
const cookieParser = require('cookie-parser');
const pinoHttp    = require('pino-http');
const logger      = require('./config/logger');
const crypto      = require('node:crypto');
const cors        = require('cors');
const mongoose    = require('mongoose');
const rateLimit   = require('express-rate-limit');
const helmet      = require('helmet');
const setupSwagger = require('./config/swagger');
const { csrfWithBearerSkip } = require('./middleware/csrf');
const { RedisStore } = require('rate-limit-redis');
const { sendCommand, connectRedis, disconnectRedis, isRedisEnabled, isRedisReady } = require('./utils/redisClient');

const fileRouter  = require('./routes/file');
const usersRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const superAdminRouter = require('./routes/superAdmin');
const collegeAdminRouter = require('./routes/collegeAdmin');
const reviewerRouter = require('./routes/reviewer');
const teacherRouter = require('./routes/teacher');
const studentRouter = require('./routes/student');
const devAuthRouter = require('./routes/devAuth');

const app = express();

// ─── Reverse proxy ────────────────────────────────────────────────────────────
// Behind Render/Railway/Fly/Nginx, req.ip is the proxy's address unless Express
// is told to trust X-Forwarded-For. Without this, every user shares ONE rate-limit
// bucket. Set TRUST_PROXY to the number of proxy hops (usually 1), or leave unset
// to default to 1 in production and off elsewhere.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set('trust proxy', Number.isNaN(hops) ? process.env.TRUST_PROXY : hops);
} else if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

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
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
}));

// ─── Logging ───────────────────────────────────────────────────────────
app.use(pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
  customProps: (req) => ({ requestId: req.id }),
  customSuccessMessage: () => 'request completed',
  customErrorMessage:   () => 'request failed',
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
}));

// Stamp X-Request-ID on every response early — before any controller runs.
// pinoHttp's customSuccessMessage / customErrorMessage fire AFTER the response
// is sent, so calling res.setHeader() there causes "Cannot set headers after
// they are sent to the client". This middleware runs at the right time.
app.use((req, res, next) => {
  if (req.id) res.setHeader('X-Request-ID', req.id);
  next();
});

// ─── Body parsers & static ────────────────────────────────────────────────────
// Size limits prevent memory-exhaustion DoS via oversized JSON payloads.
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));
app.use((req, res, next) => {
    if (!req.body) req.body = {};
    next();
});
app.use(cookieParser());

// ─── Dev Auth Bypass (never mounts in production) ──────────────
if (process.env.NODE_ENV === 'development' && process.env.ENABLE_DEV_AUTH === 'true') {
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
// Redis is used when REDIS_URL is configured; otherwise express-rate-limit's
// in-memory store remains available for local/single-instance deployments.
function createLimiter(name, options) {
  if (process.env.ENABLE_DEV_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
    return (req, res, next) => next();
  }
  if (!isRedisEnabled()) return rateLimit(options);
  return rateLimit({
    ...options,
    store: new RedisStore({
      sendCommand,
      prefix: `qmetric:rl:${name}:`,
    }),
    passOnStoreError: process.env.NODE_ENV !== 'production',
  });
}

// Login / password change: only FAILED attempts count, so a campus NAT full of
// teachers logging in successfully doesn't lock everyone out.
const loginLimiter = createLimiter('login', {
  windowMs: 15 * 60 * 1000,
  max: 15,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Too many failed attempts from this IP. Please wait 15 minutes before trying again.',
  },
});

// Everything else under /auth (profile reads, colleges list, logout...).
// Its own instance, so it does not share a bucket with the admin/teacher routes.
const authGeneralLimiter = createLimiter('auth-general', {
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Too many requests from this IP. Please slow down.',
  },
});

// Account creation / verification-email resend: every request counts.
const signupLimiter = createLimiter('signup', {
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Too many sign-up requests from this IP. Please try again later.',
  },
});

const adminCreationLimiter = createLimiter('admin-create', {
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: 'Too many admin-creation attempts from this IP. Please try again later.' },
});

// General limiter for protected admin/reviewer/teacher routes
const generalLimiter = createLimiter('general', {
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
const uploadLimiter = createLimiter('upload', {
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
const bulkLimiter = createLimiter('bulk', {
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
// Scope strict limits to credential endpoints only. Reads like GET /auth/profile,
// /auth/colleges and /auth/logout must NOT consume the login budget.
app.use('/auth/login',               loginLimiter);
app.use('/auth/password',            loginLimiter);
app.use('/auth/create-account',      signupLimiter);
app.use('/auth/create-admin',        adminCreationLimiter);
app.use('/auth/resend-verification', signupLimiter);
app.use('/auth/forgot-password',     signupLimiter);
app.use('/auth/reset-password',      loginLimiter);
app.use('/auth',   authGeneralLimiter, bulkLimiter, usersRouter);
app.use('/college-admin', generalLimiter, collegeAdminRouter);
app.use('/admin',                 generalLimiter, adminRouter);
app.use('/super-admin',           generalLimiter, superAdminRouter);
app.use('/reviewer',              generalLimiter, reviewerRouter);
app.use('/teacher',               generalLimiter, teacherRouter);
app.use('/student',               generalLimiter, studentRouter);
app.use('/notifications', generalLimiter, notificationsRouter);

// ─── Health check (responds even if DB is not yet connected) ──────────────────
const healthHandler = (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState];
  res.json({ status: 'ok', uptime: process.uptime() });
};

const readinessHandler = (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  const redisReady = !isRedisEnabled() || isRedisReady();
  const ready = dbReady && redisReady;
  return res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    db: dbReady ? 'connected' : 'not_connected',
    redis: isRedisEnabled() ? (redisReady ? 'connected' : 'not_connected') : 'disabled',
    uptime: process.uptime(),
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);
app.get('/ready', readinessHandler);
app.get('/api/ready', readinessHandler);

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
  // Never send stack traces to a client — dev or prod. Full error is in
  // the server log; the client gets a safe, generic message.
  res.status(err.status || 500).json({
    error: true,
    message: err.status && err.status < 500
      ? err.message
      : 'An internal server error occurred.',
  });
});

// ─── Process-level resilience handlers ─────────────────────────────────────────
let httpServer = null;

const shutdown = async (signal) => {
  logger.info({ signal }, 'Shutdown requested');

  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
  forceExit.unref();

  try {
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
    await mongoose.connection.close(false);
    await disconnectRedis();
    clearTimeout(forceExit);
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Graceful shutdown failed');
    process.exit(1);
  }
};

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
  if (process.env.NODE_ENV !== 'test') shutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  if (process.env.NODE_ENV !== 'test') {
    shutdown('uncaughtException');
  }
});

// ─── Start server (skip during Jest — tests use in-memory MongoDB) ───────────
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  httpServer = app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server started');
    logger.info({ health: '/health', readiness: '/ready' }, 'Health endpoints available');
  });

  // ─── Mongo connection with exponential backoff ────────────────
  const MONGO_RETRIES = 5;
  const MONGO_BASE_DELAY_MS = 2000;

  async function connectMongo(attempt = 1) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      logger.info('Connected to MongoDB');
    } catch (err) {
      logger.error({ attempt, maxRetries: MONGO_RETRIES, err }, 'MongoDB connection attempt failed');
      if (attempt >= MONGO_RETRIES) {
        logger.fatal('Exhausted all MongoDB connection retries. Exiting.');
        process.exit(1);
      }
      const delay = MONGO_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn({ delayMs: delay }, 'Retrying MongoDB connection');
      await new Promise((r) => setTimeout(r, delay));
      return connectMongo(attempt + 1);
    }
  }

  connectMongo();

  if (isRedisEnabled()) {
    connectRedis()
      .then(() => logger.info('Connected to Redis'))
      .catch((err) => logger.error({ err }, 'Redis connection failed; rate limit/revocation will use fallback behavior where available'));
  }

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected — Mongoose will attempt to reconnect');
  });
  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });
}

module.exports = app;