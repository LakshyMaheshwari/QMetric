const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'qmetric_id_photos',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        // Optionally resize images before saving
        transformation: [{ width: 800, height: 800, crop: 'limit' }]
    }
});

// Set a file size limit (e.g., 5MB)
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

module.exports = upload;
