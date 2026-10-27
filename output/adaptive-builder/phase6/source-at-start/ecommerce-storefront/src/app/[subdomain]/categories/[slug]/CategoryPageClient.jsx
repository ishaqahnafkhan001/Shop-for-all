"use client";
import { CategoryView, STOCK_LABELS, money, CategoryFilters } from '@scaleup/storefront-renderer/presentation/CategoryView';
import StorefrontPresentationRuntime from '@/components/storefront/StorefrontPresentationRuntime';

import { getStorefrontPresentationVariant } from "@scaleup/storefront-theme";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";


import { useStorefrontProductActions } from "@/hooks/useStorefrontProductActions";
import { useStorefrontTheme } from "@/components/storefront/StorefrontThemeProvider";
import { normalizeProduct } from "@/utils/normalizeProduct";


import {
    desktopGridClasses,
    productGridGapClasses,
    resolveAllProductsLayout,
    tabletGridClasses
} from "@/components/storefront/reference/referenceCore";







export default function CategoryPageClient({ shop, category, categoryDetail = null, products = [], pagination = {}, filters = {} }) {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const filterButtonRef = useRef(null);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [draftFilters, setDraftFilters] = useState({
        minPrice: filters.minPrice || "",
        maxPrice: filters.maxPrice || "",
        stock: filters.stock || "all",
        sale: filters.sale === "true",
        rating: filters.rating || "",
    });
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
    const total = pagination?.totalItems ?? pagination?.total ?? normalizedProducts.length;
    const page = pagination?.page || 1;
    const totalPages = pagination?.totalPages || pagination?.pages || 1;
    const hasRatingData = normalizedProducts.some(product => Number(product.averageRating || 0) > 0 || Number(product.numReviews || 0) > 0) || Boolean(filters.rating);
    const categoryImage = categoryDetail?.coverImage?.url || categoryDetail?.image || "";
    const categoryImageAlt = categoryDetail?.coverImage?.altText || `${category} category`;

    useEffect(() => {
        if (!mobileFiltersOpen) return undefined;
        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                setMobileFiltersOpen(false);
                filterButtonRef.current?.focus();
            }
        };
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [mobileFiltersOpen]);

    const updateQuery = (updates = {}) => {
        const next = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value === undefined || value === null || value === "" || value === false || value === "all") {
                next.delete(key);
            } else {
                next.set(key, String(value));
            }
        });
        if (!Object.prototype.hasOwnProperty.call(updates, "page")) next.set("page", "1");
        const query = next.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
    };

    const applyFilters = () => {
        updateQuery({
            minPrice: draftFilters.minPrice,
            maxPrice: draftFilters.maxPrice,
            stock: draftFilters.stock,
            sale: draftFilters.sale ? "true" : "",
            rating: draftFilters.rating
        });
        setMobileFiltersOpen(false);
        filterButtonRef.current?.focus();
    };

    const clearFilters = () => {
        setDraftFilters({ minPrice: "", maxPrice: "", stock: "all", sale: false, rating: "" });
        updateQuery({ minPrice: "", maxPrice: "", stock: "", sale: "", rating: "", page: "1" });
        setMobileFiltersOpen(false);
        filterButtonRef.current?.focus();
    };

    const activeFilters = [
        filters.minPrice || filters.maxPrice ? {
            key: "price",
            label: `Price: ${filters.minPrice ? money(filters.minPrice) : "Any"}-${filters.maxPrice ? money(filters.maxPrice) : "Any"}`,
            updates: { minPrice: "", maxPrice: "" }
        } : null,
        filters.stock && filters.stock !== "all" ? {
            key: "stock",
            label: STOCK_LABELS[filters.stock] || "Availability",
            updates: { stock: "" }
        } : null,
        filters.sale === "true" ? {
            key: "sale",
            label: "On sale",
            updates: { sale: "" }
        } : null,
        filters.rating ? {
            key: "rating",
            label: `${filters.rating}+ stars`,
            updates: { rating: "" }
        } : null
    ].filter(Boolean);

    const filterContent = (
        <CategoryFilters {...{ applyFilters, atelier, clearFilters, draftFilters, hasRatingData, setDraftFilters }} />
    );

    return (
        <StorefrontPresentationRuntime><CategoryView {...{ activeFilters, atelier, category, categoryImage, categoryImageAlt, clearFilters, filterButtonRef, filterContent, filters, gridClass, gridGapClass, hasRatingData, mobileFiltersOpen, normalizedProducts, page, presentationVariant, productActions, setMobileFiltersOpen, shop, themedProductCard, total, totalPages, updateQuery }} /></StorefrontPresentationRuntime>
    );
}
