"use client";
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useShopData } from '@/hooks/useShopData';
import { useCart } from '@/context/CartContext';
import { getEnabledHomepageSections, normalizeTheme } from '@/lib/theme';
import {
    ShoppingCart, PackageX, ShoppingBag, ArrowRight,
    Filter, ChevronLeft, ChevronRight, SlidersHorizontal, Star
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
    Compact: 'mb-6 sm:mb-8',
    Comfortable: 'mb-8 sm:mb-12',
    Spacious: 'mb-12 sm:mb-16'
};

const productGridGapClasses = {
    Compact: 'gap-2 sm:gap-4 lg:gap-5',
    Comfortable: 'gap-3 sm:gap-6 lg:gap-8',
    Editorial: 'gap-5 sm:gap-8 lg:gap-10'
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
        <div
            className={`group flex flex-col bg-white ${radiusClass} ${shadowClass} transition-shadow duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-both`}
            style={{ animationDelay: `${(index % 12) * 40}ms` }}
        >
            <div className={`aspect-square relative overflow-hidden bg-gray-50 sm:bg-gray-50/50 ${radiusClass} mb-3 sm:mb-5`}>
                <Link href={`/products/${product._id}`} className="absolute inset-0 z-10" />

                <Image
                    src={product.imageUrl || 'https://via.placeholder.com/400'}
                    alt={product.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className={`${imageFitClass} transition-transform duration-500 group-hover:scale-105`}
                    loading={index < 6 ? 'eager' : 'lazy'}
                />

                {hasDiscount && product.stock > 0 && (
                    <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-red-600 text-white text-[9px] sm:text-[10px] font-black px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg uppercase tracking-widest z-20 shadow-lg shadow-red-200">
                        {activeDiscount}% OFF
                    </div>
                )}

                {product.stock <= 0 && (
                    <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-white/90 backdrop-blur text-gray-900 text-[9px] sm:text-[10px] font-bold px-2 py-1 sm:px-3 sm:py-1 rounded-full uppercase tracking-widest z-20 shadow-sm">
                        Sold Out
                    </div>
                )}
            </div>

            <div className="flex flex-col flex-grow px-1 sm:px-2 pb-2 sm:pb-4">
                {cardTheme?.showCategory !== false && (
                    <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider mb-1 line-clamp-1">
                        {product.category}
                    </p>
                )}
                <h3 className="text-sm sm:text-base font-semibold text-[var(--sf-foreground)] mb-2 leading-snug line-clamp-2 min-h-[40px] sm:min-h-[44px]">
                    <Link href={`/products/${product._id}`} className="hover:text-[var(--sf-accent)] transition-colors relative z-10">
                        {product.title}
                    </Link>
                </h3>

                {cardTheme?.showRating !== false && product.averageRating > 0 && (
                    <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-amber-500">
                        <Star size={13} fill="currentColor" />
                        <span>{Number(product.averageRating).toFixed(1)}</span>
                    </div>
                )}

                <div className="flex items-baseline flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6 mt-auto">
                    <span className="text-base sm:text-xl font-black text-[var(--sf-foreground)]">৳ {product.finalPrice}</span>
                    {hasDiscount && (
                        <span className="text-xs sm:text-sm text-gray-400 line-through font-medium">৳ {product.sellingPrice}</span>
                    )}
                </div>

                {showQuickBuy && (
                <div className="flex items-center gap-2 relative z-20">
                    <button
                        onClick={handleAddToCart}
                        disabled={product.stock <= 0}
                        className="p-2.5 sm:p-3 border border-gray-200 rounded-lg sm:rounded-xl text-gray-600 active:scale-95 hover:border-[var(--sf-accent)] hover:text-[var(--sf-accent)] hover:bg-[var(--sf-accent-bg)] transition-all disabled:opacity-50"
                    >
                        <ShoppingBag size={18} className="sm:w-5 sm:h-5" />
                    </button>
                    <button
                        onClick={handleBuyNow}
                        disabled={product.stock <= 0}
                        className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 bg-gray-900 text-white py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold active:scale-95 hover:bg-[var(--sf-accent)] transition-colors shadow-md shadow-gray-900/20 disabled:bg-gray-300 disabled:shadow-none"
                    >
                        <span>Buy Now</span>
                        <ArrowRight size={14} className="sm:w-4 sm:h-4" />
                    </button>
                </div>
                )}
            </div>
        </div>
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
            <section className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-7">
                <h2 className="mb-4 text-xl sm:text-2xl font-black text-[var(--sf-foreground)]" style={{ fontFamily: 'var(--sf-heading-font)', fontWeight: 'var(--sf-heading-weight)' }}>
                    {section.title || 'Shop by category'}
                </h2>
                <div className="flex flex-wrap gap-2">
                    {(categories || []).slice(0, 10).map((category) => (
                        <Link
                            key={category}
                            href={`/?category=${encodeURIComponent(category)}`}
                            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-[var(--sf-accent)] hover:text-[var(--sf-accent)]"
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
            <section className="grid gap-4 sm:grid-cols-2">
                {visibleBanners.map((banner) => {
                    const imageUrl = banner.desktopImages?.[0] || banner.images?.[0] || banner.image;
                    const mobileImageUrl = banner.mobileImages?.[0] || imageUrl;
                    if (!imageUrl) return null;
                    return (
                        <Link
                            key={banner._id}
                            href={banner.link || '/'}
                            className="group relative aspect-[16/9] overflow-hidden rounded-3xl bg-gray-100"
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
            <section className="rounded-3xl border border-gray-100 bg-[var(--sf-accent-bg)] p-6 text-center sm:p-10">
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
        ? 'w-full px-4 sm:px-6'
        : layout.maxWidth === 'Contained'
            ? 'container mx-auto px-4 py-6 sm:py-8 sm:px-6 mb-24 max-w-5xl'
            : 'container mx-auto px-4 py-6 sm:py-8 sm:px-6 mb-24 max-w-7xl';
    const heroHeightClass = hero.height === 'Compact'
        ? 'h-[220px] sm:h-[280px] md:h-[360px]'
        : hero.height === 'Tall'
            ? 'h-[320px] sm:h-[480px] md:h-[640px]'
            : 'h-[250px] sm:h-[350px] md:h-[500px]';
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
                <section className={`relative w-full ${heroHeightClass} rounded-3xl sm:rounded-[2rem] overflow-hidden ${sectionSpacingClass} shadow-xl group`}>
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
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 sm:p-6" style={{ backgroundColor: `rgba(0,0,0,${(heroOverlayOpacity ?? 25) / 100})` }}>
                                {(slide.title || heroSubtitle) && (
                                    <div className="mt-auto mb-6 text-white">
                                        {slide.title && <h1 className="text-3xl sm:text-5xl font-black" style={{ fontFamily: 'var(--sf-heading-font)', fontWeight: 'var(--sf-heading-weight)' }}>{slide.title}</h1>}
                                        {heroSubtitle && <p className="mt-3 text-sm sm:text-lg text-white/90">{heroSubtitle}</p>}
                                    </div>
                                )}
                                {slide.link && (
                                    <Link
                                        href={slide.link}
                                        className="bg-white text-gray-900 px-6 py-2.5 sm:px-8 sm:py-3 rounded-full text-sm sm:text-base font-bold hover:bg-gray-100 active:scale-95 transition-all shadow-lg mt-auto mb-8 sm:mb-12"
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
                <section className={`relative bg-gray-900 text-white rounded-3xl sm:rounded-[2rem] py-12 px-4 sm:py-16 sm:px-6 md:py-24 ${sectionSpacingClass} overflow-hidden flex flex-col items-center text-center shadow-xl shadow-gray-900/10`}>
                    <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
                    <div className="relative z-10 max-w-3xl">
                        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-4 sm:mb-6 capitalize" style={{ fontFamily: 'var(--sf-heading-font)', fontWeight: 'var(--sf-heading-weight)' }}>
                            {heroTitle || shop?.shopName || subdomain}
                        </h1>
                        {storewideDiscount > 0 && (
                            <div className="mb-4 sm:mb-6 inline-block bg-[var(--sf-accent)] text-white text-[10px] sm:text-xs font-bold px-3 py-1.5 sm:px-4 sm:py-2 rounded-full uppercase tracking-widest animate-pulse">
                                🔥 {storewideDiscount}% Storewide Sale Active!
                            </div>
                        )}
                        <p className="text-gray-400 text-base sm:text-lg md:text-xl font-light px-2">
                            {heroSubtitle || shop?.description || "Curated essentials for the modern lifestyle. Discover the latest collection."}
                        </p>
                    </div>
                </section>
            ) : null}

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
            <div id="products" className="flex flex-col lg:flex-row gap-6 lg:gap-10">

                {/* ⬅️ SIDEBAR FILTERS */}
                <aside className="w-full lg:w-64 flex-shrink-0">
                    <div className="sticky top-20 bg-white lg:border lg:border-gray-100 lg:rounded-2xl lg:p-6 lg:shadow-sm">

                        {/* Mobile: horizontal category strip + price toggle */}
                        <div className="lg:hidden mb-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Categories</h3>
                                <button
                                    onClick={toggleMobileFilters}
                                    className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
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
                            <div className="hidden lg:flex items-center gap-2 mb-6 text-gray-900 font-bold text-lg">
                                <Filter size={20} />
                                <h2>Filters</h2>
                            </div>

                            <div className="hidden lg:block mb-8">
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Categories</h3>
                                <div className="flex flex-col gap-1.5">
                                    <DesktopCategoryButton label="All Products" active={filters.category === 'All'} onClick={() => handleCategoryChange('All')} />
                                    {categories?.map((cat) => (
                                        <DesktopCategoryButton key={cat} label={cat} active={filters.category === cat} onClick={() => handleCategoryChange(cat)} />
                                    ))}
                                </div>
                            </div>

                            <div className="bg-gray-50 lg:bg-transparent p-4 lg:p-0 rounded-xl mb-6 lg:mb-0">
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Price Range</h3>
                                <div className="flex items-center gap-2 mb-3">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={priceInput.min}
                                        onChange={handleMinPriceChange}
                                        className="w-full px-3 py-2.5 bg-white lg:bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--sf-accent-ring)] outline-none transition-shadow"
                                    />
                                    <span className="text-gray-400">-</span>
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={priceInput.max}
                                        onChange={handleMaxPriceChange}
                                        className="w-full px-3 py-2.5 bg-white lg:bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--sf-accent-ring)] outline-none transition-shadow"
                                    />
                                </div>
                                <button
                                    onClick={handlePriceApply}
                                    className="w-full py-2.5 bg-gray-900 lg:bg-gray-100 hover:bg-gray-800 lg:hover:bg-gray-200 text-white lg:text-gray-900 text-sm font-semibold rounded-lg transition-colors active:scale-95 shadow-sm lg:shadow-none"
                                >
                                    Apply Price
                                </button>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ➡️ PRODUCT GRID */}
                <main className="flex-1">
                    {productSection?.title && (
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <h2 className="text-2xl sm:text-3xl font-black text-[var(--sf-foreground)]" style={{ fontFamily: 'var(--sf-heading-font)', fontWeight: 'var(--sf-heading-weight)' }}>
                                {productSection.title}
                            </h2>
                            {productCard.showQuickBuy !== false && (
                                <span className="hidden sm:inline text-sm font-bold text-[var(--sf-accent)]">
                                    Quick buy enabled
                                </span>
                            )}
                        </div>
                    )}

                    {/* Sort controls */}
                    <div className="flex flex-row flex-wrap justify-between items-center gap-3 mb-6 bg-gray-50/50 border border-gray-100 p-2 sm:p-3 rounded-2xl">
                        <div className="flex items-center flex-1 min-w-[140px]">
                            <select
                                value={['priceAsc', 'priceDesc'].includes(filters.sort) ? filters.sort : 'default'}
                                onChange={handleSortChange}
                                className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-xl px-3 py-2 outline-none appearance-none cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
                            >
                                <option value="default" disabled>Sort by Price</option>
                                <option value="priceAsc">Price: Low to High</option>
                                <option value="priceDesc">Price: High to Low</option>
                            </select>
                        </div>
                        <div className="flex items-center flex-1 min-w-[140px]">
                            <select
                                value={['nameAsc', 'nameDesc'].includes(filters.sort) ? filters.sort : 'default'}
                                onChange={handleSortChange}
                                className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-xl px-3 py-2 outline-none appearance-none cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
                            >
                                <option value="default" disabled>Sort by Name</option>
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
                                <div className="text-center py-20 px-4 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">No products found</h3>
                                    <p className="text-gray-500 text-sm">Try adjusting your filters or searching for something else.</p>
                                    <button
                                        onClick={handleClearFilters}
                                        className="mt-6 px-6 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
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
                                <div className="w-full mt-12 sm:mt-16 mb-8 overflow-x-auto pb-4 scrollbar-hide px-2">
                                    <div className="flex items-center justify-start sm:justify-center gap-2 min-w-max mx-auto w-fit">
                                        <button
                                            onClick={() => handlePageChange(filters.page - 1)}
                                            disabled={filters.page === 1}
                                            className="flex-shrink-0 p-2 sm:p-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm bg-white"
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
                                                        className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all active:scale-95 shadow-sm ${
                                                            filters.page === pageNumber
                                                                ? 'bg-gray-900 text-white'
                                                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
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
                                            className="flex-shrink-0 p-2 sm:p-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm bg-white"
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
            className={`flex-shrink-0 snap-start px-4 py-2 rounded-full text-sm transition-colors whitespace-nowrap border ${
                active
                    ? 'bg-gray-900 border-gray-900 text-white font-medium shadow-md'
                    : 'bg-white border-gray-200 text-gray-600 active:bg-gray-50'
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
            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                active ? 'bg-gray-900 text-white font-medium' : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
            {label}
        </button>
    );
});
