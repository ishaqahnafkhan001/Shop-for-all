import AdaptivePresentation from '@/components/storefront/AdaptivePresentation';
import { PolicyIndexView } from '@scaleup/storefront-renderer/presentation/PolicyIndexView';

import {getStorefrontPresentationVariant} from "@scaleup/storefront-theme";
import { headers } from "next/headers";

import { notFound, redirect } from "next/navigation";

import { POLICY_TYPES, getPolicyContent } from "@/lib/defaultPolicies";
import { fetchStorefrontInfo, getStorefrontPlanRedirectUrl } from "@/lib/storefrontServer";
import {
    buildStorefrontMetadata,
    cleanTextForMeta,
    getShopBaseUrl,
    noindexMetadata,
    truncateMetaDescription
} from "@/lib/seo";
import { resolveStorefrontIndexability } from "@/lib/indexability";

const getStoreInfo = async (subdomain, host = "", fresh = false) => {
    try {
        return await fetchStorefrontInfo(subdomain, { storefrontHost: host, fresh });
    } catch (error) {
        const redirectTo = getStorefrontPlanRedirectUrl(error, "/policies");
        if (redirectTo) return { __redirectTo: redirectTo };
        if (![404, 423].includes(error.status)) {
            console.error("Server policy index shop info fetch error:", error.message);
        }
        return { __status: error.status || 500 };
    }
};

export async function generateMetadata({ params }) {
    const { subdomain } = await params;
    const headerStore = await headers();
    const host = headerStore.get("host") || "";
    const shop = await getStoreInfo(subdomain, host, true);

    if (!shop || shop.__status || shop.__redirectTo) {
        return noindexMetadata("Store Policies", "This store policy page is currently unavailable.");
    }

    const storeName = shop.shopName || shop.name || "Store";
    const summary = POLICY_TYPES
        .map(type => cleanTextForMeta(getPolicyContent(shop?.theme?.policies || {}, type, { storeName })))
        .join(" ");
    const indexability = resolveStorefrontIndexability({
        shop,
        resourceType: "homepage",
        host,
        subdomain,
        canonicalPath: "/policies"
    });

    return buildStorefrontMetadata({
        shop,
        pageTitle: "Policies",
        description: truncateMetaDescription(summary || `Read refund, shipping, privacy, and terms policies for ${storeName}.`),
        url: `${getShopBaseUrl({ host, subdomain, shop }).replace(/\/$/, "")}/policies`,
        image: shop?.theme?.logoUrl || "",
        type: "article",
        isIndexable: indexability.indexable,
        googleSiteVerification: shop?.theme?.seo?.googleSiteVerification || ""
    });
}

export default async function PoliciesPage({ params }) {
    const { subdomain } = await params;
    const headerStore = await headers();
    const host = headerStore.get("host") || "";
    const shop = await getStoreInfo(subdomain, host);
    if (shop?.__redirectTo) redirect(shop.__redirectTo);
    if (shop?.__status === 404) notFound();
    const storeName = shop?.shopName || shop?.name || "this store";
    const policies = shop?.theme?.policies || {};
    const atelier = getStorefrontPresentationVariant(shop?.theme) === 'atelier-editorial';

    return (
        <AdaptivePresentation pageKind="policiesIndex" core><PolicyIndexView {...{ atelier, policies, storeName }} /></AdaptivePresentation>
    );
}
