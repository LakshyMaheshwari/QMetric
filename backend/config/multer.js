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

// MIME type and filename are client-controlled. Validate the actual file
// signature after multer has buffered the upload.
function hasValidImageSignature(buffer, mimetype) {
    if (!Buffer.isBuffer(buffer)) return false;

    if (mimetype === 'image/jpeg') {
        return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    if (mimetype === 'image/png') {
        return buffer.length >= 8 && buffer.subarray(0, 8).equals(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        );
    }

    if (mimetype === 'image/webp') {
        return (
            buffer.length >= 12 &&
            buffer.toString('ascii', 0, 4) === 'RIFF' &&
            buffer.toString('ascii', 8, 12) === 'WEBP'
        );
    }

    return false;
}

const validateImageSignature = (req, res, next) => {
    if (!req.file) return next();

    if (!hasValidImageSignature(req.file.buffer, req.file.mimetype)) {
        return res.status(400).json({
            error: true,
            message: 'Uploaded image contents do not match the declared file type.',
        });
    }

    next();
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: fileFilter
});

module.exports = upload;
module.exports.validateImageSignature = validateImageSignature;
module.exports.hasValidImageSignature = hasValidImageSignature;
