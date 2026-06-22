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

const allowedMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime'
]);

const allowedNidMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp'
]);

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 10
    },
    fileFilter: (req, file, cb) => {
        if (!allowedMimeTypes.has(file.mimetype)) {
            return cb(new Error('Unsupported file type'));
        }

        cb(null, true);
    }
});

const nidUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 2
    },
    fileFilter: (req, file, cb) => {
        if (!allowedNidMimeTypes.has(file.mimetype)) {
            return cb(new Error('Unsupported NID image type'));
        }

        cb(null, true);
    }
});

const streamUpload = (buffer, options) => new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error) return reject(error);
        resolve(result);
    });

    stream.end(buffer);
});

const buildNidUploadOptions = ({ shopId, documentType }) => ({
    folder: `vendor_verifications/nid/${shopId}`,
    public_id: `${documentType}_${Date.now()}`,
    resource_type: 'image',
    type: 'authenticated',
    format: 'webp',
    overwrite: true,
    transformation: [
        { width: 1600, height: 1600, crop: 'limit' },
        { quality: 'auto' }
    ],
    context: {
        document_type: documentType,
        purpose: 'vendor_verification'
    }
});

const toNidDocumentMeta = (result, migratedFromLegacyUrl = '') => ({
    publicId: result.public_id || '',
    resourceType: result.resource_type || 'image',
    format: result.format || 'webp',
    bytes: result.bytes || 0,
    uploadedAt: new Date(),
    migratedFromLegacyUrl
});

const uploadNidDocument = async ({ file, shopId, documentType }) => {
    if (!file?.buffer) throw new Error(`Missing ${documentType} NID image`);

    const result = await streamUpload(file.buffer, buildNidUploadOptions({ shopId, documentType }));
    return toNidDocumentMeta(result);
};

const migrateLegacyNidDocument = async ({ url, shopId, documentType }) => {
    if (!url) throw new Error(`Missing legacy ${documentType} NID URL`);

    const result = await cloudinary.uploader.upload(url, buildNidUploadOptions({ shopId, documentType }));
    return toNidDocumentMeta(result, url);
};

const createSignedNidUrl = ({ document, expiresInSeconds = 300 }) => {
    if (!document?.publicId) return null;

    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const url = cloudinary.url(document.publicId, {
        resource_type: document.resourceType || 'image',
        type: 'authenticated',
        sign_url: true,
        secure: true,
        expires_at: expiresAt,
        format: document.format || undefined
    });

    return {
        url,
        expiresAt: new Date(expiresAt * 1000)
    };
};

module.exports = {
    cloudinary,
    upload,
    nidUpload,
    uploadNidDocument,
    migrateLegacyNidDocument,
    createSignedNidUrl
};
