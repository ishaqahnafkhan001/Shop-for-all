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

    return !isNextImageAllowed(src);
};
