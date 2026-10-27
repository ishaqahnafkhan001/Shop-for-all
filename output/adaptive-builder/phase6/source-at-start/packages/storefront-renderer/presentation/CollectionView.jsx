'use client';

import { ArrowLeft, Layers3, PackageX } from 'lucide-react';
import { Link } from './Runtime.jsx';
import SafeProductImage from './SafeProductImage.jsx';
import { ProductCard } from '../reference/StorefrontProductCard.jsx';
import { optimizeCloudinaryImage } from '../reference/referenceCore.jsx';




export function CollectionView({ adaptiveParts = false, atelier, collection, filters, gridClass, gridGapClass, normalizedProducts, page, pagination, presentationVariant, productActions, shop, themedProductCard, total, totalPages, updateQuery }) { return (<div className={atelier ? "sf-page atelier-catalog" : "sf-page"}>
            <section data-ab-surface={adaptiveParts ? '' : undefined} className="border-b border-slate-200 bg-slate-50/80">
                <div className="sf-shell-wide py-6 sm:py-10">
                    <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-[var(--sf-accent)]">
                        <ArrowLeft size={16} />
                        Back to store
                    </Link>
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
                        <div className="min-w-0">
                            <div data-ab-surface={adaptiveParts ? '' : undefined} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm">
                                <Layers3 size={14} />
                                Collection
                            </div>
                            <h1 data-ab-part={adaptiveParts ? 'title' : undefined} className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                                {collection.title}
                            </h1>
                            {collection.description && (
                                <p data-ab-part={adaptiveParts ? 'description' : undefined} className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600 sm:text-base">
                                    {collection.description}
                                </p>
                            )}
                            <p className="mt-4 text-sm font-bold text-slate-500">
                                {total} product{total === 1 ? "" : "s"}
                            </p>
                        </div>
                        {collection.image && (
                            <div data-ab-surface={adaptiveParts ? '' : undefined} data-ab-part={adaptiveParts ? 'cover' : undefined} data-atelier-part={atelier ? "catalog-cover" : undefined} className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-white bg-white shadow-xl shadow-slate-200/70">
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
                        <select data-ab-part={adaptiveParts ? 'sort' : undefined}
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
                    <div data-ab-surface={adaptiveParts ? '' : undefined} data-ab-part={adaptiveParts ? 'empty' : undefined} className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
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
                        <div data-ab-part={adaptiveParts ? 'listing' : undefined} className={`grid ${gridClass} ${gridGapClass} ${normalizedProducts.length === 1 ? "mx-auto w-full max-w-[20rem] sm:mx-0 sm:max-w-none" : ""}`}>
                            {normalizedProducts.map((product, index) => (
                                <ProductCard adaptiveParts={adaptiveParts}
                                    key={product._id}
                                    presentationVariant={presentationVariant}
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
                            <nav data-ab-part={adaptiveParts ? 'pagination' : undefined} aria-label="Collection pagination" className="mt-8 flex flex-wrap items-center justify-center gap-3">
                                <button data-ab-surface={adaptiveParts ? '' : undefined}
                                    type="button"
                                    disabled={page <= 1 || pagination?.hasPrevPage === false}
                                    onClick={() => updateQuery({ page: Math.max(1, page - 1) })}
                                    className="min-h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 disabled:opacity-40"
                                >
                                    Previous
                                </button>
                                <span className="text-sm font-black text-slate-500">Page {page} of {totalPages}</span>
                                <button data-ab-surface={adaptiveParts ? '' : undefined}
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
        </div>); }
