"use client";
import React, { memo } from 'react';
import { ShoppingCart, Truck, ShieldCheck } from 'lucide-react';

const ActionButtons = memo(function ActionButtons({ displayStock, onAddToCart, onBuyNow }) {
    return (
        <div className="mt-auto space-y-4">
            {/* Stock badge */}
            <div className="flex items-center justify-between">
                {displayStock > 0 ? (
                    <span className="sf-badge sf-badge-success">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        In Stock ({displayStock} units ready)
                    </span>
                ) : (
                    <span className="sf-badge bg-red-50 text-red-700">
                        Out of Stock
                    </span>
                )}
            </div>

            <button
                onClick={onAddToCart}
                disabled={displayStock <= 0}
                    className="sf-btn sf-btn-primary w-full px-8 py-4 text-base disabled:cursor-not-allowed disabled:opacity-50"
            >
                <ShoppingCart size={22} />
                <span>{displayStock > 0 ? 'Add to Cart' : 'Currently Unavailable'}</span>
            </button>

            {displayStock > 0 && (
                <button
                    onClick={onBuyNow}
                    className="sf-btn sf-btn-secondary w-full py-4"
                >
                    Buy now
                </button>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-4 pt-3">
                <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-cyan-50 p-5">
                    <div className="w-max rounded-xl bg-white p-2 text-[var(--sf-accent)] shadow-sm">
                        <Truck size={20} />
                    </div>
                    <span className="mt-3 block text-sm font-bold text-slate-700">Fast delivery</span>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50 p-5">
                    <div className="w-max rounded-xl bg-white p-2 text-[var(--sf-accent)] shadow-sm">
                        <ShieldCheck size={20} />
                    </div>
                    <span className="mt-3 block text-sm font-bold text-slate-700">Secure checkout</span>
                </div>
            </div>
        </div>
    );
});

export default ActionButtons;
