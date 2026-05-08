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
        resource_type: 'auto',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp4', 'mov'],

        // 👇 ADD THIS TRANSFORMATION BLOCK 👇
        transformation: [
            // 1. Resize massive images: 'limit' only shrinks images larger than 1200px, ignores smaller ones
            { width: 1200, height: 1200, crop: 'limit' },

            // 2. The Magic: 'auto' tells Cloudinary's AI to compress as much as possible without visible loss
            { quality: 'auto' },

            // 3. (Optional but recommended) Automatically convert heavy PNGs/JPGs to lightweight WebP
            { fetch_format: 'auto' }
        ]
    },
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };