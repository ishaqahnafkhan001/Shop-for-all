"use client";
import React from 'react';
import { useCart } from '@/context/CartContext';
import { Trash2, ShoppingBag, Plus, Minus, ArrowLeft, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import Link from 'next/link';

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
                    Looks like you haven't added anything to your cart yet.
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
                        <div key={item._id} className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">

                                <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                                    <div className="w-24 h-24 bg-gray-50 rounded-xl flex-shrink-0 border overflow-hidden">
                                        <img
                                            src={item.imageUrl || (item.images && item.images[0]) || 'https://via.placeholder.com/150'}
                                            alt={item.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 line-clamp-1">{item.title}</h3>

                                        {/* RENDER VARIANTS (JSX Safe) */}
                                        {item.selectedVariant && item.selectedVariant.attributes && (
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {item.selectedVariant.attributes.map((attr, idx) => (
                                                    <span key={idx} className="text-[10px] uppercase tracking-wider bg-gray-100 px-2 py-1 rounded text-gray-600 font-bold">
                                                        {attr.name}: {attr.value}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="mt-2 flex items-center gap-2">
                                            <p className="font-bold text-blue-600">৳ {item.finalPrice || item.sellingPrice}</p>
                                            {item.pricing?.discount > 0 && (
                                                <p className="text-xs text-gray-400 line-through">৳ {item.pricing.sellingPrice}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-6 w-full sm:w-auto justify-between">
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                                            <button
                                                onClick={() => updateQuantity(item._id, item.quantity - 1)}
                                                disabled={item.quantity <= 1}
                                                className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-30"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item._id, item.quantity + 1)}
                                                disabled={item.quantity >= (item.selectedVariant?.stock || item.stock || 99)}
                                                className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-30"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                        {/* Stock Alert logic */}
                                        {item.quantity >= (item.selectedVariant?.stock || item.stock) && (
                                            <span className="text-[10px] text-orange-600 mt-1 font-bold">Limit reached</span>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => removeFromCart(item._id)}
                                        className="text-gray-400 hover:text-red-600 p-2 transition"
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
                                <div className="flex justify-between text-green-600 font-bold bg-green-100/50 p-2 rounded-lg">
                                    <span>Total Savings</span>
                                    <span>- ৳ {totalSavings}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-center border-t border-gray-200 pt-4 mb-8">
                            <span className="font-bold text-gray-900">Total</span>
                            <span className="text-2xl font-black text-gray-900">৳ {total}</span>
                        </div>

                        <Link href="/checkout" className="w-full block text-center bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg">
                            Proceed to Checkout
                        </Link>

                        {/* Trust Info */}
                        <div className="mt-8 space-y-4 pt-6 border-t border-gray-200">
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                <ShieldCheck size={16} className="text-green-600" />
                                <span>Authentic Products Guaranteed</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                <Truck size={16} className="text-gray-400" />
                                <span>Delivery within 2-3 business days</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}