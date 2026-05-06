// config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'shop_products',
        // 🚨 CRITICAL: 'auto' allows both images and videos to be uploaded
        resource_type: 'auto',
        // Add video formats like mp4, mov, or webm
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp4', 'mov'],
    },
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };