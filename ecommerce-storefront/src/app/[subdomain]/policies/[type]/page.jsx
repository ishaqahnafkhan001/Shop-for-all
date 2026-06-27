import { headers } from "next/headers";
import { notFound } from "next/navigation";
import PolicyPageClient from "./PolicyPageClient";
import { fetchStorefrontInfo } from "@/lib/storefrontServer";
import { POLICY_LABELS, getPolicyContent as getDefaultedPolicyContent } from "@/lib/defaultPolicies";
import {
    buildMetadata,
    cleanTextForMeta,
    getPolicyCanonicalUrl,
    isShopSearchVisible,
    noindexMetadata,
    truncateMetaDescription,
    truncateMetaTitle
} from "@/lib/seo";

const POLICY_FIELD_BY_TYPE = {
    privacy: "privacyPolicy",
    terms: "termsAndConditions",
    refund: "returnRefundPolicy",
    shipping: "shippingPolicy"
};

const getStoreInfo = async (subdomain, host = "") => {
    try {
        return await fetchStorefrontInfo(subdomain, { storefrontHost: host });
    } catch (error) {
        if (![404, 423].includes(error.status)) {
            console.error("Server policy shop info fetch error:", error.message);
        }
        return null;
    }
};

const getPolicyContent = (shop, type) => {
    const policies = shop?.theme?.policies || {};
    return getDefaultedPolicyContent(
        {
            ...policies,
            [type]: policies[type] || policies[POLICY_FIELD_BY_TYPE[type]]
        },
        type,
        { storeName: shop?.shopName || shop?.name || "this store" }
    );
};

export async function generateMetadata({ params }) {
    const { subdomain, type } = await params;
    const label = POLICY_LABELS[type] || "Store Policy";
    const headerStore = await headers();
    const host = headerStore.get("host") || "";
    const shop = await getStoreInfo(subdomain, host);

    if (!shop) {
        return noindexMetadata(label, "This store policy is currently unavailable.");
    }

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
    if (!POLICY_LABELS[type]) notFound();

    return <PolicyPageClient type={type} />;
}
