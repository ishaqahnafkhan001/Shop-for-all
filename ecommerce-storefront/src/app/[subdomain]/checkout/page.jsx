"use client";

import React, { useState, useEffect, useMemo } from "react";

import {
    ShieldCheck,
    Truck,
    ArrowLeft,
    CheckCircle,
    MapPin,
    Phone,
    User,
    Mail,
    Trash2,
    Minus,
    Plus,
    Package,
    FileText,
} from "lucide-react";

import Link from "next/link";
import Image from "next/image";

import { toast } from "react-hot-toast";

import API from "@/api/api";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useStorefrontTheme } from "@/components/storefront/StorefrontThemeProvider";

export default function CheckoutPage({ params }) {

    const { subdomain } = React.use(params);

    // =========================================
    // CART
    // =========================================
    const {
        cartItems,
        cartTotal,
        clearCart,
        updateQuantity,
        removeFromCart,
    } = useCart();
    const { user } = useAuth();
    const { theme } = useStorefrontTheme();
    const policies = useMemo(() => theme.policies || {}, [theme.policies]);
    const visiblePolicies = useMemo(() => (
        [
            ['refund', 'Refund policy'],
            ['shipping', 'Shipping policy'],
            ['privacy', 'Privacy policy'],
            ['terms', 'Terms of service'],
        ].filter(([key]) => Boolean(policies[key]?.trim()))
    ), [policies]);

    // =========================================
    // STATES
    // =========================================
    const [loading, setLoading] = useState(false);

    const [isSuccess, setIsSuccess] = useState(false);

    const [orderId, setOrderId] = useState(null);

    const [productsDetails, setProductsDetails] = useState({});

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
    });

    const [promotionCode, setPromotionCode] = useState("");
    const [promotionPreview, setPromotionPreview] = useState(null);
    const checkoutBranding = useMemo(() => theme.checkoutBranding || {}, [theme.checkoutBranding]);

    // =========================================
    // SHIPPING LOGIC
    // =========================================
    const isDhaka =
        formData.city
            ?.trim()
            ?.toLowerCase()
            ?.includes("dhaka");

    const shippingCost = isDhaka ? 80 : 120;

    const subtotal = cartTotal;

    const promotionDiscount = promotionPreview?.discountAmount || 0;
    const finalShippingCost = promotionPreview?.freeShipping ? 0 : shippingCost;
    const totalAmount = Math.max(0, subtotal - promotionDiscount) + finalShippingCost;

    // =========================================
    // FETCH PRODUCTS
    // =========================================
    useEffect(() => {

        const fetchProducts = async () => {

            try {

                const ids = cartItems.map(item => item._id).join(',');
                const { data } = await API.get(
                    `/storefront/${subdomain}/products/batch`,
                    { params: { ids } }
                );

                const mapped = {};

                (data?.data || []).forEach((product) => {
                    mapped[product._id] = product;
                });

                setProductsDetails(mapped);

            } catch (error) {

                console.error(
                    "Failed to fetch products",
                    error
                );
            }
        };

        if (cartItems.length > 0) {
            fetchProducts();
        }

    }, [cartItems, subdomain]);

    // =========================================
    // INPUT CHANGE
    // =========================================
    const handleInputChange = (e) => {

        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleApplyPromotion = async () => {
        if (!promotionCode.trim()) {
            toast.error("Enter a coupon code");
            return;
        }

        try {
            const { data } = await API.post(
                `/promotions/storefront/${subdomain}/validate`,
                {
                    code: promotionCode,
                    subtotal,
                    customerEmail: formData.email,
                    items: cartItems.map((item) => {
                        const unitPrice = item.finalPrice || item.sellingPrice || 0;
                        return {
                            productId: item._id,
                            category: item.category,
                            collections: item.collections || [],
                            quantity: item.quantity,
                            price: unitPrice,
                            total: unitPrice * item.quantity,
                        };
                    }),
                }
            );

            setPromotionPreview(data.data);
            toast.success("Coupon applied");
        } catch (error) {
            setPromotionPreview(null);
            toast.error(error.response?.data?.error || "Coupon is not valid");
        }
    };

    // =========================================
    // PLACE ORDER
    // =========================================
    const handlePlaceOrder = async (e) => {

        e.preventDefault();

        if (cartItems.length === 0) {
            toast.error("Your cart is empty");
            return;
        }

        setLoading(true);

        try {

            let savedOrderData;

            // =====================================
            // LOGGED IN USER
            // =====================================
            if (user?.role === "Customer") {

                const securePayload = {

                    items: cartItems.map((item) => {

                        const selectedVariantId =
                            item.variantId ||
                            item.variants?.find(
                                (variant) =>
                                    variant.isActive
                            )?._id ||
                            item.variants?.[0]?._id;

                        if (!selectedVariantId) {

                            throw new Error(
                                `No variant found for ${item.title}`
                            );
                        }

                        return {
                            productId: item._id,
                            variantId:
                            selectedVariantId,
                            quantity: item.quantity,
                        };
                    }),

                    shipping: {

                        zone: isDhaka
                            ? "Inside Dhaka"
                            : "Outside Dhaka",

                        address: {
                            fullName:
                            formData.fullName,
                            phone:
                            formData.phone,
                            addressLine:
                            formData.address,
                            city:
                            formData.city,
                        },
                    },

                    payment: {
                        method: "COD",
                    },

                    promotionCode: promotionPreview?.code || promotionCode,

                    source: "storefront",
                };

                const response =
                    await API.post(
                        `/storefront/${subdomain}/orders`,
                        securePayload
                    );

                savedOrderData = {
                    _id: response.data.orderId,
                };

            } else {

                // =====================================
                // GUEST USER
                // =====================================
                const guestPayload = {

                    subdomain,

                    customer: {
                        fullName:
                        formData.fullName,
                        email:
                        formData.email,
                        phone:
                        formData.phone,
                    },

                    shippingAddress:
                        `${formData.address}, ${formData.city}`,

                    shippingZone: isDhaka
                        ? "Inside Dhaka"
                        : "Outside Dhaka",

                    items: cartItems.map((item) => ({
                        product: item._id,
                        quantity: item.quantity,
                        price:
                            item.finalPrice ||
                            item.sellingPrice,
                    })),

                    shippingCost,

                    totalAmount,

                    promotionCode: promotionPreview?.code || promotionCode,

                    source: "storefront",
                };

                const response =
                    await API.post(
                        "/public/orders",
                        guestPayload
                    );

                savedOrderData =
                    response.data;
            }

            setOrderId(savedOrderData._id);

            setIsSuccess(true);

            clearCart();

            toast.success(
                "Order placed successfully"
            );

        } catch (error) {

            console.log("FULL ERROR:", error);

            toast.error(
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message ||
                "Failed to place order"
            );

        } finally {

            setLoading(false);
        }
    };

    // =========================================
    // SUCCESS SCREEN
    // =========================================
    if (isSuccess) {

        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4">

                <div className="bg-white border border-gray-100 rounded-3xl shadow-xl max-w-lg w-full p-10 text-center">

                    <CheckCircle
                        size={90}
                        className="mx-auto text-green-500 mb-6"
                    />

                    <h1 className="text-4xl font-black text-gray-900 mb-3">
                        Order Confirmed
                    </h1>

                    <p className="text-gray-600 leading-relaxed">
                        Thank you for your purchase.
                    </p>

                    <div className="mt-7 bg-gray-50 rounded-2xl border border-gray-100 p-5">

                        <p className="text-sm text-gray-500 mb-2">
                            ORDER ID
                        </p>

                        <p className="text-2xl font-black text-[var(--sf-accent)] tracking-wider">
                            #
                            {orderId
                                ?.slice(-6)
                                ?.toUpperCase()}
                        </p>

                    </div>

                    <Link
                        href="/"
                        className="inline-flex mt-8 bg-[var(--sf-accent)] text-white px-8 py-4 rounded-2xl font-bold hover:scale-[1.02] transition"
                    >
                        Continue Shopping
                    </Link>

                </div>

            </div>
        );
    }

    // =========================================
    // EMPTY CART
    // =========================================
    if (cartItems.length === 0) {

        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">

                <Package
                    size={80}
                    className="text-gray-300 mb-6"
                />

                <h2 className="text-3xl font-black text-gray-900 mb-3">
                    Your cart is empty
                </h2>

                <p className="text-gray-500 mb-8">
                    Add some products first
                </p>

                <Link
                    href="/"
                    className="bg-[var(--sf-accent)] text-white px-7 py-4 rounded-2xl font-bold"
                >
                    Continue Shopping
                </Link>

            </div>
        );
    }

    // =========================================
    // MAIN UI
    // =========================================
    return (
        <div className="min-h-screen bg-[var(--sf-background)]">

            <div className="container mx-auto max-w-7xl px-4 py-10">

                {(checkoutBranding.logoUrl || checkoutBranding.bannerText) && (
                    <div className="mb-8 rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-sm">
                        {checkoutBranding.logoUrl && (
                            <Image
                                src={checkoutBranding.logoUrl}
                                alt=""
                                width={180}
                                height={48}
                                className="mx-auto mb-3 h-12 w-auto object-contain"
                            />
                        )}
                        {checkoutBranding.bannerText && (
                            <p className="text-sm font-semibold text-gray-700">{checkoutBranding.bannerText}</p>
                        )}
                    </div>
                )}

                <Link
                    href="/cart"
                    className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-[var(--sf-accent)] transition mb-8"
                >
                    <ArrowLeft
                        size={16}
                        className="mr-2"
                    />
                    Back to Cart
                </Link>

                <form
                    onSubmit={handlePlaceOrder}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-10"
                >

                    {/* LEFT SIDE */}
                    <div className="lg:col-span-7 space-y-8">

                        {/* CUSTOMER INFO */}
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">

                            <h2 className="text-2xl font-black text-gray-900 mb-8">
                                Customer Information
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                <div className="md:col-span-2">

                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                        <User size={16} />
                                        Full Name
                                    </label>

                                    <input
                                        required
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={
                                            handleInputChange
                                        }
                                        placeholder="Enter your full name"
                                        className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[var(--sf-accent)] outline-none"
                                    />

                                </div>

                                <div>

                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                        <Mail size={16} />
                                        Email
                                    </label>

                                    <input
                                        required
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={
                                            handleInputChange
                                        }
                                        placeholder="example@gmail.com"
                                        className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[var(--sf-accent)] outline-none"
                                    />

                                </div>

                                <div>

                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                        <Phone size={16} />
                                        Phone Number
                                    </label>

                                    <input
                                        required
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={
                                            handleInputChange
                                        }
                                        placeholder="+8801XXXXXXXXX"
                                        className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[var(--sf-accent)] outline-none"
                                    />

                                </div>

                                <div className="md:col-span-2">

                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                        <MapPin size={16} />
                                        Full Address
                                    </label>

                                    <textarea
                                        required
                                        rows={4}
                                        name="address"
                                        value={formData.address}
                                        onChange={
                                            handleInputChange
                                        }
                                        placeholder="House, road, area, thana"
                                        className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[var(--sf-accent)] outline-none resize-none"
                                    />

                                </div>

                                <div className="md:col-span-2">

                                    <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                        City / District
                                    </label>

                                    <input
                                        required
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={
                                            handleInputChange
                                        }
                                        placeholder="Dhaka"
                                        className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[var(--sf-accent)] outline-none"
                                    />

                                </div>

                            </div>

                        </div>

                        {/* DELIVERY NOTICE */}
                        <div className="bg-white rounded-3xl border border-gray-100 p-6 flex gap-4">

                            <Truck
                                size={32}
                                className="text-[var(--sf-accent)] mt-1"
                            />

                            <div>

                                <h3 className="font-black text-lg text-gray-900 mb-1">
                                    Delivery Charge
                                </h3>

                                <p className="text-gray-600">
                                    Inside Dhaka → ৳ 80
                                </p>

                                <p className="text-gray-600">
                                    Outside Dhaka → ৳ 120
                                </p>

                            </div>

                        </div>

                    </div>

                    {/* RIGHT SIDE */}
                    <div className="lg:col-span-5">

                        <div className="sticky top-24 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

                            {/* HEADER */}
                            <div className="p-7 border-b border-gray-100">

                                <h2 className="text-2xl font-black text-gray-900">
                                    Order Summary
                                </h2>

                            </div>

                            
                            {/* PRODUCTS */}
                            <div className="max-h-[500px] overflow-y-auto p-7 space-y-5">

                                {cartItems.map((item) => {

                                    const product = productsDetails[item._id];

                                    return (
                                        // Changed key from item.cartId to item._id
                                        <div
                                            key={item._id}
                                            className="border border-gray-100 rounded-2xl p-4"
                                        >

                                            <div className="flex gap-4">

                                                <Image
                                                    src={
                                                        product?.thumbnail ||
                                                        product?.images?.[0] ||
                                                        "/placeholder.png"
                                                    }
                                                    alt={item.title}
                                                    width={96}
                                                    height={96}
                                                    className="h-24 w-24 rounded-2xl object-cover border"
                                                />

                                                <div className="flex-1">

                                                    <h3 className="font-black text-gray-900 line-clamp-2">
                                                        {item.title}
                                                    </h3>

                                                    {product?.shortDescription && (
                                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                                            {
                                                                product.shortDescription
                                                            }
                                                        </p>
                                                    )}

                                                    {/* QUANTITY */}
                                                    <div className="flex items-center justify-between mt-5">

                                                        <div className="flex items-center gap-2">

                                                            <button
                                                                type="button"
                                                                // Changed item.cartId to item._id
                                                                onClick={() =>
                                                                    updateQuantity(
                                                                        item._id,
                                                                        item.quantity - 1
                                                                    )
                                                                }
                                                                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                                                            >
                                                                <Minus size={16} />
                                                            </button>

                                                            <div className="w-10 text-center font-black">
                                                                {
                                                                    item.quantity
                                                                }
                                                            </div>

                                                            <button
                                                                type="button"
                                                                // Changed item.cartId to item._id
                                                                onClick={() =>
                                                                    updateQuantity(
                                                                        item._id,
                                                                        item.quantity + 1
                                                                    )
                                                                }
                                                                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                                                            >
                                                                <Plus size={16} />
                                                            </button>

                                                        </div>

                                                        <div className="text-right">

                                                            <p className="font-black text-lg text-[var(--sf-accent)]">
                                                                ৳
                                                                {(item.finalPrice ||
                                                                        item.sellingPrice) *
                                                                    item.quantity}
                                                            </p>

                                                            <p className="text-xs text-gray-400">
                                                                ৳
                                                                {item.finalPrice ||
                                                                    item.sellingPrice}
                                                                each
                                                            </p>

                                                        </div>

                                                    </div>

                                                    {/* REMOVE */}
                                                    <button
                                                        type="button"
                                                        // Changed item.cartId to item._id
                                                        onClick={() =>
                                                            removeFromCart(
                                                                item._id
                                                            )
                                                        }
                                                        className="mt-4 inline-flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-semibold"
                                                    >
                                                        <Trash2 size={14} />
                                                        Remove
                                                    </button>

                                                </div>

                                            </div>

                                        </div>
                                    );
                                })}

                            </div>
                            {/* TOTALS */}
                            <div className="border-t border-gray-100 p-7">

                                <div className="mb-6">
                                    <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                        Coupon Code
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={promotionCode}
                                            onChange={(e) => setPromotionCode(e.target.value.toUpperCase())}
                                            placeholder="SAVE10"
                                            className="min-w-0 flex-1 px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[var(--sf-accent)] outline-none uppercase"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleApplyPromotion}
                                            className="px-4 py-3 rounded-2xl bg-gray-900 text-white font-bold hover:bg-[var(--sf-accent)]"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4 text-sm">

                                    <div className="flex justify-between">

                                        <span className="text-gray-500">
                                            Subtotal
                                        </span>

                                        <span className="font-bold text-gray-900">
                                            ৳ {subtotal}
                                        </span>

                                    </div>

                                    <div className="flex justify-between">

                                        <span className="text-gray-500">
                                            Delivery Charge
                                        </span>

                                        <span className="font-bold text-gray-900">
                                            ৳ {finalShippingCost}
                                        </span>

                                    </div>

                                    {promotionDiscount > 0 && (
                                        <div className="flex justify-between text-green-700">

                                            <span>
                                                Coupon Discount
                                            </span>

                                            <span className="font-bold">
                                                - ৳ {promotionDiscount}
                                            </span>

                                        </div>
                                    )}

                                </div>

                                <div className="flex justify-between items-center border-t border-dashed border-gray-200 pt-5 mt-5">

                                    <span className="text-xl font-black text-gray-900">
                                        Total
                                    </span>

                                    <span className="text-3xl font-black text-[var(--sf-accent)]">
                                        ৳ {totalAmount}
                                    </span>

                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full mt-7 bg-gray-900 hover:bg-[var(--sf-accent)] text-white py-5 font-black text-lg transition disabled:opacity-50"
                                    style={{ borderRadius: 'var(--sf-checkout-radius)' }}
                                >
                                    {loading
                                        ? "Processing..."
                                        : "Place Order"}
                                </button>

                                <p className="flex items-center justify-center gap-2 mt-5 text-sm text-gray-500">

                                    <ShieldCheck
                                        size={16}
                                        className="text-green-500"
                                    />

                                    {checkoutBranding.trustMessage || 'Secure Checkout'}

                                </p>

                                {visiblePolicies.length > 0 && (
                                    <div className="mt-6 border-t border-gray-100 pt-5">
                                        <div className="mb-3 flex items-center gap-2 text-sm font-black text-gray-900">
                                            <FileText size={16} className="text-[var(--sf-accent)]" />
                                            Store Policies
                                        </div>
                                        <div className="space-y-2">
                                            {visiblePolicies.map(([key, label]) => (
                                                <details key={key} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                                                    <summary className="cursor-pointer text-sm font-bold text-gray-800">
                                                        {label}
                                                    </summary>
                                                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-600">
                                                        {policies[key]}
                                                    </p>
                                                </details>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </div>

                        </div>

                    </div>

                </form>

            </div>

        </div>
    );
}
