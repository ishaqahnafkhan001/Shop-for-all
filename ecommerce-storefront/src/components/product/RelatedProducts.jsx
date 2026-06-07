"use client";
import React, { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const RelatedProducts = memo(function RelatedProducts({ subdomain, products }) {
    if (!products?.length) return null;

    return (
        <div className="mt-10 border-t border-slate-200 pt-8">
            <h2 className="mb-6 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                Complete Your Look
            </h2>

            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 scrollbar-hide">
                {products.map(item => (
                    <Link
                        href={`/${subdomain}/products/${item._id}`}
                        key={item._id}
                        className="group w-64 flex-shrink-0 snap-start rounded-3xl border border-slate-200 bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70"
                    >
                        <div className="relative mb-4 flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-slate-50 p-4">
	                            <Image
	                                src={item.images[0]}
	                                alt={item.title}
	                                fill
	                                sizes="288px"
	                                className="object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-105"
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
                ))}
            </div>
        </div>
    );
});

export default RelatedProducts;
