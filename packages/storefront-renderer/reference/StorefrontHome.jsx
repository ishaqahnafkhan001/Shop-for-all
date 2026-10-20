"use client";

import { getEnabledHomepageSections, getStorefrontPresentationVariant, resolveEffectiveTheme as normalizeTheme } from "@scaleup/storefront-theme";
import {
    DefaultLink,
    getReferenceThemeStyle,
    isPreviewMobile,
    isPreviewNarrow,
    noop,
} from "./referenceCore";
import { StorefrontAllProducts } from "./StorefrontAllProducts";
import { StorefrontHero } from "./StorefrontHero";
import { StorefrontComposition } from "./StorefrontComposition";
import { HomepageSection } from "./StorefrontSectionRenderer";

export function ReferenceStorefrontHome({
    theme: themeCandidate,
    shopName = "",
    products = [],
    categories = [],
    categoryDetails = [],
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
    onStockChange = noop,
    onPageChange = noop,
    onProductAdd = noop,
    onProductBuyNow,
    onWishlistToggle,
    isProductWishlisted,
    LinkComponent = DefaultLink,
    afterHeroContent = null,
    previewDevice,
    editor,
}) {
    const theme = normalizeTheme(themeCandidate);
    const presentationVariant = getStorefrontPresentationVariant(theme);
    const layout = theme.layout || {};
    const productCard = {
        ...(theme.productCard || {}),
        cardAlignment: layout.cardAlignment,
        colors: theme.colors?.productCard || {},
    };
    const sectionColors = theme.colors?.sections || {};
    const allProducts = theme.allProducts || {};
    const enabledSections = getEnabledHomepageSections(theme);
    const catalogProducts = products || [];
    const forcedMobilePreview = isPreviewMobile(previewDevice);
    const forcedNarrowPreview = isPreviewNarrow(previewDevice);

    const isAvailable = (section) => {
        if (section.type === 'CategoryList') return Boolean(categoryDetails.length || categories.length || catalogProducts.some(product => product.category));
        if (section.type === 'BrandStory') {
            const settings = section.settings || {};
            return Boolean(settings.text || settings.imageUrl || settings.image || settings.desktopImage);
        }
        if (['Collection', 'CollectionShowcase'].includes(section.type)) {
            const id = section.id || section._id;
            const ids = section.settings?.productIds || section.settings?.source?.productIds || [];
            const products = sectionProducts?.[id] || catalogProducts.filter(product => ids.map(String).includes(String(product._id)));
            return products.length > 0;
        }
        return true;
    };
    const renderSection = (section, index) => (
        <HomepageSection
            key={section.id || section._id || `${section.type}-${index}`}
            section={section}
            sectionIndex={index}
            categories={categoryDetails.length ? categoryDetails : categories}
            sectionProducts={sectionProducts}
            sectionReviews={sectionReviews}
            catalogProducts={catalogProducts}
            storewideDiscount={storewideDiscount}
            productCard={productCard}
            presentationVariant={presentationVariant}
            sectionColors={sectionColors}
            layout={layout}
            mobile={theme.mobile}
            onProductAdd={onProductAdd}
            onProductBuyNow={onProductBuyNow}
            onWishlistToggle={onWishlistToggle}
            isProductWishlisted={isProductWishlisted}
            LinkComponent={LinkComponent}
            previewDevice={previewDevice}
            editor={editor}
        />
    );
    const hero = (
        <StorefrontHero
            theme={theme}
            shopName={shopName}
            storewideDiscount={storewideDiscount}
            LinkComponent={LinkComponent}
            previewDevice={previewDevice}
            editor={editor}
        />
    );
    const catalog = (
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
            onStockChange={onStockChange}
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
    );

    return (
        <div data-homepage-composition={layout.homepageComposition} data-atelier-home={presentationVariant === 'atelier-editorial' ? '' : undefined} className="min-w-0 overflow-x-hidden bg-white" style={getReferenceThemeStyle(theme)}>
            <StorefrontComposition
                presentationVariant={presentationVariant}
                layout={layout}
                sections={enabledSections}
                isAvailable={isAvailable}
                renderSection={renderSection}
                hero={hero}
                afterHeroContent={afterHeroContent}
                catalog={catalog}
                previewDevice={previewDevice}
            />
        </div>
    );
}
