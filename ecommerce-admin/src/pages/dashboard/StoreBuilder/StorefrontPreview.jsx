import { CheckoutBrandingBanner, CheckoutTrustBadges } from '@scaleup/storefront-renderer/presentation/CheckoutSections';
import { useMemo } from 'react';
import { StorefrontPreviewFrame } from './StorefrontPreviewFrame.jsx';
import { PreviewCommercePage } from './PreviewCommercePages.jsx';
import { normalizeProduct } from '@scaleup/storefront-renderer/product-data';
import { PresentationRuntime, NativeImage } from '@scaleup/storefront-renderer/presentation/Runtime';
import { STOREFRONT_VIEWPORTS } from '@scaleup/storefront-renderer/viewports';
import { createPreviewEditor } from './previewEditor.js';
import {
    ReferenceStorefrontFooter,
    ReferenceStorefrontHeader,
    ReferenceStorefrontHome,
    getReferenceThemeStyle
} from '@scaleup/storefront-renderer';
import { getStorefrontPresentationVariant, resolveEffectiveTheme } from '@scaleup/storefront-theme';

const getCategoryName = (category) => (
    typeof category === 'string'
        ? category.trim()
        : String(category?.name || category?.title || category?.label || category?.slug || '').trim()
);

const PreviewLink = ({ href, children, className, ...props }) => {
    const anchorProps = { ...props };
    delete anchorProps.prefetch;
    return (
        <a href={href || '#'} className={className} {...anchorProps} onClick={event => { anchorProps.onClick?.(event); event.preventDefault(); }}>
            {children}
        </a>
    );
};

export const CheckoutBrandingPreview = ({ theme, shopName }) => {
    const resolved = resolveEffectiveTheme(theme, { shopName });
    return <div className="sf-presentation" data-sf-presentation={getStorefrontPresentationVariant(resolved) === 'atelier-editorial' ? 'atelier-editorial' : undefined} style={getReferenceThemeStyle(resolved)}><CheckoutBrandingBanner checkoutBranding={resolved.checkoutBranding} /><CheckoutTrustBadges /></div>;
};

export const StorefrontPreviewContent = ({
    theme,
    planAccess,
    branding,
    storewideDiscount,
    shopName,
    trustedBadge,
    shopVerification,
    cartCount = 3,
    previewPage = 'home',
    availableProducts = [],
    previewCatalog,
    availableCategories = [],
    availableReviews = [],
    activeElement,
    onSelectElement,
    onToggleSectionVisibility
}) => {
    const normalizedTheme = resolveEffectiveTheme(theme || {}, { planAccess, branding, shopName });
    const products = availableProducts.map(normalizeProduct).filter(Boolean);
    const catalogProducts = previewCatalog?.products ? previewCatalog.products.map(normalizeProduct).filter(Boolean) : products;
    const previewCategories = availableCategories.length
        ? availableCategories
        : [...new Set(products.map(product => product.category).filter(Boolean))];
    const categoryNames = [...new Set(previewCategories.map(getCategoryName).filter(Boolean))];
    const categoryDetails = previewCategories.filter(category => category && typeof category === 'object');
    const previewSectionProducts = useMemo(() => {
        const productMap = new Map(products.map(product => [String(product._id), product]));
        Object.entries(previewCatalog?.productsById || {}).forEach(([id, product]) => productMap.set(id, normalizeProduct(product)));
        // Fresh picker results take precedence over the opening snapshot. A null
        // public card means the product is no longer eligible for storefront use.
        products.forEach(product => {
            if (!Object.hasOwn(product, 'previewCard')) return;
            if (product.previewCard) productMap.set(String(product._id), normalizeProduct(product.previewCard));
            else productMap.delete(String(product._id));
        });
        return (normalizedTheme.homepageSections || []).reduce((acc, section) => {
            if (!['FeaturedProducts', 'Collection', 'CollectionShowcase'].includes(section.type)) return acc;
            const sectionId = section.id || section._id;
            const productIds = section.settings?.productIds || section.settings?.source?.productIds || section.source?.productIds || [];
            if (!sectionId || !Array.isArray(productIds) || productIds.length === 0) return acc;
            acc[sectionId] = productIds.map(id => productMap.get(String(id))).filter(Boolean);
            return acc;
        }, {});
    }, [products, previewCatalog, normalizedTheme.homepageSections]);
    const previewSectionReviews = useMemo(() => {
        const reviewMap = new Map(availableReviews.map(review => [String(review._id), review]));
        return (normalizedTheme.homepageSections || []).reduce((acc, section) => {
            if (section.type !== 'Reviews') return acc;
            const sectionId = section.id || section._id;
            const reviewIds = section.settings?.reviewIds || [];
            if (!sectionId || !Array.isArray(reviewIds) || reviewIds.length === 0) return acc;
            acc[sectionId] = reviewIds.map(id => reviewMap.get(String(id))).filter(Boolean);
            return acc;
        }, {});
    }, [availableReviews, normalizedTheme.homepageSections]);
    const editor = useMemo(() => createPreviewEditor({ theme, activeElement, onSelectElement, onToggleSectionVisibility }),
        [activeElement, theme, onSelectElement, onToggleSectionVisibility]);
    const renderPreviewPage = () => {
        if (previewPage !== 'home') return <PreviewCommercePage key={`${previewPage}-${products[0]?._id || 'empty'}`} page={previewPage} theme={normalizedTheme} shopName={shopName} products={products} reviews={availableReviews} />;

        return (
            <ReferenceStorefrontHome
                theme={normalizedTheme}
                shopName={shopName || 'Store preview'}
                subdomain="preview"
                cartCount={cartCount}
                storewideDiscount={storewideDiscount}
                products={catalogProducts}
                categories={categoryNames}
                categoryDetails={categoryDetails}
                sectionProducts={previewSectionProducts}
                sectionReviews={previewSectionReviews}
                pagination={previewCatalog?.pagination || { page: 1, pages: 1 }}
                filters={{ category: 'All', sort: 'newest', page: 1 }}
                priceInput={{ min: '', max: '' }}
                catalogSearch=""
                onProductBuyNow={() => {}}
                preview
                previewDevice={undefined}
                editor={editor}
                LinkComponent={PreviewLink}
            />
        );
    };

    return <PresentationRuntime value={{ Link: PreviewLink, Image: NativeImage }}>
        <div className="sf-presentation" style={{ ...getReferenceThemeStyle(normalizedTheme), minHeight: '100vh' }} data-sf-presentation={getStorefrontPresentationVariant(normalizedTheme) === 'atelier-editorial' ? 'atelier-editorial' : undefined}>
            <ReferenceStorefrontHeader theme={normalizedTheme} shopName={shopName || 'Store preview'} subdomain="preview" cartCount={cartCount} trustedBadge={trustedBadge} shopVerification={shopVerification} editor={editor} LinkComponent={PreviewLink} />
            {renderPreviewPage()}
            <ReferenceStorefrontFooter theme={normalizedTheme} shopName={shopName || 'Store preview'} subdomain="preview" cartCount={cartCount} shopVerification={shopVerification} editor={editor} LinkComponent={PreviewLink} />
        </div>
    </PresentationRuntime>;
};

export function StorefrontPreview({ device = 'desktop', previewZoom = 'fit', thumbnail = false, ...props }) {
    const viewport = STOREFRONT_VIEWPORTS[device] || STOREFRONT_VIEWPORTS.desktop;
    return <div data-preview-device={device} className={thumbnail ? '' : 'rounded-lg border border-slate-200 bg-slate-100 p-3'}>
        <StorefrontPreviewFrame width={viewport.width} height={thumbnail ? 740 : viewport.height}
            title={`${props.shopName || 'Store'} ${props.previewPage || 'home'} preview`} zoom={previewZoom} thumbnail={thumbnail}>
            <StorefrontPreviewContent {...props} device={device} />
        </StorefrontPreviewFrame>
    </div>;
}
