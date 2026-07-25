import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import CategoryPageClient from "./CategoryPageClient";
import {
    fetchStorefrontInfo,
    fetchStorefrontProducts,
    getStorefrontPlanRedirectUrl
} from "@/lib/storefrontServer";
import {
    buildBreadcrumbJsonLd,
    buildStorefrontMetadata,
    getCategoryCanonicalUrl,
    getCategorySeoDescription,
    getCategorySeoTitle,
    getHomepageCanonicalUrl,
    getProductCanonicalUrl,
    isShopSearchVisible,
    noindexMetadata
} from "@/lib/seo";

const decodeCategory = (value = "") => {
    try {
        return decodeURIComponent(String(value || "").replace(/\+/g, "%20")).trim();
    } catch {
        return String(value || "").trim();
    }
};

const stringifyJsonLd = (jsonLd) => JSON.stringify(jsonLd).replace(/</g, "\\u003c");

const getCategoryFilters = (searchParams = {}) => {
    const sort = ["default", "newest", "price_asc", "price_desc", "rating_desc"].includes(searchParams.sort)
        ? searchParams.sort
        : "newest";
    const stock = ["all", "in", "out"].includes(searchParams.stock) ? searchParams.stock : "all";

    return {
        page: Math.max(Number(searchParams.page) || 1, 1),
        limit: Math.min(Math.max(Number(searchParams.limit) || 12, 1), 48),
        minPrice: searchParams.minPrice || "",
        maxPrice: searchParams.maxPrice || "",
        stock,
        sale: searchParams.sale === "true" ? "true" : "",
        rating: ["3", "4"].includes(String(searchParams.rating || "")) ? String(searchParams.rating) : "",
        sort
    };
};

const getCategoryPageData = async (subdomain, slug, host = "", searchParams = {}) => {
    const category = decodeCategory(slug);
    if (!category) return null;
    const filters = getCategoryFilters(searchParams);

    try {
        const [shop, productData] = await Promise.all([
            fetchStorefrontInfo(subdomain, { storefrontHost: host }),
            fetchStorefrontProducts(subdomain, {
                category,
                page: filters.page,
                limit: filters.limit,
                sort: filters.sort === "default" ? "newest" : filters.sort,
                minPrice: filters.minPrice,
                maxPrice: filters.maxPrice,
                stock: filters.stock === "all" ? "" : filters.stock,
                sale: filters.sale,
                rating: filters.rating
            }, { storefrontHost: host })
        ]);

        const products = productData?.data || productData?.products || [];
        const categories = productData?.categories || [];
        const pagination = productData?.pagination || { page: filters.page, limit: filters.limit, total: products.length, totalPages: 1, pages: 1 };
        const categoryExists = categories.some(item => String(item || "").trim().toLowerCase() === category.toLowerCase());

        return {
            shop,
            category,
            products,
            categories,
            filters,
            pagination,
            exists: categoryExists || products.length > 0
        };
    } catch (error) {
        const redirectTo = getStorefrontPlanRedirectUrl(
            error,
            `/categories/${encodeURIComponent(slug)}`
        );
        if (redirectTo) return { redirectTo };
        if (![404, 423].includes(error.status)) {
            console.error("Server category page fetch error:", error.message);
        }
        return null;
    }
};

export async function generateMetadata({ params }) {
    const { subdomain, slug } = await params;
    const headerStore = await headers();
    const host = headerStore.get("host") || "";
    const data = await getCategoryPageData(subdomain, slug, host);

    if (!data?.shop || !data?.exists) {
        return noindexMetadata("Category unavailable", "This category is currently unavailable.");
    }

    return buildStorefrontMetadata({
        shop: data.shop,
        pageTitle: getCategorySeoTitle(data.category, data.shop),
        description: getCategorySeoDescription(data.category, data.shop),
        url: getCategoryCanonicalUrl({ host, subdomain, shop: data.shop, category: data.category }),
        image: "",
        type: "website",
        isIndexable: isShopSearchVisible(data.shop),
        googleSiteVerification: data.shop?.theme?.seo?.googleSiteVerification || ""
    });
}

export default async function CategoryPage({ params, searchParams }) {
    const { subdomain, slug } = await params;
    const resolvedSearchParams = await searchParams;
    const headerStore = await headers();
    const host = headerStore.get("host") || "";
    const data = await getCategoryPageData(subdomain, slug, host, resolvedSearchParams || {});
    if (data?.redirectTo) redirect(data.redirectTo);

    if (!data?.shop || !data?.exists) notFound();

    const homepageUrl = getHomepageCanonicalUrl({ host, subdomain, shop: data.shop });
    const categoryUrl = getCategoryCanonicalUrl({ host, subdomain, shop: data.shop, category: data.category });
    const breadcrumbJsonLd = buildBreadcrumbJsonLd({
        items: [
            { name: data.shop?.shopName || data.shop?.name || "Store", url: homepageUrl },
            { name: data.category, url: categoryUrl }
        ]
    });
    const itemListJsonLd = data.products.length ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: data.category,
        itemListElement: data.products.map((product, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: getProductCanonicalUrl({ host, subdomain, shop: data.shop, product })
        }))
    } : null;

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
            <CategoryPageClient
                key={JSON.stringify(data.filters)}
                shop={data.shop}
                category={data.category}
                products={data.products}
                pagination={data.pagination}
                filters={data.filters}
            />
        </>
    );
}
