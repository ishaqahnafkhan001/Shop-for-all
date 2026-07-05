const DEFAULT_TITLE = "Scaleup | Launch Your Online Store Without Coding";
const DEFAULT_DESCRIPTION = "Create a professional online store with Scaleup.";
const DEFAULT_CURRENCY = "BDT";
const PLATFORM_NAME = "Scaleup";

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

const normalizeTitleText = (text = "", max = 80) => truncateAtWord(
    cleanTextForMeta(text)
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/\s*\|\s*/g, " | ")
        .replace(/\s+/g, " ")
        .trim(),
    max
);

const stripKnownSuffixes = (value = "") => normalizeTitleText(value)
    .replace(/\s*\|\s*Scaleup\s*$/i, "")
    .replace(/\s*-\s*Scaleup\s*$/i, "")
    .trim();

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

const normalizeHost = (host = "") => String(host || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .split(/[/?#]/)[0]
    .replace(/\/$/, "")
    .toLowerCase();

const getHostLabel = (host = "") => normalizeHost(host).split(":")[0];

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

export const isCustomDomainFullyVerified = (customDomain = {}) => (
    customDomain?.status === "Verified" &&
    Boolean(customDomain?.domain) &&
    customDomain?.ownershipVerified === true &&
    (
        customDomain?.routingVerified === true ||
        customDomain?.manuallyVerifiedRouting === true
    )
);

export const getVerifiedCustomDomainHost = (shop = {}, explicitCustomDomain = "") => {
    const domain = normalizeHost(explicitCustomDomain || shop?.customDomain?.domain || "");
    if (!domain) return "";

    const customDomain = explicitCustomDomain
        ? {
            status: "Verified",
            domain,
            ownershipVerified: true,
            routingVerified: true
        }
        : shop?.customDomain;

    return isCustomDomainFullyVerified(customDomain) ? domain : "";
};

export const getPreferredSiteName = (shop = {}, { host = "", subdomain = "" } = {}) => {
    const candidates = [
        shop?.theme?.seo?.siteName,
        shop?.theme?.brand?.storeName,
        shop?.theme?.header?.storeName,
        shop?.displayName,
        shop?.shopName,
        shop?.name
    ];
    const found = candidates.map(cleanTextForMeta).find(Boolean);
    if (found) return normalizeTitleText(found, 60);

    const verifiedHost = getVerifiedCustomDomainHost(shop);
    const fallbackHost = getHostLabel(verifiedHost || host) || (subdomain ? `${subdomain}.scaleup.codes` : "");
    return fallbackHost || "Store";
};

export const normalizeStorefrontPlan = (plan = null) => {
    if (plan === true) return "starter";
    if (plan === false) return "growth";

    const candidates = [];
    if (typeof plan === "string") candidates.push(plan);
    if (plan && typeof plan === "object") {
        candidates.push(
            plan.slug,
            plan.planSlug,
            plan.activePlanSlug,
            plan.intendedPlanSlug,
            plan.name,
            plan.planName,
            plan.activePlanName,
            plan.intendedPlanName,
            plan.key,
            plan.id
        );
        if (plan.plan && plan.plan !== plan) candidates.push(plan.plan);
        if (plan.planId && plan.planId !== plan) candidates.push(plan.planId);
    }

    const normalized = candidates
        .flat()
        .filter(Boolean)
        .map(value => String(value).trim().toLowerCase().replace(/[_\s]+/g, "-"));

    if (normalized.some(value => value === "pro" || value.includes("pro-plan"))) return "pro";
    if (normalized.some(value => value === "growth" || value.includes("growth-plan"))) return "growth";
    if (normalized.some(value => value === "starter" || value === "trial" || value === "trialing" || value.includes("starter-plan"))) return "starter";
    return "unknown";
};

export const buildStorefrontTitle = ({ shopName = "", pageTitle = "", planKey = "unknown" } = {}) => {
    const cleanShopName = stripKnownSuffixes(shopName) || "Online Store";
    let cleanPageTitle = stripKnownSuffixes(pageTitle);

    const shopLower = cleanShopName.toLowerCase();
    const pageLower = cleanPageTitle.toLowerCase();
    if (pageLower === shopLower) cleanPageTitle = "";
    if (pageLower.startsWith(`${shopLower} | `)) {
        cleanPageTitle = cleanPageTitle.slice(cleanShopName.length + 3).trim();
    }
    if (pageLower.endsWith(` | ${shopLower}`)) {
        cleanPageTitle = cleanPageTitle.slice(0, -(cleanShopName.length + 3)).trim();
    }

    const parts = [cleanShopName, cleanPageTitle].filter(Boolean);
    if (planKey === "starter" || planKey === "unknown") parts.push(PLATFORM_NAME);
    return truncateAtWord(parts.join(" | "), 120);
};

const isSafeIconUrl = (url = "") => {
    const value = String(url || "").trim();
    if (!value) return false;
    if (/^data:image\/svg\+xml,/i.test(value)) return true;
    if (/^data:/i.test(value)) return false;
    if (/^https?:\/\//i.test(value)) return true;
    if (value.startsWith("/")) return true;
    return false;
};

const getIconMimeType = (url = "") => {
    if (/^data:image\/svg\+xml,/i.test(url)) return "image/svg+xml";
    const clean = String(url || "").split("?")[0].toLowerCase();
    if (clean.endsWith(".ico")) return "image/x-icon";
    if (clean.endsWith(".jpg") || clean.endsWith(".jpeg")) return "image/jpeg";
    if (clean.endsWith(".webp")) return "image/webp";
    if (clean.endsWith(".svg")) return "image/svg+xml";
    return "image/png";
};

const hashString = (value = "") => {
    let hash = 0;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
        hash = ((hash << 5) - hash) + text.charCodeAt(index);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
};

const appendIconVersion = (url = "", version = "") => {
    if (!url || url.startsWith("data:")) return url;
    const cleanVersion = encodeURIComponent(String(version || hashString(url)).slice(0, 32));
    if (!cleanVersion) return url;
    return `${url}${url.includes("?") ? "&" : "?"}v=${cleanVersion}`;
};

const getThemeBrandColor = (theme = {}) => (
    theme?.colors?.accent ||
    theme?.colors?.primary ||
    theme?.colors?.buttonBackground ||
    theme?.productCard?.accent ||
    "#0f766e"
);

const buildInitialsIcon = ({ shopName = "Store", theme = {} } = {}) => {
    const initial = cleanTextForMeta(shopName).replace(/[^a-z0-9\u0980-\u09ff]/gi, "").charAt(0).toUpperCase() || "S";
    const background = /^#[0-9a-f]{3,8}$/i.test(getThemeBrandColor(theme)) ? getThemeBrandColor(theme) : "#0f766e";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="${background}"/><text x="64" y="78" text-anchor="middle" font-family="Arial, sans-serif" font-size="58" font-weight="800" fill="#fff">${initial}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

export const resolveStorefrontIcon = ({ shop = {}, shopName = "" } = {}) => {
    const theme = shop?.theme || {};
    const candidates = [
        theme?.faviconUrl,
        shop?.faviconUrl,
        theme?.header?.faviconUrl
    ];
    const selected = candidates.map(value => String(value || "").trim()).find(isSafeIconUrl);
    const version = shop?.logoUpdatedAt || shop?.updatedAt || theme?.updatedAt || selected || shopName;
    const url = selected
        ? appendIconVersion(selected, version)
        : buildInitialsIcon({ shopName, theme });
    const type = getIconMimeType(url);

    return {
        faviconUrl: url,
        appleTouchIconUrl: url,
        icons: {
            icon: [
                { url, type, sizes: "32x32" },
                { url, type, sizes: "48x48" }
            ],
            shortcut: [{ url, type }],
            apple: [{ url, type, sizes: "180x180" }]
        }
    };
};

export const resolveStorefrontBranding = ({
    shop = {},
    theme = shop?.theme || {},
    plan = null,
    pageTitle = "",
    product = null,
    category = "",
    collection = null,
    host = "",
    subdomain = ""
} = {}) => {
    const shopName = getPreferredSiteName({ ...shop, theme }, { host, subdomain }) || "Online Store";
    const entityTitle = pageTitle ||
        product?.seo?.title ||
        product?.title ||
        collection?.seo?.title ||
        collection?.title ||
        category ||
        "Home";
    const inferredPlanKey = normalizeStorefrontPlan(
        plan ||
        shop?.plan ||
        shop?.subscription ||
        shop?.subscription?.plan ||
        shop?.activePlanSlug ||
        shop?.activePlanName
    );
    const hasPublicBrandingDecision = typeof shop?.showPlatformBranding === "boolean";
    const showScaleupBranding = hasPublicBrandingDecision
        ? shop.showPlatformBranding
        : inferredPlanKey === "starter" || inferredPlanKey === "unknown";
    const planKey = showScaleupBranding && inferredPlanKey === "unknown"
        ? "unknown"
        : (!showScaleupBranding && inferredPlanKey === "unknown" ? "growth" : inferredPlanKey);
    const icon = resolveStorefrontIcon({ shop: { ...shop, theme }, shopName });

    return {
        shopName,
        pageTitle: normalizeTitleText(entityTitle, 80) || "Home",
        fullTitle: buildStorefrontTitle({ shopName, pageTitle: entityTitle, planKey }),
        faviconUrl: icon.faviconUrl,
        appleTouchIconUrl: icon.appleTouchIconUrl,
        icons: icon.icons,
        openGraphSiteName: shopName,
        showScaleupBranding,
        planKey
    };
};

export const getShopBaseUrl = ({ host, subdomain, shop, customDomain } = {}) => {
    const currentHost = normalizeHost(host || "");
    const verifiedCustomDomain = getVerifiedCustomDomainHost(shop, customDomain);

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
export const getCollectionPathSegment = (collection = {}) => encodeURIComponent(collection.slug || collection._id || collection.id || "");
export const getCategoryPathSegment = (category = "") => encodeURIComponent(cleanTextForMeta(category) || "category");

export const getProductCanonicalUrl = ({ host, subdomain, shop, product } = {}) => {
    return absoluteUrl(getShopBaseUrl({ host, subdomain, shop }), `/products/${getProductPathSegment(product)}`);
};

export const getCollectionCanonicalUrl = ({ host, subdomain, shop, collection } = {}) => {
    return absoluteUrl(getShopBaseUrl({ host, subdomain, shop }), `/collections/${getCollectionPathSegment(collection)}`);
};

export const getCategoryCanonicalUrl = ({ host, subdomain, shop, category } = {}) => {
    return absoluteUrl(getShopBaseUrl({ host, subdomain, shop }), `/categories/${getCategoryPathSegment(category)}`);
};

export const getHomepageCanonicalUrl = ({ host, subdomain, shop } = {}) => (
    `${getShopBaseUrl({ host, subdomain, shop }).replace(/\/$/, "")}/`
);

export const getPolicyCanonicalUrl = ({ host, subdomain, shop, type } = {}) => (
    absoluteUrl(getShopBaseUrl({ host, subdomain, shop }), `/policies/${encodeURIComponent(type || "privacy")}`)
);

export const getProductSeoTitle = (product = {}, shop = {}) => {
    return truncateMetaTitle(product?.seo?.title || product?.title || "Product");
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

export const getHomepageSeoTitle = (shop = {}, options = {}) => {
    const theme = shop?.theme || {};
    return truncateMetaTitle(
        theme?.seo?.title ||
        theme?.homepageSeo?.title ||
        theme?.hero?.title ||
        `${getPreferredSiteName(shop, options)} - Online Store`
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

export const getCollectionSeoTitle = (collection = {}, shop = {}) => {
    return truncateMetaTitle(collection?.seo?.title || collection?.title || "Collection");
};

export const getCollectionSeoDescription = (collection = {}, shop = {}) => {
    const storeName = shop?.shopName || shop?.name || "this store";
    return truncateMetaDescription(
        collection?.seo?.description ||
        collection?.description ||
        `Shop ${collection?.title || "collection"} products from ${storeName}.`
    );
};

export const getCategorySeoTitle = (category = "", shop = {}) => {
    return truncateMetaTitle(cleanTextForMeta(category) || "Products");
};

export const getCategorySeoDescription = (category = "", shop = {}) => {
    const storeName = shop?.shopName || shop?.name || "this store";
    return truncateMetaDescription(`Shop ${cleanTextForMeta(category) || "selected products"} from ${storeName}.`);
};

const firstHeroImage = (shop = {}) => {
    const hero = shop?.theme?.hero || {};
    const firstSlide = Array.isArray(hero.slides) ? hero.slides.find(slide => slide?.desktopImage || slide?.mobileImage) : null;
    return hero.imageUrl || firstSlide?.desktopImage || firstSlide?.mobileImage || "";
};

export const getOgImage = (product = null, shop = {}) => {
    if (product?.coverMediaId) return getImageUrlFromValue(product.coverMediaId);
    if (product?.images?.[0]) return getImageUrlFromValue(product.images[0]);
    if (product?.imageUrl) return product.imageUrl;
    const seo = shop?.theme?.seo || {};
    return seo.socialImage || seo.image || seo.defaultSocialImage || shop?.theme?.logoUrl || firstHeroImage(shop) || "";
};

export const getCollectionOgImage = (collection = {}, products = [], shop = {}) => {
    if (collection?.image) return collection.image;
    const firstProductImage = products.find(product => product?.images?.[0] || product?.imageUrl);
    return getOgImage(firstProductImage || null, shop);
};

export const getImageUrlFromValue = (image) => {
    if (!image) return "";
    if (typeof image === "string") return image;
    return image.url || image.src || image.secureUrl || "";
};

export const getImageAltFromValue = (image) => {
    if (!image || typeof image === "string") return "";
    return cleanTextForMeta(image.alt || image.altText || image.title || "");
};

export const getProductImageAlt = ({ product, image, shop } = {}) => {
    const safeProduct = product || {};
    const safeShop = shop || {};

    return (
        getImageAltFromValue(image) ||
        cleanTextForMeta(safeProduct.imageAltText) ||
        cleanTextForMeta(safeProduct.title) ||
        cleanTextForMeta(safeShop.shopName || safeShop.name) ||
        "Product image"
    );
};

export const getProductImageUrls = (product = {}) => {
    const safeProduct = product || {};
    const images = Array.isArray(safeProduct.images) ? safeProduct.images.map(getImageUrlFromValue).filter(Boolean) : [];
    if (safeProduct.coverMediaId) images.unshift(getImageUrlFromValue(safeProduct.coverMediaId));
    if (safeProduct.imageUrl) images.unshift(safeProduct.imageUrl);
    return [...new Set(images)];
};

export const isShopSearchVisible = (shop = {}) => shop?.theme?.seo?.searchEngineVisibility !== false;

export const getRobotsForPage = ({ isIndexable = true, isFollowable = isIndexable } = {}) => ({
    index: Boolean(isIndexable),
    follow: Boolean(isFollowable),
    nocache: !isIndexable,
    googleBot: {
        index: Boolean(isIndexable),
        follow: Boolean(isFollowable)
    }
});

export const buildMetadata = ({
    title,
    description,
    url,
    image,
    siteName = "",
    icons,
    type = "website",
    isIndexable = true,
    isFollowable = true,
    googleSiteVerification = ""
} = {}) => {
    const safeTitle = truncateMetaTitle(title);
    const safeDescription = truncateMetaDescription(description);
    const safeSiteName = cleanTextForMeta(siteName).slice(0, 80);
    const images = image ? [{ url: image }] : [];

    const metadata = {
        title: { absolute: safeTitle },
        description: safeDescription,
        alternates: { canonical: url },
        robots: getRobotsForPage({ isIndexable, isFollowable }),
        openGraph: {
            type,
            title: safeTitle,
            description: safeDescription,
            url,
            images,
            ...(safeSiteName ? { siteName: safeSiteName } : {})
        },
        twitter: {
            card: image ? "summary_large_image" : "summary",
            title: safeTitle,
            description: safeDescription,
            images: image ? [image] : []
        }
    };

    if (icons) metadata.icons = icons;

    if (googleSiteVerification) {
        metadata.verification = { google: googleSiteVerification };
    }

    return metadata;
};

export const buildStorefrontMetadata = ({
    shop = {},
    pageTitle = "",
    description,
    url,
    image,
    type = "website",
    isIndexable = true,
    isFollowable = true,
    googleSiteVerification = ""
} = {}) => {
    const branding = resolveStorefrontBranding({
        shop,
        theme: shop?.theme || {},
        pageTitle,
        host: url,
        subdomain: shop?.subdomain || ""
    });

    return buildMetadata({
        title: branding.fullTitle,
        description,
        url,
        image,
        siteName: branding.openGraphSiteName,
        icons: branding.icons,
        type,
        isIndexable,
        isFollowable,
        googleSiteVerification
    });
};

export const buildHomepageJsonLd = ({ shop = {}, url = "" } = {}) => {
    const siteName = resolveStorefrontBranding({ shop, host: url, pageTitle: "Home" }).shopName;
    const shopName = cleanTextForMeta(shop?.shopName || shop?.name || "");
    const logo = shop?.theme?.logoUrl || shop?.logoUrl || "";
    const alternateName = shopName && shopName !== siteName ? [shopName] : undefined;

    return [
        {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: siteName,
            alternateName,
            url
        },
        {
            "@context": "https://schema.org",
            "@type": "OnlineStore",
            name: siteName,
            url,
            logo: logo || undefined
        }
    ].map(item => JSON.parse(JSON.stringify(item)));
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
        image: getProductImageUrls(product),
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

export const buildCollectionItemListJsonLd = ({ collection, products = [], shop, host, subdomain } = {}) => {
    const itemListElement = products
        .filter(product => product?.title && (product?.slug || product?._id))
        .map((product, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: getProductCanonicalUrl({ host, subdomain, shop, product }),
            name: cleanTextForMeta(product.title),
            image: getProductImageUrls(product)[0] || undefined
        }));

    if (!collection?.title || itemListElement.length === 0) return null;

    return JSON.parse(JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: cleanTextForMeta(collection.title),
        itemListElement
    }));
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
    title: { absolute: title },
    description,
    robots: getRobotsForPage({ isIndexable: false })
});
