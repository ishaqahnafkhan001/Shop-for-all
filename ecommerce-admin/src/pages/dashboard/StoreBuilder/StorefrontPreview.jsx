import { useMemo } from 'react';
import { ChevronDown, ChevronUp, Copy, CreditCard, Eye, EyeOff, Lock, Minus, Package, Pencil, Plus, ShieldCheck, ShoppingBag, Star, Trash2 } from 'lucide-react';
import {
    REFERENCE_SAMPLE_CATEGORIES,
    REFERENCE_SAMPLE_PRODUCTS,
    ReferenceStorefrontFooter,
    ReferenceStorefrontHeader,
    ReferenceStorefrontHome,
    getReferenceThemeStyle
} from '../../../../../ecommerce-storefront/src/components/storefront/ReferenceStorefront.jsx';
import { FALLBACK_THEME, normalizeTheme } from '../../../../../ecommerce-storefront/src/lib/theme.js';

const deviceClasses = {
    desktop: 'w-[1180px] max-w-none',
    tablet: 'w-[768px] max-w-none',
    mobile: 'w-[390px] max-w-none',
    smallMobile: 'w-[320px] max-w-none'
};

const getPrice = (product = {}) => product.finalPrice || product.sellingPrice || product.pricing?.sellingPrice || product.price || 2190;
const getImage = (product = {}) => product.imageUrl || product.images?.[0] || '';
const getSectionLabel = (section = {}) => section.settings?.visualLabel || section.title || section.type || 'Section';

const PreviewLink = ({ href, children, className, ...props }) => (
    <a href={href || '#'} className={className} onClick={event => event.preventDefault()} {...props}>
        {children}
    </a>
);

const PreviewSectionToolbar = ({
    id,
    label,
    locked,
    section,
    sectionIndex,
    sectionCount,
    onSelectElement,
    onMoveSection,
    onDuplicateSection,
    onToggleSectionVisibility,
    onRemoveSection
}) => {
    const isDynamicSection = id?.startsWith('section-') && Number.isFinite(sectionIndex);
    const isVisible = section?.isEnabled !== false;
    const stop = (event) => {
        event.preventDefault();
        event.stopPropagation();
    };
    const handleAction = (event, action) => {
        stop(event);
        action?.();
    };
    const buttonClass = 'inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40';

    return (
        <div
            className="absolute right-3 top-3 z-[90] flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-xl shadow-slate-950/15 backdrop-blur"
            onMouseDown={stop}
            onClick={stop}
        >
            <span className="max-w-[160px] truncate rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-black text-white">
                {label || 'Section'}
            </span>
            {locked && (
                <span className="inline-flex h-8 items-center gap-1 rounded-lg bg-amber-50 px-2 text-[11px] font-black text-amber-800">
                    <Lock size={12} />
                    Locked layout
                </span>
            )}
            <button type="button" className={buttonClass} onClick={event => handleAction(event, () => onSelectElement?.(id))} aria-label={`Edit ${label || 'section'}`}>
                <Pencil size={13} />
                Edit
            </button>
            {isDynamicSection && (
                <>
                    <button type="button" className={buttonClass} disabled={sectionIndex <= 0} onClick={event => handleAction(event, () => onMoveSection?.(sectionIndex, -1))} title="Move section up" aria-label={`Move ${label || 'section'} up`}>
                        <ChevronUp size={13} />
                    </button>
                    <button type="button" className={buttonClass} disabled={sectionIndex >= sectionCount - 1} onClick={event => handleAction(event, () => onMoveSection?.(sectionIndex, 1))} title="Move section down" aria-label={`Move ${label || 'section'} down`}>
                        <ChevronDown size={13} />
                    </button>
                    <button type="button" className={buttonClass} onClick={event => handleAction(event, () => onDuplicateSection?.(sectionIndex))} aria-label={`Duplicate ${label || 'section'}`}>
                        <Copy size={13} />
                    </button>
                    <button type="button" className={buttonClass} onClick={event => handleAction(event, () => onToggleSectionVisibility?.(sectionIndex, !isVisible))} aria-label={`${isVisible ? 'Hide' : 'Show'} ${label || 'section'}`}>
                        {isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                        {isVisible ? 'Hide' : 'Show'}
                    </button>
                    <button type="button" className={`${buttonClass} text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700`} onClick={event => handleAction(event, () => onRemoveSection?.(sectionIndex))} aria-label={`Delete ${label || 'section'}`}>
                        <Trash2 size={13} />
                    </button>
                </>
            )}
        </div>
    );
};

export const CheckoutBrandingPreview = ({ theme: themeCandidate, shopName }) => {
    const theme = normalizeTheme(themeCandidate || {});
    const colors = theme.colors || FALLBACK_THEME.colors;
    const checkoutBranding = theme.checkoutBranding || FALLBACK_THEME.checkoutBranding;
    const policies = theme.policies || FALLBACK_THEME.policies;
    const visiblePolicies = [
        ['refund', 'Refund policy'],
        ['shipping', 'Shipping policy'],
        ['privacy', 'Privacy policy'],
        ['terms', 'Terms of service']
    ].filter(([key]) => policies[key]?.trim());
    const buttonRadius = checkoutBranding.buttonStyle === 'Pill'
        ? '999px'
        : checkoutBranding.buttonStyle === 'Solid'
            ? '10px'
            : '16px';

    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <CreditCard size={16} />
                Checkout preview
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" style={{ color: colors.foreground }}>
                {(checkoutBranding.logoUrl || checkoutBranding.bannerText) && (
                    <div className="mb-4 rounded-lg border border-slate-100 bg-white p-3 text-center">
                        {checkoutBranding.logoUrl && (
                            <div
                                className="mx-auto mb-2 h-10 w-32 rounded bg-contain bg-center bg-no-repeat"
                                style={{ backgroundImage: `url(${checkoutBranding.logoUrl})` }}
                            />
                        )}
                        <p className="text-xs font-semibold text-slate-600">
                            {checkoutBranding.bannerText || shopName || 'Checkout'}
                        </p>
                    </div>
                )}
                <div className="grid grid-cols-1 gap-3 text-xs">
                    <div className="rounded-lg border border-slate-100 p-3">
                        <p className="font-bold text-slate-900">Order Summary</p>
                        <div className="mt-3 space-y-2 text-slate-500">
                            <div className="flex justify-between"><span>Subtotal</span><span>৳ 2,190</span></div>
                            <div className="flex justify-between"><span>Delivery Charge</span><span>৳ 80</span></div>
                            <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 font-black text-slate-900"><span>Total</span><span style={{ color: colors.accent }}>৳ 2,270</span></div>
                        </div>
                    </div>
                    <button className="w-full py-3 text-sm font-black" style={{ backgroundColor: colors.primaryButtonBg || colors.accent, color: colors.primaryButtonText || '#ffffff', borderRadius: buttonRadius }}>
                        Place Order
                    </button>
                    <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
                        <ShieldCheck size={14} style={{ color: colors.accent }} />
                        {checkoutBranding.trustMessage || 'Secure checkout'}
                    </p>
                    {visiblePolicies.length > 0 ? (
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                            <p className="mb-2 font-bold text-slate-900">Visible checkout policies</p>
                            <div className="space-y-1">
                                {visiblePolicies.map(([key, label]) => (
                                    <div key={key} className="rounded bg-white px-3 py-2 font-semibold text-slate-600">
                                        {label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            No checkout policies are visible yet. Add policy text to show them.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

const ProductPreviewPage = ({ products }) => {
    const product = products[0] || {};
    const image = getImage(product);
    const price = getPrice(product);

    return (
        <div className="bg-white px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white to-teal-50/60 p-6 shadow-sm">
                    <div className="relative aspect-square overflow-hidden rounded-[1.5rem] bg-slate-100">
                        {image ? <img src={image} alt="" className="h-full w-full object-contain p-6" /> : <div className="flex h-full items-center justify-center text-slate-300"><ShoppingBag size={54} /></div>}
                    </div>
                    <div className="mt-4 flex gap-3 overflow-hidden">
                        {[0, 1, 2].map(item => (
                            <span key={item} className="h-16 w-16 rounded-xl border border-slate-200 bg-slate-50" />
                        ))}
                    </div>
                </div>
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/70">
                    <div className="mb-3 flex items-center gap-2 text-[var(--sf-rating-color)]">
                        {[1, 2, 3, 4, 5].map(star => <Star key={star} size={16} fill="currentColor" />)}
                        <span className="text-sm font-bold text-slate-500">4.8 review preview</span>
                    </div>
                    <h1 className="text-4xl font-black leading-tight text-slate-950">{product.title || 'Product detail preview'}</h1>
                    <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                        <p className="text-sm font-bold text-slate-500">Price</p>
                        <p className="mt-1 text-4xl font-black text-slate-950">৳ {price}</p>
                    </div>
                    <div className="mt-5 space-y-3">
                        {['Size', 'Color'].map(label => (
                            <div key={label}>
                                <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
                                <div className="flex flex-wrap gap-2">
                                    {['Option 1', 'Option 2', 'Option 3'].map((value, index) => (
                                        <span key={value} className={`rounded-xl border px-4 py-2 text-sm font-black ${index === 0 ? 'border-[var(--sf-accent)] bg-[var(--sf-accent-bg)] text-[var(--sf-accent)]' : 'border-slate-200 text-slate-700'}`}>{value}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 flex items-center justify-between rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                        <span className="text-sm font-black text-slate-950">Quantity</span>
                        <span className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <button className="p-3"><Minus size={15} /></button>
                            <span className="border-x border-slate-200 px-4 py-3 text-sm font-black">1</span>
                            <button className="p-3"><Plus size={15} /></button>
                        </span>
                    </div>
                    <button className="mt-5 w-full rounded-2xl bg-[var(--sf-primary-button-bg)] px-6 py-4 text-base font-black text-[var(--sf-primary-button-text)]">
                        Add to Cart
                    </button>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {['Secure checkout', 'Easy returns', 'Fast delivery', 'Cash on delivery'].map(label => (
                            <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-600">{label}</div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const CartPreviewPage = ({ products }) => {
    const product = products[0] || {};
    const image = getImage(product);
    const price = getPrice(product);

    return (
        <div className="bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-4">
                    {[0, 1].map(index => (
                        <div key={index} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex gap-4">
                                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                                    {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <Package className="m-8 text-slate-300" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="line-clamp-1 text-lg font-black text-slate-950">{product.title || 'Cart item preview'}</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-500">Variant / option preview</p>
                                    <p className="mt-3 text-xl font-black text-slate-950">৳ {price}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/70">
                    <p className="text-xl font-black text-slate-950">Order Summary</p>
                    <div className="mt-5 space-y-3 text-sm text-slate-600">
                        <div className="flex justify-between"><span>Subtotal</span><strong>৳ {price * 2}</strong></div>
                        <div className="flex justify-between"><span>Shipping estimate</span><strong>৳ 60</strong></div>
                    </div>
                    <div className="mt-5 flex justify-between border-t border-slate-200 pt-5 text-xl font-black text-slate-950">
                        <span>Total</span><span>৳ {price * 2 + 60}</span>
                    </div>
                    <button className="mt-5 w-full rounded-2xl bg-[var(--sf-primary-button-bg)] px-5 py-4 font-black text-[var(--sf-primary-button-text)]">Proceed to Checkout</button>
                    <p className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500"><ShieldCheck size={16} /> Secure checkout preview</p>
                </div>
            </div>
        </div>
    );
};

const CheckoutPreviewPage = ({ theme, shopName, products }) => {
    const product = products[0] || {};
    const image = getImage(product);
    const price = getPrice(product);

    return (
        <div className="bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
                <div className="space-y-5">
                    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-2xl font-black text-slate-950">Customer Information</p>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            {['Full name', 'Email', 'Phone', 'City / District'].map(label => <div key={label} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-400">{label}</div>)}
                            <div className="h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-400 sm:col-span-2">Full address</div>
                        </div>
                    </div>
                    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-xl font-black text-slate-950">Payment Method</p>
                        <div className="mt-4 rounded-2xl border border-[var(--sf-accent)] bg-[var(--sf-accent-bg)] p-4 text-sm font-bold text-slate-700">Cash on Delivery</div>
                    </div>
                </div>
                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70">
                    <CheckoutBrandingPreview theme={theme} shopName={shopName} />
                    <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                        <div className="flex gap-3">
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">{image && <img src={image} alt="" className="h-full w-full object-cover" />}</div>
                            <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 text-sm font-black text-slate-950">{product.title || 'Checkout item preview'}</p>
                                <p className="mt-1 text-sm font-black text-slate-950">৳ {price}</p>
                            </div>
                        </div>
                    </div>
                    <p className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500"><Lock size={15} /> Secure order preview</p>
                </div>
            </div>
        </div>
    );
};

const PolicyPreviewPage = ({ theme, shopName }) => {
    const policies = theme.policies || {};
    const policyItems = [
        ['privacy', 'Privacy Policy'],
        ['terms', 'Terms & Conditions'],
        ['refund', 'Refund Policy'],
        ['shipping', 'Shipping Policy']
    ];
    const activePolicy = policyItems.find(([key]) => policies[key]?.trim()) || policyItems[0];
    const [key, label] = activePolicy;
    const content = policies[key]?.trim();

    return (
        <div className="bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--sf-accent)]">{shopName || 'Store preview'}</p>
                    <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{label}</h1>
                    <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                        Policy pages use the same text saved in Store Builder and help customers trust checkout before they buy.
                    </p>
                    <div className="mt-6 grid gap-3 sm:grid-cols-4">
                        {policyItems.map(([itemKey, itemLabel]) => (
                            <div
                                key={itemKey}
                                className={`rounded-2xl border px-4 py-3 text-sm font-black ${
                                    itemKey === key
                                        ? 'border-[var(--sf-accent)] bg-[var(--sf-accent-bg)] text-[var(--sf-accent)]'
                                        : 'border-slate-200 bg-slate-50 text-slate-500'
                                }`}
                            >
                                {itemLabel}
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
                        {content ? (
                            <p className="whitespace-pre-wrap">{content}</p>
                        ) : (
                            <p className="text-slate-500">Add policy text in Store Builder to make this page useful for customers.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const StorefrontPreview = ({
    theme,
    storewideDiscount,
    shopName,
    device,
    previewPage = 'home',
    availableProducts = [],
    availableCategories = [],
    availableReviews = [],
    activeElement,
    onSelectElement,
    onMoveSection,
    onDuplicateSection,
    onToggleSectionVisibility,
    onRemoveSection
}) => {
    const normalizedTheme = normalizeTheme(theme || {});
    const isMobilePreview = device === 'mobile' || device === 'smallMobile';
    const products = availableProducts.length > 0
        ? availableProducts.slice(0, 10).map(product => ({
            ...product,
            imageUrl: product.imageUrl || product.images?.[0] || ''
        }))
        : REFERENCE_SAMPLE_PRODUCTS;
    const categories = availableCategories.length
        ? availableCategories
        : [...new Set(products.map(product => product.category).filter(Boolean))];
    const previewSectionProducts = useMemo(() => {
        const productMap = new Map(products.map(product => [String(product._id), product]));
        return (normalizedTheme.homepageSections || []).reduce((acc, section) => {
            if (section.type !== 'FeaturedProducts') return acc;
            const sectionId = section.id || section._id;
            const productIds = section.settings?.productIds || section.settings?.source?.productIds || section.source?.productIds || [];
            if (!sectionId || !Array.isArray(productIds) || productIds.length === 0) return acc;
            acc[sectionId] = productIds.map(id => productMap.get(String(id))).filter(Boolean);
            return acc;
        }, {});
    }, [products, normalizedTheme.homepageSections]);
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
    const editor = useMemo(() => {
        if (!onSelectElement) return null;
        const sections = normalizedTheme.homepageSections || [];

        return {
            selectedId: activeElement,
            onSelect: onSelectElement,
            renderToolbar: (id, meta = {}) => {
                const sectionIndex = id?.startsWith('section-') ? Number(id.replace('section-', '')) : null;
                const section = Number.isFinite(sectionIndex) ? sections[sectionIndex] : null;

                return (
                    <PreviewSectionToolbar
                        id={id}
                        label={section ? getSectionLabel(section) : meta.label}
                        locked={Boolean(meta.locked)}
                        section={section}
                        sectionIndex={sectionIndex}
                        sectionCount={sections.length}
                        onSelectElement={onSelectElement}
                        onMoveSection={onMoveSection}
                        onDuplicateSection={onDuplicateSection}
                        onToggleSectionVisibility={onToggleSectionVisibility}
                        onRemoveSection={onRemoveSection}
                    />
                );
            }
        };
    }, [activeElement, normalizedTheme.homepageSections, onDuplicateSection, onMoveSection, onRemoveSection, onSelectElement, onToggleSectionVisibility]);
    const frameLabel = device === 'desktop'
        ? `${previewPage}.scaleup.store`
        : device === 'tablet'
            ? 'Tablet preview'
            : device === 'smallMobile'
                ? 'Small phone preview'
                : 'Phone preview';
    const frameClass = device === 'desktop'
        ? 'rounded-xl border border-slate-300 bg-white shadow-2xl shadow-slate-900/10'
        : device === 'tablet'
            ? 'rounded-[2rem] border-[10px] border-slate-900 bg-white shadow-2xl shadow-slate-900/20'
            : 'rounded-[2.4rem] border-[10px] border-slate-950 bg-white shadow-2xl shadow-slate-900/25';
    const renderPreviewPage = () => {
        if (previewPage === 'product') return <ProductPreviewPage products={products} />;
        if (previewPage === 'cart') return <CartPreviewPage products={products} />;
        if (previewPage === 'checkout') return <CheckoutPreviewPage theme={normalizedTheme} shopName={shopName} products={products} />;
        if (previewPage === 'policy') return <PolicyPreviewPage theme={normalizedTheme} shopName={shopName} />;

        return (
            <ReferenceStorefrontHome
                theme={normalizedTheme}
                shopName={shopName || 'Store preview'}
                subdomain="preview"
                cartCount={3}
                storewideDiscount={storewideDiscount}
                products={products}
                categories={categories.length ? categories : REFERENCE_SAMPLE_CATEGORIES}
                sectionProducts={previewSectionProducts}
                sectionReviews={previewSectionReviews}
                pagination={{ page: 1, pages: 10 }}
                filters={{ category: 'All', sort: 'newest', page: 1 }}
                priceInput={{ min: '', max: '' }}
                catalogSearch=""
                preview
                previewDevice={device}
                editor={editor}
                LinkComponent={PreviewLink}
            />
        );
    };

    return (
        <div className="isolate overflow-x-auto rounded-lg border border-slate-200 bg-slate-100 p-4">
            <div className={`mx-auto transition-all duration-300 ${deviceClasses[device]}`}>
                <div className={`${isMobilePreview ? 'max-h-[760px] overflow-y-auto' : 'overflow-hidden'} ${frameClass}`}>
                    {device === 'desktop' ? (
                        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                            <span className="ml-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">{frameLabel}</span>
                        </div>
                    ) : (
                        <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-slate-800" />
                    )}
                    <div style={getReferenceThemeStyle(normalizedTheme)}>
                        <ReferenceStorefrontHeader
                            theme={normalizedTheme}
                            shopName={shopName || 'Store preview'}
                            subdomain="preview"
                            cartCount={3}
                            preview
                            previewDevice={device}
                            editor={editor}
                            LinkComponent={PreviewLink}
                        />
                        {renderPreviewPage()}
                        <ReferenceStorefrontFooter
                            theme={normalizedTheme}
                            shopName={shopName || 'Store preview'}
                            subdomain="preview"
                            cartCount={3}
                            preview
                            previewDevice={device}
                            editor={editor}
                            LinkComponent={PreviewLink}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
