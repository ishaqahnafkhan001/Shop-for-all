import { blankSellerFacts } from '../utils/sellerFacts.js';
export const RECOVERY_REVIEW_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const validSubmissionId = id => typeof id === 'string' && /^[a-zA-Z0-9-]{16,80}$/.test(id);
export const validProductId = id => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
const object = value => value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Blob);
const text = value => typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
const scalar = value => ['number', 'string'].includes(typeof value) ? value : '';
const readableScalar = value => ['string', 'number', 'boolean'].includes(typeof value);
const rows = value => Array.isArray(value) && value.every(row => object(row) && Object.values(row).every(readableScalar));
const timestamp = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 8640000000000000 ? value : undefined;
const safeDetails = value => object(value) && Object.values(value).every(detail => object(detail) && Object.entries(detail).every(([key, field]) => key === 'taxable' ? typeof field === 'boolean' : ['string', 'number'].includes(typeof field) && (typeof field !== 'number' || Number.isFinite(field))));
// Normalize for display/restoration; retain the original persisted snapshot and wire payload.
export function inspectRecovery(record = {}) {
    const issues = [], missingMedia = [];
    const source = object(record.snapshot) ? record.snapshot : {};
    const form = object(source.formData) ? source.formData : {};
    let validForm = Boolean(object(source.formData));
    if (!validForm) issues.push('The saved form is incomplete. Check the catalog and server status before starting again.');
    const fields = Object.fromEntries(['title', 'slug', 'description', 'category', 'tags', 'publishAt', 'imageAltText'].map(key => [key, text(form[key])]));
    const pricing = object(form.pricing) ? form.pricing : {}, seo = object(form.seo) ? form.seo : {};
    for (const key of ['pricing', 'seo', 'sellerFacts']) {
        if (form[key] !== undefined && (!object(form[key]) || !Object.values(form[key]).every(readableScalar))) {
            validForm = false;
            issues.push(`Saved ${key === 'sellerFacts' ? 'seller facts' : key} could not be read. The original record is retained.`);
        }
    }
    const formData = { ...form, ...fields, status: ['Draft', 'Published', 'Archived'].includes(form.status) ? form.status : 'Draft', publicationStatus: ['draft', 'published', 'scheduled', 'archived'].includes(form.publicationStatus) ? form.publicationStatus : 'draft', lowStockThreshold: scalar(form.lowStockThreshold) || 0, pricing: { buyingPrice: scalar(pricing.buyingPrice), sellingPrice: scalar(pricing.sellingPrice), discount: scalar(pricing.discount) || 0 }, seo: { title: text(seo.title), description: text(seo.description) }, sellerFacts: { ...blankSellerFacts(), ...(object(form.sellerFacts) ? Object.fromEntries(Object.entries(form.sellerFacts).map(([key, value]) => [key, text(value)])) : {}) } };
    for (const key of ['features', 'specifications', 'comments']) {
        formData[key] = rows(form[key]) ? form[key].map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, text(value)]))) : [];
        if (form[key] !== undefined && !rows(form[key])) issues.push(`Some saved ${key} could not be read. The original recovery record is retained.`);
    }
    const entries = Array.isArray(record.entries) ? record.entries : [];
    const validEntries = entries.length > 0 && entries.every(entry => Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string' && (typeof entry[1] === 'string' || entry[1] instanceof Blob));
    const media = (kind, field) => {
        const originals = Array.isArray(source[kind]) ? source[kind] : [];
        const expected = entries.filter(entry => Array.isArray(entry) && entry[0] === field);
        const files = [], indices = new Map();
        const usable = file => file instanceof Blob && file.type.startsWith(field === 'images' ? 'image/' : 'video/');
        for (let index = 0; index < Math.max(originals.length, expected.length); index++) {
            const file = usable(originals[index]) ? originals[index] : expected[index]?.[1];
            if (usable(file)) { indices.set(index, files.length); files.push(file); }
            else missingMedia.push(text(originals[index]?.name) || text(expected[index]?.[1]?.name) || `${field === 'images' ? 'Image' : 'Video'} ${index + 1}`);
        }
        return { files, indices };
    };
    const images = media('imageFiles', 'images'), videos = media('videoFiles', 'videos');
    const imageFiles = images.files, videoFiles = videos.files;
    let validStructure = true;
    const attributes = Array.isArray(source.attributes) && source.attributes.length <= 5 && source.attributes.every(attr => object(attr) && typeof attr.name === 'string' && Array.isArray(attr.options) && attr.options.length <= 50 && attr.options.every(option => typeof option === 'string')) ? source.attributes : [{ name: '', options: [] }];
    if (source.attributes !== undefined && attributes !== source.attributes) { validStructure = false; issues.push('Some variant attributes could not be read. The original record is retained.'); }
    for (const key of ['variantDetails', 'stockOverrides']) if (source[key] !== undefined && (key === 'variantDetails' ? !safeDetails(source[key]) : !object(source[key]) || !Object.values(source[key]).every(value => ['string', 'number'].includes(typeof value)))) { validStructure = false; issues.push('Some variant details could not be read. The original record is retained.'); }
    const variantDetails = safeDetails(source.variantDetails) ? Object.fromEntries(Object.entries(source.variantDetails).map(([key, details]) => {
        const reference = /^product-image:(\d+)$/.exec(details.image || '');
        if (!reference) return [key, details];
        const imageIndex = images.indices.get(Number(reference[1]));
        if (imageIndex === undefined) issues.push(`Reselect the variant image for ${key}: its saved attachment is missing.`);
        return [key, { ...details, image: imageIndex === undefined ? '' : `product-image:${imageIndex}` }];
    })) : {};
    const snapshot = { ...source, formData, imageFiles, videoFiles, coverImageIndex: images.indices.get(source.coverImageIndex) ?? 0, selectedCollections: Array.isArray(source.selectedCollections) ? source.selectedCollections.filter(value => typeof value === 'string') : [], attributes, optionInputs: Array.isArray(source.optionInputs) ? source.optionInputs.map(text) : attributes.map(() => ''), defaultStock: scalar(source.defaultStock) || 0, stockOverrides: object(source.stockOverrides) ? source.stockOverrides : {}, variantDetails };
    const validPayload = validEntries && /^[a-f\d]{64}$/i.test(record.fingerprint || '');
    if (!validPayload && record.state !== 'saved') issues.push('The original submission payload is incomplete. Automatic resubmission is unavailable; check its server status.');
    return { snapshot, missingMedia: [...new Set(missingMedia)], issues, validPayload, validForm: validForm && validStructure && !issues.some(issue => issue.startsWith('Some saved')), expired: Number.isFinite(record.createdAt) && Date.now() - record.createdAt >= RECOVERY_REVIEW_AGE_MS };
}
export function normalizeSubmission(record, scope) {
    if (!object(record) || record.scope !== scope || typeof record.id !== 'string') return null;
    const saved = record.state === 'saved' && validProductId(record.productId);
    const supported = ['preparing', 'uploading', 'saving', 'failed', 'recovery'].includes(record.state);
    const live = typeof record.browserLock?.until === 'number' && record.browserLock.until > Date.now();
    const until = timestamp(record.browserLock?.until);
    const browserLock = typeof record.browserLock?.owner === 'string' && until && until <= Date.now() + 60000 ? { owner: record.browserLock.owner, until, purpose: 'saving' } : undefined;
    return { ...record, createdAt: timestamp(record.createdAt), updatedAt: timestamp(record.updatedAt), checkedAt: timestamp(record.checkedAt), browserLock, title: text(record.title) || text(record.snapshot?.formData?.title) || 'Untitled product', state: saved ? 'saved' : validSubmissionId(record.id) && supported && (!['preparing', 'uploading', 'saving'].includes(record.state) || (live && browserLock)) ? record.state : 'recovery', editable: validSubmissionId(record.id) && !saved && record.state === 'failed' && record.editable === true, error: typeof record.error === 'string' ? record.error : '', originalError: typeof record.originalError === 'string' ? record.originalError : '', revision: Number.isSafeInteger(record.revision) ? record.revision : 0 };
}
