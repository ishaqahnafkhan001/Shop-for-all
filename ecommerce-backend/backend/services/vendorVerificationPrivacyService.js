const {
    createSignedNidUrl,
    migrateLegacyNidDocument
} = require('../config/cloudinary');

const DOCUMENT_TYPES = Object.freeze({
    front: 'front',
    back: 'back'
});

const LEGACY_URL_FIELDS = Object.freeze({
    front: 'nidFrontUrl',
    back: 'nidBackUrl'
});

const maskNidNumber = (value = '') => {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    const visible = digits.slice(-4);
    return `${'*'.repeat(Math.max(digits.length - 4, 4))}${visible}`;
};

const getDocument = (verification, type) => verification?.nidDocuments?.[type] || {};

const hasPrivateDocument = (verification, type) => Boolean(getDocument(verification, type)?.publicId);

const hasLegacyDocument = (verification, type) => Boolean(verification?.[LEGACY_URL_FIELDS[type]]);

const documentSummary = (verification, type) => ({
    available: hasPrivateDocument(verification, type) || hasLegacyDocument(verification, type),
    type,
    requiresMigration: !hasPrivateDocument(verification, type) && hasLegacyDocument(verification, type),
    uploadedAt: getDocument(verification, type)?.uploadedAt || null
});

const documentSummaries = (verification) => ({
    front: documentSummary(verification, DOCUMENT_TYPES.front),
    back: documentSummary(verification, DOCUMENT_TYPES.back)
});

const serializeVerificationPrivacy = (verification, options = {}) => {
    const {
        includeFullNid = false,
        includeLegacyUrls = false
    } = options;
    if (!verification) return null;
    const doc = verification?.toObject ? verification.toObject() : { ...(verification || {}) };

    const shop = doc.shop_id && typeof doc.shop_id === 'object' ? doc.shop_id : null;
    const owner = doc.owner_id && typeof doc.owner_id === 'object' ? doc.owner_id : null;
    const reviewer = doc.reviewedBy && typeof doc.reviewedBy === 'object' ? doc.reviewedBy : null;
    const nidNumber = includeFullNid ? doc.nidNumber || '' : maskNidNumber(doc.nidNumber);

    const sanitized = {
        ...doc,
        nidNumber,
        nidNumberMasked: maskNidNumber(doc.nidNumber),
        documents: documentSummaries(doc),
        shop,
        owner,
        reviewer
    };

    delete sanitized.nidDocuments;
    if (!includeLegacyUrls) {
        delete sanitized.nidFrontUrl;
        delete sanitized.nidBackUrl;
    }

    return sanitized;
};

const ensurePrivateDocument = async ({ verification, type }) => {
    if (!DOCUMENT_TYPES[type]) throw new Error('Invalid NID document type');

    if (hasPrivateDocument(verification, type)) {
        return getDocument(verification, type);
    }

    const legacyUrl = verification?.[LEGACY_URL_FIELDS[type]];
    if (!legacyUrl) {
        throw new Error('NID document is not available');
    }

    const meta = await migrateLegacyNidDocument({
        url: legacyUrl,
        shopId: verification.shop_id,
        documentType: type
    });

    verification.nidDocuments = {
        ...(verification.nidDocuments?.toObject ? verification.nidDocuments.toObject() : verification.nidDocuments || {}),
        [type]: meta
    };
    await verification.save();

    return verification.nidDocuments[type];
};

const getSignedNidDocumentUrl = async ({ verification, type, expiresInSeconds = 300 }) => {
    const document = await ensurePrivateDocument({ verification, type });
    const signed = createSignedNidUrl({ document, expiresInSeconds });

    if (!signed?.url) {
        throw new Error('Unable to create signed NID document URL');
    }

    return signed;
};

module.exports = {
    DOCUMENT_TYPES,
    documentSummaries,
    getSignedNidDocumentUrl,
    maskNidNumber,
    serializeVerificationPrivacy
};
