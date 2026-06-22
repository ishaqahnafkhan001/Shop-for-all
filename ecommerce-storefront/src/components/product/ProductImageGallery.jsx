"use client";
import React, { useEffect, useState, memo } from 'react';
import Image from 'next/image';
import { ShoppingBag, Zap } from 'lucide-react';
import { shouldUseUnoptimizedImage } from '@/lib/imageDomains';

const ProductImageGallery = memo(function ProductImageGallery({ images, category, displayDiscount }) {
    const [activeIdx,    setActiveIdx]    = useState(0);
    const [isZoomed,     setIsZoomed]     = useState(false);
    const safeImages = images?.filter(Boolean) || [];
    const primaryImage = safeImages?.[0];

    useEffect(() => {
        setActiveIdx(0);
    }, [primaryImage]);

    return (
        <div className="flex flex-col gap-5">
            {/* Main image */}
            <div
                className="group relative flex aspect-square cursor-crosshair items-center justify-center overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-indigo-50/50 p-7 shadow-sm transition-all duration-500 hover:shadow-xl hover:shadow-indigo-100/70 sm:p-9"
                onMouseEnter={() => setIsZoomed(true)}
                onMouseLeave={() => setIsZoomed(false)}
            >
                {primaryImage ? (
                    <Image
                        src={safeImages[activeIdx] || primaryImage}
                        alt="Product"
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        priority={activeIdx === 0}
                        unoptimized={shouldUseUnoptimizedImage(safeImages[activeIdx] || primaryImage)}
                        className={`object-contain transition-transform duration-700 ease-out ${isZoomed ? 'scale-110' : 'scale-100'}`}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                        <ShoppingBag size={56} />
                    </div>
                )}

                <div className="absolute left-4 top-4 flex flex-col gap-2 sm:left-6 sm:top-6">
                    <span className="rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-slate-700 shadow-sm backdrop-blur-md">
                        {category}
                    </span>
                </div>

                {displayDiscount > 0 && (
                    <div className="absolute right-4 top-4 flex items-center rounded-full bg-red-600 px-3 py-1.5 text-xs font-black text-white shadow-lg shadow-red-200 sm:right-6 sm:top-6">
                        <Zap size={14} className="mr-1.5 fill-current" />
                        {displayDiscount}% OFF
                    </div>
                )}
            </div>

            {/* Thumbnails */}
            {safeImages.length > 1 && (
                <div className="flex gap-3 overflow-x-auto px-1 py-2 scrollbar-hide">
                    {safeImages.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveIdx(idx)}
                            className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl transition-all duration-300
                                ${activeIdx === idx
                                ? 'ring-2 ring-[var(--sf-accent)] ring-offset-2 scale-105 shadow-md'
                                : 'border border-slate-200 opacity-75 hover:border-[var(--sf-accent)]/50 hover:opacity-100'
                            }`}
                        >
                            <Image src={img} alt="" fill sizes="80px" unoptimized={shouldUseUnoptimizedImage(img)} className="object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
});

export default ProductImageGallery;
