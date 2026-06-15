/* eslint-disable @next/next/no-img-element */
"use client";

import { memo, useState } from 'react';
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Filter,
    Headphones,
    Heart,
    Home,
    Mail,
    Menu,
    PackageX,
    Search,
    ShieldCheck,
    ShoppingBag,
    SlidersHorizontal,
    Star,
    Truck,
    User,
    X
} from 'lucide-react';
import { getEnabledHomepageSections, getSortedNavigation, normalizeTheme } from '../../lib/theme';

export const REFERENCE_SAMPLE_PRODUCTS = [];
export const REFERENCE_SAMPLE_CATEGORIES = [];

const serviceCards = [
    { icon: Truck, title: 'Quick Shipping', text: 'Fast fulfillment with live delivery updates' },
    { icon: Headphones, title: '24/7 Support', text: 'Friendly help whenever customers need it' },
    { icon: ShieldCheck, title: 'Secure Payment', text: 'Encrypted checkout and trusted payments' }
];

const productGridGapClasses = {
    Compact: 'gap-3 sm:gap-4',
    Comfortable: 'gap-4 sm:gap-5 lg:gap-6',
    Spacious: 'gap-5 sm:gap-7 lg:gap-8',
    Editorial: 'gap-5 sm:gap-7 lg:gap-8'
};

const tabletGridClasses = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4'
};

const desktopGridClasses = {
    2: 'xl:grid-cols-2',
    3: 'xl:grid-cols-3',
    4: 'xl:grid-cols-4',
    5: 'xl:grid-cols-5'
};

const plainGridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5'
};

const cardRadiusClasses = {
    Soft: 'rounded-xl',
    Rounded: 'rounded-[1.35rem]',
    Square: 'rounded-none'
};

const imageRadiusClasses = {
    Soft: 'rounded-xl',
    Rounded: 'rounded-[1.15rem]',
    Square: 'rounded-none'
};

const cardShadowClasses = {
    None: 'shadow-none hover:shadow-none',
    Soft: 'shadow-sm hover:shadow-xl hover:shadow-slate-200/70',
    Elevated: 'shadow-lg shadow-slate-200/70 hover:shadow-2xl hover:shadow-slate-300/70'
};

const imageAspectClasses = {
    Square: 'aspect-square',
    Portrait: 'aspect-[3/4]',
    Landscape: 'aspect-[4/3]'
};

const titleSizeClasses = {
    Small: 'text-xs sm:text-sm',
    Medium: 'text-sm sm:text-base',
    Large: 'text-base sm:text-lg'
};

const priceSizeClasses = {
    Small: 'text-base',
    Medium: 'text-lg',
    Large: 'text-xl sm:text-2xl'
};

const buttonShapeClasses = {
    Soft: 'rounded-lg',
    Rounded: 'rounded-xl',
    Pill: 'rounded-full',
    Square: 'rounded-none'
};

const categoryGridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4'
};

const categoryDesktopGridClasses = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4'
};

const noop = () => {};
const formatPrice = (value) => {
    const number = Number(value || 0);
    return number > 999 ? `৳ ${number.toLocaleString('en-BD')}` : `$${number.toFixed(2)}`;
};
const getImageUrl = (product) => product?.imageUrl || product?.images?.[0] || '';
const getPrice = (product) => product?.finalPrice || product?.sellingPrice || product?.pricing?.sellingPrice || product?.price || 0;
const normalizeImageList = (...lists) => [...new Set(lists.flat().filter(Boolean).map(String))];

export const getReferenceThemeStyle = (themeCandidate = {}) => {
    const theme = normalizeTheme(themeCandidate);
    const colors = theme.colors || {};
    return {
        '--sf-accent': colors.accent || '#0f766e',
        '--sf-accent-hover': colors.accentHover || '#115e59',
        '--sf-accent-soft': colors.accentSoft || '#99f6e4',
        '--sf-accent-bg': colors.accentBg || '#ecfdf5',
        '--sf-primary-button-bg': colors.primaryButtonBg || colors.accent || '#0f766e',
        '--sf-primary-button-text': colors.primaryButtonText || '#ffffff',
        '--sf-primary-button-hover-bg': colors.primaryButtonHoverBg || colors.accentHover || '#115e59',
        '--sf-card-hover-border': colors.cardHoverBorder || '#99f6e4',
        '--sf-sale-badge-bg': colors.saleBadgeBg || '#dc2626',
        '--sf-sale-badge-text': colors.saleBadgeText || '#ffffff',
        '--sf-price-color': colors.priceColor || '#0f172a',
        fontFamily: theme.typography?.bodyFont || theme.fontFamily || 'Inter, ui-sans-serif, system-ui, sans-serif',
        color: colors.foreground || '#111827',
        backgroundColor: colors.background || '#ffffff'
    };
};

const DefaultLink = ({ href, children, className, onClick, ...props }) => (
    <a href={href} className={className} onClick={onClick} {...props}>{children}</a>
);

const LinkSlot = ({ LinkComponent = DefaultLink, href, children, className, onClick, ...props }) => (
    <LinkComponent href={href} className={className} onClick={onClick} {...props}>{children}</LinkComponent>
);

const containerClass = 'mx-auto w-full max-w-[1440px] px-4 sm:px-5 lg:px-8';
const isPreviewMobile = (device) => device === 'mobile' || device === 'smallMobile';
const isPreviewNarrow = (device) => isPreviewMobile(device) || device === 'tablet';

const BrandMark = ({ theme, brandName }) => (
    <span className="flex min-w-0 items-center gap-3">
        {theme.logoUrl ? (
            <img
                src={theme.logoUrl}
                alt={brandName}
                className="h-10 w-10 rounded-2xl border border-slate-200 object-cover shadow-sm"
            />
        ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-teal-600 text-sm font-black text-white shadow-sm shadow-teal-900/20">
                {brandName.slice(0, 1).toUpperCase()}
            </span>
        )}
        <span className="min-w-0">
            <span className="block truncate text-sm font-black leading-tight text-slate-950 sm:text-base">{brandName}</span>
            <span className="hidden truncate text-xs font-semibold text-slate-500 sm:block">Storefront</span>
        </span>
    </span>
);

const HeaderNavItem = ({ item, LinkComponent, onClick }) => {
    const children = item.children || [];
    const hasChildren = children.length > 0;

    if (!hasChildren) {
        return (
            <LinkSlot
                LinkComponent={LinkComponent}
                href={item.url || '#'}
                onClick={onClick}
                className="rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-[var(--sf-accent)]"
            >
                {item.label}
            </LinkSlot>
        );
    }

    return (
        <div className="group relative">
            <LinkSlot
                LinkComponent={LinkComponent}
                href={item.url || '#'}
                onClick={onClick}
                className="inline-flex items-center gap-1 rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-[var(--sf-accent)]"
            >
                {item.label}
                <ChevronDown size={14} className="transition group-hover:rotate-180" />
            </LinkSlot>
            <div className="invisible absolute left-0 top-full z-40 min-w-56 translate-y-2 rounded-2xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl shadow-slate-900/10 transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                {children.map((child, index) => (
                    <LinkSlot
                        key={`${child.label}-${index}`}
                        LinkComponent={LinkComponent}
                        href={child.url}
                        onClick={onClick}
                        className="block rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-[var(--sf-accent)]"
                    >
                        {child.label}
                    </LinkSlot>
                ))}
            </div>
        </div>
    );
};

export function ReferenceStorefrontHeader({
    theme: themeCandidate,
    shopName,
    subdomain,
    cartCount = 0,
    onSearch = noop,
    LinkComponent = DefaultLink,
    preview = false,
    previewDevice
}) {
    const theme = normalizeTheme(themeCandidate);
    const brandName = shopName || subdomain || 'Storefront';
    const navLinks = getSortedNavigation(theme);
    const headerNavLinks = navLinks.filter(item => !['track order', 'account', 'cart'].includes(String(item.label || '').toLowerCase()));
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const logoPosition = theme.header?.logoPosition || 'Left';
    const forcedDesktopLayoutClass = logoPosition === 'Center'
        ? 'grid-cols-[minmax(320px,1fr)_minmax(210px,auto)_minmax(360px,1fr)]'
        : logoPosition === 'Right'
            ? 'grid-cols-[minmax(320px,1fr)_minmax(360px,1fr)_minmax(210px,auto)]'
            : 'grid-cols-[minmax(210px,0.8fr)_minmax(320px,1fr)_minmax(360px,1.2fr)]';
    const desktopLayoutClass = logoPosition === 'Center'
        ? 'lg:grid-cols-[minmax(320px,1fr)_minmax(210px,auto)_minmax(360px,1fr)]'
        : logoPosition === 'Right'
            ? 'lg:grid-cols-[minmax(320px,1fr)_minmax(360px,1fr)_minmax(210px,auto)]'
            : 'lg:grid-cols-[minmax(210px,0.8fr)_minmax(320px,1fr)_minmax(360px,1.2fr)]';
    const brandSlot = (
        <LinkSlot LinkComponent={LinkComponent} href="/" className="min-w-0">
            <BrandMark theme={theme} brandName={brandName} />
        </LinkSlot>
    );
    const searchSlot = (
        <div className={`flex ${logoPosition === 'Left' ? 'justify-center' : 'justify-start'}`}>
            <button
                type="button"
                onClick={onSearch}
                className="flex h-11 w-full max-w-[420px] items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 text-sm font-semibold text-slate-500 transition hover:border-[var(--sf-accent-soft)] hover:bg-white hover:text-slate-900"
            >
                <Search size={17} />
                <span>Search products</span>
            </button>
        </div>
    );
    const actionSlot = (
        <div className={`flex items-center gap-2 ${logoPosition === 'Right' ? 'justify-start' : 'justify-end'}`}>
            <nav className="mr-2 hidden max-w-full items-center gap-1 overflow-visible text-sm font-bold text-slate-700 xl:flex">
                {headerNavLinks.slice(0, 5).map((item, index) => (
                    <HeaderNavItem
                        key={`${item.label}-${index}`}
                        item={item}
                        LinkComponent={LinkComponent}
                    />
                ))}
            </nav>
            <LinkSlot LinkComponent={LinkComponent} href="/track" className="inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 hover:text-[var(--sf-accent)]">
                <Truck size={17} />
                Track Order
            </LinkSlot>
            <LinkSlot LinkComponent={LinkComponent} href="/account" className="inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 hover:text-[var(--sf-accent)]">
                <User size={17} />
                Account
            </LinkSlot>
            <LinkSlot
                LinkComponent={LinkComponent}
                href="/cart"
                className="relative inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
                <ShoppingBag size={17} />
                Cart
                {cartCount > 0 && (
                    <span className="absolute -right-1.5 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--sf-accent)] px-1 text-[10px] font-black text-white">
                        {cartCount}
                    </span>
                )}
            </LinkSlot>
        </div>
    );
    const desktopSlots = logoPosition === 'Center'
        ? [searchSlot, brandSlot, actionSlot]
        : logoPosition === 'Right'
            ? [searchSlot, actionSlot, brandSlot]
            : [brandSlot, searchSlot, actionSlot];
    const forceNarrowHeader = isPreviewNarrow(previewDevice);
    const desktopHeaderClass = previewDevice
        ? (forceNarrowHeader ? 'hidden' : `grid h-[76px] items-center gap-6 ${forcedDesktopLayoutClass}`)
        : `hidden h-[76px] items-center gap-6 lg:grid ${desktopLayoutClass}`;
    const mobileHeaderClass = previewDevice
        ? (forceNarrowHeader ? 'flex h-[66px] items-center justify-between gap-3' : 'hidden')
        : 'flex h-[66px] items-center justify-between gap-3 lg:hidden';
    const mobileSearchClass = previewDevice
        ? (forceNarrowHeader ? 'pb-3' : 'hidden')
        : 'pb-3 lg:hidden';

    return (
        <>
            <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
                <div className={containerClass}>
                    <div className={desktopHeaderClass}>
                        {desktopSlots.map((slot, index) => <div key={index} className="min-w-0">{slot}</div>)}
                    </div>

                    <div className={mobileHeaderClass}>
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(true)}
                            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
                            aria-label="Open menu"
                        >
                            <Menu size={20} />
                        </button>
                        <LinkSlot LinkComponent={LinkComponent} href="/" className="min-w-0 flex-1">
                            <BrandMark theme={theme} brandName={brandName} />
                        </LinkSlot>
                        <LinkSlot
                            LinkComponent={LinkComponent}
                            href="/cart"
                            className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white"
                            aria-label="Cart"
                        >
                            <ShoppingBag size={18} />
                            {cartCount > 0 && (
                                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--sf-accent)] px-1 text-[10px] font-black">
                                    {cartCount}
                                </span>
                            )}
                        </LinkSlot>
                    </div>

                    <div className={mobileSearchClass}>
                        <button
                            type="button"
                            onClick={onSearch}
                            className="flex h-11 w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-500"
                        >
                            <Search size={17} />
                            <span>Search products</span>
                        </button>
                    </div>
                </div>
            </header>

            {mobileMenuOpen && !preview && (
                <div className="fixed inset-0 z-[90] bg-slate-950/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)}>
                    <aside className="h-full w-[86vw] max-w-sm bg-white p-5 shadow-2xl" onClick={event => event.stopPropagation()}>
                        <div className="mb-6 flex items-center justify-between gap-4">
                            <BrandMark theme={theme} brandName={brandName} />
                            <button type="button" onClick={() => setMobileMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                                <X size={20} />
                            </button>
                        </div>
                        <nav className="grid gap-2">
                            {[...headerNavLinks, { label: 'Track Order', url: '/track' }, { label: 'Account', url: '/account' }].map((item, index) => (
                                <div key={`${item.label}-${index}`} className="rounded-2xl border border-slate-200 bg-white">
                                    <LinkSlot
                                        LinkComponent={LinkComponent}
                                        href={item.url || '#'}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block px-4 py-3 text-sm font-black text-slate-800 transition hover:text-[var(--sf-accent)]"
                                    >
                                        {item.label}
                                    </LinkSlot>
                                    {(item.children || []).length > 0 && (
                                        <div className="border-t border-slate-100 px-3 pb-3">
                                            {item.children.map((child, childIndex) => (
                                                <LinkSlot
                                                    key={`${child.label}-${childIndex}`}
                                                    LinkComponent={LinkComponent}
                                                    href={child.url}
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    className="mt-2 block rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600"
                                                >
                                                    {child.label}
                                                </LinkSlot>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </nav>
                    </aside>
                </div>
            )}
        </>
    );
}

const ProductCard = memo(function ProductCard({ product, index, storewideDiscount, productCard, onProductAdd, LinkComponent }) {
    const activeDiscount = product.discount > 0 ? product.discount : (product.pricing?.discount > 0 ? product.pricing.discount : (storewideDiscount || 0));
    const hasDiscount = activeDiscount > 0;
    const stock = product.stock ?? product.totalStock ?? 0;
    const price = getPrice(product);
    const originalPrice = product.sellingPrice || product.pricing?.sellingPrice || price;
    const rating = Number(product.averageRating || 0);
    const showRating = productCard?.showRating !== false && rating > 0;
    const showReviews = productCard?.showReviews !== false && Number(product.numReviews || 0) > 0;
    const imageUrl = getImageUrl(product);
    const cardRadiusClass = cardRadiusClasses[productCard?.borderRadius || 'Rounded'] || cardRadiusClasses.Rounded;
    const imageRadiusClass = imageRadiusClasses[productCard?.imageRadius || 'Rounded'] || imageRadiusClasses.Rounded;
    const shadowClass = cardShadowClasses[productCard?.shadow || 'Soft'] || cardShadowClasses.Soft;
    const aspectClass = imageAspectClasses[productCard?.aspectRatio || 'Square'] || imageAspectClasses.Square;
    const titleSizeClass = titleSizeClasses[productCard?.titleSize || 'Medium'] || titleSizeClasses.Medium;
    const priceSizeClass = priceSizeClasses[productCard?.priceSize || 'Medium'] || priceSizeClasses.Medium;
    const buttonShapeClass = buttonShapeClasses[productCard?.buttonShape || 'Pill'] || buttonShapeClasses.Pill;
    const buttonColor = productCard?.buttonColor || 'var(--sf-accent)';
    const priceColor = productCard?.priceColor || 'var(--sf-price-color, #0f172a)';
    const imageFitClass = productCard?.imageFit === 'Contain' ? 'object-contain' : 'object-cover';
    const imagePaddingClass = productCard?.imageFit === 'Contain' ? 'p-3' : '';
    const buttonStyle = productCard?.buttonStyle || 'Solid';
    const buttonInlineStyle = buttonStyle === 'Solid'
        ? { backgroundColor: buttonColor, color: '#ffffff', borderColor: buttonColor }
        : { color: buttonColor, borderColor: buttonStyle === 'Ghost' ? 'transparent' : buttonColor, backgroundColor: buttonStyle === 'Ghost' ? 'transparent' : '#ffffff' };
    const stockText = stock > 0 ? `${stock} in stock` : 'Out of stock';
    const sku = product.sku || product.variants?.[0]?.sku || (product._id ? `ID ${String(product._id).slice(-6)}` : '');

    const handleAdd = (event) => {
        event.preventDefault();
        event.stopPropagation();
        onProductAdd(product);
    };

    return (
        <article
            className={`group relative flex min-h-full min-w-0 flex-col overflow-hidden border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-[var(--sf-card-hover-border)] ${cardRadiusClass} ${shadowClass}`}
            style={{ animationDelay: `${(index % 8) * 35}ms` }}
        >
            <LinkSlot LinkComponent={LinkComponent} href={`/products/${product._id}`} className="absolute inset-0 z-10" aria-label={`View ${product.title}`} />
            <div className={`relative overflow-hidden bg-slate-100 ${aspectClass} ${imageRadiusClass === 'rounded-none' ? '' : 'm-3 mb-0'} ${imageRadiusClass}`}>
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={product.title}
                        className={`h-full w-full ${imageFitClass} ${imagePaddingClass} transition-transform duration-500 ${productCard?.hoverZoom === false ? '' : 'group-hover:scale-105'}`}
                        loading={index < 6 ? 'eager' : 'lazy'}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300">
                        <ShoppingBag size={34} />
                    </div>
                )}
                {productCard?.showWishlist !== false && (
                    <button type="button" className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-500 shadow-sm backdrop-blur transition hover:text-[var(--sf-accent)]">
                        <Heart size={16} />
                    </button>
                )}
                {hasDiscount && productCard?.showDiscountBadge !== false && (
                    <span className="absolute left-3 top-3 z-20 rounded-full bg-[var(--sf-sale-badge-bg)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[var(--sf-sale-badge-text)]">
                        {activeDiscount}% off
                    </span>
                )}
            </div>
            <div className="flex flex-1 flex-col p-4">
                {showRating && (
                    <div className="mb-2 flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-0.5 text-amber-400">
                            {[1, 2, 3, 4, 5].map(star => (
                                <Star
                                    key={star}
                                    size={12}
                                    fill={star <= Math.round(rating) ? 'currentColor' : 'none'}
                                    className={star <= Math.round(rating) ? '' : 'text-slate-300'}
                                />
                            ))}
                        </span>
                        <span className="text-slate-400">{rating.toFixed(1)}{showReviews ? ` (${product.numReviews})` : ''}</span>
                    </div>
                )}
                <h3 className={`line-clamp-2 leading-snug text-slate-950 ${titleSizeClass}`} style={{ fontWeight: productCard?.titleWeight || 800 }}>{product.title}</h3>
                {productCard?.showCategory !== false && product.category && (
                    <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">{product.category}</p>
                )}
                {(productCard?.showStock !== false || productCard?.showSku) && (
                    <div className="mt-2 space-y-1 text-[11px] font-bold text-slate-400">
                        {productCard?.showStock !== false && <p>{stockText}</p>}
                        {productCard?.showSku && sku && <p>SKU: {sku}</p>}
                    </div>
                )}
                <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                    <div>
                        <p className={`${priceSizeClass} font-black`} style={{ color: priceColor }}>{formatPrice(price)}</p>
                        {hasDiscount && originalPrice > price && (
                            <p className="text-xs font-semibold text-slate-400 line-through">{formatPrice(originalPrice)}</p>
                        )}
                    </div>
                    {productCard?.showQuickBuy !== false && (
                        <button
                            type="button"
                            disabled={stock <= 0}
                            onClick={handleAdd}
                            className={`relative z-20 border px-4 py-2 text-xs font-black shadow-sm transition hover:-translate-y-0.5 disabled:bg-slate-300 disabled:text-white ${buttonShapeClass}`}
                            style={stock <= 0 ? undefined : buttonInlineStyle}
                        >
                            Add to Cart
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
});

const HomepageSection = memo(function HomepageSection({ section, categories, sectionProducts, sectionReviews, catalogProducts, storewideDiscount, productCard, layout, onProductAdd, LinkComponent, previewDevice }) {
    const mobileSettings = section.mobileSettings || {};
    const [activeImage, setActiveImage] = useState(0);
    const mobileVisibilityClass = mobileSettings.isVisible === false
        ? (isPreviewMobile(previewDevice) ? 'hidden' : previewDevice ? '' : 'hidden md:block')
        : '';

    if (section.type === 'FeaturedProducts') {
        const products = sectionProducts?.[section.id || section._id] || catalogProducts.slice(0, 4);
        const mobileGridClass = Number(mobileSettings.columns) === 1 ? 'grid-cols-1' : 'grid-cols-2';
        const featuredGridClass = previewDevice
            ? (isPreviewMobile(previewDevice) ? mobileGridClass : 'grid-cols-4')
            : `${mobileGridClass} md:grid-cols-4`;
        if (products.length === 0) return null;
        return (
            <section className={`${mobileVisibilityClass} mt-10 md:mt-12`}>
                <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{section.title || 'Featured Products'}</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Handpicked products from this store</p>
                    </div>
                    <LinkSlot LinkComponent={LinkComponent} href="#products" className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:border-[var(--sf-accent-soft)] hover:text-[var(--sf-accent)] sm:inline-flex">
                        View all
                    </LinkSlot>
                </div>
                <div className={`grid ${featuredGridClass} ${productGridGapClasses[layout?.productGap || 'Comfortable']}`}>
                    {products.slice(0, 4).map((product, index) => (
                        <ProductCard
                            key={product._id}
                            product={product}
                            index={index}
                            storewideDiscount={storewideDiscount}
                            productCard={productCard}
                            onProductAdd={onProductAdd}
                            LinkComponent={LinkComponent}
                        />
                    ))}
                </div>
            </section>
        );
    }

    if (section.type === 'Banner') {
        const desktopImages = normalizeImageList(section.settings?.desktopImages || [], section.settings?.desktopImage, section.settings?.image);
        const mobileImages = normalizeImageList(section.settings?.mobileImages || [], section.settings?.mobileImage, mobileSettings.image);
        const images = desktopImages.length ? desktopImages : mobileImages;
        const mobileDisplayImages = mobileImages.length ? mobileImages : images;
        const imageIndex = images.length ? activeImage % images.length : 0;
        const mobileImageIndex = mobileDisplayImages.length ? activeImage % mobileDisplayImages.length : 0;
        const imageUrl = images[imageIndex] || '';
        const mobileImageUrl = mobileDisplayImages[mobileImageIndex] || imageUrl;
        return (
            <section className={`${mobileVisibilityClass} mt-10 md:mt-12`}>
                <LinkSlot LinkComponent={LinkComponent} href={section.settings?.buttonLink || '#products'} className="group relative block min-h-[240px] overflow-hidden rounded-[1.75rem] bg-slate-950 shadow-sm sm:min-h-[320px]">
                    {mobileImageUrl && mobileImageUrl !== imageUrl && <img src={mobileImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover md:hidden" />}
                    {imageUrl && <img src={imageUrl} alt="" className={`${mobileImageUrl && mobileImageUrl !== imageUrl ? 'hidden md:block' : ''} absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105`} />}
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/78 via-slate-950/36 to-transparent" />
                    <div className="relative z-10 flex min-h-[240px] max-w-2xl flex-col justify-end p-6 text-white sm:min-h-[320px] sm:p-10">
                        <h2 className="text-3xl font-black leading-tight sm:text-5xl">{section.settings?.title || section.title || 'Promotional banner'}</h2>
                        {section.settings?.subtitle && <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">{section.settings.subtitle}</p>}
                        {section.settings?.buttonText && <span className="mt-5 inline-flex w-fit rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950">{section.settings.buttonText}</span>}
                    </div>
                    {images.length > 1 && (
                        <div className="absolute bottom-5 right-5 z-20 flex items-center gap-2" onClick={event => event.preventDefault()}>
                            <button type="button" onClick={() => setActiveImage(prev => (prev - 1 + images.length) % images.length)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-950 shadow-sm">
                                <ChevronLeft size={16} />
                            </button>
                            <div className="flex gap-1.5">
                                {images.map((_, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => setActiveImage(index)}
                                        className={`h-2 rounded-full transition ${index === imageIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
                                        aria-label={`Show banner ${index + 1}`}
                                    />
                                ))}
                            </div>
                            <button type="button" onClick={() => setActiveImage(prev => (prev + 1) % images.length)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-950 shadow-sm">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </LinkSlot>
            </section>
        );
    }

    if (section.type === 'Reviews') {
        const reviewText = section.settings?.text?.trim();
        const reviews = sectionReviews?.[section.id || section._id] || [];
        if (!reviewText && reviews.length === 0) return null;
        return (
            <section className={`${mobileVisibilityClass} mt-10 rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm md:mt-12`}>
                <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">{section.title || 'Customer Reviews'}</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                    {reviews.length > 0 ? reviews.map(review => (
                        <div key={review._id} className="rounded-2xl bg-slate-50 p-4">
                            <div className="flex text-amber-400">{[1, 2, 3, 4, 5].map(star => <Star key={star} size={13} fill="currentColor" />)}</div>
                            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">“{review.comment}”</p>
                            <div className="mt-4 border-t border-slate-200 pt-3">
                                <p className="text-sm font-black text-slate-950">{review.name}</p>
                                {review.product?.title && <p className="text-xs font-semibold text-slate-500">{review.product.title}</p>}
                                <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Review ID {String(review._id).slice(-8)}</p>
                            </div>
                        </div>
                    )) : (
                        <div className="rounded-2xl bg-slate-50 p-4 md:col-span-3">
                            <div className="flex text-amber-400">{[1, 2, 3, 4, 5].map(star => <Star key={star} size={13} fill="currentColor" />)}</div>
                            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{reviewText}</p>
                        </div>
                    )}
                </div>
            </section>
        );
    }

    if (section.type === 'CategoryList') {
        const maxCategories = Math.min(Math.max(Number(section.settings?.maxCategories) || 10, 1), 24);
        const visibleCategories = (categories || []).slice(0, maxCategories);
        const mobileColumns = Math.min(Math.max(Number(mobileSettings.columns) || 2, 1), 4);
        const desktopColumns = Math.min(Math.max(Number(section.settings?.columns) || 4, 1), 4);
        const categoryGridClass = previewDevice
            ? (isPreviewMobile(previewDevice) ? categoryGridClasses[mobileColumns] : categoryGridClasses[desktopColumns])
            : `${categoryGridClasses[mobileColumns]} ${categoryDesktopGridClasses[desktopColumns]}`;
        if (visibleCategories.length === 0) return null;
        return (
            <section className={`${mobileVisibilityClass} mt-10 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:mt-12`}>
                <h2 className="text-2xl font-black text-slate-950">{section.title || 'Shop by category'}</h2>
                <div className={`mt-4 grid gap-2 ${categoryGridClass}`}>
                    {visibleCategories.map(category => (
                        <LinkSlot key={category} LinkComponent={LinkComponent} href={`/?category=${encodeURIComponent(category)}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 transition hover:border-[var(--sf-accent)] hover:bg-[var(--sf-accent-bg)]">
                            {category}
                        </LinkSlot>
                    ))}
                </div>
            </section>
        );
    }

    return (
        <section className={`${mobileVisibilityClass} mt-10 rounded-[1.75rem] border border-slate-200 bg-white p-7 text-center shadow-sm md:mt-12 sm:p-10`}>
            <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">{section.title || 'Store update'}</h2>
            {section.settings?.text && <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">{section.settings.text}</p>}
        </section>
    );
});

const FilterPanel = ({ categories, filters, priceInput, onCategoryChange, onMinPriceChange, onMaxPriceChange, onPriceApply, onClearFilters, onRatingChange }) => (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
            <h3 className="text-base font-black text-slate-950">Filter Products</h3>
            <SlidersHorizontal size={17} className="text-slate-400" />
        </div>
        <div className="space-y-2">
            <button type="button" onClick={() => onCategoryChange('All')} className={`w-full rounded-xl px-3 py-2 text-left text-sm font-bold transition ${filters.category === 'All' ? 'bg-[var(--sf-accent)] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>All Products</button>
            {categories?.map(category => (
                <button key={category} type="button" onClick={() => onCategoryChange(category)} className={`w-full rounded-xl px-3 py-2 text-left text-sm font-bold transition ${filters.category === category ? 'bg-[var(--sf-accent)] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                    {category}
                </button>
            ))}
        </div>
        <div className="my-5 h-px bg-slate-200" />
        <h4 className="mb-3 text-sm font-black text-slate-950">Price Range</h4>
        <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Min" value={priceInput.min} onChange={onMinPriceChange} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--sf-accent)] focus:ring-4 focus:ring-teal-100" />
            <input type="number" placeholder="Max" value={priceInput.max} onChange={onMaxPriceChange} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--sf-accent)] focus:ring-4 focus:ring-teal-100" />
        </div>
        <button type="button" onClick={onPriceApply} className="mt-3 w-full rounded-full bg-[var(--sf-accent)] px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[var(--sf-accent-hover)]">Apply Price</button>
        <div className="my-5 h-px bg-slate-200" />
        <div className="space-y-3 text-sm font-bold text-slate-600">
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 rounded border-slate-300" /> In stock only</label>
            <div>
                <p className="mb-2 text-slate-950">Rating</p>
                {[5, 4, 3].map(rating => (
                    <button
                        key={rating}
                        type="button"
                        onClick={() => onRatingChange?.(Number(filters.minRating) === rating ? '' : rating)}
                        className={`flex w-full items-center gap-2 rounded-xl px-2 py-1 text-left text-amber-400 transition ${Number(filters.minRating) === rating ? 'bg-amber-50 ring-1 ring-amber-200' : 'hover:bg-slate-50'}`}
                    >
                        {[1, 2, 3, 4, 5].map(star => <Star key={star} size={13} fill="currentColor" className={star <= rating ? '' : 'text-slate-200'} />)}
                        <span className="text-xs text-slate-500">{rating}.0+</span>
                    </button>
                ))}
            </div>
        </div>
        <button type="button" onClick={onClearFilters} className="mt-5 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">Clear Filter</button>
    </div>
);

export function ReferenceStorefrontHome({
    theme: themeCandidate,
    products = [],
    categories = [],
    sectionProducts = {},
    sectionReviews = {},
    storewideDiscount = 0,
    loading = false,
    pagination = { page: 1, pages: 1 },
    filters = { category: 'All', sort: 'newest', page: 1 },
    priceInput = { min: '', max: '' },
    catalogSearch = '',
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
    LinkComponent = DefaultLink,
    previewDevice
}) {
    const theme = normalizeTheme(themeCandidate);
    const hero = theme.hero || {};
    const layout = theme.layout || {};
    const productCard = theme.productCard || {};
    const allProducts = theme.allProducts || {};
    const enabledSections = getEnabledHomepageSections(theme);
    const catalogProducts = products || [];
    const filteredProducts = catalogSearch.trim()
        ? catalogProducts.filter(product => `${product.title || ''} ${product.category || ''}`.toLowerCase().includes(catalogSearch.toLowerCase()))
        : catalogProducts;
    const desktopColumns = Math.min(Math.max(allProducts.desktopColumns || layout.productColumnsDesktop || 3, 2), 5);
    const tabletColumns = Math.min(Math.max(allProducts.tabletColumns || 2, 1), 4);
    const mobileColumns = Math.min(Math.max(allProducts.mobileColumns || layout.productColumnsMobile || 2, 1), 2);
    const liveGridClass = `${mobileColumns === 1 ? 'grid-cols-1' : 'grid-cols-2'} ${tabletGridClasses[tabletColumns] || tabletGridClasses[2]} ${desktopGridClasses[desktopColumns] || desktopGridClasses[3]}`;
    const gridClass = previewDevice
        ? (isPreviewMobile(previewDevice)
            ? plainGridClasses[mobileColumns]
            : previewDevice === 'tablet'
                ? plainGridClasses[tabletColumns]
                : plainGridClasses[desktopColumns])
        : liveGridClass;
    const gridGapClass = productGridGapClasses[layout.productGap || theme.productGridStyle] || productGridGapClasses.Comfortable;
    const forcedMobilePreview = isPreviewMobile(previewDevice);
    const forcedNarrowPreview = isPreviewNarrow(previewDevice);
    const heroClass = previewDevice
        ? `relative overflow-hidden rounded-[1.75rem] bg-slate-950 ${forcedMobilePreview ? 'p-5' : 'p-10'} text-white shadow-xl shadow-slate-200/70 ${previewDevice === 'desktop' ? 'min-h-[420px]' : 'min-h-[360px]'}`
        : 'relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-xl shadow-slate-200/70 sm:p-10 lg:min-h-[420px]';
    const heroGridClass = previewDevice
        ? `relative z-10 grid gap-8 ${previewDevice === 'desktop' ? 'grid-cols-[0.9fr_1fr] items-center' : ''}`
        : 'relative z-10 grid gap-8 lg:grid-cols-[0.9fr_1fr] lg:items-center';
    const heroTitleClass = previewDevice
        ? `max-w-xl font-black leading-[0.95] tracking-tight ${forcedMobilePreview ? 'text-4xl' : previewDevice === 'tablet' ? 'text-5xl' : 'text-7xl'}`
        : 'max-w-xl text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl lg:text-7xl';
    const serviceGridClass = previewDevice
        ? (forcedMobilePreview
            ? 'mt-5 grid auto-cols-[82%] grid-flow-col gap-4 overflow-x-auto pb-2'
            : 'mt-5 grid grid-cols-3 gap-4 pb-2')
        : 'mt-5 grid auto-cols-[82%] grid-flow-col gap-4 overflow-x-auto pb-2 sm:auto-cols-fr sm:grid-flow-row sm:grid-cols-3 sm:overflow-visible';
    const allProductsHeaderClass = forcedNarrowPreview
        ? 'mb-6 flex flex-col gap-4'
        : 'mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between';
    const catalogControlsClass = forcedMobilePreview
        ? 'flex flex-col gap-3'
        : 'flex flex-col gap-3 sm:flex-row';
    const catalogSearchClass = forcedMobilePreview
        ? 'relative min-w-0'
        : 'relative min-w-0 sm:min-w-[320px]';
    const catalogSelectClass = forcedMobilePreview
        ? 'rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-[var(--sf-accent)] focus:ring-4 focus:ring-teal-100'
        : 'rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-[var(--sf-accent)] focus:ring-4 focus:ring-teal-100 sm:w-36';
    const productLayoutClass = forcedNarrowPreview
        ? 'grid gap-6'
        : 'grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]';
    const filterAsideClass = forcedNarrowPreview ? 'hidden' : 'hidden lg:block';
    const filterButtonClass = forcedNarrowPreview
        ? 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700'
        : 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 lg:hidden';
    const mobileFilterOverlayClass = forcedNarrowPreview
        ? 'fixed inset-0 z-[80] flex items-end bg-slate-950/50 backdrop-blur-sm'
        : 'fixed inset-0 z-[80] flex items-end bg-slate-950/50 backdrop-blur-sm lg:hidden';

    return (
        <div className="bg-white" style={getReferenceThemeStyle(theme)}>
            <div className={`${containerClass} py-5 sm:py-8`}>
                <section className={heroClass}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(20,184,166,.35),transparent_30rem)]" />
                    <button type="button" disabled className="absolute left-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-950 shadow-md disabled:opacity-90 md:flex" aria-label="Previous slide">
                        <ChevronLeft size={19} />
                    </button>
                    <button type="button" disabled className="absolute right-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-950 shadow-md disabled:opacity-90 md:flex" aria-label="Next slide">
                        <ChevronRight size={19} />
                    </button>
                    <div className={heroGridClass}>
                        <div className="max-w-2xl">
                            {hero.title && (
                                <h1 className={heroTitleClass}>
                                    {hero.title}
                                </h1>
                            )}
                            {hero.subtitle && (
                                <p className="mt-5 max-w-lg text-base font-semibold leading-7 text-white/70 sm:text-lg">
                                    {hero.subtitle}
                                </p>
                            )}
                            <div className="mt-7 flex flex-wrap gap-3">
                                <LinkSlot LinkComponent={LinkComponent} href="#products" className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100">
                                    {hero.ctaLabel || 'Shop Now'}
                                </LinkSlot>
                                <LinkSlot LinkComponent={LinkComponent} href="#products" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10">
                                    Explore Collection
                                </LinkSlot>
                            </div>
                        </div>
                        <div className="relative min-h-[250px] overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-cyan-100 to-teal-900 shadow-2xl sm:min-h-[330px]">
                            {hero.imageUrl ? (
                                <img src={hero.imageUrl} alt={hero.title || 'Store hero'} className="absolute inset-0 h-full w-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20 text-white/50">
                                    <ShoppingBag size={54} />
                                </div>
                            )}
                            {storewideDiscount > 0 && (
                                <div className="absolute bottom-5 left-5 rounded-2xl bg-white px-5 py-4 text-slate-950 shadow-xl">
                                    <p className="text-xs font-black text-slate-400">Today only</p>
                                    <p className="text-2xl font-black">{storewideDiscount}% off</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="relative z-10 mt-6 flex justify-center gap-2">
                        <span className="h-2 w-8 rounded-full bg-white" />
                        <span className="h-2 w-2 rounded-full bg-white/40" />
                        <span className="h-2 w-2 rounded-full bg-white/40" />
                    </div>
                </section>

                <section className={serviceGridClass}>
                    {serviceCards.map(({ icon: Icon, title, text }) => (
                        <div key={title} className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-4">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--sf-accent-bg)] text-[var(--sf-accent)]">
                                    <Icon size={20} />
                                </span>
                                <div>
                                    <h3 className="text-base font-black text-slate-950">{title}</h3>
                                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{text}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </section>

                {enabledSections.map((section, index) => (
                    <HomepageSection
                        key={section.id || section._id || `${section.type}-${index}`}
                        section={section}
                        categories={categories}
                        sectionProducts={sectionProducts}
                        sectionReviews={sectionReviews}
                        catalogProducts={catalogProducts}
                        storewideDiscount={storewideDiscount}
                        productCard={productCard}
                        layout={layout}
                        onProductAdd={onProductAdd}
                        LinkComponent={LinkComponent}
                        previewDevice={previewDevice}
                    />
                ))}
            </div>

            {allProducts.isEnabled !== false && (
                <section id="products" className="bg-slate-50 py-9 sm:py-12">
                    <div className={containerClass}>
                        <div className={allProductsHeaderClass}>
                            <div>
                                <h2 className="text-3xl font-black tracking-tight text-slate-950">{allProducts.title || 'All Products'}</h2>
                                <p className="mt-1 text-sm font-semibold text-slate-500">{allProducts.subtitle || "Browse this shop's latest catalog"}</p>
                            </div>
                            <div className={catalogControlsClass}>
                                <label className={catalogSearchClass}>
                                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input value={catalogSearch} onChange={onCatalogSearchChange} placeholder="Search catalog" className="w-full rounded-full border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--sf-accent)] focus:ring-4 focus:ring-teal-100" />
                                </label>
                                <select value={filters.sort} onChange={onSortChange} className={catalogSelectClass}>
                                    <option value="newest">Newest</option>
                                    <option value="priceAsc">Price low</option>
                                    <option value="priceDesc">Price high</option>
                                    <option value="ratingDesc">Top rated</option>
                                    <option value="ratingAsc">Lowest rated</option>
                                    <option value="nameAsc">A to Z</option>
                                    <option value="nameDesc">Z to A</option>
                                </select>
                                <button type="button" onClick={onFilterOpen} className={filterButtonClass}>
                                    <Filter size={16} />
                                    Filters
                                </button>
                            </div>
                        </div>

                        <div className={productLayoutClass}>
                            <aside className={filterAsideClass}>
                                <div className="sticky top-28">
                                    <FilterPanel
                                        categories={categories}
                                        filters={filters}
                                        priceInput={priceInput}
                                        onCategoryChange={onCategoryChange}
                                        onMinPriceChange={onMinPriceChange}
                                        onMaxPriceChange={onMaxPriceChange}
                                        onPriceApply={onPriceApply}
                                        onClearFilters={onClearFilters}
                                        onRatingChange={onRatingChange}
                                    />
                                </div>
                            </aside>
                            <main>
                                {loading ? (
                                    <div className={`grid ${gridClass} ${gridGapClass}`}>
                                        {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-72 animate-pulse rounded-[1.35rem] bg-white" />)}
                                    </div>
                                ) : filteredProducts.length === 0 ? (
                                    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                                        <PackageX size={44} className="mx-auto mb-4 text-slate-300" />
                                        <h3 className="text-xl font-black text-slate-950">No products found</h3>
                                        <p className="mt-2 text-sm text-slate-500">Try adjusting search, category, or price filters.</p>
                                        <button type="button" onClick={onClearFilters} className="mt-6 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">Clear filters</button>
                                    </div>
                                ) : (
                                    <div className={`grid ${gridClass} ${gridGapClass}`}>
                                        {filteredProducts.map((product, index) => (
                                            <ProductCard
                                                key={product._id}
                                                product={product}
                                                index={index}
                                                storewideDiscount={storewideDiscount}
                                                productCard={productCard}
                                                onProductAdd={onProductAdd}
                                                LinkComponent={LinkComponent}
                                            />
                                        ))}
                                    </div>
                                )}

                                {pagination?.pages > 1 && (
                                    <div className="mt-8 hidden items-center justify-center gap-2 md:flex">
                                        <button type="button" onClick={() => onPageChange(filters.page - 1)} disabled={filters.page === 1} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 disabled:opacity-40">Previous</button>
                                        {Array.from({ length: Math.min(pagination.pages, 5) }, (_, index) => {
                                            const pageNumber = index + 1;
                                            return (
                                                <button key={pageNumber} type="button" onClick={() => onPageChange(pageNumber)} className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${filters.page === pageNumber ? 'bg-[var(--sf-accent)] text-white' : 'bg-white text-slate-600'}`}>
                                                    {pageNumber}
                                                </button>
                                            );
                                        })}
                                        <button type="button" onClick={() => onPageChange(filters.page + 1)} disabled={filters.page === pagination.pages} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 disabled:opacity-40">Next</button>
                                    </div>
                                )}
                            </main>
                        </div>
                    </div>
                </section>
            )}

            {mobileFiltersOpen && (
                <div className={mobileFilterOverlayClass} onClick={onFilterClose}>
                    <div className="max-h-[86vh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-5" onClick={event => event.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-black text-slate-950">Filter products</h2>
                            <button type="button" onClick={onFilterClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                                <X size={18} />
                            </button>
                        </div>
                        <FilterPanel
                            categories={categories}
                            filters={filters}
                            priceInput={priceInput}
                            onCategoryChange={onCategoryChange}
                            onMinPriceChange={onMinPriceChange}
                            onMaxPriceChange={onMaxPriceChange}
                            onPriceApply={onPriceApply}
                            onClearFilters={onClearFilters}
                            onRatingChange={onRatingChange}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

const FooterColumn = ({ title, links, LinkComponent }) => (
    <div>
        <h3 className="text-sm font-black text-slate-950">{title}</h3>
        <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-500">
            {links.map((link) => (
                <LinkSlot key={link.label} LinkComponent={LinkComponent} href={link.href} className="transition hover:text-[var(--sf-accent)]">
                    {link.label}
                </LinkSlot>
            ))}
        </div>
    </div>
);

const FooterAccordion = ({ title, links, LinkComponent }) => (
    <details className="group border-b border-slate-200 py-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black text-slate-950">
            {title}
            <ChevronDown size={17} className="transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 grid gap-3 pb-2 text-sm font-semibold text-slate-500">
            {links.map(link => (
                <LinkSlot key={link.label} LinkComponent={LinkComponent} href={link.href} className="transition hover:text-[var(--sf-accent)]">
                    {link.label}
                </LinkSlot>
            ))}
        </div>
    </details>
);

export function ReferenceStorefrontFooter({ theme: themeCandidate, shopName, subdomain, cartCount = 0, LinkComponent = DefaultLink, preview = false, previewDevice }) {
    const theme = normalizeTheme(themeCandidate);
    const brandName = shopName || subdomain || 'Storefront';
    const footerLinks = (theme.footer?.links || []).filter(item => item?.label && item?.url);
    const navLinks = footerLinks.length
        ? footerLinks.map(item => ({ label: item.label, href: item.url }))
        : getSortedNavigation(theme).map(item => ({ label: item.label, href: item.url }));
    const columns = navLinks.length ? [{ title: 'Store Links', links: navLinks.slice(0, 8) }] : [];
    const forceNarrowFooter = isPreviewNarrow(previewDevice);
    const footerGridClass = `grid gap-8 ${columns.length && !forceNarrowFooter ? 'lg:grid-cols-[1.3fr_minmax(0,1fr)]' : ''}`;
    const desktopColumnsClass = forceNarrowFooter ? 'hidden' : 'hidden contents lg:contents';
    const mobileColumnsClass = forceNarrowFooter ? 'block' : 'lg:hidden';
    const bottomNavClass = `${preview ? 'sticky bottom-0' : 'fixed inset-x-0 bottom-0'} z-50 ${previewDevice ? (previewDevice === 'desktop' ? 'hidden' : 'grid') : 'grid md:hidden'} grid-cols-5 border-t border-slate-200 bg-white/95 px-1 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur`;
    const mobileLinks = [
        { label: 'Home', href: '/', icon: Home },
        { label: 'Search', href: '/#products', icon: Search },
        { label: 'Track', href: '/track', icon: Truck },
        { label: 'Account', href: '/account', icon: User },
        { label: 'Cart', href: '/cart', icon: ShoppingBag, badge: cartCount }
    ];

    return (
        <>
            <footer className="border-t border-slate-200 bg-white pb-20 pt-10 md:pb-8" style={getReferenceThemeStyle(theme)}>
                <div className={containerClass}>
                    <div className={footerGridClass}>
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="h-10 w-10 rounded-full bg-[var(--sf-accent)]" />
                                <div>
                                    <h2 className="text-lg font-black text-slate-950">{brandName}</h2>
                                    <p className="text-xs font-semibold text-slate-500">Storefront</p>
                                </div>
                            </div>
                            {theme.footer?.text && (
                                <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
                                    {theme.footer.text}
                                </p>
                            )}
                            <form className="mt-5 flex max-w-sm gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
                                <input type="email" placeholder="Email for updates" className="min-w-0 flex-1 bg-transparent px-4 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400" />
                                <button type="button" className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white">Subscribe</button>
                            </form>
                        </div>
                        <div className={desktopColumnsClass}>
                            {columns.map(column => <FooterColumn key={column.title} {...column} LinkComponent={LinkComponent} />)}
                        </div>
                        <div className={mobileColumnsClass}>
                            {columns.map(column => <FooterAccordion key={column.title} {...column} LinkComponent={LinkComponent} />)}
                            {navLinks.length > 0 && <FooterAccordion title="Store Links" links={navLinks.slice(0, 6)} LinkComponent={LinkComponent} />}
                        </div>
                    </div>
                    <div className="mt-8 flex flex-col gap-4 border-t border-slate-200 pt-5 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                        <p>© {new Date().getFullYear()} {brandName}. Powered by Commerce SaaS.</p>
                        <div className="flex items-center gap-3">
                            <Mail size={16} />
                            {['f', 'ig', 'x'].map(item => (
                                <span key={item} className="flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-1 text-[10px] font-black uppercase text-slate-500">
                                    {item}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>

            {theme.mobile?.showBottomNavigation && (
                <nav className={bottomNavClass}>
                    {mobileLinks.map((item) => {
                        const Icon = item.icon;
                        return (
                            <LinkSlot key={item.label} LinkComponent={LinkComponent} href={item.href} className="relative flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[var(--sf-accent)]">
                                <Icon size={18} />
                                <span>{item.label}</span>
                                {item.badge > 0 && <span className="absolute right-4 top-0 h-4 min-w-4 rounded-full bg-[var(--sf-accent)] px-1 text-[10px] leading-4 text-white">{item.badge}</span>}
                            </LinkSlot>
                        );
                    })}
                </nav>
            )}
        </>
    );
}

export function ReferenceStorefrontPage(props) {
    return (
        <div style={getReferenceThemeStyle(props.theme)}>
            <ReferenceStorefrontHeader {...props} />
            <ReferenceStorefrontHome {...props} />
            <ReferenceStorefrontFooter {...props} />
        </div>
    );
}
