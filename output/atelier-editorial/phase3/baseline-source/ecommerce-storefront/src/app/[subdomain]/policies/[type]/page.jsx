import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import PolicyPageClient from "./PolicyPageClient";
import { fetchStorefrontInfo, getStorefrontPlanRedirectUrl } from "@/lib/storefrontServer";
import { POLICY_LABELS, getPolicyContent as getDefaultedPolicyContent } from "@/lib/defaultPolicies";
import {
    buildStorefrontMetadata,
    cleanTextForMeta,
    getPolicyCanonicalUrl,
    noindexMetadata,
    truncateMetaDescription,
} from "@/lib/seo";
import { resolveStorefrontIndexability } from "@/lib/indexability";

const POLICY_FIELD_BY_TYPE = {
    privacy: "privacyPolicy",
    terms: "termsAndConditions",
    refund: "returnRefundPolicy",
    shipping: "shippingPolicy"
};

const getStoreInfo = async (subdomain, host = "", fresh = false) => {
    try {
        return await fetchStorefrontInfo(subdomain, { storefrontHost: host, fresh });
    } catch (error) {
        const redirectTo = getStorefrontPlanRedirectUrl(error, "/policies");
        if (redirectTo) return { __redirectTo: redirectTo };
        if (![404, 423].includes(error.status)) {
            console.error("Server policy shop info fetch error:", error.message);
        }
        return { __status: error.status || 500 };
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
    const shop = await getStoreInfo(subdomain, host, true);

    if (!shop || shop.__redirectTo) {
        return noindexMetadata(label, "This store policy is currently unavailable.");
    }

    const content = cleanTextForMeta(getPolicyContent(shop, type));
    const storeName = shop.shopName || shop.name || "Store";
    const indexability = resolveStorefrontIndexability({
        shop,
        resource: { content },
        resourceType: "policy",
        host,
        subdomain,
        canonicalPath: `/policies/${type}`
    });

    return buildStorefrontMetadata({
        shop,
        pageTitle: label,
        description: truncateMetaDescription(content || `Read the ${label.toLowerCase()} for ${storeName}.`),
        url: getPolicyCanonicalUrl({ host, subdomain, shop, type }),
        image: shop?.theme?.logoUrl || "",
        type: "article",
        isIndexable: Boolean(POLICY_LABELS[type] && indexability.indexable),
        googleSiteVerification: shop?.theme?.seo?.googleSiteVerification || ""
    });
}

export default async function PolicyPage({ params }) {
    const { subdomain, type } = await params;
    if (!POLICY_LABELS[type]) notFound();
    const headerStore = await headers();
    const host = headerStore.get("host") || "";
    const shop = await getStoreInfo(subdomain, host);
    if (shop?.__redirectTo) redirect(shop.__redirectTo);
    if (shop?.__status === 404) notFound();

    return <PolicyPageClient type={type} />;
}
