"use client";

import { Filter, PackageX, Search, SlidersHorizontal, Star, X } from "lucide-react";

import {
    containerClass,
    desktopGridClasses,
    EditorSelectionFrame,
    isPreviewMobile,
    isPreviewNarrow,
    plainGridClasses,
    productGridGapClasses,
    tabletGridClasses,
} from "./referenceCore";
import { ProductCard } from "./StorefrontProductCard";

const FilterPanel = ({ categories, filters, priceInput, onCategoryChange, onMinPriceChange, onMaxPriceChange, onPriceApply, onClearFilters, onRatingChange }) => (
    <div className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-5 flex items-center justify-between">
            <h3 className="text-base font-black text-slate-950">Filter Products</h3>
            <SlidersHorizontal size={17} className="text-slate-400" />
        </div>
        <div className="space-y-2">
            <button type="button" onClick={() => onCategoryChange("All")} className={`w-full rounded-xl px-3 py-2 text-left text-sm font-bold transition ${filters.category === "All" ? "bg-[var(--sf-accent)] text-white" : "text-slate-600 hover:bg-slate-50"}`}>All Products</button>
            {categories?.map((category) => (
                <button key={category} type="button" onClick={() => onCategoryChange(category)} className={`w-full rounded-xl px-3 py-2 text-left text-sm font-bold transition ${filters.category === category ? "bg-[var(--sf-accent)] text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                    {category}
                </button>
            ))}
        </div>
        <div className="my-5 h-px bg-slate-200" />
        <h4 className="mb-3 text-sm font-black text-slate-950">Price Range</h4>
        <div className="grid grid-cols-2 gap-2 max-[360px]:grid-cols-1">
            <input type="number" aria-label="Minimum price" placeholder="Min" value={priceInput.min} onChange={onMinPriceChange} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--sf-accent)] focus:ring-4 focus:ring-teal-100" />
            <input type="number" aria-label="Maximum price" placeholder="Max" value={priceInput.max} onChange={onMaxPriceChange} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--sf-accent)] focus:ring-4 focus:ring-teal-100" />
        </div>
        <button type="button" onClick={onPriceApply} className="mt-3 w-full rounded-full bg-[var(--sf-accent)] px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[var(--sf-accent-hover)]">Apply Price</button>
        <div className="my-5 h-px bg-slate-200" />
        <div className="space-y-3 text-sm font-bold text-slate-600">
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 rounded border-slate-300" /> In stock only</label>
            <div>
                <p className="mb-2 text-slate-950">Rating</p>
                {[5, 4, 3].map((rating) => (
                    <button
                        key={rating}
                        type="button"
                        onClick={() => onRatingChange?.(Number(filters.minRating) === rating ? "" : rating)}
                        aria-pressed={Number(filters.minRating) === rating}
                        aria-label={`Filter by ${rating} stars and up`}
                        className={`flex w-full items-center gap-2 rounded-xl px-2 py-1 text-left text-amber-400 transition ${Number(filters.minRating) === rating ? "bg-amber-50 ring-1 ring-amber-200" : "hover:bg-slate-50"}`}
                    >
                        {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={13} fill="currentColor" className={star <= rating ? "" : "text-slate-200"} />)}
                        <span className="text-xs text-slate-500">{rating}.0+</span>
                    </button>
                ))}
            </div>
        </div>
        <button type="button" onClick={onClearFilters} className="mt-5 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">Clear Filter</button>
    </div>
);

export function StorefrontAllProducts({
    allProducts,
    catalogProducts,
    catalogSearch,
    categories,
    filters,
    forcedMobilePreview,
    forcedNarrowPreview,
    layout,
    loading,
    mobileFiltersOpen,
    onCatalogSearchChange,
    onCategoryChange,
    onClearFilters,
    onFilterClose,
    onFilterOpen,
    onMaxPriceChange,
    onMinPriceChange,
    onPageChange,
    onPriceApply,
    onProductAdd,
    onRatingChange,
    onSortChange,
    pagination,
    previewDevice,
    priceInput,
    productCard,
    storewideDiscount,
    editor,
    LinkComponent,
    theme,
}) {
    if (allProducts.isEnabled === false) return null;

    const filteredProducts = catalogSearch.trim()
        ? catalogProducts.filter((product) => `${product.title || ""} ${product.category || ""}`.toLowerCase().includes(catalogSearch.toLowerCase()))
        : catalogProducts;
    const desktopColumns = Math.min(Math.max(allProducts.desktopColumns || layout.productColumnsDesktop || 3, 2), 5);
    const tabletColumns = Math.min(Math.max(allProducts.tabletColumns || 2, 1), 4);
    const mobileColumns = Math.min(Math.max(allProducts.mobileColumns || layout.productColumnsMobile || 2, 1), 2);
    const liveGridClass = `${mobileColumns === 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2"} ${tabletGridClasses[tabletColumns] || tabletGridClasses[2]} ${desktopGridClasses[desktopColumns] || desktopGridClasses[3]}`;
    const gridClass = previewDevice
        ? (isPreviewMobile(previewDevice)
            ? plainGridClasses[mobileColumns]
            : previewDevice === "tablet"
                ? plainGridClasses[tabletColumns]
                : plainGridClasses[desktopColumns])
        : liveGridClass;
    const gridGapClass = productGridGapClasses[layout.productGap || theme.productGridStyle] || productGridGapClasses.Comfortable;
    const allProductsHeaderClass = forcedNarrowPreview
        ? "mb-4 flex flex-col gap-3"
        : "mb-4 flex flex-col gap-3 sm:mb-6 sm:gap-4 lg:flex-row lg:items-end lg:justify-between";
    const catalogControlsClass = forcedMobilePreview
        ? "grid w-full grid-cols-2 gap-2"
        : "grid w-full grid-cols-2 gap-2 sm:flex sm:flex-row sm:gap-3 lg:w-auto";
    const catalogSearchClass = forcedMobilePreview
        ? "relative col-span-2 w-full min-w-0"
        : "relative col-span-2 w-full min-w-0 sm:col-auto sm:flex-1 lg:w-[min(36vw,420px)] lg:flex-none";
    const catalogSelectClass = forcedMobilePreview
        ? "min-h-11 w-full rounded-full border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none focus:border-[var(--sf-accent)] focus:ring-4 focus:ring-teal-100"
        : "min-h-11 w-full rounded-full border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none focus:border-[var(--sf-accent)] focus:ring-4 focus:ring-teal-100 sm:w-36 sm:px-4";
    const productLayoutClass = forcedNarrowPreview
        ? "grid gap-6"
        : "grid min-w-0 gap-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]";
    const filterAsideClass = forcedNarrowPreview ? "hidden" : "hidden lg:block";
    const filterButtonClass = forcedNarrowPreview
        ? "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
        : "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 lg:hidden";
    const mobileFilterOverlayClass = forcedNarrowPreview
        ? "fixed inset-0 z-[80] flex items-end bg-slate-950/50 backdrop-blur-sm"
        : "fixed inset-0 z-[80] flex items-end bg-slate-950/50 backdrop-blur-sm lg:hidden";
    const activeFilterChips = [
        filters.category && filters.category !== "All" ? { label: filters.category, onClear: () => onCategoryChange("All") } : null,
        filters.minRating ? { label: `${filters.minRating}.0+ rating`, onClear: () => onRatingChange("") } : null,
        filters.minPrice || filters.maxPrice ? { label: `৳${filters.minPrice || 0} - ${filters.maxPrice || "Any"}`, onClear: onClearFilters } : null,
        catalogSearch.trim() ? {
            label: `Search: ${catalogSearch.trim()}`,
            onClear: () => onCatalogSearchChange({ target: { value: "" } }),
        } : null,
    ].filter(Boolean);

    return (
        <>
            <EditorSelectionFrame editor={editor} id="allProducts" label="All Products" locked>
                <section id="products" className="bg-slate-50 py-7 sm:py-12">
                    <div className={containerClass}>
                        <div className={allProductsHeaderClass}>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{allProducts.title || "All Products"}</h2>
                                <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">{allProducts.subtitle || "Browse this shop's latest catalog"}</p>
                            </div>
                            <div className={catalogControlsClass}>
                                <label className={catalogSearchClass}>
                                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input value={catalogSearch} onChange={onCatalogSearchChange} aria-label="Search catalog" placeholder="Search catalog" className="min-h-11 w-full rounded-full border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--sf-accent)] focus:ring-4 focus:ring-teal-100" />
                                </label>
                                <select value={filters.sort} onChange={onSortChange} aria-label="Sort products" className={catalogSelectClass}>
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

                        <div className="mb-4 flex flex-col gap-2 px-1 sm:mb-5 sm:flex-row sm:items-center sm:justify-between sm:rounded-[1.25rem] sm:border sm:border-slate-200 sm:bg-white sm:p-3 sm:shadow-sm">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                                Showing {filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"}
                            </p>
                            {activeFilterChips.length > 0 ? (
                                <div className="flex min-w-0 flex-wrap gap-2">
                                    {activeFilterChips.map((chip) => (
                                        <button
                                            key={chip.label}
                                            type="button"
                                            onClick={chip.onClear}
                                            aria-label={`Remove filter ${chip.label}`}
                                            className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--sf-accent-bg)] px-3 py-1.5 text-xs font-black text-[var(--sf-accent)]"
                                        >
                                            <span className="truncate">{chip.label}</span>
                                            <X size={13} />
                                        </button>
                                    ))}
                                    <button type="button" onClick={onClearFilters} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-500">
                                        Clear all
                                    </button>
                                </div>
                            ) : (
                                <span className="hidden text-xs font-semibold text-slate-400 sm:inline">Use filters to narrow results</span>
                            )}
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
                            <main className="min-w-0">
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
                                        <button type="button" onClick={() => onPageChange(filters.page - 1)} disabled={filters.page === 1} aria-label="Previous product page" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 disabled:opacity-40">Previous</button>
                                        {Array.from({ length: Math.min(pagination.pages, 5) }, (_, index) => {
                                            const pageNumber = index + 1;
                                            return (
                                                <button key={pageNumber} type="button" onClick={() => onPageChange(pageNumber)} aria-label={`Go to product page ${pageNumber}`} aria-current={filters.page === pageNumber ? "page" : undefined} className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${filters.page === pageNumber ? "bg-[var(--sf-accent)] text-white" : "bg-white text-slate-600"}`}>
                                                    {pageNumber}
                                                </button>
                                            );
                                        })}
                                        <button type="button" onClick={() => onPageChange(filters.page + 1)} disabled={filters.page === pagination.pages} aria-label="Next product page" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 disabled:opacity-40">Next</button>
                                    </div>
                                )}
                            </main>
                        </div>
                    </div>
                </section>
            </EditorSelectionFrame>

            {mobileFiltersOpen && (
                <div className={mobileFilterOverlayClass} onClick={onFilterClose}>
                    <div className="max-h-[86vh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-5" onClick={(event) => event.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-black text-slate-950">Filter products</h2>
                            <button type="button" onClick={onFilterClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100" aria-label="Close filters">
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
        </>
    );
}
