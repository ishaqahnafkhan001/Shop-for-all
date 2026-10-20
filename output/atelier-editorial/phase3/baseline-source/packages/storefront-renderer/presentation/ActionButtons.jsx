"use client";
import React, { memo } from 'react';
import { Headphones, RefreshCcw, ShieldCheck, ShoppingCart, Truck, Wallet } from 'lucide-react';

const trustItems = [
    { icon: ShieldCheck, title: 'Secure checkout', text: 'Encrypted order flow' },
    { icon: RefreshCcw, title: 'Easy returns', text: 'Clear return support' },
    { icon: Truck, title: 'Fast delivery', text: 'Tracked local shipping' },
    { icon: Wallet, title: 'Cash on delivery', text: 'Pay when it arrives' },
];

const ActionButtons = memo(function ActionButtons({ displayStock, onAddToCart, onBuyNow }) {
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Ready for checkout
                </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={onAddToCart}
                    disabled={displayStock <= 0}
                    className="sf-btn sf-btn-primary w-full px-8 py-4 text-base disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
                >
                    <ShoppingCart size={22} />
                    <span>{displayStock > 0 ? 'Add to Cart' : 'Currently Unavailable'}</span>
                </button>
                {displayStock > 0 && (
                    <button
                        type="button"
                        onClick={onBuyNow}
                        className="sf-btn sf-btn-secondary w-full py-4 sm:col-span-2"
                    >
                        Buy now
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 gap-3 pt-3 min-[420px]:grid-cols-2">
                {trustItems.map(({ icon: Icon, title, text }) => (
                    <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sf-accent-bg)] text-[var(--sf-accent)]">
                                <Icon size={18} />
                            </div>
                            <div className="min-w-0">
                                <span className="block text-sm font-black text-slate-800">{title}</span>
                                <span className="mt-0.5 block text-xs font-semibold leading-5 text-slate-500">{text}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                    <Headphones size={19} className="mt-0.5 shrink-0 text-emerald-600" />
                    <p className="text-sm font-semibold leading-6 text-emerald-800">
                        Need help before ordering? Customer support is available for sizing, delivery, and payment questions.
                    </p>
                </div>
            </div>
        </div>
    );
});

export default ActionButtons;
