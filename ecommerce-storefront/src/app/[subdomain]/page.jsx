"use client";
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useShopData } from '@/hooks/useShopData';
import { useCart } from '@/context/CartContext';
import { getEnabledHomepageSections, normalizeTheme } from '@/lib/theme';
import {
    PackageX, ShoppingBag, ArrowRight,
    Filter, ChevronLeft, ChevronRight, SlidersHorizontal, Star, ShieldCheck, Truck
} from 'lucide-react';

// ─── Extracted & memoised product card ───────────────────────────────────────
const getCardRadius = (radius) => {
    if (radius === 'Square') return 'rounded-none';
    if (radius === 'Soft') return 'rounded-lg';
    return 'rounded-2xl sm:rounded-3xl';
};

const getCardShadow = (shadow) => {
    if (shadow === 'None') return 'shadow-none';
    if (shadow === 'Elevated') return 'shadow-lg hover:shadow-xl';
    return 'hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]';
};

const sectionSpacingClasses = {
    Compact: 'mb-7 sm:mb-9',
    Comfortable: 'mb-9 sm:mb-12',
    Spacious: 'mb-12 sm:mb-16'
};

const productGridGapClasses = {
    Compact: 'gap-3 sm:gap-5 lg:gap-6',
    Comfortable: 'gap-4 sm:gap-7 lg:gap-9',
    Editorial: 'gap-6 sm:gap-9 lg:gap-11'
};

const desktopGridClasses = {
    2: 'md:grid-cols-2 lg:grid-cols-2',
    3: 'md:grid-cols-3 lg:grid-cols-3',
    4: 'md:grid-cols-4 lg:grid-cols-4',
    5: 'md:grid-cols-5 lg:grid-cols-5'
};

const ProductCard = memo(function ProductCard({ product, index, storewideDiscount, addToCart, cardTheme }) {
    const router = useRouter();

    const activeDiscount = product.discount > 0 ? product.discount : (storewideDiscount || 0);
    const hasDiscount = activeDiscount > 0;

    const handleAddToCart = useCallback((e) => {
        e.preventDefault();
        addToCart(product);
    }, [product, addToCart]);

    const handleBuyNow = useCallback((e) => {
        e.preventDefault();
        addToCart(product);
        router.push('/checkout');
    }, [product, addToCart, router]);

    const radiusClass = getCardRadius(cardTheme?.borderRadius);
    const shadowClass = getCardShadow(cardTheme?.shadow);
    const imageFitClass = cardTheme?.imageFit === 'Cover' ? 'object-cover p-0' : 'object-contain p-3 sm:p-5 mix-blend-multiply';
    const showQuickBuy = cardTheme?.showQuickBuy !== false;

    return (
        <article
            className={`group flex min-h-full flex-col overflow-hidden border border-slate-200 bg-white ${radiusClass} ${shadowClass} transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-100/70`}
            style={{ animationDelay: `${(index % 12) * 30}ms` }}
        >
            <div className={`aspect-[4/4.25] relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/70 ${radiusClass} m-2 sm:m-3`}>
                <Link href={`/products/${product._id}`} className="absolute inset-0 z-10" />

                <Image
                    src={product.imageUrl || 'https://via.placeholder.com/400'}
                    alt={product.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className={`${imageFitClass} transition-transform duration-500 group-hover:scale-105`}
                    loading={index < 6 ? 'eager' : 'lazy'}
                />

                {cardTheme?.showCategory !== false && product.category && (
                    <div className="absolute left-2 top-2 z-20 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm backdrop-blur sm:left-3 sm:top-3">
                        {product.category}
                    </div>
                )}

                {hasDiscount && product.stock > 0 && (
                    <div className="absolute right-2 top-2 z-20 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-200 sm:right-3 sm:top-3">
                        {activeDiscount}% OFF
                    </div>
                )}

                {product.stock <= 0 && (
                    <div className="absolute left-2 top-2 z-20 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-sm backdrop-blur sm:left-3 sm:top-3">
                        Sold Out
                    </div>
                )}
            </div>

            <div className="flex flex-grow flex-col px-4 pb-4 pt-2 sm:px-5 sm:pb-5">
                <h3 className="min-h-[40px] text-sm font-black leading-snug text-slate-950 line-clamp-2 sm:text-base">
                    <Link href={`/products/${product._id}`} className="hover:text-[var(--sf-accent)] transition-colors relative z-10">
                        {product.title}
                    </Link>
                </h3>

                {cardTheme?.showRating !== false && product.averageRating > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs font-bold text-amber-500">
                        <Star size={13} fill="currentColor" />
                        <span>{Number(product.averageRating).toFixed(1)}</span>
                    </div>
                )}

                <div className="mt-auto flex flex-wrap items-end gap-1.5 pt-4 sm:gap-2">
                    <span className="text-lg font-black text-slate-950 sm:text-xl">৳ {product.finalPrice}</span>
                    {hasDiscount && (
                        <span className="pb-0.5 text-xs font-semibold text-slate-400 line-through sm:text-sm">৳ {product.sellingPrice}</span>
                    )}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs font-bold">
                    <span className={product.stock > 0 ? 'text-emerald-700' : 'text-red-600'}>
                        {product.stock > 0 ? `${product.stock} in stock` : 'Unavailable'}
                    </span>
                    <span className="rounded-full bg-cyan-50 px-2 py-1 text-cyan-700">COD ready</span>
                </div>

                {showQuickBuy && (
                <div className="relative z-20 mt-5 flex items-center gap-2">
                    <button
                        onClick={handleAddToCart}
                        disabled={product.stock <= 0}
                        className="sf-btn sf-btn-secondary h-12 min-h-0 w-12 shrink-0 p-0 text-slate-600 disabled:opacity-50"
                        aria-label={`Add ${product.title} to cart`}
                    >
                        <ShoppingBag size={18} />
                    </button>
                    <button
                        onClick={handleBuyNow}
                        disabled={product.stock <= 0}
                        className="sf-btn sf-btn-primary h-12 min-h-0 flex-1 px-3 text-xs disabled:bg-slate-300 disabled:shadow-none sm:text-sm"
                    >
                        <span>Buy Now</span>
                        <ArrowRight size={14} />
                    </button>
                </div>
                )}
            </div>
        </article>
    );
});

// ─── Skeleton loader (stable reference, no props) ─────────────────────────────
const SkeletonGrid = memo(function SkeletonGrid() {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex flex-col space-y-3 sm:space-y-4 animate-pulse">
                    <div className="aspect-square bg-gray-100 rounded-2xl" />
                    <div className="h-4 bg-gray-100 rounded w-2/3" />
                    <div className="h-4 bg-gray-100 rounded w-1/4" />
                </div>
            ))}
        </div>
    );
});

const HomepageCustomSection = memo(function HomepageCustomSection({ section, categories, banners }) {
    if (section.type === 'CategoryList') {
        return (
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="mb-4 text-xl sm:text-2xl font-black text-[var(--sf-foreground)]" style={{ fontFamily: 'var(--sf-heading-font)', fontWeight: 'var(--sf-heading-weight)' }}>
                    {section.title || 'Shop by category'}
                </h2>
                <div className="flex flex-wrap gap-2">
                    {(categories || []).slice(0, 10).map((category) => (
                        <Link
                            key={category}
                            href={`/?category=${encodeURIComponent(category)}`}
                            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-[var(--sf-accent)] hover:bg-[var(--sf-accent-bg)] hover:text-[var(--sf-accent)]"
                        >
                            {category}
                        </Link>
                    ))}
                </div>
            </section>
        );
    }

    if (section.type === 'BannerGrid') {
        const visibleBanners = (banners || []).slice(0, 2);
        if (visibleBanners.length === 0) return null;

        return (
            <section className="grid gap-5 sm:grid-cols-2">
                {visibleBanners.map((banner) => {
                    const imageUrl = banner.desktopImages?.[0] || banner.images?.[0] || banner.image;
                    const mobileImageUrl = banner.mobileImages?.[0] || imageUrl;
                    if (!imageUrl) return null;
                    return (
                        <Link
                            key={banner._id}
                            href={banner.link || '/'}
                            className="group relative aspect-[16/9] overflow-hidden rounded-[2rem] bg-slate-100 shadow-sm"
                        >
                            {mobileImageUrl !== imageUrl && (
                                <Image
                                    src={mobileImageUrl}
                                    alt={banner.title || section.title || 'Store banner'}
                                    fill
                                    sizes="100vw"
                                    className="object-cover transition-transform duration-500 group-hover:scale-105 md:hidden"
                                />
                            )}
                            <Image
                                src={imageUrl}
                                alt={banner.title || section.title || 'Store banner'}
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className={`${mobileImageUrl !== imageUrl ? 'hidden md:block' : ''} object-cover transition-transform duration-500 group-hover:scale-105`}
                            />
                            {banner.title && (
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 text-lg font-black text-white">
                                    {banner.title}
                                </div>
                            )}
                        </Link>
                    );
                })}
            </section>
        );
    }

    if (section.type === 'TextBlock' || section.type === 'Newsletter' || section.type === 'Reviews') {
        return (
            <section className="rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-7 text-center shadow-sm sm:p-12">
                <h2 className="text-xl sm:text-3xl font-black text-[var(--sf-foreground)]" style={{ fontFamily: 'var(--sf-heading-font)', fontWeight: 'var(--sf-heading-weight)' }}>
                    {section.title || 'Store update'}
                </h2>
                {section.settings?.text && (
                    <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base text-gray-600">
                        {section.settings.text}
                    </p>
                )}
            </section>
        );
    }

    return null;
});

// ─── Main page ────────────────────────────────────────────────────────────────
export default function VendorHomePage({ params }) {
    const { subdomain } = React.use(params);
    const { addToCart } = useCart();

    const [filters, setFilters] = useState({
        category: 'All', minPrice: '', maxPrice: '', sort: 'newest', page: 1,
    });
    const [priceInput, setPriceInput] = useState({ min: '', max: '' });
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    const { shop, products, categories, banners, loading, error, pagination } = useShopData(subdomain, filters);
    const theme = normalizeTheme(shop?.theme || {});
    const hero = theme.hero || {};
    const layout = theme.layout || {};
    const productCard = theme.productCard || {};
    const heroImageUrl = hero.imageUrl;
    const heroTitle = hero.title;
    const heroSubtitle = hero.subtitle;
    const heroCtaUrl = hero.ctaUrl;
    const heroCtaLabel = hero.ctaLabel;
    const heroOverlayOpacity = hero.overlayOpacity;
    const enabledSections = getEnabledHomepageSections(theme);
    const containerClass = layout.maxWidth === 'Full'
            ? 'w-full px-5 py-6 pb-24 sm:px-8 sm:py-8'
        : layout.maxWidth === 'Contained'
            ? 'mx-auto max-w-5xl px-5 py-6 pb-24 sm:px-8 sm:py-8'
            : 'sf-shell-wide py-6 pb-24 sm:py-8';
    const heroHeightClass = hero.height === 'Compact'
        ? 'h-[220px] sm:h-[280px] md:h-[340px]'
        : hero.height === 'Tall'
            ? 'h-[340px] sm:h-[440px] md:h-[540px]'
            : 'h-[260px] sm:h-[340px] md:h-[440px]';
    const desktopColumns = Math.min(Math.max(layout.productColumnsDesktop || 3, 2), 5);
    const gridClass = `${layout.productColumnsMobile === 1 ? 'grid-cols-1' : 'grid-cols-2'} ${desktopGridClasses[desktopColumns] || desktopGridClasses[3]}`;
    const gridGapClass = productGridGapClasses[theme.productGridStyle] || productGridGapClasses.Comfortable;
    const sectionSpacingClass = sectionSpacingClasses[layout.sectionSpacing] || sectionSpacingClasses.Comfortable;
    const showHero = enabledSections.length === 0 || enabledSections.some(section => section.type === 'Hero');
    const showProducts = enabledSections.length === 0 || enabledSections.some(section => ['FeaturedProducts', 'Collection'].includes(section.type));
    const productSection = enabledSections.find(section => ['FeaturedProducts', 'Collection'].includes(section.type));
    const customSections = enabledSections.filter(section => !['Hero', 'FeaturedProducts', 'Collection'].includes(section.type));

    // ── Derived state ──────────────────────────────────────────────────────────
    const activeBanners = useMemo(
        () => banners || shop?.banners || [],
        [banners, shop?.banners]
    );

    const allSlides = [
        ...(heroImageUrl ? [{
            _id: 'theme-hero',
            image: heroImageUrl,
            title: heroTitle,
            link: heroCtaUrl
        }] : []),
        ...activeBanners
    ].flatMap((banner) => {
        const images = banner.desktopImages?.length
            ? banner.desktopImages
            : banner.images?.length
                ? banner.images
                : (banner.image ? [banner.image] : []);
        const mobileImages = banner.mobileImages || [];
        return images.map((imgUrl, i) => ({
            id: `${banner._id || 'banner'}-${i}`,
            imgUrl,
            mobileImgUrl: mobileImages[i] || mobileImages[0] || imgUrl,
            title: banner.title,
            link: banner.link,
        }));
    });

    // ── Auto-slider ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (allSlides.length <= 1) return;
        const timer = setInterval(
            () => setCurrentSlide((prev) => (prev + 1) % allSlides.length),
            4000
        );
        return () => clearInterval(timer);
    }, [allSlides.length]);

    // ── Stable callbacks ───────────────────────────────────────────────────────
    const handlePriceApply = useCallback(() => {
        setFilters((prev) => ({ ...prev, minPrice: priceInput.min, maxPrice: priceInput.max, page: 1 }));
        setShowMobileFilters(false);
    }, [priceInput]);

    const handlePageChange = useCallback((newPage) => {
        setFilters((prev) => ({ ...prev, page: newPage }));
        window.scrollTo({ top: 300, behavior: 'smooth' });
    }, []);

    const handleCategoryChange = useCallback((cat) => {
        setFilters((prev) => ({ ...prev, category: cat, page: 1 }));
    }, []);

    const handleSortChange = useCallback((e) => {
        setFilters((prev) => ({ ...prev, sort: e.target.value, page: 1 }));
    }, []);

    const handleClearFilters = useCallback(() => {
        setFilters({ category: 'All', minPrice: '', maxPrice: '', sort: 'newest', page: 1 });
    }, []);

    const handleMinPriceChange = useCallback((e) => {
        setPriceInput((prev) => ({ ...prev, min: e.target.value }));
    }, []);

    const handleMaxPriceChange = useCallback((e) => {
        setPriceInput((prev) => ({ ...prev, max: e.target.value }));
    }, []);

    const toggleMobileFilters = useCallback(() => {
        setShowMobileFilters((prev) => !prev);
    }, []);

    const storewideDiscount = shop?.storewideDiscount || 0;
    const trustItems = [
        { icon: ShieldCheck, label: 'Secure checkout', text: 'Protected customer details' },
        { icon: Truck, label: 'Order tracking', text: 'Track delivery after purchase' },
        { icon: ShoppingBag, label: 'Quick buy', text: 'Fast cart and checkout flow' },
        { icon: Star, label: 'Reviewed products', text: 'Ratings and customer feedback' },
    ];

    // ── Error state ────────────────────────────────────────────────────────────
    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <PackageX size={48} className="text-gray-300 mb-4 animate-bounce" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">Store Unavailable</h2>
            <p className="text-gray-500 text-sm">This storefront is currently inactive or does not exist.</p>
        </div>
    );

    return (
        <div className={containerClass}>

            {/* ✨ HERO / BANNER SLIDER ✨ */}
            {showHero && allSlides.length > 0 ? (
                <section className={`relative w-full ${heroHeightClass} overflow-hidden rounded-[1.75rem] bg-slate-950 shadow-2xl shadow-slate-200/70 ${sectionSpacingClass} group`}>
                    {allSlides.map((slide, index) => (
                        <div
                            key={slide.id}
                            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                                index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                            }`}
                        >
                            {slide.mobileImgUrl && slide.mobileImgUrl !== slide.imgUrl && (
                                <Image
                                    src={slide.mobileImgUrl}
                                    alt={slide.title || 'Promotional Banner'}
                                    fill
                                    sizes="100vw"
                                    className="object-cover transition-transform duration-[10s] ease-linear hover:scale-105 md:hidden"
                                    priority={index === 0}
                                    loading={index === 0 ? 'eager' : 'lazy'}
                                />
                            )}
                            <Image
                                src={slide.imgUrl}
                                alt={slide.title || 'Promotional Banner'}
                                fill
                                sizes="100vw"
                                className={`${slide.mobileImgUrl && slide.mobileImgUrl !== slide.imgUrl ? 'hidden md:block' : ''} object-cover transition-transform duration-[10s] ease-linear hover:scale-105`}
                                priority={index === 0}
                                loading={index === 0 ? 'eager' : 'lazy'}
                            />
                            <div className="absolute inset-0 flex items-end p-6 sm:p-10" style={{ background: `linear-gradient(90deg, rgba(15,23,42,${Math.max((heroOverlayOpacity ?? 25) / 100, 0.38)}) 0%, rgba(15,23,42,0.22) 52%, rgba(15,23,42,0.08) 100%)` }}>
                                {(slide.title || heroSubtitle) && (
                                    <div className="max-w-2xl pb-14 text-left text-white sm:pb-10">
                                        <p className="mb-3 inline-flex rounded-full bg-white/14 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white/82 backdrop-blur">
                                            Featured collection
                                        </p>
                                        {slide.title && <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-5xl" style={{ fontFamily: 'var(--sf-heading-font)', fontWeight: 'var(--sf-heading-weight)' }}>{slide.title}</h1>}
                                        {heroSubtitle && <p className="mt-3 max-w-xl text-sm leading-6 text-white/82 sm:text-lg">{heroSubtitle}</p>}
                                        {storewideDiscount > 0 && (
                                            <span className="mt-5 inline-flex rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-950 shadow-lg shadow-emerald-900/20">
                                                {storewideDiscount}% storewide offer
                                            </span>
                                        )}
                                    </div>
                                )}
                                {slide.link && (
                                    <Link
                                        href={slide.link}
                                        className="absolute bottom-6 right-5 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-xl transition hover:bg-slate-100 sm:bottom-8 sm:right-8"
                                    >
                                        {heroCtaLabel || 'Shop Now'}
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}

                    {allSlides.length > 1 && (
                        <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 z-20 flex justify-center gap-2">
                            {allSlides.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentSlide(index)}
                                    className={`h-2 rounded-full transition-all duration-500 ${
                                        index === currentSlide ? 'bg-white w-6 sm:w-8' : 'bg-white/50 w-2 hover:bg-white/80'
                                    }`}
                                    aria-label={`Go to slide ${index + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </section>
            ) : showHero ? (
                <section className={`relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-14 text-white shadow-2xl shadow-slate-200/70 sm:px-10 sm:py-18 md:py-20 ${sectionSpacingClass}`}>
                    <div className="absolute inset-0 opacity-20 landing-grid" />
                    <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_0.7fr] lg:items-end">
                        <div className="max-w-3xl">
                            <p className="sf-badge bg-white/10 text-white/78">New storefront</p>
                        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl capitalize" style={{ fontFamily: 'var(--sf-heading-font)', fontWeight: 'var(--sf-heading-weight)' }}>
                            {heroTitle || shop?.shopName || subdomain}
                        </h1>
                        {storewideDiscount > 0 && (
                            <div className="mt-5 inline-block rounded-full bg-emerald-400 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-950">
                                {storewideDiscount}% storewide sale active
                            </div>
                        )}
                        <p className="mt-5 max-w-2xl text-base leading-7 text-white/66 sm:text-lg">
                            {heroSubtitle || shop?.description || "Curated essentials for the modern lifestyle. Discover the latest collection."}
                        </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {trustItems.slice(0, 4).map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.label} className="rounded-3xl border border-white/10 bg-white/[0.07] p-5">
                                        <Icon size={20} className="text-emerald-300" />
                                        <p className="mt-3 text-sm font-black">{item.label}</p>
                                        <p className="mt-1 text-xs leading-5 text-white/48">{item.text}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            ) : null}

            <section className={`${sectionSpacingClass} grid gap-4 sm:grid-cols-2 lg:grid-cols-4`}>
                {trustItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.label} className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-cyan-50 text-[var(--sf-accent)]">
                                <Icon size={18} />
                            </span>
                            <div>
                                <p className="text-sm font-black text-slate-950">{item.label}</p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">{item.text}</p>
                            </div>
                        </div>
                    );
                })}
            </section>

            {customSections.length > 0 && (
                <div className={sectionSpacingClass}>
                    <div className="space-y-5 sm:space-y-7">
                        {customSections.map((section, index) => (
                            <HomepageCustomSection
                                key={section._id || `${section.type}-${index}`}
                                section={section}
                                categories={categories}
                                banners={activeBanners}
                            />
                        ))}
                    </div>
                </div>
            )}

            {showProducts && (
            <div id="products" className="grid gap-5 lg:grid-cols-[270px_minmax(0,1fr)] lg:gap-8">

                {/* ⬅️ SIDEBAR FILTERS */}
                <aside className="min-w-0">
                    <div className="sticky top-24 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm lg:p-6">

                        {/* Mobile: horizontal category strip + price toggle */}
                        <div className="lg:hidden mb-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Categories</h3>
                                <button
                                    onClick={toggleMobileFilters}
                                    className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
                                >
                                    <SlidersHorizontal size={14} />
                                    Price Filter
                                </button>
                            </div>

                            <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 scrollbar-hide snap-x">
                                <CategoryButton label="All Products" active={filters.category === 'All'} onClick={() => handleCategoryChange('All')} />
                                {categories?.map((cat) => (
                                    <CategoryButton key={cat} label={cat} active={filters.category === cat} onClick={() => handleCategoryChange(cat)} />
                                ))}
                            </div>
                        </div>

                        {/* Desktop sidebar + collapsible mobile price */}
                        <div className={`${showMobileFilters ? 'block' : 'hidden'} lg:block transition-all duration-300`}>
                            <div className="hidden lg:flex items-center gap-2 mb-5 text-slate-950 font-black text-lg">
                                <Filter size={20} />
                                <h2>Filters</h2>
                            </div>

                            <div className="hidden lg:block mb-6">
                                <h3 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Categories</h3>
                                <div className="flex flex-col gap-1.5">
                                    <DesktopCategoryButton label="All Products" active={filters.category === 'All'} onClick={() => handleCategoryChange('All')} />
                                    {categories?.map((cat) => (
                                        <DesktopCategoryButton key={cat} label={cat} active={filters.category === cat} onClick={() => handleCategoryChange(cat)} />
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-3xl bg-gradient-to-br from-slate-50 to-indigo-50/60 p-5">
                                <h3 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Price Range</h3>
                                <div className="mb-3 flex items-center gap-2">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={priceInput.min}
                                        onChange={handleMinPriceChange}
                                        className="sf-field px-3 py-2.5 text-sm"
                                    />
                                    <span className="text-slate-400">-</span>
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={priceInput.max}
                                        onChange={handleMaxPriceChange}
                                        className="sf-field px-3 py-2.5 text-sm"
                                    />
                                </div>
                                <button
                                    onClick={handlePriceApply}
                                    className="sf-btn sf-btn-primary min-h-0 w-full py-2.5 text-sm"
                                >
                                    Apply Price
                                </button>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ➡️ PRODUCT GRID */}
                <main className="flex-1">
                    <div className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
                        <div>
                            <p className="sf-kicker">Catalog</p>
                            <h2 className="sf-heading mt-1 text-2xl sm:text-3xl" style={{ fontFamily: 'var(--sf-heading-font)', fontWeight: 'var(--sf-heading-weight)' }}>
                                {productSection?.title || 'Shop products'}
                            </h2>
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                {loading ? 'Loading products...' : `${products?.length || 0} products shown`}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {storewideDiscount > 0 && (
                                <span className="sf-badge sf-badge-success">{storewideDiscount}% sale active</span>
                            )}
                            {productCard.showQuickBuy !== false && (
                                <span className="sf-badge sf-badge-color">Quick buy</span>
                            )}
                        </div>
                    </div>

                    {/* Sort controls */}
                    <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 to-cyan-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-slate-600">
                            Filter by category or price, then sort products by what matters.
                        </p>
                        <div className="flex min-w-[200px] items-center">
                            <select
                                value={filters.sort}
                                onChange={handleSortChange}
                                className="sf-field py-2.5 text-sm font-bold"
                            >
                                <option value="newest">Newest first</option>
                                <option value="priceAsc">Price: Low to High</option>
                                <option value="priceDesc">Price: High to Low</option>
                                <option value="nameAsc">Name: A to Z</option>
                                <option value="nameDesc">Name: Z to A</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <SkeletonGrid />
                    ) : (
                        <>
                            {products?.length === 0 ? (
                                <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-4 py-16 text-center">
                                    <PackageX size={44} className="mx-auto mb-4 text-slate-300" />
                                    <h3 className="mb-2 text-xl font-black text-slate-950">No products found</h3>
                                    <p className="text-sm text-slate-500">Try adjusting your filters or searching for something else.</p>
                                    <button
                                        onClick={handleClearFilters}
                                        className="sf-btn sf-btn-secondary mt-6"
                                    >
                                        Clear all filters
                                    </button>
                                </div>
                            ) : (
                                <div className={`grid ${gridClass} ${gridGapClass}`}>
                                    {products.map((product, index) => (
                                        <ProductCard
                                            key={product._id}
                                            product={product}
                                            index={index}
                                            storewideDiscount={storewideDiscount}
                                            addToCart={addToCart}
                                            cardTheme={productCard}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* PAGINATION */}
                            {pagination?.pages > 1 && (
                                <div className="mb-8 mt-10 w-full overflow-x-auto px-2 pb-4 scrollbar-hide sm:mt-12">
                                    <div className="flex items-center justify-start sm:justify-center gap-2 min-w-max mx-auto w-fit">
                                        <button
                                            onClick={() => handlePageChange(filters.page - 1)}
                                            disabled={filters.page === 1}
                                            className="flex-shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2.5"
                                        >
                                            <ChevronLeft size={18} />
                                        </button>

                                        <div className="flex items-center gap-1.5 flex-nowrap">
                                            {Array.from({ length: pagination.pages }, (_, i) => {
                                                const pageNumber = i + 1;
                                                return (
                                                    <button
                                                        key={pageNumber}
                                                        onClick={() => handlePageChange(pageNumber)}
                                                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-black shadow-sm transition-all sm:h-10 sm:w-10 ${
                                                            filters.page === pageNumber
                                                                ? 'bg-slate-950 text-white'
                                                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        {pageNumber}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <button
                                            onClick={() => handlePageChange(filters.page + 1)}
                                            disabled={filters.page === pagination.pages}
                                            className="flex-shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2.5"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
            )}
        </div>
    );
}

// ─── Tiny helper components (stable, no re-render cost) ───────────────────────
const CategoryButton = memo(function CategoryButton({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`flex-shrink-0 snap-start rounded-full border px-4 py-2 text-sm font-bold transition-colors whitespace-nowrap ${
                active
                    ? 'border-slate-950 bg-slate-950 text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-600 active:bg-slate-50'
            }`}
        >
            {label}
        </button>
    );
});

const DesktopCategoryButton = memo(function DesktopCategoryButton({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors ${
                active ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
        >
            {label}
        </button>
    );
});
