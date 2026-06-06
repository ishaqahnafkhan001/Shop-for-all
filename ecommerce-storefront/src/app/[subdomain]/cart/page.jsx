"use client";
import React from 'react';
import { useCart } from '@/context/CartContext';
import { Trash2, ShoppingBag, Plus, Minus, ArrowLeft, ShieldCheck, Truck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function CartPage() {
    const { cartItems, cartTotal, removeFromCart, updateQuantity } = useCart();

    const subtotal = cartTotal;
    const shipping = cartItems.length > 0 ? 60 : 0;

    // Calculate total savings based on your Product Schema pricing logic
    const totalSavings = cartItems.reduce((acc, item) => {
        const original = item.pricing?.sellingPrice || item.sellingPrice || 0;
        const current = item.finalPrice || item.sellingPrice || 0;
        const saving = original > current ? (original - current) * item.quantity : 0;
        return acc + saving;
    }, 0);

    const total = subtotal + shipping;

    // EMPTY STATE
    if (cartItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] py-20 px-4 text-center">
                <div className="bg-gray-50 p-6 rounded-full mb-6">
                    <ShoppingBag size={64} className="text-gray-300" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
                <p className="text-gray-500 mb-8 max-w-md">
                    Looks like you haven&apos;t added anything to your cart yet.
                </p>
                <Link
                    href="/"
                    className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:opacity-80 transition shadow-lg"
                >
                    Continue Shopping
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl">
            <div className="flex items-center mb-8">
                <Link href="/" className="text-gray-500 hover:text-black transition mr-4">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-3xl font-extrabold text-gray-900">Your Cart ({cartItems.length})</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Left Side: Items */}
                <div className="lg:col-span-2 space-y-4">
                    {cartItems.map((item) => (
                        <div key={item._id} className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">

                                <div className="flex flex-col sm:flex-row items-start gap-5 flex-1 min-w-0 w-full">
                                    {/* Product Image */}
                                    <div className="relative w-full sm:w-28 sm:h-28 aspect-square bg-gray-50 rounded-xl flex-shrink-0 border border-gray-100 overflow-hidden">
                                        <Image
                                            src={item.imageUrl || (item.images && item.images[0]) || 'https://via.placeholder.com/150'}
                                            alt={item.title}
                                            fill
                                            sizes="(max-width: 640px) 100vw, 112px"
                                            className="object-cover"
                                        />
                                    </div>

                                    {/* Product Details */}
                                    <div className="flex flex-col flex-1 min-w-0 w-full">

                                        {/* Category & SKU */}
                                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                            {item.category && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--sf-accent,blue-600)]">
                                                    {item.category}
                                                </span>
                                            )}
                                            {(item.sku || item.selectedVariant?.sku) && (
                                                <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    SKU: {item.selectedVariant?.sku || item.sku}
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="font-bold text-lg text-gray-900 line-clamp-1 mb-1" title={item.title}>
                                            {item.title}
                                        </h3>

                                        {/* Description Snippet */}
                                        {(item.shortDescription || item.description) && (
                                            <p className="text-xs text-gray-500 line-clamp-2 mb-2 leading-relaxed">
                                                {item.shortDescription || item.description}
                                            </p>
                                        )}

                                        {/* RENDER VARIANTS (JSX Safe) */}
                                        {item.selectedVariant && item.selectedVariant.attributes && (
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {item.selectedVariant.attributes.map((attr, idx) => (
                                                    <span key={idx} className="text-[11px] uppercase tracking-wider border border-gray-200 bg-gray-50 px-2 py-1 rounded-md text-gray-700 font-semibold">
                                                        <span className="text-gray-400 mr-1">{attr.name}:</span>
                                                        {attr.value}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Pricing */}
                                        <div className="mt-auto flex items-center gap-2">
                                            <p className="font-extrabold text-[var(--sf-accent,blue-600)] text-lg">
                                                ৳ {item.finalPrice || item.sellingPrice}
                                            </p>
                                            {item.pricing?.discount > 0 && (
                                                <p className="text-sm text-gray-400 line-through">
                                                    ৳ {item.pricing.sellingPrice}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center space-x-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-gray-100 pt-4 sm:pt-0">
                                    <div className="flex flex-col items-center sm:items-end">
                                        <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 overflow-hidden shadow-sm">
                                            <button
                                                onClick={() => updateQuantity(item._id, item.quantity - 1)}
                                                disabled={item.quantity <= 1}
                                                className="p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className="w-10 text-center font-bold text-sm bg-white py-2">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => updateQuantity(item._id, item.quantity + 1)}
                                                disabled={item.quantity >= (item.selectedVariant?.stock || item.stock || 99)}
                                                className="p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                        {/* Stock Alert logic */}
                                        {item.quantity >= (item.selectedVariant?.stock || item.stock) && (
                                            <span className="text-[10px] text-orange-600 mt-1 font-bold flex items-center">
                                                Limit reached
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => removeFromCart(item._id)}
                                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-lg transition-colors"
                                        title="Remove item"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Side: Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 sticky top-24">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

                        <div className="space-y-3 text-sm mb-6">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span className="font-medium text-gray-900">৳ {subtotal}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Shipping estimate</span>
                                <span className="font-medium text-gray-900">৳ {shipping}</span>
                            </div>

                            {totalSavings > 0 && (
                                <div className="flex justify-between text-green-700 font-bold bg-green-100/50 p-3 rounded-xl border border-green-200/50">
                                    <span>Total Savings</span>
                                    <span>- ৳ {totalSavings}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-center border-t border-gray-200 pt-5 mb-8">
                            <span className="font-bold text-gray-900 text-lg">Total</span>
                            <span className="text-3xl font-black text-[var(--sf-accent,gray-900)]">৳ {total}</span>
                        </div>

                        <Link href="/checkout" className="w-full block text-center bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-[var(--sf-accent,black)] hover:-translate-y-0.5 transition-all shadow-lg">
                            Proceed to Checkout
                        </Link>

                        {/* Trust Info */}
                        <div className="mt-8 space-y-4 pt-6 border-t border-gray-200">
                            <div className="flex items-center gap-3 text-sm text-gray-600 font-medium bg-white p-3 rounded-xl border border-gray-100">
                                <ShieldCheck size={18} className="text-green-600 flex-shrink-0" />
                                <span>Authentic Products Guaranteed</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600 font-medium bg-white p-3 rounded-xl border border-gray-100">
                                <Truck size={18} className="text-[var(--sf-accent,blue-600)] flex-shrink-0" />
                                <span>Fast & secure delivery</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
