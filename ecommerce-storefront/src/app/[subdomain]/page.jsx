import StorefrontHomeClient from './StorefrontHomeClient';
import { fetchStorefrontBootstrap } from '@/lib/storefrontServer';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
    buildHomepageJsonLd,
    buildNextHomepageMetadata,
    getHomepageCanonicalUrl,
    noindexMetadata,
    resolveStorefrontHomepageSeo
} from '@/lib/seo';

const stringifyJsonLd = (jsonLd) => JSON.stringify(jsonLd).replace(/</g, '\\u003c');

const getInitialStorefrontData = async (subdomain, host = '') => {
    try {
        return await fetchStorefrontBootstrap(subdomain, {
            page: 1,
            limit: 9,
            sort: 'newest',
        }, {
            storefrontHost: host,
            fresh: true,
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
            fresh: true,
        });
        const shop = initialData?.shop;
        if (!shop) return noindexMetadata('Store unavailable', 'This storefront is currently unavailable.');

        const resolvedSeo = resolveStorefrontHomepageSeo({
            shop,
            host,
            subdomain,
            catalogSummary: {
                categories: initialData?.categories || [],
                collections: initialData?.collections || []
            }
        });
        return buildNextHomepageMetadata(resolvedSeo, shop);
    } catch (error) {
        return noindexMetadata('Store unavailable', error.body?.error || error.message || 'This storefront is currently unavailable.');
    }
}

export default async function VendorHomePage({ params, searchParams }) {
    const { subdomain } = await params;
    const query = searchParams ? await searchParams : {};
    const legacyCategory = Array.isArray(query?.category) ? query.category[0] : query?.category;
    if (legacyCategory) {
        redirect(`/categories/${encodeURIComponent(String(legacyCategory).trim())}`);
    }

    const headerStore = await headers();
    const host = headerStore.get('host') || '';
    const initialData = await getInitialStorefrontData(subdomain, host);
    const shop = initialData?.shop;
    const homepageUrl = shop ? getHomepageCanonicalUrl({ host, subdomain, shop }) : '';
    const homepageJsonLd = shop ? buildHomepageJsonLd({
        shop,
        url: homepageUrl,
        subdomain,
        catalogSummary: {
            categories: initialData?.categories || [],
            collections: initialData?.collections || []
        }
    }) : [];

    return (
        <>
            {homepageJsonLd.map((jsonLd, index) => (
                <script
                    key={`${jsonLd['@type']}-${index}`}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: stringifyJsonLd(jsonLd) }}
                />
            ))}
            <StorefrontHomeClient subdomain={subdomain} initialData={initialData} />
        </>
    );
}
