import { headers } from "next/headers";

import { fetchStorefrontInfo } from "@/lib/storefrontServer";
import {
    buildStorefrontMetadata,
    getShopBaseUrl,
    noindexMetadata
} from "@/lib/seo";

export const buildTenantPageMetadata = async ({
    params,
    pageTitle,
    path = "",
    description = "",
    indexable = false
} = {}) => {
    const { subdomain } = await params;
    const headerStore = await headers();
    const host = headerStore.get("host") || "";

    try {
        const shop = await fetchStorefrontInfo(subdomain, { storefrontHost: host });
        if (!shop) {
            return noindexMetadata("Store unavailable", "This storefront is currently unavailable.");
        }

        const baseUrl = getShopBaseUrl({ host, subdomain, shop }).replace(/\/$/, "");
        return buildStorefrontMetadata({
            shop,
            pageTitle,
            description: description || `${pageTitle} for ${shop.shopName || shop.name || "this store"}.`,
            url: `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`,
            image: shop?.theme?.logoUrl || "",
            type: "website",
            isIndexable: indexable,
            isFollowable: false,
            googleSiteVerification: shop?.theme?.seo?.googleSiteVerification || ""
        });
    } catch (error) {
        return noindexMetadata(pageTitle || "Store unavailable", error.body?.error || error.message || "This storefront is currently unavailable.");
    }
};
