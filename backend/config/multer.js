const multer = require('multer');

// Use memoryStorage so we can manually upload to Cloudinary
// with the ocr: 'adv_ocr' parameter for ID verification.
// CloudinaryStorage adapter does not support passing OCR params.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, PNG, and WEBP are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: fileFilter
});

module.exports = upload;
