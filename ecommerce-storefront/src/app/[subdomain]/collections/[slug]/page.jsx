import { headers } from "next/headers";
import { notFound } from "next/navigation";
import CollectionPageClient from "./CollectionPageClient";
import { fetchStorefrontCollection, fetchStorefrontInfo } from "@/lib/storefrontServer";
import {
    buildBreadcrumbJsonLd,
    buildCollectionItemListJsonLd,
    buildMetadata,
    getCollectionCanonicalUrl,
    getCollectionOgImage,
    getCollectionSeoDescription,
    getCollectionSeoTitle,
    getHomepageCanonicalUrl,
    isShopSearchVisible,
    noindexMetadata
} from "@/lib/seo";

const getCollectionPageData = async (subdomain, slug) => {
    try {
        const [shop, collectionData] = await Promise.all([
            fetchStorefrontInfo(subdomain),
            fetchStorefrontCollection(subdomain, slug, { page: 1, limit: 48, sort: "newest" })
        ]);

        return {
            shop,
            collection: collectionData?.collection || null,
            products: collectionData?.products || [],
            pagination: collectionData?.pagination || null
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
    const data = await getCollectionPageData(subdomain, slug);

    if (!data?.collection || !data?.shop) {
        return noindexMetadata("Collection unavailable", "This collection is currently unavailable.");
    }

    const { shop, collection, products } = data;
    return buildMetadata({
        title: getCollectionSeoTitle(collection, shop),
        description: getCollectionSeoDescription(collection, shop),
        url: getCollectionCanonicalUrl({ host, subdomain, shop, collection }),
        image: getCollectionOgImage(collection, products, shop),
        type: "website",
        isIndexable: isShopSearchVisible(shop),
        googleSiteVerification: shop?.theme?.seo?.googleSiteVerification || ""
    });
}

export default async function CollectionPage({ params }) {
    const { subdomain, slug } = await params;
    const data = await getCollectionPageData(subdomain, slug);

    if (!data?.collection || !data?.shop) notFound();

    const headerStore = await headers();
    const host = headerStore.get("host") || "";
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
                shop={data.shop}
                collection={data.collection}
                products={data.products}
            />
        </>
    );
}
