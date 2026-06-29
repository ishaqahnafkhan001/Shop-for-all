const parseMaybeJson = (value, fallback) => {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const fileToProofMeta = (file) => ({
    url: file.path || file.secure_url || '',
    publicId: file.filename || file.public_id || '',
    originalName: file.originalname || '',
    mimeType: file.mimetype || '',
    size: Number(file.size || 0)
});

const buildProofFromFiles = (files = {}) => {
    const images = (files.proofImages || []).map(fileToProofMeta).filter(item => item.url);
    const [videoFile] = files.proofVideo || [];
    const video = videoFile ? fileToProofMeta(videoFile) : undefined;

    if (images.length < 1) {
        const err = new Error('At least one proof image is required.');
        err.statusCode = 400;
        throw err;
    }

    if (images.length > 3) {
        const err = new Error('You can upload up to 3 proof images.');
        err.statusCode = 400;
        throw err;
    }

    return {
        images,
        ...(video?.url ? { video } : {})
    };
};

module.exports = {
    parseMaybeJson,
    buildProofFromFiles
};
