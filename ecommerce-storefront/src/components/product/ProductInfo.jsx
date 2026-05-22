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
            <div className="mb-2 flex items-center gap-2">
                <StarRow rating={averageRating} />
                <span className="text-sm text-gray-500 font-medium">
                    ({averageRating} / 5 from {numReviews} Reviews)
                </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight leading-tight">
                {title}
            </h1>

            {currentVariant && (
                <p className="text-sm text-gray-500 bg-gray-100 inline-flex px-3 py-1 rounded-md font-mono mb-6 w-max">
                    SKU: {currentVariant.sku}
                </p>
            )}

            {/* Pricing */}
            <div className="flex items-end space-x-4 mb-6 p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100">
                <div className="flex flex-col">
                    <span className="text-sm text-gray-500 font-medium mb-1">Final Price</span>
                    <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--sf-accent)] to-purple-600">
                        ৳ {displayFinalPrice}
                    </p>
                </div>
                {displayDiscount > 0 && (
                    <p className="text-xl text-gray-400 line-through font-medium mb-1">
                        ৳ {baseOriginalPrice}
                    </p>
                )}
            </div>

            <p className="text-gray-600 text-lg leading-relaxed mb-8">
                {description || 'Elevate your daily routine with this premium quality product.'}
            </p>
        </>
    );
});

export { StarRow };
export default ProductInfo;