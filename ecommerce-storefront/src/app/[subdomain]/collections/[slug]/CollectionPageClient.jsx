"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Layers3, PackageX } from "lucide-react";
import { useStorefrontProductActions } from "@/hooks/useStorefrontProductActions";
import { normalizeTheme } from "@/lib/theme";
import SafeProductImage from "@/components/storefront/SafeProductImage";
import { ProductCard } from "@/components/storefront/reference/StorefrontProductCard";
import {
    desktopGridClasses,
    optimizeCloudinaryImage,
    productGridGapClasses,
    tabletGridClasses
} from "@/components/storefront/reference/referenceCore";

export default function CollectionPageClient({ shop, collection, products = [], pagination = {}, filters = {} }) {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
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
    const total = Number(pagination?.totalItems ?? pagination?.total) || normalizedProducts.length;
    const page = Math.max(Number(pagination?.page ?? filters.page) || 1, 1);
    const totalPages = Math.max(Number(pagination?.totalPages ?? pagination?.pages) || 1, 1);

    const updateQuery = (updates = {}) => {
        const next = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value === undefined || value === null || value === "" || value === "newest") {
                next.delete(key);
            } else {
                next.set(key, String(value));
            }
        });
        const query = next.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
    };

    return (
        <div className="sf-page">
            <section className="border-b border-slate-200 bg-slate-50/80">
                <div className="sf-shell-wide py-6 sm:py-10">
                    <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-[var(--sf-accent)]">
                        <ArrowLeft size={16} />
                        Back to store
                    </Link>
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm">
                                <Layers3 size={14} />
                                Collection
                            </div>
                            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                                {collection.title}
                            </h1>
                            {collection.description && (
                                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600 sm:text-base">
                                    {collection.description}
                                </p>
                            )}
                            <p className="mt-4 text-sm font-bold text-slate-500">
                                {total} product{total === 1 ? "" : "s"}
                            </p>
                        </div>
                        {collection.image && (
                            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-white bg-white shadow-xl shadow-slate-200/70">
                                <SafeProductImage
                                    src={optimizeCloudinaryImage(collection.image, { width: 900, crop: "fill" })}
                                    alt={`${collection.title} collection`}
                                    fill
                                    sizes="(max-width: 1024px) 100vw, 360px"
                                    priority
                                    className="object-cover"
                                    fallbackClassName="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="sf-shell-wide py-8 sm:py-12">
                <div className="mb-5 flex justify-end">
                    <label className="flex items-center gap-2 text-sm font-black text-slate-600">
                        Sort
                        <select
                            value={filters.sort || "newest"}
                            onChange={(event) => updateQuery({ sort: event.target.value, page: 1 })}
                            className="sf-field min-h-11 rounded-full px-4 py-2 text-sm"
                        >
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                            <option value="rating_desc">Best Rated</option>
                        </select>
                    </label>
                </div>
                {normalizedProducts.length === 0 ? (
                    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
                        <PackageX size={48} className="mx-auto mb-4 text-slate-300" />
                        <h2 className="text-2xl font-black text-slate-950">No products in this collection yet</h2>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                            This collection is live, but there are no published products available right now.
                        </p>
                        <Link href="/" className="mt-6 inline-flex rounded-full bg-[var(--sf-accent)] px-5 py-3 text-sm font-black text-white">
                            Browse all products
                        </Link>
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
                                    onProductAdd={(item) => productActions.addProductToCart(item, { location: 'collection' })}
                                    onProductBuyNow={(item) => productActions.buyNow(item, { location: 'collection' })}
                                    onWishlistToggle={productActions.toggleWishlist}
                                    isWishlisted={productActions.isWishlisted}
                                    LinkComponent={Link}
                                />
                            ))}
                        </div>
                        {totalPages > 1 && (
                            <nav aria-label="Collection pagination" className="mt-8 flex flex-wrap items-center justify-center gap-3">
                                <button
                                    type="button"
                                    disabled={page <= 1 || pagination?.hasPrevPage === false}
                                    onClick={() => updateQuery({ page: Math.max(1, page - 1) })}
                                    className="min-h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 disabled:opacity-40"
                                >
                                    Previous
                                </button>
                                <span className="text-sm font-black text-slate-500">Page {page} of {totalPages}</span>
                                <button
                                    type="button"
                                    disabled={page >= totalPages || pagination?.hasNextPage === false}
                                    onClick={() => updateQuery({ page: page + 1 })}
                                    className="min-h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </nav>
                        )}
                    </>
                )}
            </section>
            {productActions.variantPicker}
        </div>
    );
}
