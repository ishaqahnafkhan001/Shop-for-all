const escapeHtml = (value = '') => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const safeHttpUrl = (value = '') => {
    try {
        const url = new URL(String(value));
        return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
            ? escapeHtml(url.href) : '';
    } catch {
        return '';
    }
};

module.exports = { escapeHtml, safeHttpUrl };
