const ALLOWED_PAGE_SIZES = Object.freeze([10, 20, 25, 50, 100]);

const normalizePage = (value, fallback = 1) => {
    const page = parseInt(value, 10);
    return Math.max(Number.isFinite(page) ? page : fallback, 1);
};

const normalizeLimit = (value, fallback = 25) => {
    const requested = parseInt(value, 10);
    if (!Number.isFinite(requested) || requested <= 0) return fallback;
    if (ALLOWED_PAGE_SIZES.includes(requested)) return requested;
    return requested > Math.max(...ALLOWED_PAGE_SIZES)
        ? Math.max(...ALLOWED_PAGE_SIZES)
        : fallback;
};

const normalizeSearch = (value = '', maxLength = 80) => (
    String(value || '')
        .replace(/[^\p{L}\p{N}\s@._#+-]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength)
);

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
};

module.exports = {
    ALLOWED_PAGE_SIZES,
    normalizePage,
    normalizeLimit,
    normalizeSearch,
    escapeRegex,
    parseDate
};
