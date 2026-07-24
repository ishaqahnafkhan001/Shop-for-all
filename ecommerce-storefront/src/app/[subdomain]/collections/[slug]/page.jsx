import { headers } from "next/headers";
import { notFound } from "next/navigation";
import CollectionPageClient from "./CollectionPageClient";
import { fetchStorefrontCollection, fetchStorefrontInfo } from "@/lib/storefrontServer";
import {
    buildBreadcrumbJsonLd,
    buildCollectionItemListJsonLd,
    buildStorefrontMetadata,
    getCollectionCanonicalUrl,
    getCollectionOgImage,
    getCollectionSeoDescription,
    getCollectionSeoTitle,
    getHomepageCanonicalUrl,
    isShopSearchVisible,
    noindexMetadata
} from "@/lib/seo";

const getCollectionFilters = (searchParams = {}) => ({
    page: Math.max(Number(searchParams.page) || 1, 1),
    limit: Math.min(Math.max(Number(searchParams.limit) || 12, 1), 48),
    sort: ["newest", "oldest", "price_asc", "price_desc", "rating_desc"].includes(searchParams.sort)
        ? searchParams.sort
        : "newest"
});

const getCollectionPageData = async (subdomain, slug, host = "", searchParams = {}) => {
    const filters = getCollectionFilters(searchParams);

    try {
        const [shop, collectionData] = await Promise.all([
            fetchStorefrontInfo(subdomain, { storefrontHost: host }),
            fetchStorefrontCollection(subdomain, slug, filters, { storefrontHost: host })
        ]);

        return {
            shop,
            collection: collectionData?.collection || null,
            products: collectionData?.products || [],
            pagination: collectionData?.pagination || {
                page: filters.page,
                limit: filters.limit,
                totalItems: collectionData?.products?.length || 0,
                totalPages: 1,
                pages: 1
            },
            filters
        };
    } catch (error) {
        if (![404, 423].includes(error.status)) {
            console.error("Server collection page fetch error:", error.message);
        }
        return null;
    }
};

const stringifyJsonLd = (jsonLd) => JSON.stringify(jsonLd).replace(/</g, "\\u003c");

export async function generateMetadata({ params }) {
    const { subdomain, slug } = await params;
    const headerStore = await headers();
    const host = headerStore.get("host") || "";
    const data = await getCollectionPageData(subdomain, slug, host);

    if (!data?.collection || !data?.shop) {
        return noindexMetadata("Collection unavailable", "This collection is currently unavailable.");
    }

    const { shop, collection, products } = data;
    return buildStorefrontMetadata({
        shop,
        pageTitle: getCollectionSeoTitle(collection, shop),
        description: getCollectionSeoDescription(collection, shop),
        url: getCollectionCanonicalUrl({ host, subdomain, shop, collection }),
        image: getCollectionOgImage(collection, products, shop),
        type: "website",
        isIndexable: isShopSearchVisible(shop),
        googleSiteVerification: shop?.theme?.seo?.googleSiteVerification || ""
    });
}

export default async function CollectionPage({ params, searchParams }) {
    const { subdomain, slug } = await params;
    const resolvedSearchParams = await searchParams;
    const headerStore = await headers();
    const host = headerStore.get("host") || "";
    const data = await getCollectionPageData(subdomain, slug, host, resolvedSearchParams || {});

    if (!data?.collection || !data?.shop) notFound();

    const collectionUrl = getCollectionCanonicalUrl({
        host,
        subdomain,
        shop: data.shop,
        collection: data.collection
    });
    const homepageUrl = getHomepageCanonicalUrl({ host, subdomain, shop: data.shop });
    const breadcrumbJsonLd = buildBreadcrumbJsonLd({
        items: [
            { name: data.shop?.shopName || data.shop?.name || "Store", url: homepageUrl },
            { name: data.collection.title, url: collectionUrl }
        ]
    });
    const itemListJsonLd = buildCollectionItemListJsonLd({
        collection: data.collection,
        products: data.products,
        shop: data.shop,
        host,
        subdomain
    });

    return (
        <>
            {breadcrumbJsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: stringifyJsonLd(breadcrumbJsonLd) }}
                />
            )}
            {itemListJsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: stringifyJsonLd(itemListJsonLd) }}
                />
            )}
            <CollectionPageClient
                key={JSON.stringify(data.filters)}
                shop={data.shop}
                collection={data.collection}
                products={data.products}
                pagination={data.pagination}
                filters={data.filters}
            />
        </>
    );
}
