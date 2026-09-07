const cloudinary = require('cloudinary').v2;

// Cloudinary automatically reads CLOUDINARY_URL from .env
cloudinary.config();

module.exports = cloudinary;
