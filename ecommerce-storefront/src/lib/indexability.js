import { getShopBaseUrl, getRobotsForPage, isShopSearchVisible } from "@/lib/seo";

const PUBLIC_RESOURCE_RULES = {
    product: resource => (
        resource?.isDeleted !== true &&
        resource?.isActive !== false &&
        (!resource?.status || resource.status === "Published")
    ),
    collection: resource => resource?.isActive !== false,
    category: resource => Number(resource?.productCount || 0) > 0,
    policy: resource => Boolean(String(resource?.content || "").trim()),
    homepage: () => true
};

export const resolveStorefrontIndexability = ({
    shop = null,
    resource = null,
    resourceType = "homepage",
    exists = true,
    host = "",
    subdomain = "",
    canonicalPath = "/",
    preview = false,
    environmentAllowsIndexing = (
        process.env.NODE_ENV === "production" &&
        process.env.VERCEL_ENV !== "preview"
    )
} = {}) => {
    const canonicalOrigin = shop ? getShopBaseUrl({ host, subdomain, shop }).replace(/\/$/, "") : "";
    const publicRule = PUBLIC_RESOURCE_RULES[resourceType] || (() => true);
    const publiclyAccessible = Boolean(shop && exists && publicRule(resource));
    const searchVisible = Boolean(shop && isShopSearchVisible(shop));
    const indexable = Boolean(
        publiclyAccessible &&
        searchVisible &&
        !preview &&
        environmentAllowsIndexing
    );

    let reason = "INDEXABLE";
    if (!exists || !shop) reason = "NOT_FOUND";
    else if (!publiclyAccessible) reason = "NOT_PUBLIC";
    else if (!searchVisible) reason = "SEARCH_VISIBILITY_DISABLED";
    else if (preview) reason = "PREVIEW";
    else if (!environmentAllowsIndexing) reason = "ENVIRONMENT_NOINDEX";

    const safePath = String(canonicalPath || "/").startsWith("/")
        ? String(canonicalPath || "/")
        : `/${canonicalPath}`;

    return {
        exists: Boolean(exists && shop),
        publiclyAccessible,
        indexable,
        robots: getRobotsForPage({ isIndexable: indexable, isFollowable: indexable }),
        canonicalOrigin,
        canonicalPath: safePath,
        canonicalUrl: canonicalOrigin ? `${canonicalOrigin}${safePath === "/" ? "/" : safePath}` : "",
        sitemapEligible: indexable,
        structuredDataEligible: indexable,
        reason
    };
};
