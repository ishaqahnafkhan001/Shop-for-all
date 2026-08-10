import { fetchStorefrontInfo, getStorefrontPlanRedirectUrl } from "@/lib/storefrontServer";
import { resolveStorefrontIndexability } from "@/lib/indexability";

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
        const shop = await fetchStorefrontInfo(subdomain, { storefrontHost: host, fresh: true });
        const policy = resolveStorefrontIndexability({
            shop,
            resourceType: "homepage",
            host,
            subdomain,
            canonicalPath: "/"
        });
        if (!policy.indexable) {
            return new Response("User-agent: *\nDisallow: /\n", {
                headers: {
                    "content-type": "text/plain; charset=utf-8",
                    "cache-control": "no-cache, max-age=0, must-revalidate"
                }
            });
        }
        const body = [
            "User-agent: *",
            "Allow: /",
            ...privatePaths.map(path => `Disallow: ${path}`),
            "",
            `Sitemap: ${policy.canonicalOrigin}/sitemap.xml`,
            ""
        ].join("\n");

        return new Response(body, {
            headers: {
                "content-type": "text/plain; charset=utf-8",
                "cache-control": "no-cache, max-age=0, must-revalidate"
            }
        });
    } catch (error) {
        const redirectTo = getStorefrontPlanRedirectUrl(error, "/robots.txt");
        if (redirectTo) return Response.redirect(redirectTo, 307);
        return new Response("User-agent: *\nDisallow: /\n", {
            headers: {
                "content-type": "text/plain; charset=utf-8",
                "cache-control": "public, s-maxage=60"
            }
        });
    }
}
