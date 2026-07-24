"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Filter, PackageX, Tags, X } from "lucide-react";

import { useStorefrontProductActions } from "@/hooks/useStorefrontProductActions";
import { normalizeTheme } from "@/lib/theme";
import { ProductCard } from "@/components/storefront/reference/StorefrontProductCard";
import {
    desktopGridClasses,
    productGridGapClasses,
    tabletGridClasses
} from "@/components/storefront/reference/referenceCore";

const STOCK_LABELS = {
    all: "All availability",
    in: "In stock",
    out: "Out of stock"
};

const SORT_LABELS = {
    default: "Default",
    newest: "Newest",
    price_asc: "Price: Low to High",
    price_desc: "Price: High to Low",
    rating_desc: "Best Rated"
};

const money = (value) => `৳${Number(value || 0).toLocaleString("en-BD")}`;

export default function CategoryPageClient({ shop, category, products = [], pagination = {}, filters = {} }) {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const filterButtonRef = useRef(null);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [draftFilters, setDraftFilters] = useState({
        minPrice: filters.minPrice || "",
        maxPrice: filters.maxPrice || "",
        stock: filters.stock || "all",
        sale: filters.sale === "true",
        rating: filters.rating || "",
    });
    const productActions = useStorefrontProductActions({ subdomain: params?.subdomain || shop?.subdomain });
    const theme = normalizeTheme(shop?.theme || {});
    const productCardColors = theme.colors?.productCard;
    const normalizedProducts = useMemo(() => products.map(product => {
        const sellingPrice = product?.pricing?.sellingPrice ?? product?.sellingPrice ?? 0;
        const discount = product?.pricing?.discount ?? product?.discount ?? 0;
        const finalPrice = product?.finalPrice ?? Math.round(sellingPrice - (sellingPrice * (discount / 100)));

        return {
            ...product,
            sellingPrice,
            discount,
            finalPrice,
            stock: product?.totalStock ?? product?.stock ?? 0
        };
    }), [products]);
    const desktopColumns = Math.min(Math.max(theme.allProducts?.desktopColumns || theme.layout?.productColumnsDesktop || 3, 2), 5);
    const tabletColumns = Math.min(Math.max(theme.allProducts?.tabletColumns || 2, 1), 4);
    const mobileColumns = Math.min(Math.max(theme.allProducts?.mobileColumns || theme.layout?.productColumnsMobile || 2, 1), 2);
    const gridClass = `${mobileColumns === 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2"} ${tabletGridClasses[tabletColumns] || tabletGridClasses[2]} ${desktopGridClasses[desktopColumns] || desktopGridClasses[3]}`;
    const gridGapClass = productGridGapClasses[theme.layout?.productGap || theme.productGridStyle] || productGridGapClasses.Comfortable;
    const themedProductCard = useMemo(() => ({
        ...(theme.productCard || {}),
        colors: productCardColors || {},
    }), [theme.productCard, productCardColors]);
    const total = pagination?.totalItems ?? pagination?.total ?? normalizedProducts.length;
    const page = pagination?.page || 1;
    const totalPages = pagination?.totalPages || pagination?.pages || 1;
    const hasRatingData = normalizedProducts.some(product => Number(product.averageRating || 0) > 0 || Number(product.numReviews || 0) > 0) || Boolean(filters.rating);

    useEffect(() => {
        if (!mobileFiltersOpen) return undefined;
        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                setMobileFiltersOpen(false);
                filterButtonRef.current?.focus();
            }
        };
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [mobileFiltersOpen]);

    const updateQuery = (updates = {}) => {
        const next = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value === undefined || value === null || value === "" || value === false || value === "all") {
                next.delete(key);
            } else {
                next.set(key, String(value));
            }
        });
        if (!Object.prototype.hasOwnProperty.call(updates, "page")) next.set("page", "1");
        const query = next.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
    };

    const applyFilters = () => {
        updateQuery({
            minPrice: draftFilters.minPrice,
            maxPrice: draftFilters.maxPrice,
            stock: draftFilters.stock,
            sale: draftFilters.sale ? "true" : "",
            rating: draftFilters.rating
        });
        setMobileFiltersOpen(false);
        filterButtonRef.current?.focus();
    };

    const clearFilters = () => {
        setDraftFilters({ minPrice: "", maxPrice: "", stock: "all", sale: false, rating: "" });
        updateQuery({ minPrice: "", maxPrice: "", stock: "", sale: "", rating: "", page: "1" });
        setMobileFiltersOpen(false);
        filterButtonRef.current?.focus();
    };

    const activeFilters = [
        filters.minPrice || filters.maxPrice ? {
            key: "price",
            label: `Price: ${filters.minPrice ? money(filters.minPrice) : "Any"}-${filters.maxPrice ? money(filters.maxPrice) : "Any"}`,
            updates: { minPrice: "", maxPrice: "" }
        } : null,
        filters.stock && filters.stock !== "all" ? {
            key: "stock",
            label: STOCK_LABELS[filters.stock] || "Availability",
            updates: { stock: "" }
        } : null,
        filters.sale === "true" ? {
            key: "sale",
            label: "On sale",
            updates: { sale: "" }
        } : null,
        filters.rating ? {
            key: "rating",
            label: `${filters.rating}+ stars`,
            updates: { rating: "" }
        } : null
    ].filter(Boolean);

    const filterContent = (
        <div className="space-y-5">
            <div>
                <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Price range</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                        type="number"
                        min="0"
                        value={draftFilters.minPrice}
                        onChange={(event) => setDraftFilters(prev => ({ ...prev, minPrice: event.target.value }))}
                        className="sf-field rounded-2xl px-3 py-3 text-sm"
                        placeholder="Min"
                    />
                    <input
                        type="number"
                        min="0"
                        value={draftFilters.maxPrice}
                        onChange={(event) => setDraftFilters(prev => ({ ...prev, maxPrice: event.target.value }))}
                        className="sf-field rounded-2xl px-3 py-3 text-sm"
                        placeholder="Max"
                    />
                </div>
            </div>
            <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Availability</span>
                <select
                    value={draftFilters.stock}
                    onChange={(event) => setDraftFilters(prev => ({ ...prev, stock: event.target.value }))}
                    className="sf-field mt-2 w-full rounded-2xl px-3 py-3 text-sm"
                >
                    <option value="all">All</option>
                    <option value="in">In stock</option>
                    <option value="out">Out of stock</option>
                </select>
            </label>
            <label className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
                <span>On sale</span>
                <input
                    type="checkbox"
                    checked={draftFilters.sale}
                    onChange={(event) => setDraftFilters(prev => ({ ...prev, sale: event.target.checked }))}
                    className="h-5 w-5 rounded border-slate-300"
                />
            </label>
            {hasRatingData && (
                <label className="block">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Rating</span>
                    <select
                        value={draftFilters.rating}
                        onChange={(event) => setDraftFilters(prev => ({ ...prev, rating: event.target.value }))}
                        className="sf-field mt-2 w-full rounded-2xl px-3 py-3 text-sm"
                    >
                        <option value="">Any rating</option>
                        <option value="4">4 stars and above</option>
                        <option value="3">3 stars and above</option>
                    </select>
                </label>
            )}
            <div className="flex gap-2 pt-1">
                <button type="button" onClick={clearFilters} className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600">
                    Clear
                </button>
                <button type="button" onClick={applyFilters} className="flex-1 rounded-2xl bg-[var(--sf-accent)] px-4 py-3 text-sm font-black text-white">
                    Apply
                </button>
            </div>
        </div>
    );

    return (
        <div className="sf-page">
            <section className="border-b border-slate-200 bg-slate-50/80">
                <div className="sf-shell-wide py-6 sm:py-10">
                    <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-[var(--sf-accent)]">
                        <ArrowLeft size={16} />
                        Back to store
                    </Link>
                    <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm">
                            <Tags size={14} />
                            Category
                        </div>
                        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                            {category}
                        </h1>
                        <p className="mt-4 text-sm font-bold text-slate-500">
                            {total} product{total === 1 ? "" : "s"}
                        </p>
                    </div>
                </div>
            </section>

            <section className="sf-shell-wide py-8 sm:py-12">
                <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            ref={filterButtonRef}
                            type="button"
                            onClick={() => setMobileFiltersOpen(true)}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm lg:hidden"
                        >
                            <Filter size={16} />
                            Filters{activeFilters.length ? ` (${activeFilters.length})` : ""}
                        </button>
                        {activeFilters.map(filter => (
                            <button
                                key={filter.key}
                                type="button"
                                onClick={() => updateQuery(filter.updates)}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-xs font-black text-slate-600"
                            >
                                {filter.label}
                                <X size={13} />
                            </button>
                        ))}
                        {activeFilters.length > 0 && (
                            <button type="button" onClick={clearFilters} className="text-xs font-black text-[var(--sf-accent)]">
                                Clear all
                            </button>
                        )}
                    </div>
                    <label className="flex items-center gap-2 text-sm font-black text-slate-600">
                        Sort
                        <select
                            value={filters.sort || "newest"}
                            onChange={(event) => updateQuery({ sort: event.target.value })}
                            className="sf-field min-h-11 rounded-full px-4 py-2 text-sm"
                        >
                            {Object.entries(SORT_LABELS)
                                .filter(([value]) => value !== "rating_desc" || hasRatingData)
                                .map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </label>
                </div>

                <div className="grid gap-7 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <aside className="hidden self-start rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm lg:block">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">Filter products</h2>
                            <Filter size={16} className="text-slate-400" />
                        </div>
                        {filterContent}
                    </aside>

                    <div>
                {normalizedProducts.length === 0 ? (
                    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
                        <PackageX size={48} className="mx-auto mb-4 text-slate-300" />
                        <h2 className="text-2xl font-black text-slate-950">
                            {activeFilters.length ? "No products match these filters" : "No products in this category yet"}
                        </h2>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                            {activeFilters.length
                                ? "Try clearing one or more filters to see more products from this category."
                                : "This category is available, but there are no published products right now."}
                        </p>
                        {activeFilters.length ? (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-6 inline-flex rounded-full bg-[var(--sf-accent)] px-5 py-3 text-sm font-black text-white"
                            >
                                Clear filters
                            </button>
                        ) : (
                            <Link href="/" className="mt-6 inline-flex rounded-full bg-[var(--sf-accent)] px-5 py-3 text-sm font-black text-white">
                                Browse all products
                            </Link>
                        )}
                    </div>
                ) : (
                    <>
                    <div className={`grid ${gridClass} ${gridGapClass} ${normalizedProducts.length === 1 ? "mx-auto w-full max-w-[20rem] sm:mx-0 sm:max-w-none" : ""}`}>
                        {normalizedProducts.map((product, index) => (
                            <ProductCard
                                key={product._id}
                                product={product}
                                index={index}
                                storewideDiscount={shop?.storewideDiscount || 0}
                                productCard={themedProductCard}
                                onProductAdd={(item) => productActions.addProductToCart(item, { location: "category" })}
                                onProductBuyNow={(item) => productActions.buyNow(item, { location: "category" })}
                                onWishlistToggle={productActions.toggleWishlist}
                                isWishlisted={productActions.isWishlisted}
                                LinkComponent={Link}
                            />
                        ))}
                    </div>
                    {totalPages > 1 && (
                        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                            <button
                                type="button"
                                disabled={page <= 1}
                                onClick={() => updateQuery({ page: Math.max(1, page - 1) })}
                                className="min-h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 disabled:opacity-40"
                            >
                                Previous
                            </button>
                            <span className="text-sm font-black text-slate-500">Page {page} of {totalPages}</span>
                            <button
                                type="button"
                                disabled={page >= totalPages}
                                onClick={() => updateQuery({ page: page + 1 })}
                                className="min-h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    )}
                    </>
                )}
                    </div>
                </div>
            </section>
            {mobileFiltersOpen && (
                <div className="fixed inset-0 z-[130] lg:hidden" role="dialog" aria-modal="true" aria-labelledby="category-filter-title">
                    <button
                        type="button"
                        aria-label="Close filters"
                        onClick={() => {
                            setMobileFiltersOpen(false);
                            filterButtonRef.current?.focus();
                        }}
                        className="absolute inset-0 bg-slate-950/45"
                    />
                    <div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 id="category-filter-title" className="text-lg font-black text-slate-950">Filter products</h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setMobileFiltersOpen(false);
                                    filterButtonRef.current?.focus();
                                }}
                                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                                aria-label="Close filters"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        {filterContent}
                    </div>
                </div>
            )}
            {productActions.variantPicker}
        </div>
    );
}
