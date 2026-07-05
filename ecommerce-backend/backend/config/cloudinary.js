const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const buildStorefrontUploadOptions = (file) => {
    const isVideo = file.mimetype.startsWith('video/');

    return {
        folder: 'shop_products',
        resource_type: 'auto',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp4', 'mov'],
        ...(!isVideo && { format: 'webp' }),
        transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto' }
        ]
    };
};

const buildBrandUploadOptions = (file) => {
    const isSvg = file.mimetype === 'image/svg+xml';

    return {
        folder: 'shop_branding',
        resource_type: 'auto',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'svg', 'ico'],
        ...(!isSvg && { format: 'webp' }),
        ...(!isSvg && {
            transformation: [
                { width: 1200, height: 1200, crop: 'limit' },
                { quality: 'auto' }
            ]
        })
    };
};

class CloudinaryMulterStorage {
    constructor(optionsBuilder = buildStorefrontUploadOptions) {
        this.optionsBuilder = optionsBuilder;
    }

    _handleFile(req, file, cb) {
        const chunks = [];
        file.stream.on('data', chunk => chunks.push(chunk));
        file.stream.on('error', cb);
        file.stream.on('end', async () => {
            try {
                const buffer = Buffer.concat(chunks);
                const result = await streamUpload(buffer, this.optionsBuilder(file, req));
                cb(null, {
                    path: result.secure_url || result.url || '',
                    filename: result.public_id || '',
                    public_id: result.public_id || '',
                    secure_url: result.secure_url || result.url || '',
                    mimetype: file.mimetype,
                    originalname: file.originalname,
                    size: result.bytes || buffer.length
                });
            } catch (error) {
                cb(error);
            }
        });
    }

    _removeFile(req, file, cb) {
        cb(null);
    }
}

const storage = new CloudinaryMulterStorage();
const brandStorage = new CloudinaryMulterStorage(buildBrandUploadOptions);

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

const allowedBrandMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'image/x-icon',
    'image/vnd.microsoft.icon'
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

const brandUpload = multer({
    storage: brandStorage,
    limits: {
        fileSize: 2 * 1024 * 1024,
        files: 1
    },
    fileFilter: (req, file, cb) => {
        if (!allowedBrandMimeTypes.has(file.mimetype)) {
            return cb(new Error('Unsupported logo or icon file type'));
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
    brandUpload,
    nidUpload,
    uploadNidDocument,
    migrateLegacyNidDocument,
    createSignedNidUrl
};
