"use client";
import React, { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ShieldCheck, Truck, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import API from '@/api/api';

export default function CheckoutPage({ params }) {
    const { subdomain } = React.use(params);
    const { cartItems, cartTotal, clearCart } = useCart();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [orderId, setOrderId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        address: '',
        city: 'Dhaka',
        zone: 'Inside Dhaka',
    });

    const shippingCost = formData.zone === 'Inside Dhaka' ? 60 : 120;
    const subtotal = cartTotal;
    const totalAmount = subtotal + shippingCost;

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePlaceOrder = async (e) => {
        e.preventDefault();

        if (cartItems.length === 0) {
            toast.error("Your cart is empty!");
            return;
        }

        setLoading(true);

        try {
            // ✨ 1. Check if the user is currently logged in
            const token = localStorage.getItem('shopforall_token');
            let savedOrderData;

            if (token) {
                // ==========================================
                // 🚪 DOOR 1: LOGGED-IN USER CHECKOUT
                // ==========================================
                const securePayload = {
                    items: cartItems.map(item => ({
                        product: item._id,
                        quantity: item.quantity
                    })),
                    shippingZone: formData.zone,
                    shippingAddress: `${formData.address}, ${formData.city}`
                };

                // Send to the secure route
                const response = await API.post(`/storefront/${subdomain}/orders`, securePayload, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // Your secure route returns { success: true, order: {...} }
                savedOrderData = response.data.order;

            } else {
                // ==========================================
                // 🚪 DOOR 2: GUEST CHECKOUT
                // ==========================================
                const guestPayload = {
                    subdomain,
                    customer: {
                        fullName: formData.fullName,
                        email: formData.email,
                        phone: formData.phone,
                    },
                    shippingAddress: `${formData.address}, ${formData.city}`,
                    shippingZone: formData.zone,
                    items: cartItems.map(item => ({
                        product: item._id,
                        quantity: item.quantity,
                        price: item.sellingPrice
                    })),
                    shippingCost,
                    totalAmount
                };

                const response = await API.post('/public/orders', guestPayload);
                savedOrderData = response.data;
            }

            // ✨ 3. Success for both doors!
            setOrderId(savedOrderData._id);
            setIsSuccess(true);
            clearCart();
            toast.success("Order placed successfully!");

        } catch (error) {
            console.error("ORDER REJECTED BECAUSE:", error.response?.data || error.message);
            toast.error(error.response?.data?.error || "Failed to place order.");
        } finally {
            setLoading(false);
        }
    };

    // --- SUCCESS SCREEN ---
    if (isSuccess) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center py-20 px-4 text-center">
                <CheckCircle size={80} className="text-green-500 mb-6" />
                <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Order Confirmed!</h1>
                <p className="text-lg text-gray-600 mb-8 max-w-md">
                    Thank you for your purchase. Your order <span className="font-mono font-bold text-indigo-600">#{orderId?.slice(-6).toUpperCase()}</span> is currently being processed.
                </p>
                <Link href="/" className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg">
                    Continue Shopping
                </Link>
            </div>
        );
    }

    // --- EMPTY CART REDIRECT ---
    if (cartItems.length === 0) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
                <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
                <Link href="/" className="text-indigo-600 hover:underline">Go back to shop</Link>
            </div>
        );
    }

    // --- CHECKOUT FORM ---
    return (
        <div className="container mx-auto px-4 py-10 max-w-6xl">
            <Link href="/cart" className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600 mb-8 transition">
                <ArrowLeft size={16} className="mr-2" /> Back to Cart
            </Link>

            <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Checkout</h1>

            <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* Left Side: Shipping Details */}
                <div className="lg:col-span-7 space-y-8">
                    <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Contact Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <input required type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none transition" placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                                <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none transition" placeholder="john@example.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                                <input required type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none transition" placeholder="+880 1..." />
                            </div>
                        </div>

                        <h2 className="text-xl font-bold text-gray-900 mt-10 mb-6">Shipping Address</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                                <input required type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none transition" placeholder="House 12, Road 5, Block C" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                <input required type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none transition" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Zone</label>
                                <select name="zone" value={formData.zone} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none transition bg-white">
                                    <option value="Inside Dhaka">Inside Dhaka (৳ 60)</option>
                                    <option value="Outside Dhaka">Outside Dhaka (৳ 120)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method Info */}
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 border-dashed flex items-center">
                        <Truck className="text-indigo-600 mr-4" size={32} />
                        <div>
                            <h3 className="font-bold text-gray-900">Cash on Delivery</h3>
                            <p className="text-sm text-gray-500">Pay with cash when your order arrives.</p>
                        </div>
                    </div>
                </div>

                {/* Right Side: Order Summary */}
                <div className="lg:col-span-5">
                    <div className="bg-gray-50 p-6 md:p-8 rounded-3xl border border-gray-100 sticky top-24">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

                        {/* Cart Items Preview */}
                        <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                            {cartItems.map(item => (
                                <div key={item._id} className="flex justify-between text-sm">
                                    <div className="flex items-center">
                                        <span className="font-semibold mr-2">{item.quantity}x</span>
                                        <span className="text-gray-600 line-clamp-1">{item.title}</span>
                                    </div>
                                    <span className="font-medium">৳ {item.sellingPrice * item.quantity}</span>
                                </div>
                            ))}
                        </div>

                        {/* Cost Breakdown */}
                        <div className="space-y-3 text-sm text-gray-600 border-t border-gray-200 pt-4 mb-6">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span className="font-medium text-gray-900">৳ {subtotal}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Shipping ({formData.zone})</span>
                                <span className="font-medium text-gray-900">৳ {shippingCost}</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center border-t border-gray-200 pt-4 mb-8">
                            <span className="font-bold text-gray-900 text-lg">Total</span>
                            <span className="text-2xl font-extrabold text-indigo-600">৳ {totalAmount}</span>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-indigo-600 transition-colors shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : 'Place Order'}
                        </button>

                        <p className="flex items-center justify-center mt-4 text-xs text-gray-500">
                            <ShieldCheck size={14} className="mr-1 text-green-500" /> Secure and encrypted checkout
                        </p>
                    </div>
                </div>

            </form>
        </div>
    );
}