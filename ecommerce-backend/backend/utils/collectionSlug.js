const collectionSlug = (value = '') => {
    const clean = String(value || '').normalize('NFC').replace(/<[^>]*>/g, '').trim();
    const ascii = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    return ascii || encodeURIComponent(clean.slice(0, 80)).toLowerCase().replace(/%/g, '').slice(0, 80);
};
module.exports = { collectionSlug };
