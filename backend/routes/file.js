const os   = require('os');
const path = require('path');
const fs   = require('fs');
var express = require('express');
var router = express.Router();
const authenticateToken = require('../core/auth/utilities');
let fileController = require('../controllers/fileController');
const multer = require('multer');

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
    console.log('✅ Upload directory created at:', uploadDir);
  } catch (err) {
    console.error('❌ Failed to create upload directory:', err.message);
  }
}

// ─── Multer configuration ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + fileExt);
  },
});

const upload = multer({ storage: storage });

// ─── Routes ───────────────────────────────────────────────────────────────────
router.post('/totext',  authenticateToken, upload.single('file'), fileController.convertToText);
router.get('/totext',   authenticateToken, fileController.getResults);
router.get('/all',      authenticateToken, fileController.getResultsById);
router.post('/search',  authenticateToken, fileController.searchPapers);

router.get('/test', (req, res) => {
  res.json({ status: 'ok', uploadDir, message: 'File route is working!' });
});

module.exports = router;
