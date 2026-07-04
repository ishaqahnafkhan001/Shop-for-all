"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { PackageX, Tag, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useShopData } from '@/hooks/useShopData';
import { useStorefrontProductActions } from '@/hooks/useStorefrontProductActions';
import { normalizeTheme } from '@/lib/theme';
import { useStorefrontTheme } from '@/components/storefront/StorefrontThemeProvider';
import { ReferenceStorefrontHome } from '@/components/storefront/ReferenceStorefront';
import { trackStorefrontEvent } from '@/utils/analyticsTracker';

const formatCountdown = (target) => {
    const targetTime = new Date(target || 0).getTime();
    const remaining = Math.max(0, targetTime - Date.now());
    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return { days, hours, minutes, seconds, expired: remaining <= 0 };
};

function LaunchCountdown({ launchAt }) {
    const [time, setTime] = useState(() => formatCountdown(launchAt));

    useEffect(() => {
        const timer = window.setInterval(() => {
            setTime(formatCountdown(launchAt));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [launchAt]);

    return (
        <div className="mt-4 grid grid-cols-4 gap-2 max-w-sm">
            {[
                ['Days', time.days],
                ['Hours', time.hours],
                ['Min', time.minutes],
                ['Sec', time.seconds]
            ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white/90 px-3 py-2 text-center text-slate-950 shadow-sm backdrop-blur">
                    <p className="text-lg font-black tabular-nums sm:text-2xl">{String(value).padStart(2, '0')}</p>
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
                </div>
            ))}
        </div>
    );
}

function StorefrontLaunchBanners({ banners = [] }) {
    const visible = Array.isArray(banners) ? banners : [];
    if (!visible.length) return null;

    return (
        <div className="mx-auto w-full max-w-7xl px-3 pt-4 sm:px-6 lg:px-8">
            <div className="space-y-4">
                {visible.map((banner) => {
                    const desktopImage = banner.desktopImages?.[0] || banner.images?.[0] || '';
                    const mobileImage = banner.mobileImages?.[0] || desktopImage;
                    const isLaunch = banner.type === 'scheduled_product';
                    const canOpen = Boolean(banner.link && (!isLaunch || banner.scheduledProduct?.isPublic));
                    const Wrapper = canOpen ? Link : 'div';
                    const wrapperProps = canOpen ? { href: banner.link } : {};

                    return (
                        <Wrapper
                            key={banner._id}
                            {...wrapperProps}
                            className="group relative block min-h-[220px] overflow-hidden rounded-[1.5rem] bg-slate-950 shadow-xl shadow-slate-200/70 sm:min-h-[300px] sm:rounded-[2rem]"
                        >
                            {desktopImage ? (
                                <picture>
                                    {mobileImage && mobileImage !== desktopImage && (
                                        <source media="(max-width: 640px)" srcSet={mobileImage} />
                                    )}
                                    <img
                                        src={desktopImage}
                                        alt=""
                                        loading="lazy"
                                        decoding="async"
                                        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                                    />
                                </picture>
                            ) : null}
                            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/88 via-slate-950/58 to-slate-950/10" />
                            <div className="relative z-10 flex min-h-[220px] flex-col justify-end p-5 text-white sm:min-h-[300px] sm:p-8">
                                {isLaunch && (
                                    <p className="mb-2 inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-teal-100 backdrop-blur">
                                        Upcoming launch
                                    </p>
                                )}
                                <h2 className="max-w-2xl text-2xl font-black leading-tight sm:text-4xl">{banner.title}</h2>
                                {banner.subtitle && (
                                    <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/78 sm:text-base">{banner.subtitle}</p>
                                )}
                                {banner.countdownEnabled && banner.launchAt && (
                                    <LaunchCountdown launchAt={banner.launchAt} />
                                )}
                                {canOpen ? (
                                    <span className="mt-5 inline-flex w-fit rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950">
                                        {banner.postLaunchCtaText || 'View product'}
                                    </span>
                                ) : isLaunch ? (
                                    <span className="mt-5 inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white/80 backdrop-blur">
                                        Available after launch
                                    </span>
                                ) : null}
                            </div>
                        </Wrapper>
                    );
                })}
            </div>
        </div>
    );
}

export default function StorefrontHomeClient({ subdomain, initialData = null }) {
    const { user } = useAuth();
    const { hydrateThemeSettings } = useStorefrontTheme();
    const [filters, setFilters] = useState({ category: 'All', minPrice: '', maxPrice: '', minRating: '', sort: 'newest', page: 1 });
    const [priceInput, setPriceInput] = useState({ min: '', max: '' });
    const [catalogSearch, setCatalogSearch] = useState('');
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    const { shop, products, categories, banners = [], sectionProducts, sectionReviews, activeSalePopups = [], loading, error, pagination } = useShopData(subdomain, filters, initialData);
    const [dismissedSalePopupId, setDismissedSalePopupId] = useState('');
    const theme = normalizeTheme(shop?.theme || initialData?.shop?.theme || {});
    const storewideDiscount = shop?.storewideDiscount || initialData?.shop?.storewideDiscount || 0;
    const customerId = user?.role === 'Customer' ? (user._id || user.id) : null;
    const productActions = useStorefrontProductActions({
        subdomain,
        onProductAdded: (product, meta = {}) => {
            trackStorefrontEvent({
                subdomain,
                eventType: 'add_to_cart',
                customer_id: customerId,
                product_id: product._id,
                variant_id: product.variantId || product.selectedVariant?._id,
                value: product.finalPrice || product.sellingPrice || product.pricing?.sellingPrice || 0,
                metadata: {
                    productTitle: product.title,
                    category: product.category,
                    location: meta.location || 'home',
                    intent: meta.intent || 'add_to_cart'
                }
            });
        }
    });
    const popupRef = useRef(null);
    const closePopupRef = useRef(null);
    const previousFocusRef = useRef(null);

    useEffect(() => {
        if (shop) hydrateThemeSettings(shop);
    }, [hydrateThemeSettings, shop]);

    const handleCategoryChange = useCallback((category) => {
        setFilters(prev => ({ ...prev, category, page: 1 }));
        setMobileFiltersOpen(false);
    }, []);

    const handleSortChange = useCallback((event) => {
        setFilters(prev => ({ ...prev, sort: event.target.value, page: 1 }));
    }, []);

    const handlePriceApply = useCallback(() => {
        setFilters(prev => ({ ...prev, minPrice: priceInput.min, maxPrice: priceInput.max, page: 1 }));
        setMobileFiltersOpen(false);
    }, [priceInput]);

    const handleRatingChange = useCallback((minRating) => {
        setFilters(prev => ({ ...prev, minRating, page: 1 }));
    }, []);

    const handleClearFilters = useCallback(() => {
        setPriceInput({ min: '', max: '' });
        setFilters({ category: 'All', minPrice: '', maxPrice: '', minRating: '', sort: 'newest', page: 1 });
        setMobileFiltersOpen(false);
    }, []);

    const handlePageChange = useCallback((page) => {
        setFilters(prev => ({ ...prev, page }));
        window.scrollTo({ top: 520, behavior: 'smooth' });
    }, []);

    const handleProductAdd = useCallback((product) => {
        productActions.addProductToCart(product, { location: 'home' });
    }, [productActions]);

    const getSalePopupKey = useCallback((popup) => (
        `sale-popup:${subdomain}:${popup?.saleId || 'sale'}:${popup?.version || 'v1'}`
    ), [subdomain]);
    const isSalePopupDismissed = useCallback((popup) => {
        if (!popup || popup.frequency === 'every_visit' || typeof window === 'undefined') return false;
        const key = getSalePopupKey(popup);
        if (popup.frequency === 'once_per_day') {
            return window.localStorage.getItem(key) === new Date().toISOString().slice(0, 10);
        }
        return window.sessionStorage.getItem(key) === 'dismissed';
    }, [getSalePopupKey]);
    const activeSalePopup = activeSalePopups.find(popup => (
        String(popup.saleId) !== dismissedSalePopupId &&
        !isSalePopupDismissed(popup)
    ));
    const dismissSalePopup = useCallback(() => {
        if (!activeSalePopup?.saleId) return;
        const id = String(activeSalePopup.saleId);
        setDismissedSalePopupId(id);
        if (typeof window !== 'undefined') {
            const key = getSalePopupKey(activeSalePopup);
            if (activeSalePopup.frequency === 'once_per_day') {
                window.localStorage.setItem(key, new Date().toISOString().slice(0, 10));
            } else if (activeSalePopup.frequency !== 'every_visit') {
                window.sessionStorage.setItem(key, 'dismissed');
            }
        }
    }, [activeSalePopup, getSalePopupKey]);

    useEffect(() => {
        if (!activeSalePopup) return undefined;
        previousFocusRef.current = document.activeElement;
        const timer = window.setTimeout(() => closePopupRef.current?.focus(), 0);

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                dismissSalePopup();
                return;
            }
            if (event.key !== 'Tab' || !popupRef.current) return;
            const focusable = popupRef.current.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('keydown', handleKeyDown);
            previousFocusRef.current?.focus?.();
        };
    }, [activeSalePopup, dismissSalePopup]);

    useEffect(() => {
        const query = catalogSearch.trim();
        if (query.length < 2) return undefined;

        const timer = setTimeout(() => {
            const normalized = query.toLowerCase();
            const resultCount = products.filter(product => (
                `${product.title || ''} ${product.category || ''}`.toLowerCase().includes(normalized)
            )).length;

            trackStorefrontEvent({
                subdomain,
                eventType: 'search',
                customer_id: customerId,
                metadata: {
                    query,
                    resultCount,
                    location: 'catalog'
                }
            });
        }, 700);

        return () => clearTimeout(timer);
    }, [catalogSearch, customerId, products, subdomain]);

    if (error) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
                <PackageX size={48} className="mb-4 text-slate-300" />
                <h2 className="mb-2 text-xl font-black text-slate-950">Store Unavailable</h2>
                <p className="text-sm text-slate-500">{error || 'This storefront is currently inactive or does not exist.'}</p>
            </div>
        );
    }

    return (
        <>
            <StorefrontLaunchBanners banners={banners} />
            <ReferenceStorefrontHome
                theme={theme}
                products={products}
                categories={categories}
                sectionProducts={sectionProducts}
                sectionReviews={sectionReviews}
                storewideDiscount={storewideDiscount}
                loading={loading}
                pagination={pagination}
                filters={filters}
                priceInput={priceInput}
                catalogSearch={catalogSearch}
                mobileFiltersOpen={mobileFiltersOpen}
                onCatalogSearchChange={event => setCatalogSearch(event.target.value)}
                onSortChange={handleSortChange}
                onFilterOpen={() => setMobileFiltersOpen(true)}
                onFilterClose={() => setMobileFiltersOpen(false)}
                onCategoryChange={handleCategoryChange}
                onMinPriceChange={event => setPriceInput(prev => ({ ...prev, min: event.target.value }))}
                onMaxPriceChange={event => setPriceInput(prev => ({ ...prev, max: event.target.value }))}
                onPriceApply={handlePriceApply}
                onRatingChange={handleRatingChange}
                onClearFilters={handleClearFilters}
                onPageChange={handlePageChange}
                onProductAdd={handleProductAdd}
                onProductBuyNow={(product) => productActions.buyNow(product, { location: 'home' })}
                onWishlistToggle={productActions.toggleWishlist}
                isProductWishlisted={productActions.isWishlisted}
                LinkComponent={Link}
            />
            {activeSalePopup && (
                <div
                    ref={popupRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="sale-popup-title"
                    className="fixed inset-x-3 bottom-4 z-50 mx-auto max-w-md overflow-hidden rounded-[1.5rem] border border-emerald-200 bg-white shadow-2xl shadow-slate-900/20 sm:bottom-6"
                >
                    <button
                        ref={closePopupRef}
                        type="button"
                        onClick={dismissSalePopup}
                        aria-label="Dismiss sale announcement"
                        className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition hover:bg-slate-100"
                    >
                        <X size={16} />
                    </button>
                    {(activeSalePopup.desktopImage || activeSalePopup.mobileImage) && (
                        <picture>
                            {activeSalePopup.mobileImage && activeSalePopup.mobileImage !== activeSalePopup.desktopImage && (
                                <source media="(max-width: 640px)" srcSet={activeSalePopup.mobileImage} />
                            )}
                            <img
                                src={activeSalePopup.desktopImage || activeSalePopup.mobileImage}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                className="h-36 w-full object-cover"
                            />
                        </picture>
                    )}
                    <div className="flex gap-3 p-4 pr-12 sm:p-5 sm:pr-12">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                            <Tag size={20} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Limited time offer</p>
                            <h3 id="sale-popup-title" className="mt-1 text-lg font-black text-slate-950">{activeSalePopup.title}</h3>
                            {activeSalePopup.message && (
                                <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">{activeSalePopup.message}</p>
                            )}
                            {activeSalePopup.ctaUrl && (
                                <Link
                                    href={activeSalePopup.ctaUrl}
                                    onClick={dismissSalePopup}
                                    className="mt-3 inline-flex min-h-11 items-center rounded-full bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-900/15"
                                >
                                    {activeSalePopup.ctaLabel || 'Shop sale'}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {productActions.variantPicker}
        </>
    );
}
