export const escapeXml = (value = "") => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const safeIsoDate = value => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

export const buildUrlsetXml = (entries = []) => {
    const nodes = entries.map(({ loc, lastmod, changefreq, priority }) => {
        const isoDate = safeIsoDate(lastmod);
        return [
            "  <url>",
            `    <loc>${escapeXml(loc)}</loc>`,
            isoDate ? `    <lastmod>${escapeXml(isoDate)}</lastmod>` : "",
            changefreq ? `    <changefreq>${escapeXml(changefreq)}</changefreq>` : "",
            priority ? `    <priority>${escapeXml(priority)}</priority>` : "",
            "  </url>"
        ].filter(Boolean).join("\n");
    });
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${nodes.join("\n")}\n</urlset>`;
};

export const buildSitemapIndexXml = (entries = []) => {
    const nodes = entries.map(({ loc, lastmod }) => {
        const isoDate = safeIsoDate(lastmod);
        return [
            "  <sitemap>",
            `    <loc>${escapeXml(loc)}</loc>`,
            isoDate ? `    <lastmod>${escapeXml(isoDate)}</lastmod>` : "",
            "  </sitemap>"
        ].filter(Boolean).join("\n");
    });
    return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${nodes.join("\n")}\n</sitemapindex>`;
};

export const xmlResponse = (body, { status = 200, cacheControl = "no-cache, max-age=0, must-revalidate" } = {}) => (
    new Response(body, {
        status,
        headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": cacheControl
        }
    })
);

export const sitemapFailureResponse = () => xmlResponse(
    `<?xml version="1.0" encoding="UTF-8"?>\n<error>Sitemap temporarily unavailable.</error>`,
    { status: 503, cacheControl: "no-store" }
);
