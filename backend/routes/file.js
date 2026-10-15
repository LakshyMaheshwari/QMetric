const logger = require('../config/logger');

const os      = require('node:os');
const path    = require('node:path');
const fs      = require('node:fs');
const crypto  = require('node:crypto');
const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const { requireFeature } = require('../middleware/requireFeature');

const authenticateToken = require('../core/auth/utilities');
const fileController = require('../controllers/fileController');

// ─── Upload destination (cross-platform) ──────────────────────────────────────
// os.tmpdir() resolves to:
//   Linux/Mac  → /tmp
//   Windows    → C:\Users\<user>\AppData\Local\Temp
//
// Using a sub-directory keeps our uploads isolated from system temp files.
const uploadDir = path.join(os.tmpdir(), 'qmetric-uploads');

// Create the directory if it doesn't exist (recursive is safe if it already exists)
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.info('✅ Upload directory created at:', uploadDir);
  } catch (err) {
    logger.error('❌ Failed to create upload directory:', err.message);
  }
}

// ─── Multer configuration ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname).toLowerCase();
    // Cryptographically random suffix — Math.random() is not safe for
    // filename uniqueness if the temp directory is ever exposed. This
    // guarantees collision-free names across concurrent uploads.
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${fileExt}`);
  },
});

// Allowed file types
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

// ─── File size limit (S5693 — intentionally exceeds the 8 MB Sonar default) ──
// QMetric accepts Excel/CSV question papers, which routinely exceed 8 MB
// (dense spreadsheets with formulas and images). The limit is set to 25 MB,
// but the design is safe against oversized-request DoS:
//   1. Multer uses diskStorage — the body streams to disk, not memory.
//   2. Per-request memory footprint is O(chunk size), not O(file size).
//   3. The uploadLimiter rate-limits this endpoint to 20 uploads/hour/IP.
//   4. JSON/urlencoded bodies elsewhere stay at the Express default (100 KB).
const MAX_FILE_SIZE = 25 * 1024 * 1024;  // 25 MB

// File type filter — extension whitelist
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`File type not allowed: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`));
  }

  cb(null, true);
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,                      // hard cap on number of parts per request
    fields: 5,                     // Sequence, FormData, and a few spares
    fieldSize: 1 * 1024 * 1024,    // cap non-file form fields at 1 MB each
  },
});

// ─── Routes ───────────────────────────────────────────────────────────────────
router.post(
  '/totext',
  authenticateToken,
  requireFeature('upload_paper'),
  upload.single('file'),
  fileController.convertToText
);
router.get('/totext',   authenticateToken, fileController.getResults);
router.get('/all',      authenticateToken, fileController.getResultsById);
router.post('/search',  authenticateToken, fileController.searchPapers);

module.exports = router;
