import StorefrontHomeClient from './StorefrontHomeClient';
import { fetchStorefrontBootstrap } from '@/lib/storefrontServer';
import { headers } from 'next/headers';
import {
    buildMetadata,
    getHomepageCanonicalUrl,
    getHomepageSeoDescription,
    getHomepageSeoTitle,
    getOgImage,
    isShopSearchVisible,
    noindexMetadata
} from '@/lib/seo';

const getInitialStorefrontData = async (subdomain, host = '') => {
    try {
        return await fetchStorefrontBootstrap(subdomain, {
            page: 1,
            limit: 9,
            sort: 'newest',
        }, {
            storefrontHost: host,
        });
    } catch (error) {
        if ([404, 423].includes(error.status)) {
            return {
                shop: null,
                error: error.body?.error || error.message || 'This storefront is currently unavailable.',
            };
        }

        console.error('Server storefront bootstrap error:', error.message);
        return null;
    }
};

export async function generateMetadata({ params }) {
    const { subdomain } = await params;
    const headerStore = await headers();
    const host = headerStore.get('host') || '';

    try {
        const initialData = await fetchStorefrontBootstrap(subdomain, {
            page: 1,
            limit: 9,
            sort: 'newest',
        }, {
            storefrontHost: host,
        });
        const shop = initialData?.shop;
        if (!shop) return noindexMetadata('Store unavailable', 'This storefront is currently unavailable.');

        const url = getHomepageCanonicalUrl({ host, subdomain, shop });
        return buildMetadata({
            title: getHomepageSeoTitle(shop),
            description: getHomepageSeoDescription(shop),
            url,
            image: getOgImage(null, shop),
            type: 'website',
            isIndexable: isShopSearchVisible(shop),
            googleSiteVerification: shop?.theme?.seo?.googleSiteVerification || ''
        });
    } catch (error) {
        return noindexMetadata('Store unavailable', error.body?.error || error.message || 'This storefront is currently unavailable.');
    }
}

export default async function VendorHomePage({ params }) {
    const { subdomain } = await params;
    const headerStore = await headers();
    const host = headerStore.get('host') || '';
    const initialData = await getInitialStorefrontData(subdomain, host);

    return <StorefrontHomeClient subdomain={subdomain} initialData={initialData} />;
}
