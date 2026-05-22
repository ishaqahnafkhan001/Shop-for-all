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

    params: async (req, file) => {

        const isVideo = file.mimetype.startsWith('video/');

        return {
            folder: 'shop_products',
            resource_type: 'auto',
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp4', 'mov'],


            ...( !isVideo && { format: 'webp' } ),

            transformation: [

                { width: 1200, height: 1200, crop: 'limit' },


                { quality: 'auto' }
            ]
        };
    },
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };