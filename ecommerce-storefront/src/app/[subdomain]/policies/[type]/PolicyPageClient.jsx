"use client";

import { PolicyView } from '@scaleup/storefront-renderer/presentation/PolicyView';
import StorefrontPresentationRuntime from '@/components/storefront/StorefrontPresentationRuntime';
import { useStorefrontTheme } from "@/components/storefront/StorefrontThemeProvider";
import { POLICY_LABELS, getPolicyContent } from "@/lib/defaultPolicies";

export default function PolicyPageClient({ type }) {
    const { settings, theme } = useStorefrontTheme();
    const label = POLICY_LABELS[type] || "Store Policy";
    const content = getPolicyContent(theme?.policies || {}, type, {
        storeName: settings?.shopName || settings?.name || "this store"
    });

    return <StorefrontPresentationRuntime><PolicyView label={label} content={content} /></StorefrontPresentationRuntime>;
}
