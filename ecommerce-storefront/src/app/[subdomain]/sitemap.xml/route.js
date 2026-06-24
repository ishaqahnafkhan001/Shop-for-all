import { fetchStorefrontInfo, fetchStorefrontProducts } from "@/lib/storefrontServer";
import {
    getHomepageCanonicalUrl,
    getPolicyCanonicalUrl,
    getProductCanonicalUrl
} from "@/lib/seo";

const POLICY_TYPES = ["privacy", "terms", "refund", "shipping"];

const escapeXml = (value = "") => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const urlNode = ({ loc, lastmod, changefreq = "weekly", priority = "0.7" }) => {
    const lastModified = lastmod ? `<lastmod>${escapeXml(new Date(lastmod).toISOString())}</lastmod>` : "";
    return [
        "  <url>",
        `    <loc>${escapeXml(loc)}</loc>`,
        lastModified ? `    ${lastModified}` : "",
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        "  </url>"
    ].filter(Boolean).join("\n");
};

const hasPolicyContent = (shop, type) => {
    const policies = shop?.theme?.policies || {};
    return Boolean(String(policies[type] || "").trim());
};

export async function GET(request, { params }) {
    const { subdomain } = await params;
    const host = request.headers.get("host") || "";

    try {
        const [shop, productsResponse] = await Promise.all([
            fetchStorefrontInfo(subdomain),
            fetchStorefrontProducts(subdomain, { page: 1, limit: 2500, sort: "newest" })
        ]);

        const products = productsResponse.products || productsResponse.data || [];
        const urls = [
            urlNode({
                loc: getHomepageCanonicalUrl({ host, subdomain, shop }),
                lastmod: shop?.updatedAt,
                changefreq: "daily",
                priority: "1.0"
            }),
            ...products
                .filter(product => product?.slug)
                .map(product => urlNode({
                    loc: getProductCanonicalUrl({ host, subdomain, shop, product }),
                    lastmod: product.updatedAt || product.createdAt,
                    changefreq: "weekly",
                    priority: "0.8"
                })),
            ...POLICY_TYPES
                .filter(type => hasPolicyContent(shop, type))
                .map(type => urlNode({
                    loc: getPolicyCanonicalUrl({ host, subdomain, shop, type }),
                    lastmod: shop?.updatedAt,
                    changefreq: "monthly",
                    priority: "0.4"
                }))
        ];

        return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`, {
            headers: {
                "content-type": "application/xml; charset=utf-8",
                "cache-control": "public, s-maxage=300, stale-while-revalidate=3600"
            }
        });
    } catch {
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
            headers: {
                "content-type": "application/xml; charset=utf-8",
                "cache-control": "public, s-maxage=60"
            }
        });
    }
}
