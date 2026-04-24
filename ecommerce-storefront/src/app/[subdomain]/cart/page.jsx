"use client";
import React from 'react';
import { useCart } from '@/context/CartContext';
import { Trash2, ShoppingBag, Plus, Minus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CartPage() {
    // ✨ THE FIX: Import cartItems and cartTotal
    const { cartItems, cartTotal, removeFromCart, updateQuantity } = useCart();

    // Calculate Costs
    const subtotal = cartTotal; // ✨ THE FIX: Use the pre-calculated math
    const shipping = cartItems.length > 0 ? 60 : 0; // Flat rate shipping (৳ 60)
    const total = subtotal + shipping;

    // EMPTY CART STATE
    if (cartItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] py-20 px-4 text-center">
                <div className="bg-gray-50 p-6 rounded-full mb-6">
                    <ShoppingBag size={64} className="text-gray-300" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
                <p className="text-gray-500 mb-8 max-w-md">
                    Looks like you haven't added anything to your cart yet. Explore our top categories and find something you love!
                </p>
                <Link
                    href="/"
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg hover:shadow-indigo-500/30"
                >
                    Continue Shopping
                </Link>
            </div>
        );
    }

    // ACTIVE CART STATE
    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl">
            <div className="flex items-center mb-8">
                <Link href="/" className="text-gray-500 hover:text-indigo-600 transition mr-4">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-3xl font-extrabold text-gray-900">Your Cart</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Left Side: Cart Items List */}
                <div className="lg:col-span-2 space-y-4">
                    {cartItems.map((item) => (
                        <div key={item._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition">

                            {/* Product Info */}
                            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                                <div className="w-20 h-20 bg-gray-50 rounded-xl flex-shrink-0 border border-gray-100 overflow-hidden">
                                    <img src={item.imageUrl || 'https://via.placeholder.com/150'} alt={item.title} className="w-full h-full object-cover mix-blend-multiply" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 line-clamp-1">{item.title}</h3>
                                    <p className="text-sm text-gray-500 mb-1">{item.category}</p>
                                    <p className="font-bold text-indigo-600">৳ {item.sellingPrice}</p>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center space-x-6 w-full sm:w-auto justify-between sm:justify-end">
                                {/* Quantity Increment/Decrement */}
                                <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                                    <button
                                        onClick={() => updateQuantity(item._id, item.quantity - 1)}
                                        disabled={item.quantity <= 1}
                                        className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-30 transition"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item._id, item.quantity + 1)}
                                        disabled={item.quantity >= item.stock}
                                        className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-30 transition"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>

                                {/* Delete Button */}
                                <button
                                    onClick={() => removeFromCart(item._id)}
                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition"
                                    title="Remove item"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Side: Order Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 sticky top-24">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

                        <div className="space-y-3 text-sm text-gray-600 mb-6">
                            <div className="flex justify-between">
                                <span>Subtotal ({cartItems.length} items)</span>
                                <span className="font-medium text-gray-900">৳ {subtotal}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Shipping estimate</span>
                                <span className="font-medium text-gray-900">৳ {shipping}</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center border-t border-gray-200 pt-4 mb-8">
                            <span className="font-bold text-gray-900">Total</span>
                            <span className="text-2xl font-extrabold text-indigo-600">৳ {total}</span>
                        </div>

                        <Link href="/checkout" className="w-full flex items-center justify-center bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-indigo-600 transition-colors shadow-lg hover:shadow-indigo-500/30">
                            Proceed to Checkout
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}