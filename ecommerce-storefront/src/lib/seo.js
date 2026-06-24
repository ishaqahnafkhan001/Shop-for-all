const DEFAULT_TITLE = "ShopForAll | Multi-Tenant E-commerce";
const DEFAULT_DESCRIPTION = "Shop quality products from trusted stores.";
const DEFAULT_CURRENCY = "BDT";

export const isObjectId = (value = "") => /^[a-f\d]{24}$/i.test(String(value));

export const cleanTextForMeta = (text = "") => {
    return String(text || "")
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, " ")
        .trim();
};

const truncateAtWord = (text = "", max = 160) => {
    const clean = cleanTextForMeta(text);
    if (clean.length <= max) return clean;
    const clipped = clean.slice(0, max - 1).trim();
    const lastSpace = clipped.lastIndexOf(" ");
    return `${(lastSpace > 40 ? clipped.slice(0, lastSpace) : clipped).trim()}…`;
};

export const truncateMetaTitle = (title, max = 70) => truncateAtWord(title, max) || DEFAULT_TITLE;
export const truncateMetaDescription = (description, max = 170) => truncateAtWord(description, max) || DEFAULT_DESCRIPTION;

const getProtocol = (host = "") => (/localhost|127\.0\.0\.1|\[::1\]/i.test(host) ? "http" : "https");

const normalizeHost = (host = "") => String(host || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

const isPlatformRootHost = (host = "") => {
    const cleanHost = normalizeHost(host).split(":")[0];
    return [
        "localhost",
        "127.0.0.1",
        "scaleup.codes",
        "www.scaleup.codes",
        "shop.scaleup.codes"
    ].includes(cleanHost);
};

export const getShopBaseUrl = ({ host, subdomain, shop, customDomain } = {}) => {
    const currentHost = normalizeHost(host || "");
    const verifiedCustomDomain = normalizeHost(
        customDomain ||
        (shop?.customDomain?.status === "Verified" ? shop?.customDomain?.domain : "")
    );

    if (verifiedCustomDomain) {
        return `${getProtocol(verifiedCustomDomain)}://${verifiedCustomDomain}`;
    }

    if (!currentHost) {
        const fallbackSubdomain = subdomain || shop?.subdomain || "";
        return fallbackSubdomain ? `https://${fallbackSubdomain}.scaleup.codes` : "https://scaleup.codes";
    }

    const origin = `${getProtocol(currentHost)}://${currentHost}`;
    const effectiveSubdomain = subdomain || shop?.subdomain || "";

    if (isPlatformRootHost(currentHost) && effectiveSubdomain) {
        return `${origin}/${encodeURIComponent(effectiveSubdomain)}`;
    }

    return origin;
};

const absoluteUrl = (baseUrl, path = "") => {
    const safePath = path.startsWith("/") ? path : `/${path}`;
    return `${String(baseUrl || "").replace(/\/$/, "")}${safePath}`;
};

export const getProductPathSegment = (product = {}) => encodeURIComponent(product.slug || product._id || product.id || "");

export const getProductCanonicalUrl = ({ host, subdomain, shop, product } = {}) => {
    return absoluteUrl(getShopBaseUrl({ host, subdomain, shop }), `/products/${getProductPathSegment(product)}`);
};

export const getHomepageCanonicalUrl = ({ host, subdomain, shop } = {}) => getShopBaseUrl({ host, subdomain, shop });

export const getPolicyCanonicalUrl = ({ host, subdomain, shop, type } = {}) => (
    absoluteUrl(getShopBaseUrl({ host, subdomain, shop }), `/policies/${encodeURIComponent(type || "privacy")}`)
);

export const getProductSeoTitle = (product = {}, shop = {}) => {
    const storeName = shop?.shopName || shop?.name || "Store";
    return truncateMetaTitle(product?.seo?.title || `${product?.title || "Product"} | ${storeName}`);
};

export const getProductSeoDescription = (product = {}, shop = {}) => {
    const storeName = shop?.shopName || shop?.name || "this store";
    return truncateMetaDescription(
        product?.seo?.description ||
        product?.shortDescription ||
        product?.description ||
        `Buy ${product?.title || "this product"} from ${storeName}.`
    );
};

export const getHomepageSeoTitle = (shop = {}) => {
    const theme = shop?.theme || {};
    return truncateMetaTitle(
        theme?.seo?.title ||
        theme?.homepageSeo?.title ||
        theme?.hero?.title ||
        `${shop?.shopName || "Store"} - Online Store`
    );
};

export const getHomepageSeoDescription = (shop = {}) => {
    const theme = shop?.theme || {};
    return truncateMetaDescription(
        theme?.seo?.description ||
        theme?.homepageSeo?.description ||
        theme?.hero?.subtitle ||
        `Shop products from ${shop?.shopName || "this store"}.`
    );
};

const firstHeroImage = (shop = {}) => {
    const hero = shop?.theme?.hero || {};
    const firstSlide = Array.isArray(hero.slides) ? hero.slides.find(slide => slide?.desktopImage || slide?.mobileImage) : null;
    return hero.imageUrl || firstSlide?.desktopImage || firstSlide?.mobileImage || "";
};

export const getOgImage = (product = null, shop = {}) => {
    if (product?.images?.[0]) return product.images[0];
    if (product?.imageUrl) return product.imageUrl;
    return shop?.theme?.logoUrl || firstHeroImage(shop) || "";
};

export const getRobotsForPage = ({ isIndexable = true } = {}) => ({
    index: Boolean(isIndexable),
    follow: Boolean(isIndexable),
    nocache: !isIndexable,
    googleBot: {
        index: Boolean(isIndexable),
        follow: Boolean(isIndexable)
    }
});

export const buildMetadata = ({
    title,
    description,
    url,
    image,
    type = "website",
    isIndexable = true
} = {}) => {
    const safeTitle = truncateMetaTitle(title);
    const safeDescription = truncateMetaDescription(description);
    const images = image ? [{ url: image }] : [];

    return {
        title: safeTitle,
        description: safeDescription,
        alternates: { canonical: url },
        robots: getRobotsForPage({ isIndexable }),
        openGraph: {
            type,
            title: safeTitle,
            description: safeDescription,
            url,
            images
        },
        twitter: {
            card: image ? "summary_large_image" : "summary",
            title: safeTitle,
            description: safeDescription,
            images: image ? [image] : []
        }
    };
};

const productPrice = (product = {}) => {
    const sellingPrice = Number(product?.pricing?.sellingPrice ?? product?.sellingPrice ?? product?.price ?? 0);
    const discount = Number(product?.pricing?.discount ?? product?.discount ?? 0);
    return discount > 0 ? Math.round(sellingPrice - (sellingPrice * discount / 100)) : sellingPrice;
};

const productStock = (product = {}) => {
    if (Number.isFinite(Number(product.totalStock))) return Number(product.totalStock);
    if (Array.isArray(product.variants)) {
        return product.variants.reduce((sum, variant) => sum + Number(variant.stock || variant.inventory?.stock || 0), 0);
    }
    return Number(product.stock || 0);
};

export const buildProductJsonLd = ({ product, shop, url } = {}) => {
    if (!product?._id && !product?.title) return null;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: cleanTextForMeta(product.title),
        description: getProductSeoDescription(product, shop),
        image: Array.isArray(product.images) ? product.images.filter(Boolean) : [],
        sku: product.variants?.find(variant => variant?.sku)?.sku || product.sku || undefined,
        brand: {
            "@type": "Brand",
            name: cleanTextForMeta(product.brand || shop?.shopName || "Store")
        },
        offers: {
            "@type": "Offer",
            price: productPrice(product),
            priceCurrency: shop?.currency || DEFAULT_CURRENCY,
            availability: productStock(product) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url
        }
    };

    const averageRating = Number(product.averageRating || 0);
    const reviewCount = Number(product.numReviews || 0);
    if (averageRating > 0 && reviewCount > 0) {
        jsonLd.aggregateRating = {
            "@type": "AggregateRating",
            ratingValue: Math.min(5, Math.max(1, averageRating)),
            reviewCount
        };
    }

    return JSON.parse(JSON.stringify(jsonLd));
};

export const buildBreadcrumbJsonLd = ({ items = [] } = {}) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items
        .filter(item => item?.name && item?.url)
        .map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: cleanTextForMeta(item.name),
            item: item.url
        }))
});

export const noindexMetadata = (title = DEFAULT_TITLE, description = DEFAULT_DESCRIPTION) => ({
    title,
    description,
    robots: getRobotsForPage({ isIndexable: false })
});
