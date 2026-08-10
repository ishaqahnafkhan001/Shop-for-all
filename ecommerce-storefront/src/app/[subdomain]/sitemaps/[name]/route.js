import {
    fetchStorefrontInfo,
    fetchStorefrontSitemapData,
    getStorefrontPlanRedirectUrl
} from "@/lib/storefrontServer";
import {
    getCategoryCanonicalUrl,
    getCollectionCanonicalUrl,
    getHomepageCanonicalUrl,
    getPolicyCanonicalUrl,
    getProductCanonicalUrl
} from "@/lib/seo";
import { resolveStorefrontIndexability } from "@/lib/indexability";
import { buildUrlsetXml, sitemapFailureResponse, xmlResponse } from "@/lib/sitemapXml";

const POLICY_TYPES = ["privacy", "terms", "refund", "shipping"];
const POLICY_FIELD_BY_TYPE = {
    privacy: "privacyPolicy",
    terms: "termsAndConditions",
    refund: "returnRefundPolicy",
    shipping: "shippingPolicy"
};

const hasPolicyContent = (shop, type) => {
    const policies = shop?.theme?.policies || {};
    return Boolean(String(policies[type] || policies[POLICY_FIELD_BY_TYPE[type]] || "").trim());
};

const dedupeEntries = entries => {
    const byUrl = new Map();
    entries.forEach(entry => {
        if (entry?.loc && !byUrl.has(entry.loc)) byUrl.set(entry.loc, entry);
    });
    return [...byUrl.values()];
};

const buildCoreEntries = ({ shop, data, host, subdomain }) => {
    const homepage = getHomepageCanonicalUrl({ host, subdomain, shop });
    return dedupeEntries([
        { loc: homepage, lastmod: shop?.updatedAt, changefreq: "daily", priority: "1.0" },
        ...((data.categories || []).map(category => ({
            loc: getCategoryCanonicalUrl({ host, subdomain, shop, category: category.slug || category.name }),
            lastmod: category.updatedAt,
            changefreq: "weekly",
            priority: "0.6"
        }))),
        ...((data.collections || []).map(collection => ({
            loc: getCollectionCanonicalUrl({ host, subdomain, shop, collection }),
            lastmod: collection.updatedAt || collection.createdAt,
            changefreq: "weekly",
            priority: "0.6"
        }))),
        ...POLICY_TYPES.filter(type => hasPolicyContent(shop, type)).map(type => ({
            loc: getPolicyCanonicalUrl({ host, subdomain, shop, type }),
            lastmod: shop?.updatedAt,
            changefreq: "monthly",
            priority: "0.4"
        }))
    ]);
};

export async function GET(request, { params }) {
    const { subdomain, name } = await params;
    const host = request.headers.get("host") || "";
    const productMatch = /^products-(\d+)\.xml$/i.exec(String(name || ""));
    const isCore = String(name || "").toLowerCase() === "core.xml";
    if (!isCore && !productMatch) return xmlResponse(buildUrlsetXml([]), { status: 404, cacheControl: "no-store" });

    try {
        const requestParams = isCore
            ? { type: "core" }
            : { type: "products", page: Number(productMatch[1]), limit: 1000 };
        const [shop, data] = await Promise.all([
            fetchStorefrontInfo(subdomain, { storefrontHost: host, fresh: true }),
            fetchStorefrontSitemapData(subdomain, requestParams, { storefrontHost: host, fresh: true })
        ]);
        const policy = resolveStorefrontIndexability({
            shop,
            resourceType: "homepage",
            host,
            subdomain,
            canonicalPath: "/"
        });
        if (!policy.sitemapEligible) return xmlResponse(buildUrlsetXml([]));

        const entries = isCore
            ? buildCoreEntries({ shop, data, host, subdomain })
            : dedupeEntries((data.products || []).filter(product => product?.slug).map(product => ({
                loc: getProductCanonicalUrl({ host, subdomain, shop, product }),
                lastmod: product.updatedAt || product.createdAt,
                changefreq: "weekly",
                priority: "0.8"
            })));

        console.info("storefront_sitemap_chunk_generated", {
            tenant: String(subdomain),
            sitemap: isCore ? "core" : `products-${Number(productMatch[1])}`,
            urlCount: entries.length
        });
        return xmlResponse(buildUrlsetXml(entries));
    } catch (error) {
        if (error?.status === 404) {
            return xmlResponse(buildUrlsetXml([]), { status: 404, cacheControl: "no-store" });
        }
        const pathname = `/sitemaps/${encodeURIComponent(String(name || ""))}`;
        const redirectTo = getStorefrontPlanRedirectUrl(error, pathname);
        if (redirectTo) return Response.redirect(redirectTo, 307);
        console.error("storefront_sitemap_chunk_failed", {
            tenant: String(subdomain),
            sitemap: String(name || ""),
            status: error?.status || 500,
            errorCode: error?.body?.code || "SITEMAP_CHUNK_FAILED"
        });
        return sitemapFailureResponse();
    }
}
