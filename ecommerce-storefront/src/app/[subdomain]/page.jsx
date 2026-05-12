"use client";
import React, { useState, useEffect } from 'react';
import { useShopData } from '@/hooks/useShopData';
import { useCart } from '@/context/CartContext';
import { ShoppingCart, PackageX, ShoppingBag, ArrowRight, Filter, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function VendorHomePage({ params }) {
    const { subdomain } = React.use(params);
    const { addToCart } = useCart();
    const router = useRouter();

    // Filters and pagination state
    const [filters, setFilters] = useState({ category: 'All', minPrice: '', maxPrice: '', sort: 'newest', page: 1 });
    const [priceInput, setPriceInput] = useState({ min: '', max: '' });
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    // Slider state
    const [currentSlide, setCurrentSlide] = useState(0);

    const { shop, products, categories, banners, loading, error, pagination } = useShopData(subdomain, filters);

    // Safe access to active banners
    const activeBanners = banners || shop?.banners || [];

    // Flatten all images from all banners into a single array of slides
    const allSlides = activeBanners.flatMap((banner) => {
        const imagesToUse = banner.images && banner.images.length > 0
            ? banner.images
            : (banner.image ? [banner.image] : []);

        return imagesToUse.map((imgUrl, index) => ({
            id: `${banner._id || 'banner'}-${index}`,
            imgUrl,
            title: banner.title,
            link: banner.link
        }));
    });

    // Auto-slider effect
    useEffect(() => {
        if (allSlides.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentSlide((prevSlide) => (prevSlide + 1) % allSlides.length);
        }, 4000);

        return () => clearInterval(timer);
    }, [allSlides.length]);

    const handlePriceApply = () => {
        setFilters({ ...filters, minPrice: priceInput.min, maxPrice: priceInput.max, page: 1 });
        setShowMobileFilters(false);
    };

    const handlePageChange = (newPage) => {
        setFilters({ ...filters, page: newPage });
        window.scrollTo({ top: 300, behavior: 'smooth' });
    };

    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <PackageX size={48} className="text-gray-300 mb-4 animate-bounce" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">Store Unavailable</h2>
            <p className="text-gray-500 text-sm">This storefront is currently inactive or does not exist.</p>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-6 sm:py-8 sm:px-6 mb-24 max-w-7xl">

            {/* ✨ HERO SECTION ✨ */}
            {allSlides.length > 0 ? (
                <section className="relative w-full h-[250px] sm:h-[350px] md:h-[500px] rounded-3xl sm:rounded-[2rem] overflow-hidden mb-8 sm:mb-12 shadow-xl group">
                    {allSlides.map((slide, index) => (
                        <div
                            key={slide.id}
                            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                                index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                            }`}
                        >
                            <img
                                src={slide.imgUrl}
                                alt={slide.title || 'Promotional Banner'}
                                className="w-full h-full object-cover transition-transform duration-[10s] ease-linear hover:scale-105"
                            />

                            {/* Banner Content overlay */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 sm:p-6 bg-black/20">
                                {slide.link && (
                                    <Link
                                        href={slide.link}
                                        className="bg-white text-gray-900 px-6 py-2.5 sm:px-8 sm:py-3 rounded-full text-sm sm:text-base font-bold hover:bg-gray-100 active:scale-95 transition-all shadow-lg mt-auto mb-8 sm:mb-12"
                                    >
                                        Shop Now
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Navigation Dots */}
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
            ) : (
                // Fallback Original Hero Section
                <section className="relative bg-gray-900 text-white rounded-3xl sm:rounded-[2rem] py-12 px-4 sm:py-16 sm:px-6 md:py-24 mb-8 sm:mb-12 overflow-hidden flex flex-col items-center text-center shadow-xl shadow-gray-900/10">
                    <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                    <div className="relative z-10 max-w-3xl">
                        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-4 sm:mb-6 capitalize">
                            {shop?.shopName || subdomain}
                        </h1>
                        {shop?.storewideDiscount > 0 && (
                            <div className="mb-4 sm:mb-6 inline-block bg-[var(--sf-accent)] text-white text-[10px] sm:text-xs font-bold px-3 py-1.5 sm:px-4 sm:py-2 rounded-full uppercase tracking-widest animate-pulse">
                                🔥 {shop.storewideDiscount}% Storewide Sale Active!
                            </div>
                        )}
                        <p className="text-gray-400 text-base sm:text-lg md:text-xl font-light px-2">
                            {shop?.description || "Curated essentials for the modern lifestyle. Discover the latest collection."}
                        </p>
                    </div>
                </section>
            )}

            <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
                {/* ⬅️ SIDEBAR / MOBILE FILTERS */}
                <aside className="w-full lg:w-64 flex-shrink-0">
                    <div className="sticky top-20 bg-white lg:border lg:border-gray-100 lg:rounded-2xl lg:p-6 lg:shadow-sm">

                        {/* Mobile Filter Toggle & Swipeable Categories */}
                        <div className="lg:hidden mb-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Categories</h3>
                                <button
                                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                                    className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                                >
                                    <SlidersHorizontal size={14} />
                                    Price Filter
                                </button>
                            </div>

                            {/* Horizontal Scrollable Categories for Mobile */}
                            <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 scrollbar-hide snap-x">
                                <button
                                    onClick={() => setFilters({ ...filters, category: 'All', page: 1 })}
                                    className={`flex-shrink-0 snap-start px-4 py-2 rounded-full text-sm transition-colors whitespace-nowrap border ${filters.category === 'All' ? 'bg-gray-900 border-gray-900 text-white font-medium shadow-md' : 'bg-white border-gray-200 text-gray-600 active:bg-gray-50'}`}
                                >
                                    All Products
                                </button>
                                {categories?.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setFilters({ ...filters, category: cat, page: 1 })}
                                        className={`flex-shrink-0 snap-start px-4 py-2 rounded-full text-sm transition-colors whitespace-nowrap border ${filters.category === cat ? 'bg-gray-900 border-gray-900 text-white font-medium shadow-md' : 'bg-white border-gray-200 text-gray-600 active:bg-gray-50'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Desktop Categories & Collapsible Mobile Filters */}
                        <div className={`${showMobileFilters ? 'block' : 'hidden'} lg:block transition-all duration-300`}>
                            <div className="hidden lg:flex items-center gap-2 mb-6 text-gray-900 font-bold text-lg">
                                <Filter size={20} />
                                <h2>Filters</h2>
                            </div>

                            <div className="hidden lg:block mb-8">
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Categories</h3>
                                <div className="flex flex-col gap-1.5">
                                    <button onClick={() => setFilters({ ...filters, category: 'All', page: 1 })} className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${filters.category === 'All' ? 'bg-gray-900 text-white font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>All Products</button>
                                    {categories?.map(cat => (
                                        <button key={cat} onClick={() => setFilters({ ...filters, category: cat, page: 1 })} className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${filters.category === cat ? 'bg-gray-900 text-white font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>{cat}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-gray-50 lg:bg-transparent p-4 lg:p-0 rounded-xl mb-6 lg:mb-0">
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Price Range</h3>
                                <div className="flex items-center gap-2 mb-3">
                                    <input type="number" placeholder="Min" value={priceInput.min} onChange={(e) => setPriceInput({...priceInput, min: e.target.value})} className="w-full px-3 py-2.5 bg-white lg:bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--sf-accent-ring)] outline-none transition-shadow" />
                                    <span className="text-gray-400">-</span>
                                    <input type="number" placeholder="Max" value={priceInput.max} onChange={(e) => setPriceInput({...priceInput, max: e.target.value})} className="w-full px-3 py-2.5 bg-white lg:bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--sf-accent-ring)] outline-none transition-shadow" />
                                </div>
                                <button onClick={handlePriceApply} className="w-full py-2.5 bg-gray-900 lg:bg-gray-100 hover:bg-gray-800 lg:hover:bg-gray-200 text-white lg:text-gray-900 text-sm font-semibold rounded-lg transition-colors active:scale-95 shadow-sm lg:shadow-none">Apply Price</button>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ➡️ PRODUCT GRID */}
                <main className="flex-1">
                    {/* Sort Controls */}
                    <div className="flex flex-row flex-wrap justify-between items-center gap-3 mb-6 bg-gray-50/50 border border-gray-100 p-2 sm:p-3 rounded-2xl">
                        <div className="flex items-center flex-1 min-w-[140px]">
                            <select value={['priceAsc', 'priceDesc'].includes(filters.sort) ? filters.sort : 'default'} onChange={(e) => setFilters({ ...filters, sort: e.target.value, page: 1 })} className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-xl px-3 py-2 outline-none appearance-none cursor-pointer hover:border-gray-300 transition-colors shadow-sm">
                                <option value="default" disabled>Sort by Price</option>
                                <option value="priceAsc">Price: Low to High</option>
                                <option value="priceDesc">Price: High to Low</option>
                            </select>
                        </div>
                        <div className="flex items-center flex-1 min-w-[140px]">
                            <select value={['nameAsc', 'nameDesc'].includes(filters.sort) ? filters.sort : 'default'} onChange={(e) => setFilters({ ...filters, sort: e.target.value, page: 1 })} className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-xl px-3 py-2 outline-none appearance-none cursor-pointer hover:border-gray-300 transition-colors shadow-sm">
                                <option value="default" disabled>Sort by Name</option>
                                <option value="nameAsc">Name: A to Z</option>
                                <option value="nameDesc">Name: Z to A</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="flex flex-col space-y-3 sm:space-y-4 animate-pulse">
                                    <div className="aspect-square bg-gray-100 rounded-2xl"></div>
                                    <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                                    <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {products?.length === 0 ? (
                                <div className="text-center py-20 px-4 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">No products found</h3>
                                    <p className="text-gray-500 text-sm">Try adjusting your filters or searching for something else.</p>
                                    <button
                                        onClick={() => setFilters({ category: 'All', minPrice: '', maxPrice: '', sort: 'newest', page: 1 })}
                                        className="mt-6 px-6 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                                    >
                                        Clear all filters
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
                                    {products?.map((product, index) => {
                                        const activeDiscount = product.discount > 0 ? product.discount : (shop?.storewideDiscount || 0);
                                        const hasDiscount = activeDiscount > 0;

                                        return (
                                            <div
                                                key={product._id}
                                                className="group flex flex-col bg-white rounded-2xl sm:rounded-3xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
                                                style={{ animationDelay: `${(index % 12) * 40}ms` }}
                                            >
                                                <div className="aspect-square relative overflow-hidden bg-gray-50 sm:bg-gray-50/50 rounded-2xl sm:rounded-3xl mb-3 sm:mb-5">
                                                    <Link href={`/products/${product._id}`} className="absolute inset-0 z-10" />
                                                    <img
                                                        src={product.imageUrl || 'https://via.placeholder.com/400'}
                                                        alt={product.title}
                                                        className="h-full w-full object-contain p-3 sm:p-5 transition-transform duration-500 group-hover:scale-105 mix-blend-multiply"
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
                                                    <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider mb-1 line-clamp-1">{product.category}</p>
                                                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 leading-snug line-clamp-2 min-h-[40px] sm:min-h-[44px]">
                                                        <Link href={`/products/${product._id}`} className="hover:text-[var(--sf-accent)] transition-colors relative z-10">
                                                            {product.title}
                                                        </Link>
                                                    </h3>

                                                    <div className="flex items-baseline flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6 mt-auto">
                                                        <span className="text-base sm:text-xl font-black text-gray-900">৳ {product.finalPrice}</span>
                                                        {hasDiscount && (
                                                            <span className="text-xs sm:text-sm text-gray-400 line-through font-medium">৳ {product.sellingPrice}</span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 relative z-20">
                                                        <button
                                                            onClick={(e) => { e.preventDefault(); addToCart(product); }}
                                                            disabled={product.stock <= 0}
                                                            className="p-2.5 sm:p-3 border border-gray-200 rounded-lg sm:rounded-xl text-gray-600 active:scale-95 hover:border-[var(--sf-accent)] hover:text-[var(--sf-accent)] hover:bg-[var(--sf-accent-bg)] transition-all disabled:opacity-50"
                                                        >
                                                            <ShoppingBag size={18} className="sm:w-5 sm:h-5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.preventDefault(); addToCart(product); router.push('/checkout'); }}
                                                            disabled={product.stock <= 0}
                                                            className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 bg-gray-900 text-white py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold active:scale-95 hover:bg-[var(--sf-accent)] transition-colors shadow-md shadow-gray-900/20 disabled:bg-gray-300 disabled:shadow-none"
                                                        >
                                                            <span>Buy Now</span>
                                                            <ArrowRight size={14} className="sm:w-4 sm:h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* ✨ PAGINATION CONTROLS ✨ */}
                            {/* ✨ PAGINATION CONTROLS ✨ */}
                            {pagination?.pages > 1 && (
                                <div className="w-full mt-12 sm:mt-16 mb-8 overflow-x-auto pb-4 scrollbar-hide px-2">
                                    <div className="flex items-center justify-start sm:justify-center gap-2 min-w-max mx-auto w-fit">

                                        {/* Prev Button */}
                                        <button
                                            onClick={() => handlePageChange(filters.page - 1)}
                                            disabled={filters.page === 1}
                                            className="flex-shrink-0 p-2 sm:p-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm bg-white"
                                        >
                                            <ChevronLeft size={18} />
                                        </button>

                                        {/* Page Numbers */}
                                        <div className="flex items-center gap-1.5 flex-nowrap">
                                            {[...Array(pagination.pages)].map((_, i) => {
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

                                        {/* Next Button */}
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
        </div>
    );
}