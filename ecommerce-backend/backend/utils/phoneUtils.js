const BD_MOBILE_PREFIX_PATTERN = /^01[3-9]\d{8}$/;
const BD_NORMALIZED_PATTERN = /^8801[3-9]\d{8}$/;

const compactPhone = (input = '') => String(input || '')
    .trim()
    .replace(/[\s-]/g, '');

const normalizeBDPhone = (input = '') => {
    const compact = compactPhone(input);
    if (!compact) return '';
    if (/[^+\d]/.test(compact)) return '';

    const withoutPlus = compact.startsWith('+') ? compact.slice(1) : compact;

    if (BD_MOBILE_PREFIX_PATTERN.test(withoutPlus)) {
        return `88${withoutPlus}`;
    }

    if (BD_NORMALIZED_PATTERN.test(withoutPlus)) {
        return withoutPlus;
    }

    return '';
};

const isValidBDPhone = (input = '') => Boolean(normalizeBDPhone(input));

const toLocalBDPhone = (normalized = '') => {
    const clean = normalizeBDPhone(normalized);
    return clean ? clean.slice(2) : '';
};

const maskPhone = (input = '') => {
    const normalized = normalizeBDPhone(input);
    if (!normalized) return '';
    const local = toLocalBDPhone(normalized);
    return `${local.slice(0, 3)}****${local.slice(-4)}`;
};

module.exports = {
    isValidBDPhone,
    maskPhone,
    normalizeBDPhone,
    toLocalBDPhone
};
