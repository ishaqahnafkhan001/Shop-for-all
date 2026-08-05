"use client";

import { getEnabledHomepageSections, normalizeTheme } from "@scaleup/storefront-theme";
import {
    DefaultLink,
    getContainerClass,
    getReferenceThemeStyle,
    isPreviewMobile,
    isPreviewNarrow,
    noop,
} from "./referenceCore";
import { StorefrontAllProducts } from "./StorefrontAllProducts";
import { StorefrontHero } from "./StorefrontHero";
import { HomepageSection } from "./StorefrontSectionRenderer";

export function ReferenceStorefrontHome({
    theme: themeCandidate,
    shopName = "",
    products = [],
    categories = [],
    sectionProducts = {},
    sectionReviews = {},
    storewideDiscount = 0,
    loading = false,
    pagination = { page: 1, pages: 1 },
    filters = { category: "All", sort: "newest", page: 1 },
    priceInput = { min: "", max: "" },
    catalogSearch = "",
    mobileFiltersOpen = false,
    onCatalogSearchChange = noop,
    onSortChange = noop,
    onFilterOpen = noop,
    onFilterClose = noop,
    onCategoryChange = noop,
    onMinPriceChange = noop,
    onMaxPriceChange = noop,
    onPriceApply = noop,
    onClearFilters = noop,
    onRatingChange = noop,
    onPageChange = noop,
    onProductAdd = noop,
    onProductBuyNow,
    onWishlistToggle,
    isProductWishlisted,
    LinkComponent = DefaultLink,
    previewDevice,
    editor,
}) {
    const theme = normalizeTheme(themeCandidate);
    const layout = theme.layout || {};
    const productCard = {
        ...(theme.productCard || {}),
        cardAlignment: layout.cardAlignment,
        colors: theme.colors?.productCard || {},
    };
    const sectionColors = theme.colors?.sections || {};
    const allProducts = theme.allProducts || {};
    const enabledSections = getEnabledHomepageSections(theme);
    const storefrontContainerClass = getContainerClass(layout);
    const catalogProducts = products || [];
    const forcedMobilePreview = isPreviewMobile(previewDevice);
    const forcedNarrowPreview = isPreviewNarrow(previewDevice);

    return (
        <div className="min-w-0 overflow-x-hidden bg-white" style={getReferenceThemeStyle(theme)}>
            <div className={`${storefrontContainerClass} py-3.5 sm:py-8`}>
                <StorefrontHero
                    theme={theme}
                    shopName={shopName}
                    storewideDiscount={storewideDiscount}
                    LinkComponent={LinkComponent}
                    previewDevice={previewDevice}
                    editor={editor}
                />

                {enabledSections.map((section, index) => (
                    <HomepageSection
                        key={section.id || section._id || `${section.type}-${index}`}
                        section={section}
                        sectionIndex={index}
                        categories={categories}
                        sectionProducts={sectionProducts}
                        sectionReviews={sectionReviews}
                        catalogProducts={catalogProducts}
                        storewideDiscount={storewideDiscount}
                        productCard={productCard}
                        sectionColors={sectionColors}
                        layout={layout}
                        onProductAdd={onProductAdd}
                        onProductBuyNow={onProductBuyNow}
                        onWishlistToggle={onWishlistToggle}
                        isProductWishlisted={isProductWishlisted}
                        LinkComponent={LinkComponent}
                        previewDevice={previewDevice}
                        editor={editor}
                    />
                ))}
            </div>

            <StorefrontAllProducts
                allProducts={allProducts}
                catalogProducts={catalogProducts}
                catalogSearch={catalogSearch}
                categories={categories}
                filters={filters}
                forcedMobilePreview={forcedMobilePreview}
                forcedNarrowPreview={forcedNarrowPreview}
                layout={layout}
                loading={loading}
                mobileFiltersOpen={mobileFiltersOpen}
                onCatalogSearchChange={onCatalogSearchChange}
                onCategoryChange={onCategoryChange}
                onClearFilters={onClearFilters}
                onFilterClose={onFilterClose}
                onFilterOpen={onFilterOpen}
                onMaxPriceChange={onMaxPriceChange}
                onMinPriceChange={onMinPriceChange}
                onPageChange={onPageChange}
                onPriceApply={onPriceApply}
                onProductAdd={onProductAdd}
                onProductBuyNow={onProductBuyNow}
                onWishlistToggle={onWishlistToggle}
                isProductWishlisted={isProductWishlisted}
                onRatingChange={onRatingChange}
                onSortChange={onSortChange}
                pagination={pagination}
                previewDevice={previewDevice}
                priceInput={priceInput}
                productCard={productCard}
                storewideDiscount={storewideDiscount}
                editor={editor}
                LinkComponent={LinkComponent}
                theme={theme}
            />
        </div>
    );
}
