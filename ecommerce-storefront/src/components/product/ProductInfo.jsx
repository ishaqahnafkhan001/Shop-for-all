"use client";
import React, { memo } from 'react';
import { BadgeCheck, Star, Wallet } from 'lucide-react';

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
        <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
                <StarRow rating={averageRating} />
                <span className="text-sm font-semibold text-slate-500">
                    {numReviews > 0 ? `${averageRating} / 5 from ${numReviews} reviews` : 'No reviews yet'}
                </span>
            </div>

            <h1 className="text-3xl font-black leading-[1.05] tracking-tight text-slate-950 sm:text-4xl lg:text-[2.65rem]">
                {title}
            </h1>

            <div className="flex flex-wrap gap-2">
                {currentVariant?.sku && (
                    <p className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-500">
                        SKU: {currentVariant.sku}
                    </p>
                )}
                {currentVariant?.barcode && (
                    <p className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-500">
                        Barcode: {currentVariant.barcode}
                    </p>
                )}
                <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-700">
                    <BadgeCheck size={13} />
                    Verified store item
                </p>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-5 rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-teal-50/70 p-4 sm:p-5">
                <div className="flex flex-col">
                    <span className="mb-1 text-sm font-bold text-slate-500">Price</span>
                    <p className="text-3xl font-black text-slate-950 sm:text-4xl">
                        ৳ {displayFinalPrice}
                    </p>
                </div>
                {displayDiscount > 0 && (
                    <div className="pb-1">
                        <p className="text-lg font-semibold text-slate-400 line-through">৳ {baseOriginalPrice}</p>
                        <span className="sf-badge sf-badge-success mt-2">{displayDiscount}% off</span>
                    </div>
                )}
                <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-sm">
                    <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                        <Wallet size={13} />
                        Payment
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-900">Cash on delivery</p>
                </div>
            </div>

            <p className="text-base leading-7 text-slate-600">
                {description || 'Elevate your daily routine with this premium quality product.'}
            </p>
        </div>
    );
});

export { StarRow };
export default ProductInfo;
