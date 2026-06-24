const ALLOWED_NEXT_IMAGE_HOSTS = new Set([
    'res.cloudinary.com'
]);

export const isNextImageAllowed = (src = '') => {
    if (!src || typeof src !== 'string') return false;
    if (src.startsWith('/') || src.startsWith('data:') || src.startsWith('blob:')) return true;

    try {
        const url = new URL(src);
        return url.protocol === 'https:' && ALLOWED_NEXT_IMAGE_HOSTS.has(url.hostname);
    } catch {
        return false;
    }
};

export const shouldUseUnoptimizedImage = (src = '') => {
    if (!src || typeof src !== 'string') return false;
    if (src.startsWith('/') || src.startsWith('data:') || src.startsWith('blob:')) return false;

    try {
        const url = new URL(src);
        if (url.hostname === 'res.cloudinary.com' && url.pathname.startsWith('/demo/')) {
            return true;
        }
    } catch {
        return true;
    }

    return !isNextImageAllowed(src);
};
