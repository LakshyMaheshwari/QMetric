require('dotenv').config();

const createError = require('http-errors');
const express     = require('express');
const path        = require('path');
const cookieParser = require('cookie-parser');
const logger      = require('morgan');
const cors        = require('cors');
const mongoose    = require('mongoose');
const rateLimit   = require('express-rate-limit');

const fileRouter  = require('./routes/file');
const usersRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');

const app = express();

// ─── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'https://q-metric-3k72.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// ─── Body parsers & static ────────────────────────────────────────────────────
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Rate Limiters ────────────────────────────────────────────────────────────

// Auth: 10 attempts per 15 minutes per IP (generous for login + register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Too many requests from this IP. Please wait 15 minutes before trying again.',
  },
});

// Upload: 20 uploads per hour per IP
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
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
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Bulk registration limit reached. Maximum 3 batches per hour.',
  },
  // Apply only to the bulk route (done at route level, but guard here too)
  skip: (req) => !req.path.includes('bulk-register'),
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/upload', uploadLimiter, fileRouter);
app.use('/auth',   authLimiter,   usersRouter);
app.use('/admin',                 adminRouter);

// ─── Health check (responds even if DB is not yet connected) ──────────────────
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState];
  res.json({ status: 'ok', db: dbStatus, uptime: process.uptime() });
});

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  next(createError(404));
});

// ─── Multer error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: true, message: 'File too large. Maximum size is 5MB.' });
  }
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ error: true, message: err.message });
  }
  next(err);
});

// ─── General error handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('🔴 Unhandled error:', err);
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    error: true,
    message: isDev ? err.message : 'An internal server error occurred.',
    ...(isDev && { stack: err.stack }),
  });
});

// ─── Start server IMMEDIATELY (not inside db.once) ───────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port: ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// ─── Connect to MongoDB (non-blocking relative to server start) ───────────────
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch((err) => {
  // Log the error but don't crash — routes will return 503 naturally if DB is down
  console.error('❌ MongoDB connection error:', err.message);
});

// ─── Handle DB disconnection after initial connection ─────────────────────────
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected — attempting to reconnect...');
});
mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

module.exports = app;
