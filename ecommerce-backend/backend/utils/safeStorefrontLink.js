const safeStorefrontLink = (value) => {
    if (typeof value !== 'string') return '';
    const link = value.trim();
    if (!link || link.length > 500 || /[\x00-\x1f\x7f\\]/.test(link)) return '';
    if ((link.startsWith('/') && !link.startsWith('//')) || link.startsWith('#')) return link;
    try {
        const url = new URL(link);
        return url.protocol === 'https:' && url.hostname && !url.username && !url.password
            ? url.toString()
            : '';
    } catch {
        return '';
    }
};

module.exports = safeStorefrontLink;
