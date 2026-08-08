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

const getServerOffset = (serverNow) => {
    const serverTime = new Date(serverNow || 0).getTime();
    return Number.isFinite(serverTime) ? serverTime - Date.now() : 0;
};

const formatCountdown = (target, serverOffset = 0) => {
    const targetTime = new Date(target || 0).getTime();
    const effectiveNow = Date.now() + serverOffset;
    const remaining = Math.max(0, targetTime - effectiveNow);
    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return { days, hours, minutes, seconds, expired: remaining <= 0 };
};

const getCountdownState = ({ startsAt, endsAt, serverOffset = 0 }) => {
    const now = Date.now() + serverOffset;
    const startTime = new Date(startsAt || 0).getTime();
    const endTime = new Date(endsAt || 0).getTime();
    const hasStart = Number.isFinite(startTime) && startTime > 0;
    const hasEnd = Number.isFinite(endTime) && endTime > 0;

    if (hasStart && now < startTime) {
        return { label: 'Sale starts in', target: startsAt, state: 'upcoming', ...formatCountdown(startsAt, serverOffset) };
    }
    if (hasEnd && now < endTime) {
        return { label: 'Sale ends in', target: endsAt, state: 'active', ...formatCountdown(endsAt, serverOffset) };
    }
    return { label: '', target: '', state: 'ended', days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
};

function SaleCountdown({ startsAt, endsAt, serverNow, onBoundary, className = '', compact = false }) {
    const serverOffsetRef = useRef(0);
    const boundaryHandledRef = useRef('');
    const [time, setTime] = useState({ label: '', target: '', state: 'pending', days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

    useEffect(() => {
        serverOffsetRef.current = getServerOffset(serverNow);
        boundaryHandledRef.current = '';
    }, [serverNow]);

    useEffect(() => {
        if (!startsAt && !endsAt) return undefined;
        const readNextState = () => getCountdownState({
            startsAt,
            endsAt,
            serverOffset: serverOffsetRef.current
        });
        const update = () => {
            setTime(prev => {
                const next = readNextState();
                if (
                    next.state !== prev.state &&
                    prev.state !== 'pending' &&
                    !boundaryHandledRef.current
                ) {
                    boundaryHandledRef.current = `${prev.state}->${next.state}`;
                    window.setTimeout(() => onBoundary?.(next.state), 0);
                }
                return next;
            });
        };
        const initialTimer = window.setTimeout(update, 0);
        const timer = window.setInterval(update, 1000);
        return () => {
            window.clearTimeout(initialTimer);
            window.clearInterval(timer);
        };
    }, [endsAt, onBoundary, startsAt]);

    if (!time.target || time.state === 'pending' || time.state === 'ended') return null;

    return (
        <div className={`${compact ? 'mt-3' : 'mt-4'} ${className}`}>
            <p className={`${compact ? 'mb-1.5 text-[10px]' : 'mb-2 text-xs'} font-black uppercase tracking-[0.16em] text-white/75`} aria-live="polite">{time.label}</p>
            <div className={`grid grid-cols-4 ${compact ? 'max-w-[17rem] gap-1.5' : 'max-w-sm gap-2'}`}>
            {[
                ['Days', time.days],
                ['Hours', time.hours],
                ['Min', time.minutes],
                ['Sec', time.seconds]
            ].map(([label, value]) => (
                <div key={label} className={`${compact ? 'rounded-xl px-1.5 py-1.5' : 'rounded-2xl px-3 py-2'} bg-white/90 text-center text-slate-950 shadow-sm backdrop-blur`}>
                    <p className={`${compact ? 'text-base' : 'text-lg sm:text-2xl'} font-black tabular-nums`}>{String(value).padStart(2, '0')}</p>
                    <p className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-black uppercase tracking-wide text-slate-500`}>{label}</p>
                </div>
            ))}
            </div>
        </div>
    );
}

function StorefrontLaunchBanners({ banners = [], serverNow, onCountdownBoundary }) {
    const visible = Array.isArray(banners) ? banners : [];
    if (!visible.length) return null;

    return (
        <section aria-label="Store promotions" className="mt-4 sm:mt-6">
            <div className="space-y-3">
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
                            className="group relative block min-h-[150px] overflow-hidden rounded-2xl bg-slate-950 shadow-lg shadow-slate-200/60 sm:min-h-[190px]"
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
                                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                                    />
                                </picture>
                            ) : null}
                            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/78 via-slate-950/40 to-transparent" />
                            <div className="relative z-10 flex min-h-[150px] flex-col justify-center p-4 text-white sm:min-h-[190px] sm:p-6">
                                {isLaunch && (
                                    <p className="mb-2 inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-teal-100 backdrop-blur">
                                        Upcoming launch
                                    </p>
                                )}
                                <h2 className="max-w-2xl text-xl font-black leading-tight sm:text-3xl">{banner.title}</h2>
                                {banner.subtitle && (
                                    <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/78 sm:text-base">{banner.subtitle}</p>
                                )}
                                {banner.countdownEnabled && banner.launchAt && (
                                    <SaleCountdown
                                        startsAt={banner.launchAt}
                                        serverNow={serverNow}
                                        onBoundary={onCountdownBoundary}
                                        compact
                                    />
                                )}
                                {canOpen ? (
                                    <span className="mt-3 inline-flex min-h-10 w-fit items-center rounded-full bg-white px-4 text-sm font-black text-slate-950">
                                        {banner.postLaunchCtaText || 'View product'}
                                    </span>
                                ) : isLaunch ? (
                                    <span className="mt-3 inline-flex min-h-10 w-fit items-center rounded-full border border-white/20 bg-white/10 px-4 text-sm font-black text-white/80 backdrop-blur">
                                        Available after launch
                                    </span>
                                ) : null}
                            </div>
                        </Wrapper>
                    );
                })}
            </div>
        </section>
    );
}

export default function StorefrontHomeClient({ subdomain, initialData = null }) {
    const { user } = useAuth();
    const { hydrateThemeSettings } = useStorefrontTheme();
    const [filters, setFilters] = useState({ category: 'All', minPrice: '', maxPrice: '', minRating: '', stock: '', sort: 'newest', page: 1 });
    const [priceInput, setPriceInput] = useState({ min: '', max: '' });
    const [catalogSearch, setCatalogSearch] = useState('');
    const [debouncedCatalogSearch, setDebouncedCatalogSearch] = useState('');
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    const {
        shop,
        products,
        categories,
        categoryDetails,
        banners = [],
        sectionProducts,
        sectionReviews,
        activeSalePopups = [],
        serverNow,
        refreshBootstrap,
        loading,
        error,
        pagination
    } = useShopData(subdomain, {
        ...filters,
        search: debouncedCatalogSearch
    }, initialData);
    const [dismissedSalePopupId, setDismissedSalePopupId] = useState('');
    const [salePopupClosedForPage, setSalePopupClosedForPage] = useState(false);
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
    useEffect(() => {
        if (shop) hydrateThemeSettings(shop);
    }, [hydrateThemeSettings, shop]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedCatalogSearch(catalogSearch.trim());
        }, 350);

        return () => window.clearTimeout(timer);
    }, [catalogSearch]);

    const handleCatalogSearchChange = useCallback((event) => {
        const value = event?.target?.value || '';
        setCatalogSearch(value);
        setFilters(prev => prev.page === 1 ? prev : { ...prev, page: 1 });
    }, []);

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

    const handleStockChange = useCallback((stock) => {
        setFilters(prev => ({ ...prev, stock, page: 1 }));
    }, []);

    const handleClearFilters = useCallback(() => {
        setPriceInput({ min: '', max: '' });
        setFilters({ category: 'All', minPrice: '', maxPrice: '', minRating: '', stock: '', sort: 'newest', page: 1 });
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
    const activeSalePopup = !salePopupClosedForPage && activeSalePopups.find(popup => (
        String(popup.saleId) !== dismissedSalePopupId &&
        !isSalePopupDismissed(popup)
    ));
    const dismissSalePopup = useCallback(() => {
        if (!activeSalePopup?.saleId) return;
        const id = String(activeSalePopup.saleId);
        setDismissedSalePopupId(id);
        setSalePopupClosedForPage(true);
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
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                dismissSalePopup();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
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
            <ReferenceStorefrontHome
                theme={theme}
                shopName={shop?.shopName || initialData?.shop?.shopName || subdomain}
                products={products}
                categories={categories}
                categoryDetails={categoryDetails}
                sectionProducts={sectionProducts}
                sectionReviews={sectionReviews}
                storewideDiscount={storewideDiscount}
                loading={loading}
                pagination={pagination}
                filters={filters}
                priceInput={priceInput}
                catalogSearch={catalogSearch}
                mobileFiltersOpen={mobileFiltersOpen}
                onCatalogSearchChange={handleCatalogSearchChange}
                onSortChange={handleSortChange}
                onFilterOpen={() => setMobileFiltersOpen(true)}
                onFilterClose={() => setMobileFiltersOpen(false)}
                onCategoryChange={handleCategoryChange}
                onMinPriceChange={event => setPriceInput(prev => ({ ...prev, min: event.target.value }))}
                onMaxPriceChange={event => setPriceInput(prev => ({ ...prev, max: event.target.value }))}
                onPriceApply={handlePriceApply}
                onRatingChange={handleRatingChange}
                onStockChange={handleStockChange}
                onClearFilters={handleClearFilters}
                onPageChange={handlePageChange}
                onProductAdd={handleProductAdd}
                onProductBuyNow={(product) => productActions.buyNow(product, { location: 'home' })}
                onWishlistToggle={productActions.toggleWishlist}
                isProductWishlisted={productActions.isWishlisted}
                LinkComponent={Link}
                afterHeroContent={(
                    <StorefrontLaunchBanners
                        banners={banners}
                        serverNow={serverNow}
                        onCountdownBoundary={refreshBootstrap}
                    />
                )}
            />
            {activeSalePopup && (
                <div
                    role="dialog"
                    aria-modal="false"
                    aria-labelledby="sale-popup-title"
                    className="fixed bottom-20 right-3 z-50 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-2xl shadow-slate-900/20 sm:bottom-5 sm:right-5"
                >
                    <button
                        type="button"
                        onClick={dismissSalePopup}
                        aria-label="Dismiss sale announcement"
                        className="absolute right-2.5 top-2.5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-sm transition hover:bg-slate-100"
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
                                className="h-20 w-full object-cover"
                            />
                        </picture>
                    )}
                    <div className="flex gap-2.5 p-3 pr-12">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Tag size={17} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Limited time offer</p>
                            <h3 id="sale-popup-title" className="mt-0.5 text-base font-black text-slate-950">{activeSalePopup.title}</h3>
                            {activeSalePopup.message && (
                                <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-600">{activeSalePopup.message}</p>
                            )}
                            <SaleCountdown
                                startsAt={activeSalePopup.startsAt}
                                endsAt={activeSalePopup.endsAt}
                                serverNow={serverNow}
                                onBoundary={refreshBootstrap}
                                className="[&_p:first-child]:text-emerald-700 [&_.rounded-xl]:bg-emerald-50"
                                compact
                            />
                            {activeSalePopup.ctaUrl && (
                                <Link
                                    href={activeSalePopup.ctaUrl}
                                    onClick={dismissSalePopup}
                                    className="mt-2.5 inline-flex min-h-10 items-center rounded-full bg-slate-950 px-4 text-xs font-black text-white shadow-lg shadow-slate-900/15"
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
