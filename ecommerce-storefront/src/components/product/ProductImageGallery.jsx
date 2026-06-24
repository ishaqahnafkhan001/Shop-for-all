"use client";
import React, { useEffect, useMemo, useState, memo } from 'react';
import Image from 'next/image';
import { ImageOff, Zap } from 'lucide-react';
import { shouldUseUnoptimizedImage } from '@/lib/imageDomains';
import { getImageUrlFromValue, getProductImageAlt } from '@/lib/seo';

const ProductImageGallery = memo(function ProductImageGallery({ images, category, displayDiscount, productTitle, imageAltText }) {
    const [activeIdx,    setActiveIdx]    = useState(0);
    const [isZoomed,     setIsZoomed]     = useState(false);
    const [failedImages, setFailedImages] = useState(() => new Set());
    const safeImages = useMemo(() => (images || [])
        .map(image => ({
            src: getImageUrlFromValue(image),
            alt: getProductImageAlt({
                product: { title: productTitle, imageAltText },
                image
            })
        }))
        .filter(image => image.src), [imageAltText, images, productTitle]);
    const displayImages = useMemo(
        () => safeImages.filter(image => !failedImages.has(image.src)),
        [safeImages, failedImages]
    );
    const primaryImage = displayImages?.[0];
    const activeImage = displayImages[activeIdx] || primaryImage;

    useEffect(() => {
        setActiveIdx(0);
    }, [primaryImage]);

    useEffect(() => {
        if (activeIdx > 0 && activeIdx >= displayImages.length) setActiveIdx(0);
    }, [activeIdx, displayImages.length]);

    const handleImageError = (image) => {
        setFailedImages(prev => {
            const next = new Set(prev);
            next.add(image.src);
            return next;
        });
    };

    return (
        <div className="min-w-0 lg:sticky lg:top-28">
            <div
                className="group relative flex aspect-[4/5] max-h-[620px] min-h-[320px] cursor-crosshair items-center justify-center overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-teal-50/50 p-4 shadow-sm shadow-slate-200/70 transition-all duration-500 hover:shadow-xl hover:shadow-teal-100/70 sm:aspect-[5/4] sm:p-6 lg:aspect-[4/5] lg:rounded-[2.25rem] xl:aspect-square"
                onMouseEnter={() => setIsZoomed(true)}
                onMouseLeave={() => setIsZoomed(false)}
            >
                {activeImage ? (
                    <Image
                        src={activeImage.src}
                        alt={activeImage.alt}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        priority={activeIdx === 0}
                        onError={() => handleImageError(activeImage)}
                        unoptimized={shouldUseUnoptimizedImage(activeImage.src)}
                        className={`object-contain p-3 transition-transform duration-700 ease-out sm:p-5 ${isZoomed ? 'scale-105' : 'scale-100'}`}
                    />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-white/70 text-center text-slate-400">
                        <ImageOff size={48} />
                        <p className="mt-3 text-sm font-bold text-slate-500">Image unavailable</p>
                        <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">Add or replace this product image from the admin catalog.</p>
                    </div>
                )}

                {category && (
                    <div className="absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-col gap-2 sm:left-6 sm:top-6">
                        <span className="truncate rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-slate-700 shadow-sm backdrop-blur-md">
                            {category}
                        </span>
                    </div>
                )}

                {displayDiscount > 0 && (
                    <div className="absolute right-4 top-4 flex items-center rounded-full bg-red-600 px-3 py-1.5 text-xs font-black text-white shadow-lg shadow-red-200 sm:right-6 sm:top-6">
                        <Zap size={14} className="mr-1.5 fill-current" />
                        {displayDiscount}% OFF
                    </div>
                )}
            </div>

            {displayImages.length > 1 && (
                <div className="mt-4">
                    <div className="flex gap-3 overflow-x-auto px-1 py-2 scrollbar-hide">
                    {displayImages.map((img, idx) => (
                        <button
                            key={img.src}
                            type="button"
                            onClick={() => setActiveIdx(idx)}
                            aria-label={`View product image ${idx + 1}`}
                            aria-pressed={activeIdx === idx}
                            className={`relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-2xl bg-white transition-all duration-300 sm:h-20 sm:w-20
                                ${activeIdx === idx
                                ? 'ring-2 ring-[var(--sf-accent)] ring-offset-2 scale-105 shadow-md'
                                : 'border border-slate-200 opacity-75 hover:border-[var(--sf-accent)]/50 hover:opacity-100'
                            }`}
                        >
                            <Image src={img.src} alt={`${img.alt} thumbnail ${idx + 1}`} fill sizes="80px" onError={() => handleImageError(img)} unoptimized={shouldUseUnoptimizedImage(img.src)} className="object-cover" />
                        </button>
                    ))}
                    </div>
                    <p className="px-1 text-xs font-semibold text-slate-400">Swipe or tap thumbnails to preview more angles.</p>
                </div>
            )}
        </div>
    );
});

export default ProductImageGallery;
