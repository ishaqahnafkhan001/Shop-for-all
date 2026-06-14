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

export const REFERENCE_SAMPLE_PRODUCTS = [
    {
        _id: 'sample-tote',
        title: 'Everyday Carry Tote',
        category: 'Bags & travel',
        sellingPrice: 68,
        finalPrice: 68,
        stock: 12,
        averageRating: 4.9,
        imageUrl: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=700&q=85'
    },
    {
        _id: 'sample-lamp',
        title: 'Ceramic Desk Lamp',
        category: 'Home studio',
        sellingPrice: 124,
        finalPrice: 124,
        stock: 8,
        averageRating: 4.8,
        imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=700&q=85'
    },
    {
        _id: 'sample-runner',
        title: 'Minimal Runner Sneaker',
        category: 'Footwear',
        sellingPrice: 92,
        finalPrice: 92,
        stock: 16,
        averageRating: 4.7,
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85'
    },
    {
        _id: 'sample-bottle',
        title: 'Wellness Bottle Set',
        category: 'Lifestyle',
        sellingPrice: 36,
        finalPrice: 36,
        stock: 24,
        averageRating: 4.9,
        imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=700&q=85'
    },
    {
        _id: 'sample-overshirt',
        title: 'Linen Overshirt',
        category: 'Breathable daily layer',
        sellingPrice: 78,
        finalPrice: 78,
        stock: 10,
        averageRating: 4.8,
        imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=85'
    },
    {
        _id: 'sample-tray',
        title: 'Oak Charging Tray',
        category: 'Organize essentials',
        sellingPrice: 45,
        finalPrice: 45,
        stock: 14,
        averageRating: 4.6,
        imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85'
    },
    {
        _id: 'sample-throw',
        title: 'Soft Knit Throw',
        category: 'Warm textured weave',
        sellingPrice: 89,
        finalPrice: 89,
        stock: 6,
        averageRating: 4.9,
        imageUrl: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=85'
    },
    {
        _id: 'sample-glass',
        title: 'Daily Glass Tumbler',
        category: 'Set of four',
        sellingPrice: 32,
        finalPrice: 32,
        stock: 18,
        averageRating: 4.7,
        imageUrl: 'https://images.unsplash.com/photo-1604134967494-8a9ed3adea0d?auto=format&fit=crop&w=900&q=85'
    },
    {
        _id: 'sample-weekender',
        title: 'Compact Weekender',
        category: 'Water resistant finish',
        sellingPrice: 118,
        finalPrice: 118,
        stock: 9,
        averageRating: 4.8,
        imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85'
    },
    {
        _id: 'sample-speaker',
        title: 'Wireless Desk Speaker',
        category: 'Clear room-filling audio',
        sellingPrice: 149,
        finalPrice: 149,
        stock: 5,
        averageRating: 4.5,
        imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=900&q=85'
    }
];

export const REFERENCE_SAMPLE_CATEGORIES = ['Home & Living', 'Fashion', 'Accessories', 'Electronics'];

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

const desktopGridClasses = {
    2: 'md:grid-cols-2 lg:grid-cols-2',
    3: 'md:grid-cols-2 xl:grid-cols-3',
    4: 'md:grid-cols-3 xl:grid-cols-4',
    5: 'md:grid-cols-3 xl:grid-cols-5'
};

const noop = () => {};
const formatPrice = (value) => {
    const number = Number(value || 0);
    return number > 999 ? `৳ ${number.toLocaleString('en-BD')}` : `$${number.toFixed(2)}`;
};
const getImageUrl = (product) => product?.imageUrl || product?.images?.[0] || REFERENCE_SAMPLE_PRODUCTS[0].imageUrl;
const getPrice = (product) => product?.finalPrice || product?.sellingPrice || product?.pricing?.sellingPrice || product?.price || 0;

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
            <span className="hidden truncate text-xs font-semibold text-slate-500 sm:block">Custom storefront</span>
        </span>
    </span>
);

export function ReferenceStorefrontHeader({
    theme: themeCandidate,
    shopName,
    subdomain,
    cartCount = 0,
    onSearch = noop,
    LinkComponent = DefaultLink,
    preview = false
}) {
    const theme = normalizeTheme(themeCandidate);
    const brandName = shopName || subdomain || 'Vendor Store';
    const navLinks = getSortedNavigation(theme).slice(0, 3);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <>
            <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
                <div className="mx-auto w-[min(100%-40px,1440px)]">
                    <div className="hidden h-[76px] items-center gap-6 lg:grid lg:grid-cols-[minmax(210px,0.8fr)_minmax(320px,1fr)_minmax(360px,1.2fr)]">
                        <LinkSlot LinkComponent={LinkComponent} href="/" className="min-w-0">
                            <BrandMark theme={theme} brandName={brandName} />
                        </LinkSlot>
                        <div className="flex justify-center">
                            <button
                                type="button"
                                onClick={onSearch}
                                className="flex h-11 min-w-[320px] items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 text-sm font-semibold text-slate-500 transition hover:border-[var(--sf-accent-soft)] hover:bg-white hover:text-slate-900"
                            >
                                <Search size={17} />
                                <span>Search products</span>
                            </button>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                            <nav className="mr-2 flex items-center gap-1 text-sm font-bold text-slate-700">
                                {navLinks.map((item, index) => (
                                    <LinkSlot
                                        key={`${item.label}-${index}`}
                                        LinkComponent={LinkComponent}
                                        href={item.url}
                                        className="rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-[var(--sf-accent)]"
                                    >
                                        {item.label}
                                    </LinkSlot>
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
                    </div>

                    <div className="flex h-[66px] items-center justify-between gap-3 lg:hidden">
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

                    <div className="pb-3 lg:hidden">
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
                            {[...navLinks, { label: 'Track Order', url: '/track' }, { label: 'Account', url: '/account' }].map((item, index) => (
                                <LinkSlot
                                    key={`${item.label}-${index}`}
                                    LinkComponent={LinkComponent}
                                    href={item.url}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-800 transition hover:border-[var(--sf-accent-soft)] hover:bg-slate-50"
                                >
                                    {item.label}
                                </LinkSlot>
                            ))}
                        </nav>
                    </aside>
                </div>
            )}
        </>
    );
}

const ProductCard = memo(function ProductCard({ product, index, storewideDiscount, productCard, onProductAdd, LinkComponent }) {
    const activeDiscount = product.discount > 0 ? product.discount : (storewideDiscount || 0);
    const hasDiscount = activeDiscount > 0;
    const stock = product.stock ?? product.totalStock ?? 0;
    const price = getPrice(product);
    const originalPrice = product.sellingPrice || product.pricing?.sellingPrice || price;
    const showRating = productCard?.showRating !== false;

    const handleAdd = (event) => {
        event.preventDefault();
        event.stopPropagation();
        onProductAdd(product);
    };

    return (
        <article
            className="group relative flex min-h-full flex-col overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[var(--sf-card-hover-border)] hover:shadow-xl hover:shadow-slate-200/70"
            style={{ animationDelay: `${(index % 8) * 35}ms` }}
        >
            <LinkSlot LinkComponent={LinkComponent} href={`/products/${product._id}`} className="absolute inset-0 z-10" aria-label={`View ${product.title}`} />
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 sm:aspect-square">
                <img
                    src={getImageUrl(product)}
                    alt={product.title}
                    className={`h-full w-full object-cover transition-transform duration-500 ${productCard?.hoverZoom === false ? '' : 'group-hover:scale-105'}`}
                    loading={index < 6 ? 'eager' : 'lazy'}
                />
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
                            {[1, 2, 3, 4, 5].map(star => <Star key={star} size={12} fill="currentColor" />)}
                        </span>
                        <span className="text-slate-400">{Number(product.averageRating || 4.8).toFixed(1)}</span>
                    </div>
                )}
                <h3 className="line-clamp-2 text-sm font-black leading-snug text-slate-950 sm:text-base">{product.title}</h3>
                {productCard?.showCategory !== false && (
                    <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">{product.category || 'Store product'}</p>
                )}
                <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                    <div>
                        <p className="text-lg font-black text-slate-950">{formatPrice(price)}</p>
                        {hasDiscount && originalPrice > price && (
                            <p className="text-xs font-semibold text-slate-400 line-through">{formatPrice(originalPrice)}</p>
                        )}
                    </div>
                    {productCard?.showQuickBuy !== false && (
                        <button
                            type="button"
                            disabled={stock <= 0}
                            onClick={handleAdd}
                            className="relative z-20 rounded-full bg-[var(--sf-accent)] px-4 py-2 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--sf-accent-hover)] disabled:bg-slate-300"
                        >
                            Add to Cart
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
});

const HomepageSection = memo(function HomepageSection({ section, categories, sectionProducts, catalogProducts, storewideDiscount, productCard, layout, onProductAdd, LinkComponent }) {
    const mobileSettings = section.mobileSettings || {};
    if (mobileSettings.isVisible === false) return null;

    if (section.type === 'FeaturedProducts') {
        const products = sectionProducts?.[section.id || section._id] || catalogProducts.slice(0, 4);
        if (products.length === 0) return null;
        return (
            <section className="mt-10 md:mt-12">
                <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{section.title || 'Featured Products'}</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Handpicked products from this store</p>
                    </div>
                    <LinkSlot LinkComponent={LinkComponent} href="#products" className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:border-[var(--sf-accent-soft)] hover:text-[var(--sf-accent)] sm:inline-flex">
                        View all
                    </LinkSlot>
                </div>
                <div className={`grid grid-cols-2 md:grid-cols-4 ${productGridGapClasses[layout?.productGap || 'Comfortable']}`}>
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
        const imageUrl = section.settings?.desktopImage || section.settings?.image || '';
        const mobileImageUrl = section.settings?.mobileImage || mobileSettings.image || imageUrl;
        return (
            <section className="mt-10 md:mt-12">
                <LinkSlot LinkComponent={LinkComponent} href={section.settings?.buttonLink || '#products'} className="group relative block min-h-[240px] overflow-hidden rounded-[1.75rem] bg-slate-950 shadow-sm sm:min-h-[320px]">
                    {mobileImageUrl && mobileImageUrl !== imageUrl && <img src={mobileImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover md:hidden" />}
                    {imageUrl && <img src={imageUrl} alt="" className={`${mobileImageUrl && mobileImageUrl !== imageUrl ? 'hidden md:block' : ''} absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105`} />}
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/78 via-slate-950/36 to-transparent" />
                    <div className="relative z-10 flex min-h-[240px] max-w-2xl flex-col justify-end p-6 text-white sm:min-h-[320px] sm:p-10">
                        <h2 className="text-3xl font-black leading-tight sm:text-5xl">{section.settings?.title || section.title || 'Promotional banner'}</h2>
                        {section.settings?.subtitle && <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">{section.settings.subtitle}</p>}
                        {section.settings?.buttonText && <span className="mt-5 inline-flex w-fit rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950">{section.settings.buttonText}</span>}
                    </div>
                </LinkSlot>
            </section>
        );
    }

    if (section.type === 'Reviews') {
        return (
            <section className="mt-10 rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm md:mt-12">
                <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">{section.title || 'Customer Reviews'}</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                    {['Beautiful store experience.', 'Fast delivery and support.', 'Products arrived perfectly.'].map((quote, index) => (
                        <div key={quote} className="rounded-2xl bg-slate-50 p-4">
                            <div className="flex text-amber-400">{[1, 2, 3, 4, 5].map(star => <Star key={star} size={13} fill="currentColor" />)}</div>
                            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{section.settings?.text || quote}</p>
                            <p className="mt-3 text-xs font-black text-slate-950">Verified customer {index + 1}</p>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (section.type === 'CategoryList') {
        return (
            <section className="mt-10 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:mt-12">
                <h2 className="text-2xl font-black text-slate-950">{section.title || 'Shop by category'}</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                    {(categories || []).slice(0, 10).map(category => (
                        <LinkSlot key={category} LinkComponent={LinkComponent} href={`/?category=${encodeURIComponent(category)}`} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-[var(--sf-accent)] hover:bg-[var(--sf-accent-bg)]">
                            {category}
                        </LinkSlot>
                    ))}
                </div>
            </section>
        );
    }

    return (
        <section className="mt-10 rounded-[1.75rem] border border-slate-200 bg-white p-7 text-center shadow-sm md:mt-12 sm:p-10">
            <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">{section.title || 'Store update'}</h2>
            {section.settings?.text && <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">{section.settings.text}</p>}
        </section>
    );
});

const FilterPanel = ({ categories, filters, priceInput, onCategoryChange, onMinPriceChange, onMaxPriceChange, onPriceApply, onClearFilters }) => (
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
                    <div key={rating} className="flex items-center gap-2 text-amber-400">
                        {[1, 2, 3, 4, 5].map(star => <Star key={star} size={13} fill="currentColor" className={star <= rating ? '' : 'text-slate-200'} />)}
                        <span className="text-xs text-slate-500">{rating}.0+</span>
                    </div>
                ))}
            </div>
        </div>
        <button type="button" onClick={onClearFilters} className="mt-5 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">Clear Filter</button>
    </div>
);

export function ReferenceStorefrontHome({
    theme: themeCandidate,
    products = REFERENCE_SAMPLE_PRODUCTS,
    categories = REFERENCE_SAMPLE_CATEGORIES,
    sectionProducts = {},
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
    onPageChange = noop,
    onProductAdd = noop,
    LinkComponent = DefaultLink
}) {
    const theme = normalizeTheme(themeCandidate);
    const hero = theme.hero || {};
    const layout = theme.layout || {};
    const productCard = theme.productCard || {};
    const allProducts = theme.allProducts || {};
    const enabledSections = getEnabledHomepageSections(theme);
    const catalogProducts = products?.length ? products : REFERENCE_SAMPLE_PRODUCTS;
    const filteredProducts = catalogSearch.trim()
        ? catalogProducts.filter(product => `${product.title || ''} ${product.category || ''}`.toLowerCase().includes(catalogSearch.toLowerCase()))
        : catalogProducts;
    const desktopColumns = Math.min(Math.max(allProducts.desktopColumns || layout.productColumnsDesktop || 3, 2), 5);
    const mobileColumns = Math.min(Math.max(allProducts.mobileColumns || layout.productColumnsMobile || 2, 1), 2);
    const gridClass = `${mobileColumns === 1 ? 'grid-cols-1' : 'grid-cols-2'} ${desktopGridClasses[desktopColumns] || desktopGridClasses[3]}`;
    const gridGapClass = productGridGapClasses[layout.productGap || theme.productGridStyle] || productGridGapClasses.Comfortable;

    return (
        <div className="bg-white" style={getReferenceThemeStyle(theme)}>
            <div className="mx-auto w-[min(100%-40px,1440px)] py-5 sm:py-8">
                <section className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-xl shadow-slate-200/70 sm:p-10 lg:min-h-[420px]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(20,184,166,.35),transparent_30rem)]" />
                    <button type="button" disabled className="absolute left-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-950 shadow-md disabled:opacity-90 md:flex" aria-label="Previous slide">
                        <ChevronLeft size={19} />
                    </button>
                    <button type="button" disabled className="absolute right-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-950 shadow-md disabled:opacity-90 md:flex" aria-label="Next slide">
                        <ChevronRight size={19} />
                    </button>
                    <div className="relative z-10 grid gap-8 lg:grid-cols-[0.9fr_1fr] lg:items-center">
                        <div className="max-w-2xl">
                            <span className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black text-white/80 ring-1 ring-white/10">
                                Theme-ready storefront for every vendor
                            </span>
                            <h1 className="mt-5 max-w-xl text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl lg:text-7xl">
                                {hero.title || 'Discover Your Favorite Products'}
                            </h1>
                            <p className="mt-5 max-w-lg text-base font-semibold leading-7 text-white/70 sm:text-lg">
                                {hero.subtitle || 'Shop quality products from trusted stores'}
                            </p>
                            <div className="mt-7 flex flex-wrap gap-3">
                                <LinkSlot LinkComponent={LinkComponent} href={hero.ctaUrl || '#products'} className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100">
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
                                <img src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85" alt="Store hero" className="absolute inset-0 h-full w-full object-cover" />
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

                <section className="mt-5 grid auto-cols-[82%] grid-flow-col gap-4 overflow-x-auto pb-2 sm:auto-cols-fr sm:grid-flow-row sm:grid-cols-3 sm:overflow-visible">
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
                        catalogProducts={catalogProducts}
                        storewideDiscount={storewideDiscount}
                        productCard={productCard}
                        layout={layout}
                        onProductAdd={onProductAdd}
                        LinkComponent={LinkComponent}
                    />
                ))}
            </div>

            {allProducts.isEnabled !== false && (
                <section id="products" className="bg-slate-50 py-9 sm:py-12">
                    <div className="mx-auto w-[min(100%-40px,1440px)]">
                        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <h2 className="text-3xl font-black tracking-tight text-slate-950">{allProducts.title || 'All Products'}</h2>
                                <p className="mt-1 text-sm font-semibold text-slate-500">{allProducts.subtitle || "Browse this shop's latest catalog"}</p>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <label className="relative min-w-0 sm:min-w-[320px]">
                                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input value={catalogSearch} onChange={onCatalogSearchChange} placeholder="Search catalog" className="w-full rounded-full border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--sf-accent)] focus:ring-4 focus:ring-teal-100" />
                                </label>
                                <select value={filters.sort} onChange={onSortChange} className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-[var(--sf-accent)] focus:ring-4 focus:ring-teal-100 sm:w-36">
                                    <option value="newest">Newest</option>
                                    <option value="priceAsc">Price low</option>
                                    <option value="priceDesc">Price high</option>
                                    <option value="nameAsc">A to Z</option>
                                </select>
                                <button type="button" onClick={onFilterOpen} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 lg:hidden">
                                    <Filter size={16} />
                                    Filters
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                            <aside className="hidden lg:block">
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
                <div className="fixed inset-0 z-[80] flex items-end bg-slate-950/50 backdrop-blur-sm lg:hidden" onClick={onFilterClose}>
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

export function ReferenceStorefrontFooter({ theme: themeCandidate, shopName, subdomain, cartCount = 0, LinkComponent = DefaultLink }) {
    const theme = normalizeTheme(themeCandidate);
    const brandName = shopName || subdomain || 'Vendor Store';
    const footerLinks = (theme.footer?.links || []).filter(item => item?.label && item?.url);
    const navLinks = footerLinks.length
        ? footerLinks.map(item => ({ label: item.label, href: item.url }))
        : getSortedNavigation(theme).map(item => ({ label: item.label, href: item.url }));
    const columns = [
        { title: 'About Us', links: [{ label: 'Brand values', href: '/' }, { label: 'Store builder', href: '/' }, { label: 'Help center', href: '/account' }, { label: 'Shipping & returns', href: '/checkout' }] },
        { title: 'Contact', links: [{ label: 'support@store.com', href: '/account' }, { label: 'Track order', href: '/track' }, { label: 'Customer account', href: '/account' }, { label: 'Cart', href: '/cart' }] },
        { title: 'FAQ', links: [{ label: 'Common questions', href: '/' }, { label: 'Payment safety', href: '/checkout' }, { label: 'Order updates', href: '/track' }, { label: 'Support', href: '/account' }] },
        { title: 'Policies', links: [{ label: 'Privacy policy', href: '/checkout' }, { label: 'Store policy', href: '/checkout' }, { label: 'Refund policy', href: '/checkout' }, { label: 'Terms', href: '/checkout' }] }
    ];
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
                <div className="mx-auto w-[min(100%-40px,1440px)]">
                    <div className="grid gap-8 lg:grid-cols-[1.3fr_repeat(4,0.7fr)]">
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="h-10 w-10 rounded-full bg-[var(--sf-accent)]" />
                                <div>
                                    <h2 className="text-lg font-black text-slate-950">{brandName}</h2>
                                    <p className="text-xs font-semibold text-slate-500">Custom storefront</p>
                                </div>
                            </div>
                            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
                                {theme.footer?.text || 'A flexible, brandable storefront built for modern multi-tenant commerce.'}
                            </p>
                            <form className="mt-5 flex max-w-sm gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
                                <input type="email" placeholder="Email for updates" className="min-w-0 flex-1 bg-transparent px-4 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400" />
                                <button type="button" className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white">Subscribe</button>
                            </form>
                        </div>
                        <div className="hidden contents lg:contents">
                            {columns.map(column => <FooterColumn key={column.title} {...column} LinkComponent={LinkComponent} />)}
                        </div>
                        <div className="lg:hidden">
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
                <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
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
