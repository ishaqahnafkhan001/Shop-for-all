"use client";
import React, { memo } from 'react';
import { Star } from 'lucide-react';

const StarRow = memo(function StarRow({ rating, size = 16 }) {
    return (
        <div className="flex text-yellow-400">
            {Array.from({ length: 5 }, (_, i) => (
                <Star
                    key={i}
                    size={size}
                    fill={i < Math.round(rating) ? 'currentColor' : 'none'}
                    className={i < Math.round(rating) ? '' : 'text-gray-300'}
                />
            ))}
        </div>
    );
});

const ProductInfo = memo(function ProductInfo({
                                                  title,
                                                  averageRating,
                                                  numReviews,
                                                  currentVariant,
                                                  baseOriginalPrice,
                                                  displayFinalPrice,
                                                  displayDiscount,
                                                  description,
                                              }) {
    return (
        <>
            {/* Rating row */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <StarRow rating={averageRating} />
                <span className="text-sm font-semibold text-slate-500">
                    ({averageRating} / 5 from {numReviews} Reviews)
                </span>
            </div>

            <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 md:text-5xl">
                {title}
            </h1>

            {currentVariant && (
                <p className="mb-5 inline-flex w-max rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-500">
                    SKU: {currentVariant.sku}
                </p>
            )}

            {/* Pricing */}
            <div className="mb-6 flex flex-wrap items-end gap-5 rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 p-6">
                <div className="flex flex-col">
                    <span className="mb-1 text-sm font-bold text-slate-500">Final Price</span>
                    <p className="text-4xl font-black text-slate-950">
                        ৳ {displayFinalPrice}
                    </p>
                </div>
                {displayDiscount > 0 && (
                    <div className="pb-1">
                        <p className="text-lg font-semibold text-slate-400 line-through">৳ {baseOriginalPrice}</p>
                        <span className="sf-badge sf-badge-success mt-2">{displayDiscount}% off</span>
                    </div>
                )}
            </div>

            <p className="mb-6 text-base leading-7 text-slate-600">
                {description || 'Elevate your daily routine with this premium quality product.'}
            </p>
        </>
    );
});

export { StarRow };
export default ProductInfo;
