"use client";
import React, { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const RelatedProducts = memo(function RelatedProducts({ subdomain, products }) {
    if (!products?.length) return null;

    return (
        <div className="mt-32 pt-16 border-t border-gray-100">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-10">
                Complete Your Look
            </h2>

            <div className="flex overflow-x-auto gap-8 pb-12 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
                {products.map(item => (
                    <Link
                        href={`/${subdomain}/products/${item._id}`}
                        key={item._id}
                        className="group w-72 flex-shrink-0 snap-start bg-white border border-gray-100 rounded-3xl p-5 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-2"
                    >
                        <div className="aspect-[4/5] bg-gray-50/50 rounded-2xl mb-5 overflow-hidden relative flex items-center justify-center p-4">
	                            <Image
	                                src={item.images[0]}
	                                alt={item.title}
	                                fill
	                                sizes="288px"
	                                className="object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-700"
	                            />
                            {item.discount > 0 && (
                                <div className="absolute top-3 right-3 bg-red-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-md shadow-red-500/30">
                                    -{item.discount}%
                                </div>
                            )}
                        </div>
                        <div className="space-y-2 px-1">
                            <h3 className="font-bold text-gray-900 text-lg line-clamp-1 group-hover:text-[var(--sf-accent)] transition-colors">
                                {item.title}
                            </h3>
                            <div className="flex items-center gap-3">
                                <p className="font-extrabold text-[var(--sf-accent)] text-lg">৳ {item.finalPrice}</p>
                                {item.discount > 0 && (
                                    <p className="text-sm text-gray-400 line-through font-medium">৳ {item.sellingPrice}</p>
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
