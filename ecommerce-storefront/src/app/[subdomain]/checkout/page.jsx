"use client";

import React, { useState, useEffect, useMemo } from "react";

import {
    ShieldCheck,
    Truck,
    ArrowLeft,
    CheckCircle,
    CreditCard,
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

                const ids = [...new Set(cartItems.map(item => item._id))].join(',');
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
                        const unitPrice = item.cartPrice || item.finalPrice || item.sellingPrice || 0;
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

    const resolveCartVariantId = (item) => {
        if (item.variantId || item.selectedVariant?._id) {
            return item.variantId || item.selectedVariant._id;
        }

        const product = productsDetails[item._id];
        return product?.variants?.find((variant) => variant.isActive !== false && variant.status !== "archived")?._id
            || product?.variants?.[0]?._id;
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

                        const selectedVariantId = resolveCartVariantId(item);

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
                        variantId: resolveCartVariantId(item),
                        quantity: item.quantity,
                        price:
                            item.cartPrice ||
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

                savedOrderData = {
                    _id: response.data.orderId || response.data.order?._id || response.data._id,
                };
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
            <div className="sf-page flex min-h-screen items-center justify-center px-4">

                <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-slate-200/70 sm:p-10">

                    <CheckCircle
                        size={90}
                        className="mx-auto mb-6 text-emerald-500"
                    />

                    <h1 className="mb-3 text-4xl font-black text-slate-950">
                        Order Confirmed
                    </h1>

                    <p className="leading-relaxed text-slate-600">
                        Thank you for your purchase.
                    </p>

                    <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">

                        <p className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-slate-500">
                            ORDER ID FOR TRACKING
                        </p>

                        <p className="text-2xl font-black tracking-wider text-[var(--sf-accent)]">
                            #
                            {orderId
                                ?.slice(-6)
                                ?.toUpperCase()}
                        </p>
                        <p className="mt-2 break-all text-xs text-slate-500">
                            Full ID: {orderId}
                        </p>
                        <p className="mt-3 text-xs text-slate-500">
                            Use the short ID and your delivery phone number on the Track Order page.
                        </p>

                    </div>

                    <Link
                        href="/"
                        className="sf-btn sf-btn-primary mt-8 px-8"
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
            <div className="sf-page flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">

                <Package
                    size={80}
                    className="mb-6 text-slate-300"
                />

                <h2 className="mb-3 text-3xl font-black text-slate-950">
                    Your cart is empty
                </h2>

                <p className="mb-8 text-slate-500">
                    Add some products first
                </p>

                <Link
                    href="/"
                    className="sf-btn sf-btn-primary px-7"
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
        <div className="sf-page">

            <div className="sf-shell-wide py-8 sm:py-10">

                {(checkoutBranding.logoUrl || checkoutBranding.bannerText) && (
                    <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-sm">
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
                            <p className="text-sm font-bold text-slate-700">{checkoutBranding.bannerText}</p>
                        )}
                    </div>
                )}

                <Link
                    href="/cart"
                    className="mb-6 inline-flex items-center text-sm font-bold text-slate-500 transition hover:text-[var(--sf-accent)]"
                >
                    <ArrowLeft
                        size={16}
                        className="mr-2"
                    />
                    Back to Cart
                </Link>

                <form
                    onSubmit={handlePlaceOrder}
                    className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_450px]"
                >

                    {/* LEFT SIDE */}
                    <div className="space-y-7">

                        {/* CUSTOMER INFO */}
                        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

                            <h2 className="mb-6 text-2xl font-black text-slate-950">
                                Customer Information
                            </h2>

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                                <div className="md:col-span-2">

                                    <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
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
                                        className="sf-field"
                                    />

                                </div>

                                <div>

                                    <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
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
                                        className="sf-field"
                                    />

                                </div>

                                <div>

                                    <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
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
                                        className="sf-field"
                                    />

                                </div>

                                <div className="md:col-span-2">

                                    <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
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
                                        className="sf-field resize-none"
                                    />

                                </div>

                                <div className="md:col-span-2">

                                    <label className="mb-2 block text-sm font-bold text-slate-700">
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
                                        className="sf-field"
                                    />

                                </div>

                            </div>

                        </div>

                        {/* DELIVERY NOTICE */}
                        <div className="flex gap-5 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white to-cyan-50/50 p-6 shadow-sm">

                            <Truck
                                size={32}
                                className="mt-1 text-[var(--sf-accent)]"
                            />

                            <div>

                                <h3 className="mb-1 text-lg font-black text-slate-950">
                                    Delivery Charge
                                </h3>

                                <p className="text-sm font-semibold text-slate-600">
                                    Inside Dhaka → ৳ 80
                                </p>

                                <p className="text-sm font-semibold text-slate-600">
                                    Outside Dhaka → ৳ 120
                                </p>

                            </div>

                        </div>

                        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                            <h2 className="mb-5 text-2xl font-black text-slate-950">
                                Delivery Method
                            </h2>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className={`rounded-2xl border p-4 ${isDhaka ? 'border-[var(--sf-accent)] bg-[var(--sf-accent-bg)]' : 'border-slate-200 bg-slate-50'}`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-black text-slate-950">Inside Dhaka</span>
                                        <span className="text-sm font-black text-[var(--sf-accent)]">৳ 80</span>
                                    </div>
                                    <p className="mt-2 text-xs font-semibold text-slate-500">Same-city delivery estimate.</p>
                                </div>
                                <div className={`rounded-2xl border p-4 ${!isDhaka ? 'border-[var(--sf-accent)] bg-[var(--sf-accent-bg)]' : 'border-slate-200 bg-slate-50'}`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-black text-slate-950">Outside Dhaka</span>
                                        <span className="text-sm font-black text-[var(--sf-accent)]">৳ 120</span>
                                    </div>
                                    <p className="mt-2 text-xs font-semibold text-slate-500">Nationwide delivery estimate.</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                            <h2 className="mb-5 text-2xl font-black text-slate-950">
                                Payment Method
                            </h2>
                            <div className="rounded-2xl border border-[var(--sf-accent)] bg-[var(--sf-accent-bg)] p-4">
                                <div className="flex items-start gap-3">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--sf-accent)] shadow-sm">
                                        <CreditCard size={19} />
                                    </span>
                                    <div>
                                        <p className="text-sm font-black text-slate-950">Cash on Delivery</p>
                                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                                            Pay securely when your order arrives. Online payment providers can be enabled later from the platform.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT SIDE */}
                    <div>

                        <div className="sticky top-28 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">

                            {/* HEADER */}
                            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50/60 p-6 sm:p-7">

                                <h2 className="text-2xl font-black text-slate-950">
                                    Order Summary
                                </h2>

                            </div>

                            
                            {/* PRODUCTS */}
                            <div className="max-h-[460px] space-y-5 overflow-y-auto p-6 sm:p-7">

                                {cartItems.map((item) => {

                                    const product = productsDetails[item._id];

                                    return (
                                        // Changed key from item.cartId to item._id
                                        <div
                                            key={item.cartItemId || item._id}
                                            className="rounded-3xl border border-slate-200 p-5"
                                        >

                                            <div className="flex gap-4">

                                                <Image
                                                    src={
                                                        item.imageUrl ||
                                                        product?.thumbnail ||
                                                        product?.images?.[0] ||
                                                        "/placeholder.png"
                                                    }
                                                    alt={item.title}
                                                    width={96}
                                                    height={96}
                                                    className="h-20 w-20 rounded-2xl border border-slate-200 object-cover sm:h-24 sm:w-24"
                                                />

                                                <div className="flex-1">

                                                    <h3 className="line-clamp-2 font-black text-slate-950">
                                                        {item.title}
                                                    </h3>

                                                    {product?.shortDescription && (
                                                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">
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
                                                                        item.cartItemId || item._id,
                                                                        item.quantity - 1
                                                                    )
                                                                }
                                                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100"
                                                            >
                                                                <Minus size={16} />
                                                            </button>

                                                            <div className="w-10 text-center font-black text-slate-950">
                                                                {
                                                                    item.quantity
                                                                }
                                                            </div>

                                                            <button
                                                                type="button"
                                                                // Changed item.cartId to item._id
                                                                onClick={() =>
                                                                    updateQuantity(
                                                                        item.cartItemId || item._id,
                                                                        item.quantity + 1
                                                                    )
                                                                }
                                                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100"
                                                            >
                                                                <Plus size={16} />
                                                            </button>

                                                        </div>

                                                        <div className="text-right">

                                                            <p className="text-lg font-black text-slate-950">
                                                                ৳
                                                                {(item.finalPrice ||
                                                                        item.sellingPrice) *
                                                                    item.quantity}
                                                            </p>

                                                            <p className="text-xs text-slate-400">
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
                                                                item.cartItemId || item._id
                                                            )
                                                        }
                                                        className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-600"
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
                            <div className="border-t border-slate-200 p-6 sm:p-7">

                                <div className="mb-6">
                                    <label className="mb-2 block text-sm font-bold text-slate-700">
                                        Coupon Code
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={promotionCode}
                                            onChange={(e) => setPromotionCode(e.target.value.toUpperCase())}
                                            placeholder="SAVE10"
                                            className="sf-field min-w-0 flex-1 uppercase"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleApplyPromotion}
                                            className="sf-btn sf-btn-primary min-h-0 px-4 py-3"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4 text-sm">

                                    <div className="flex justify-between">

                                        <span className="text-slate-500">
                                            Subtotal
                                        </span>

                                        <span className="font-bold text-slate-950">
                                            ৳ {subtotal}
                                        </span>

                                    </div>

                                    <div className="flex justify-between">

                                        <span className="text-slate-500">
                                            Delivery Charge
                                        </span>

                                        <span className="font-bold text-slate-950">
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

                                <div className="mt-5 flex items-center justify-between border-t border-dashed border-slate-200 pt-5">

                                    <span className="text-xl font-black text-slate-950">
                                        Total
                                    </span>

                                    <span className="text-3xl font-black text-slate-950">
                                        ৳ {totalAmount}
                                    </span>

                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="sf-btn sf-btn-primary mt-7 w-full py-5 text-lg disabled:opacity-50"
                                    style={{ borderRadius: 'var(--sf-checkout-radius)' }}
                                >
                                    {loading
                                        ? "Processing..."
                                        : "Place Order"}
                                </button>

                                <p className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500">

                                    <ShieldCheck
                                        size={16}
                                        className="text-emerald-500"
                                    />

                                    {checkoutBranding.trustMessage || 'Secure Checkout'}

                                </p>

                                {visiblePolicies.length > 0 && (
                                    <div className="mt-6 border-t border-slate-200 pt-5">
                                        <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950">
                                            <FileText size={16} className="text-[var(--sf-accent)]" />
                                            Store Policies
                                        </div>
                                        <div className="space-y-2">
                                            {visiblePolicies.map(([key, label]) => (
                                                <details key={key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                                    <summary className="cursor-pointer text-sm font-bold text-slate-800">
                                                        {label}
                                                    </summary>
                                                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
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
