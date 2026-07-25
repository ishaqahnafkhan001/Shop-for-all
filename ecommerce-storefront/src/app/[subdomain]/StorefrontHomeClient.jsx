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

function SaleCountdown({ startsAt, endsAt, serverNow, onBoundary, className = '' }) {
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
        <div className={`mt-4 ${className}`}>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-white/75" aria-live="polite">{time.label}</p>
            <div className="grid max-w-sm grid-cols-4 gap-2">
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
        </div>
    );
}

function StorefrontLaunchBanners({ banners = [], serverNow, onCountdownBoundary }) {
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
                                    <SaleCountdown
                                        startsAt={banner.launchAt}
                                        serverNow={serverNow}
                                        onBoundary={onCountdownBoundary}
                                    />
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
    const [debouncedCatalogSearch, setDebouncedCatalogSearch] = useState('');
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    const {
        shop,
        products,
        categories,
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
            <StorefrontLaunchBanners
                banners={banners}
                serverNow={serverNow}
                onCountdownBoundary={refreshBootstrap}
            />
            <ReferenceStorefrontHome
                theme={theme}
                shopName={shop?.shopName || initialData?.shop?.shopName || subdomain}
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
                onCatalogSearchChange={handleCatalogSearchChange}
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
                            <SaleCountdown
                                startsAt={activeSalePopup.startsAt}
                                endsAt={activeSalePopup.endsAt}
                                serverNow={serverNow}
                                onBoundary={refreshBootstrap}
                                className="[&_p:first-child]:text-emerald-700 [&_.rounded-2xl]:bg-emerald-50"
                            />
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
