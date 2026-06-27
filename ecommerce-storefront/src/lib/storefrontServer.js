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

const buildRequestHeaders = ({ storefrontHost = '' } = {}) => {
    const headers = { accept: 'application/json' };
    const cleanHost = String(storefrontHost || '').trim().toLowerCase();
    if (cleanHost) headers['x-storefront-host'] = cleanHost;
    return headers;
};

const isCustomDomainHost = (host = '') => {
    const cleanHost = String(host || '').trim().toLowerCase().split(':')[0];
    if (!cleanHost) return false;
    if (cleanHost === 'localhost' || cleanHost === '127.0.0.1') return false;
    if (cleanHost.endsWith('.localhost')) return false;
    if (cleanHost === 'scaleup.codes' || cleanHost.endsWith('.scaleup.codes')) return false;
    return cleanHost.includes('.');
};

const fetchPublicJson = async (path, { params = {}, revalidate = 30, storefrontHost = '' } = {}) => {
    const fetchOptions = {
        headers: buildRequestHeaders({ storefrontHost }),
    };

    if (isCustomDomainHost(storefrontHost)) {
        fetchOptions.cache = 'no-store';
    } else {
        fetchOptions.next = { revalidate };
    }

    const response = await fetch(buildUrl(path, params), fetchOptions);

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const error = new Error(body.error || body.message || `Request failed with ${response.status}`);
        error.status = response.status;
        error.body = body;
        throw error;
    }

    return response.json();
};

export const fetchStorefrontBootstrap = async (subdomain, params = {}, options = {}) => {
    const response = await fetchPublicJson(`/storefront/${encodeURIComponent(subdomain)}/bootstrap`, {
        params,
        revalidate: 30,
        storefrontHost: options.storefrontHost || options.host || '',
    });

    return response.data || null;
};

export const fetchStorefrontInfo = async (subdomain, options = {}) => (
    fetchPublicJson(`/storefront/${encodeURIComponent(subdomain)}/info`, {
        revalidate: 30,
        storefrontHost: options.storefrontHost || options.host || '',
    })
);

export const fetchStorefrontProducts = async (subdomain, params = {}, options = {}) => {
    const response = await fetchPublicJson(`/storefront/${encodeURIComponent(subdomain)}/products`, {
        params,
        revalidate: 60,
        storefrontHost: options.storefrontHost || options.host || '',
    });

    return response || {};
};

export const fetchStorefrontProduct = async (subdomain, productId, options = {}) => (
    fetchPublicJson(`/storefront/${encodeURIComponent(subdomain)}/products/${encodeURIComponent(productId)}`, {
        revalidate: 30,
        storefrontHost: options.storefrontHost || options.host || '',
    })
);

export const fetchStorefrontCollections = async (subdomain, options = {}) => {
    const response = await fetchPublicJson(`/storefront/${encodeURIComponent(subdomain)}/collections`, {
        revalidate: 60,
        storefrontHost: options.storefrontHost || options.host || '',
    });

    return response.data || [];
};

export const fetchStorefrontCollection = async (subdomain, slug, params = {}, options = {}) => {
    const response = await fetchPublicJson(`/storefront/${encodeURIComponent(subdomain)}/collections/${encodeURIComponent(slug)}`, {
        params,
        revalidate: 60,
        storefrontHost: options.storefrontHost || options.host || '',
    });

    return response.data || null;
};
