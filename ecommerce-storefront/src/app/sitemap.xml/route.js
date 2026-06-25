import { LANDING_SITE_URL, legalPages } from "../landingContent";

export function GET() {
    const urls = [
        { loc: LANDING_SITE_URL, priority: "1.0" },
        ...Object.keys(legalPages).map((type) => ({
            loc: `${LANDING_SITE_URL}/legal/${type}`,
            priority: "0.4",
        })),
    ];

    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
        .map((item) => `  <url><loc>${item.loc}</loc><priority>${item.priority}</priority></url>`)
        .join("\n")}\n</urlset>`;

    return new Response(body, {
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
        },
    });
}
