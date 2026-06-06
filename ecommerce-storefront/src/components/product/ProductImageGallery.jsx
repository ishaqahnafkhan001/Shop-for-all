"use client";
import React, { useState, memo } from 'react';
import Image from 'next/image';
import { Zap } from 'lucide-react';

const ProductImageGallery = memo(function ProductImageGallery({ images, category, displayDiscount }) {
    const [activeIdx,    setActiveIdx]    = useState(0);
    const [isZoomed,     setIsZoomed]     = useState(false);

    return (
        <div className="flex flex-col space-y-6">
            {/* Main image */}
            <div
                className="bg-white rounded-3xl overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] border border-gray-100/50 aspect-square flex items-center justify-center p-8 relative group cursor-crosshair transition-all duration-500 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)]"
                onMouseEnter={() => setIsZoomed(true)}
                onMouseLeave={() => setIsZoomed(false)}
            >
                <Image
                    src={images[activeIdx]}
                    alt="Product"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={activeIdx === 0}
                    className={`object-contain transition-transform duration-700 ease-out ${isZoomed ? 'scale-110' : 'scale-100'}`}
                />

                <div className="absolute top-6 left-6 flex flex-col gap-2">
                    <span className="bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-gray-800 shadow-sm border border-white/50">
                        {category}
                    </span>
                </div>

                {displayDiscount > 0 && (
                    <div className="absolute top-6 right-6 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-red-500/30 flex items-center animate-pulse-slow">
                        <Zap size={14} className="mr-1.5 fill-current" />
                        {displayDiscount}% OFF
                    </div>
                )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
                <div className="flex space-x-4 overflow-x-auto py-2 scrollbar-hide px-1">
                    {images.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveIdx(idx)}
                            className={`w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 transition-all duration-300 relative
                                ${activeIdx === idx
                                ? 'ring-2 ring-[var(--sf-accent)] ring-offset-2 scale-105 shadow-md'
                                : 'border border-gray-200 hover:border-[var(--sf-accent)]/50 hover:scale-105 opacity-70 hover:opacity-100'
                            }`}
                        >
                            <Image src={img} alt="" fill sizes="80px" className="object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
});

export default ProductImageGallery;
