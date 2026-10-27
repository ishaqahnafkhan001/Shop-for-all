"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { PackageX, Tag, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useShopData } from '@/hooks/useShopData';
import { useStorefrontProductActions } from '@/hooks/useStorefrontProductActions';
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
    const { theme } = useStorefrontTheme();
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
                    className="fixed inset-x-3 bottom-20 z-50 mx-auto w-auto max-w-[21.5rem] max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain rounded-[1.65rem] border border-white/80 bg-white/65 shadow-[0_22px_65px_-24px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-slate-900/5 backdrop-blur-2xl backdrop-saturate-150 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:mx-0 sm:w-[21.5rem] sm:max-h-[calc(100dvh-2rem)]"
                >
                    {/* Decorative glass reflections; no interactions or data changes. */}
                    <div aria-hidden="true" className="pointer-events-none absolute -left-14 -top-14 h-40 w-40 rounded-full bg-emerald-200/45 blur-3xl" />
                    <div aria-hidden="true" className="pointer-events-none absolute -right-12 top-14 h-36 w-36 rounded-full bg-sky-200/45 blur-3xl" />
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[1.65rem] bg-gradient-to-br from-white/55 via-white/10 to-teal-100/25" />
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400/90 via-teal-300/75 to-sky-400/80" />

                    <button
                        type="button"
                        onClick={dismissSalePopup}
                        aria-label="Dismiss sale announcement"
                        className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/60 text-slate-700 shadow-[0_4px_14px_-7px_rgba(15,23,42,0.35)] backdrop-blur-xl transition hover:bg-white/90 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                    >
                        <X size={17} strokeWidth={2} />
                    </button>

                    <div className="relative z-10 p-3.5 sm:p-4">
                        <div className="pr-12">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/85 bg-emerald-100/70 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.13em] text-emerald-900 shadow-sm backdrop-blur-lg">
                                <Tag size={12} strokeWidth={2} />
                                Limited time offer
                            </span>
                        </div>

                        <div className="mt-3 flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                                <h3 id="sale-popup-title" className="break-words text-[1.06rem] font-black leading-snug tracking-tight text-slate-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.65)]">
                                    {activeSalePopup.title}
                                </h3>
                                {activeSalePopup.message && (
                                    <p className="mt-1.5 line-clamp-2 break-words text-[12px] font-medium leading-5 text-slate-700">
                                        {activeSalePopup.message}
                                    </p>
                                )}
                            </div>

                            {(activeSalePopup.desktopImage || activeSalePopup.mobileImage) && (
                                <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-[1.15rem] border border-white/90 bg-white/50 p-0.5 shadow-[0_8px_20px_-10px_rgba(15,23,42,0.45)] backdrop-blur-sm">
                                    <picture>
                                        {activeSalePopup.mobileImage && activeSalePopup.mobileImage !== activeSalePopup.desktopImage && (
                                            <source media="(max-width: 640px)" srcSet={activeSalePopup.mobileImage} />
                                        )}
                                        <img
                                            src={activeSalePopup.desktopImage || activeSalePopup.mobileImage}
                                            alt=""
                                            loading="lazy"
                                            decoding="async"
                                            className="h-full w-full rounded-[0.95rem] object-cover"
                                        />
                                    </picture>
                                </div>
                            )}
                        </div>

                        <div className="mt-3 rounded-[1.15rem] border border-white/80 bg-white/45 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl">
                            <SaleCountdown
                                startsAt={activeSalePopup.startsAt}
                                endsAt={activeSalePopup.endsAt}
                                serverNow={serverNow}
                                onBoundary={refreshBootstrap}
                                className="!mt-0 [&>p]:!mb-1.5 [&>p]:!text-emerald-900 [&_.rounded-xl]:!border [&_.rounded-xl]:!border-white/90 [&_.rounded-xl]:!bg-white/65 [&_.rounded-xl]:!shadow-[0_3px_12px_-8px_rgba(15,23,42,0.35)]"
                                compact
                            />
                            {activeSalePopup.ctaUrl && (
                                <Link
                                    href={activeSalePopup.ctaUrl}
                                    onClick={dismissSalePopup}
                                    className="mt-2.5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 px-4 py-2.5 text-center text-xs font-extrabold text-white shadow-[0_8px_20px_-8px_rgba(6,95,70,0.48)] transition-[filter,transform] hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                                >
                                    <span>{activeSalePopup.ctaLabel || 'Shop sale'}</span>
                                    <span aria-hidden="true" className="text-sm leading-none">↗</span>
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
