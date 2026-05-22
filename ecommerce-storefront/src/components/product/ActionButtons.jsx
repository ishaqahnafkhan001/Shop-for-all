"use client";
import React, { memo } from 'react';
import { ShoppingCart, Truck, ShieldCheck } from 'lucide-react';

const ActionButtons = memo(function ActionButtons({ displayStock, onAddToCart, onBuyNow }) {
    return (
        <div className="mt-auto space-y-4">
            {/* Stock badge */}
            <div className="mb-6 flex items-center justify-between">
                {displayStock > 0 ? (
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-green-50 text-green-700 border border-green-200/50 shadow-sm">
                        <span className="relative flex h-2.5 w-2.5 mr-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                        </span>
                        In Stock ({displayStock} units ready)
                    </span>
                ) : (
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-red-50 text-red-700 border border-red-200/50">
                        Out of Stock
                    </span>
                )}
            </div>

            <button
                onClick={onAddToCart}
                disabled={displayStock <= 0}
                className="group w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-[var(--sf-accent)] to-[var(--sf-accent-strong,blue-600)] text-white px-8 py-5 rounded-2xl font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_15px_30px_-10px_var(--sf-accent)] hover:shadow-[0_20px_40px_-10px_var(--sf-accent)] hover:-translate-y-1"
            >
                <ShoppingCart size={24} className="group-hover:animate-bounce" />
                <span>{displayStock > 0 ? 'Add to Cart' : 'Currently Unavailable'}</span>
            </button>

            {displayStock > 0 && (
                <button
                    onClick={onBuyNow}
                    className="w-full block text-center bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg hover:-translate-y-1"
                >
                    Proceed to Checkout
                </button>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 flex flex-col items-start gap-2 hover:bg-gray-50 transition-colors">
                    <div className="bg-white p-2 rounded-xl shadow-sm text-[var(--sf-accent)]">
                        <Truck size={20} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Fast &amp; Reliable Delivery</span>
                </div>
                <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 flex flex-col items-start gap-2 hover:bg-gray-50 transition-colors">
                    <div className="bg-white p-2 rounded-xl shadow-sm text-[var(--sf-accent)]">
                        <ShieldCheck size={20} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">100% Secure Checkout</span>
                </div>
            </div>
        </div>
    );
});

export default ActionButtons;