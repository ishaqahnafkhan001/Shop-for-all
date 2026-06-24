const getBackendApiUrl = () => {
    const configuredUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

    if (configuredUrl) return configuredUrl.replace(/\/$/, '');
    if (process.env.NODE_ENV === 'production') return 'https://api.scaleup.codes/api';
    return 'http://localhost:4000/api';
};

const buildUrl = (path, params = {}) => {
    const url = new URL(`${getBackendApiUrl()}${path}`);

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, String(value));
        }
    });

    return url.toString();
};

const fetchPublicJson = async (path, { params = {}, revalidate = 30 } = {}) => {
    const response = await fetch(buildUrl(path, params), {
        next: { revalidate },
        headers: { accept: 'application/json' },
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const error = new Error(body.error || body.message || `Request failed with ${response.status}`);
        error.status = response.status;
        error.body = body;
        throw error;
    }

    return response.json();
};

export const fetchStorefrontBootstrap = async (subdomain, params = {}) => {
    const response = await fetchPublicJson(`/storefront/${encodeURIComponent(subdomain)}/bootstrap`, {
        params,
        revalidate: 30,
    });

    return response.data || null;
};

export const fetchStorefrontInfo = async (subdomain) => (
    fetchPublicJson(`/storefront/${encodeURIComponent(subdomain)}/info`, {
        revalidate: 30,
    })
);

export const fetchStorefrontProducts = async (subdomain, params = {}) => {
    const response = await fetchPublicJson(`/storefront/${encodeURIComponent(subdomain)}/products`, {
        params,
        revalidate: 60,
    });

    return response || {};
};

export const fetchStorefrontProduct = async (subdomain, productId) => (
    fetchPublicJson(`/storefront/${encodeURIComponent(subdomain)}/products/${encodeURIComponent(productId)}`, {
        revalidate: 30,
    })
);

export const fetchStorefrontCollections = async (subdomain) => {
    const response = await fetchPublicJson(`/storefront/${encodeURIComponent(subdomain)}/collections`, {
        revalidate: 60,
    });

    return response.data || [];
};

export const fetchStorefrontCollection = async (subdomain, slug, params = {}) => {
    const response = await fetchPublicJson(`/storefront/${encodeURIComponent(subdomain)}/collections/${encodeURIComponent(slug)}`, {
        params,
        revalidate: 60,
    });

    return response.data || null;
};
