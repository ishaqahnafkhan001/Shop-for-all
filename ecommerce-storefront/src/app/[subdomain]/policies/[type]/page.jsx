import { headers } from "next/headers";
import PolicyPageClient from "./PolicyPageClient";
import { fetchStorefrontInfo } from "@/lib/storefrontServer";
import {
    buildMetadata,
    cleanTextForMeta,
    getPolicyCanonicalUrl,
    isShopSearchVisible,
    noindexMetadata,
    truncateMetaDescription,
    truncateMetaTitle
} from "@/lib/seo";

const POLICY_LABELS = {
    privacy: "Privacy Policy",
    terms: "Terms & Conditions",
    refund: "Return & Refund Policy",
    shipping: "Shipping Policy"
};

const POLICY_FIELD_BY_TYPE = {
    privacy: "privacyPolicy",
    terms: "termsAndConditions",
    refund: "returnRefundPolicy",
    shipping: "shippingPolicy"
};

const getStoreInfo = async (subdomain) => {
    try {
        return await fetchStorefrontInfo(subdomain);
    } catch (error) {
        if (![404, 423].includes(error.status)) {
            console.error("Server policy shop info fetch error:", error.message);
        }
        return null;
    }
};

const getPolicyContent = (shop, type) => {
    const policies = shop?.theme?.policies || {};
    return policies[type] || policies[POLICY_FIELD_BY_TYPE[type]] || "";
};

export async function generateMetadata({ params }) {
    const { subdomain, type } = await params;
    const label = POLICY_LABELS[type] || "Store Policy";
    const shop = await getStoreInfo(subdomain);

    if (!shop) {
        return noindexMetadata(label, "This store policy is currently unavailable.");
    }

    const headerStore = await headers();
    const host = headerStore.get("host") || "";
    const content = cleanTextForMeta(getPolicyContent(shop, type));
    const storeName = shop.shopName || shop.name || "Store";

    return buildMetadata({
        title: truncateMetaTitle(`${label} | ${storeName}`),
        description: truncateMetaDescription(content || `Read the ${label.toLowerCase()} for ${storeName}.`),
        url: getPolicyCanonicalUrl({ host, subdomain, shop, type }),
        image: shop?.theme?.logoUrl || "",
        type: "article",
        isIndexable: Boolean(POLICY_LABELS[type] && content && isShopSearchVisible(shop)),
        googleSiteVerification: shop?.theme?.seo?.googleSiteVerification || ""
    });
}

export default async function PolicyPage({ params }) {
    const { type } = await params;
    return <PolicyPageClient type={type} />;
}
