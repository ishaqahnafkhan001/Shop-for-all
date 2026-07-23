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

const buildStoreBuilderUploadOptions = (file, req) => ({
    folder: `shop_branding/${String(req?.tenantId || 'unknown')}/draft`,
    resource_type: 'image',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    format: 'webp',
    transformation: [
        { width: 2000, height: 2000, crop: 'limit' },
        { quality: 'auto' }
    ],
    context: {
        purpose: 'store_builder_draft',
        shop_id: String(req?.tenantId || '')
    }
});

const isRasterSignatureValid = (buffer, mimetype) => {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
    if (mimetype === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (mimetype === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mimetype === 'image/webp') return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
    if (['image/x-icon', 'image/vnd.microsoft.icon'].includes(mimetype)) return buffer[0] === 0 && buffer[1] === 0 && buffer[2] === 1 && buffer[3] === 0;
    return false;
};

const isSafeSvgBuffer = (buffer) => {
    const source = Buffer.isBuffer(buffer) ? buffer.toString('utf8', 0, Math.min(buffer.length, 1024 * 1024)) : '';
    if (!/<svg(?:\s|>)/i.test(source)) return false;
    return !/<(?:script|foreignObject|iframe|object|embed|link|style|use)(?:\s|>)/i.test(source)
        && !/\son[a-z]+\s*=/i.test(source)
        && !/(?:javascript|vbscript|data\s*:\s*text\/html)/i.test(source)
        && !/<!DOCTYPE|<!ENTITY/i.test(source);
};

const validateImageBuffer = (buffer, file, { allowSvg = false, allowIcon = false } = {}) => {
    if (file?.mimetype === 'image/svg+xml') return allowSvg && isSafeSvgBuffer(buffer);
    if (['image/x-icon', 'image/vnd.microsoft.icon'].includes(file?.mimetype)) return allowIcon && isRasterSignatureValid(buffer, file.mimetype);
    return isRasterSignatureValid(buffer, file?.mimetype);
};

const buildSupportUploadOptions = () => ({
    folder: 'support_attachments',
    resource_type: 'auto',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'pdf', 'mp4', 'webm']
});

class CloudinaryMulterStorage {
    constructor(optionsBuilder = buildStorefrontUploadOptions, bufferValidator = null) {
        this.optionsBuilder = optionsBuilder;
        this.bufferValidator = bufferValidator;
    }

    _handleFile(req, file, cb) {
        const chunks = [];
        file.stream.on('data', chunk => chunks.push(chunk));
        file.stream.on('error', cb);
        file.stream.on('end', async () => {
            try {
                const buffer = Buffer.concat(chunks);
                if (this.bufferValidator && !this.bufferValidator(buffer, file, req)) {
                    return cb(new Error('Uploaded file content does not match an allowed image format'));
                }
                const result = await streamUpload(buffer, this.optionsBuilder(file, req));
                cb(null, {
                    path: result.secure_url || result.url || '',
                    filename: result.public_id || '',
                    public_id: result.public_id || '',
                    secure_url: result.secure_url || result.url || '',
                    mimetype: file.mimetype,
                    originalname: file.originalname,
                    size: result.bytes || buffer.length,
                    width: result.width || 0,
                    height: result.height || 0,
                    resource_type: result.resource_type || 'image',
                    format: result.format || ''
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
const brandStorage = new CloudinaryMulterStorage(
    (file, req) => ({
        ...buildBrandUploadOptions(file, req),
        folder: `shop_branding/${String(req?.tenantId || 'unknown')}/draft`,
        context: { purpose: 'store_builder_draft', shop_id: String(req?.tenantId || '') }
    }),
    (buffer, file) => validateImageBuffer(buffer, file, { allowSvg: true, allowIcon: true })
);
const storeBuilderStorage = new CloudinaryMulterStorage(
    buildStoreBuilderUploadOptions,
    (buffer, file) => validateImageBuffer(buffer, file)
);
const supportStorage = new CloudinaryMulterStorage(buildSupportUploadOptions);

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

const allowedSupportMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'video/mp4',
    'video/webm'
]);

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 17
    },
    fileFilter: (req, file, cb) => {
        if (!allowedMimeTypes.has(file.mimetype)) {
            return cb(new Error('Unsupported file type'));
        }

        if (file.fieldname === 'images' && req.planAccess?.limits?.imagesPerProduct !== null) {
            req.planImageUploadCount = Number(req.planImageUploadCount || 0) + 1;
            if (req.planImageUploadCount > Number(req.planAccess.limits.imagesPerProduct)) {
                const error = new Error(`Your plan allows up to ${req.planAccess.limits.imagesPerProduct} product images.`);
                error.code = 'PLAN_IMAGE_LIMIT';
                return cb(error);
            }
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

const storeBuilderUpload = multer({
    storage: storeBuilderStorage,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 5
    },
    fileFilter: (req, file, cb) => {
        if (!allowedNidMimeTypes.has(file.mimetype)) {
            return cb(new Error('Unsupported Store Builder image type'));
        }
        cb(null, true);
    }
});

const supportUpload = multer({
    storage: supportStorage,
    limits: {
        fileSize: 30 * 1024 * 1024,
        files: 6
    },
    fileFilter: (req, file, cb) => {
        if (!allowedSupportMimeTypes.has(file.mimetype)) {
            return cb(new Error('Unsupported support attachment file type'));
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
    storeBuilderUpload,
    supportUpload,
    nidUpload,
    uploadNidDocument,
    migrateLegacyNidDocument,
    createSignedNidUrl
};
