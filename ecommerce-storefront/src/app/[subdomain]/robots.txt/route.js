import { fetchStorefrontInfo } from "@/lib/storefrontServer";
import { getShopBaseUrl } from "@/lib/seo";

const privatePaths = [
    "/cart",
    "/checkout",
    "/account",
    "/login",
    "/register",
    "/signup",
    "/track",
    "/search",
    "/api",
    "/dashboard",
    "/admin",
    "/preview"
];

export async function GET(request, { params }) {
    const { subdomain } = await params;
    const host = request.headers.get("host") || "";

    try {
        const shop = await fetchStorefrontInfo(subdomain, { storefrontHost: host });
        const baseUrl = getShopBaseUrl({ host, subdomain, shop });
        const body = [
            "User-agent: *",
            "Allow: /",
            ...privatePaths.map(path => `Disallow: ${path}`),
            "",
            `Sitemap: ${baseUrl.replace(/\/$/, "")}/sitemap.xml`,
            ""
        ].join("\n");

        return new Response(body, {
            headers: {
                "content-type": "text/plain; charset=utf-8",
                "cache-control": "public, s-maxage=300, stale-while-revalidate=3600"
            }
        });
    } catch {
        return new Response("User-agent: *\nDisallow: /\n", {
            headers: {
                "content-type": "text/plain; charset=utf-8",
                "cache-control": "public, s-maxage=60"
            }
        });
    }
}
