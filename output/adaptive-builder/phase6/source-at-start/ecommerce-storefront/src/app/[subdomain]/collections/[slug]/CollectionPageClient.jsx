"use client";
import { CollectionView } from '@scaleup/storefront-renderer/presentation/CollectionView';
import StorefrontPresentationRuntime from '@/components/storefront/StorefrontPresentationRuntime';

import { getStorefrontPresentationVariant } from "@scaleup/storefront-theme";
import { useMemo } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";

import { useStorefrontProductActions } from "@/hooks/useStorefrontProductActions";
import { useStorefrontTheme } from "@/components/storefront/StorefrontThemeProvider";
import { normalizeProduct } from "@/utils/normalizeProduct";


import { desktopGridClasses, productGridGapClasses, resolveAllProductsLayout, tabletGridClasses } from "@/components/storefront/reference/referenceCore";

export default function CollectionPageClient({ shop, collection, products = [], pagination = {}, filters = {} }) {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const productActions = useStorefrontProductActions({ subdomain: params?.subdomain || shop?.subdomain });
    const { theme } = useStorefrontTheme();
    const presentationVariant = getStorefrontPresentationVariant(theme);
    const atelier = presentationVariant === 'atelier-editorial';
    const productCardColors = theme.colors?.productCard;
    const normalizedProducts = useMemo(() => products.map(normalizeProduct).filter(Boolean), [products]);
    const { desktop: desktopColumns, tablet: tabletColumns, mobile: mobileColumns, spacing } = resolveAllProductsLayout(theme.allProducts, theme.layout, theme.productGridStyle);
    const gridClass = `${mobileColumns === 1 ? "grid-cols-1" : "grid-cols-2"} ${tabletGridClasses[tabletColumns]} ${desktopGridClasses[desktopColumns]}`;
    const gridGapClass = productGridGapClasses[spacing];
    const themedProductCard = useMemo(() => ({
        ...(theme.productCard || {}),
        cardAlignment: theme.layout?.cardAlignment,
        colors: productCardColors || {},
    }), [theme.productCard, theme.layout?.cardAlignment, productCardColors]);
    const total = Number(pagination?.totalItems ?? pagination?.total) || normalizedProducts.length;
    const page = Math.max(Number(pagination?.page ?? filters.page) || 1, 1);
    const totalPages = Math.max(Number(pagination?.totalPages ?? pagination?.pages) || 1, 1);

    const updateQuery = (updates = {}) => {
        const next = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value === undefined || value === null || value === "" || value === "newest") {
                next.delete(key);
            } else {
                next.set(key, String(value));
            }
        });
        const query = next.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
    };

    return (
        <StorefrontPresentationRuntime><CollectionView {...{ atelier, collection, filters, gridClass, gridGapClass, normalizedProducts, page, pagination, presentationVariant, productActions, shop, themedProductCard, total, totalPages, updateQuery }} /></StorefrontPresentationRuntime>
    );
}
