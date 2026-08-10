import { headers } from "next/headers";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import CollectionPageClient from "./CollectionPageClient";
import {
    fetchStorefrontCollection,
    fetchStorefrontInfo,
    getStorefrontPlanRedirectUrl
} from "@/lib/storefrontServer";
import {
    buildBreadcrumbJsonLd,
    buildCollectionItemListJsonLd,
    buildStorefrontMetadata,
    getCollectionCanonicalUrl,
    getCollectionOgImage,
    getCollectionSeoDescription,
    getCollectionSeoTitle,
    getHomepageCanonicalUrl,
    noindexMetadata
} from "@/lib/seo";
import { resolveStorefrontIndexability } from "@/lib/indexability";

const getCollectionFilters = (searchParams = {}) => ({
    page: Math.max(Number(searchParams.page) || 1, 1),
    limit: Math.min(Math.max(Number(searchParams.limit) || 12, 1), 48),
    sort: ["newest", "oldest", "price_asc", "price_desc", "rating_desc"].includes(searchParams.sort)
        ? searchParams.sort
        : "newest"
});

const getCollectionPageData = async (subdomain, slug, host = "", searchParams = {}, fresh = false) => {
    const filters = getCollectionFilters(searchParams);

    try {
        const [shop, collectionData] = await Promise.all([
            fetchStorefrontInfo(subdomain, { storefrontHost: host, fresh }),
            fetchStorefrontCollection(subdomain, slug, filters, { storefrontHost: host, fresh })
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
        const redirectTo = getStorefrontPlanRedirectUrl(
            error,
            `/collections/${encodeURIComponent(slug)}`
        );
        if (redirectTo) return { redirectTo };
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
    const data = await getCollectionPageData(subdomain, slug, host, {}, true);

    if (!data?.collection || !data?.shop) {
        return noindexMetadata("Collection unavailable", "This collection is currently unavailable.");
    }

    const { shop, collection, products } = data;
    const indexability = resolveStorefrontIndexability({
        shop,
        resource: collection,
        resourceType: "collection",
        host,
        subdomain,
        canonicalPath: `/collections/${collection.slug}`
    });
    return buildStorefrontMetadata({
        shop,
        pageTitle: getCollectionSeoTitle(collection, shop),
        description: getCollectionSeoDescription(collection, shop),
        url: getCollectionCanonicalUrl({ host, subdomain, shop, collection }),
        image: getCollectionOgImage(collection, products, shop),
        type: "website",
        isIndexable: indexability.indexable,
        googleSiteVerification: shop?.theme?.seo?.googleSiteVerification || ""
    });
}

export default async function CollectionPage({ params, searchParams }) {
    const { subdomain, slug } = await params;
    const resolvedSearchParams = await searchParams;
    const headerStore = await headers();
    const host = headerStore.get("host") || "";
    const data = await getCollectionPageData(subdomain, slug, host, resolvedSearchParams || {});
    if (data?.redirectTo) redirect(data.redirectTo);

    if (!data?.collection || !data?.shop) notFound();
    if (String(data.collection.slug || "").toLowerCase() !== String(slug || "").toLowerCase()) {
        permanentRedirect(`/collections/${encodeURIComponent(data.collection.slug)}`);
    }

    const collectionUrl = getCollectionCanonicalUrl({
        host,
        subdomain,
        shop: data.shop,
        collection: data.collection
    });
    const homepageUrl = getHomepageCanonicalUrl({ host, subdomain, shop: data.shop });
    const indexability = resolveStorefrontIndexability({
        shop: data.shop,
        resource: data.collection,
        resourceType: "collection",
        host,
        subdomain,
        canonicalPath: `/collections/${data.collection.slug}`
    });
    const breadcrumbJsonLd = indexability.structuredDataEligible ? buildBreadcrumbJsonLd({
        items: [
            { name: data.shop?.shopName || data.shop?.name || "Store", url: homepageUrl },
            { name: data.collection.title, url: collectionUrl }
        ]
    }) : null;
    const itemListJsonLd = indexability.structuredDataEligible ? buildCollectionItemListJsonLd({
        collection: data.collection,
        products: data.products,
        shop: data.shop,
        host,
        subdomain
    }) : null;

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
