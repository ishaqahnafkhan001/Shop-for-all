import { LANDING_SITE_URL } from "../landingContent";

export function GET() {
    const body = [
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin",
        "Disallow: /dashboard",
        "Disallow: /api",
        "Disallow: /checkout",
        "Disallow: /cart",
        "Disallow: /account",
        "Disallow: /preview",
        `Sitemap: ${LANDING_SITE_URL}/sitemap.xml`,
        "",
    ].join("\n");

    return new Response(body, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
        },
    });
}
