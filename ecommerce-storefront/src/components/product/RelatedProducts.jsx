"use client";
import React, { memo } from 'react';
import Link from 'next/link';
import SafeProductImage from '@/components/storefront/SafeProductImage';
import { getImageUrlFromValue, getProductImageAlt } from '@/lib/seo';

const RelatedProducts = memo(function RelatedProducts({ products }) {
    if (!products?.length) return null;

    return (
        <section className="mt-10">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="sf-kicker">More from this shop</p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                        Complete your look
                    </h2>
                </div>
                <p className="text-sm font-semibold text-slate-500">Swipe to browse similar items.</p>
            </div>

            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 scrollbar-hide">
                {products.map(item => {
                    const image = item.images?.[0] || item.imageUrl || '';
                    return (
                        <Link
                            href={`/products/${item.slug || item._id}`}
                            key={item._id}
                            className="group w-64 flex-shrink-0 snap-start rounded-3xl border border-slate-200 bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70"
                        >
                            <div className="relative mb-4 flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-slate-50 p-4">
                                <SafeProductImage
                                    src={getImageUrlFromValue(image)}
                                    alt={getProductImageAlt({ product: item, image })}
                                    fill
                                    sizes="288px"
                                    className="object-contain transition-transform duration-700 group-hover:scale-105"
                                    fallbackClassName="flex h-full w-full items-center justify-center text-slate-300"
                                    iconClassName="h-8 w-8"
                                />
                                {item.discount > 0 && (
                                    <div className="absolute right-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-xs font-black text-white shadow-md shadow-red-500/30">
                                        -{item.discount}%
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2 px-1">
                                <h3 className="line-clamp-1 text-base font-black text-slate-950 transition-colors group-hover:text-[var(--sf-accent)]">
                                    {item.title}
                                </h3>
                                <div className="flex items-center gap-3">
                                    <p className="text-lg font-black text-slate-950">৳ {item.finalPrice}</p>
                                    {item.discount > 0 && (
                                        <p className="text-sm font-semibold text-slate-400 line-through">৳ {item.sellingPrice}</p>
                                    )}
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
});

export default RelatedProducts;
