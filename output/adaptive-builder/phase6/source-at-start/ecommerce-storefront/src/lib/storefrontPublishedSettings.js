import { cache } from 'react';
import { fetchStorefrontInfo } from './storefrontServer';
import { normalizeTheme } from './theme';

// React cache is request-scoped: share one public snapshot between layout and
// homepage without retaining one tenant's settings across requests or hosts.
export const getPublishedStorefrontSettings = cache(async (subdomain, storefrontHost = '') => {
    const shop = await fetchStorefrontInfo(subdomain, { storefrontHost, fresh: true });
    if (!shop?._id) throw new Error('Published storefront settings are unavailable.');
    return { ...shop, theme: normalizeTheme(shop.theme || {}) };
});
