import {
    fetchStorefrontInfo,
    fetchStorefrontSitemapData,
    getStorefrontPlanRedirectUrl
} from "@/lib/storefrontServer";
import { resolveStorefrontIndexability } from "@/lib/indexability";
import { buildSitemapIndexXml, sitemapFailureResponse, xmlResponse } from "@/lib/sitemapXml";

export async function GET(request, { params }) {
    const { subdomain } = await params;
    const host = request.headers.get("host") || "";

    try {
        const [shop, summary] = await Promise.all([
            fetchStorefrontInfo(subdomain, { storefrontHost: host, fresh: true }),
            fetchStorefrontSitemapData(subdomain, { type: "summary" }, { storefrontHost: host, fresh: true })
        ]);
        const policy = resolveStorefrontIndexability({
            shop,
            resourceType: "homepage",
            host,
            subdomain,
            canonicalPath: "/"
        });
        if (!policy.sitemapEligible) {
            return xmlResponse(buildSitemapIndexXml([]));
        }

        const chunkSize = Math.min(Math.max(Number(summary.productChunkSize) || 1000, 1), 1000);
        const productChunks = Math.ceil(Math.max(Number(summary.productCount) || 0, 0) / chunkSize);
        const baseUrl = policy.canonicalOrigin;
        const entries = [
            { loc: `${baseUrl}/sitemaps/core.xml`, lastmod: shop?.updatedAt },
            ...Array.from({ length: productChunks }, (_, index) => ({
                loc: `${baseUrl}/sitemaps/products-${index + 1}.xml`
            }))
        ];

        console.info("storefront_sitemap_index_generated", {
            tenant: String(subdomain),
            sitemapCount: entries.length,
            productCount: Number(summary.productCount) || 0
        });
        return xmlResponse(buildSitemapIndexXml(entries));
    } catch (error) {
        const redirectTo = getStorefrontPlanRedirectUrl(error, "/sitemap.xml");
        if (redirectTo) return Response.redirect(redirectTo, 307);
        console.error("storefront_sitemap_index_failed", {
            tenant: String(subdomain),
            status: error?.status || 500,
            errorCode: error?.body?.code || "SITEMAP_INDEX_FAILED"
        });
        return sitemapFailureResponse();
    }
}
