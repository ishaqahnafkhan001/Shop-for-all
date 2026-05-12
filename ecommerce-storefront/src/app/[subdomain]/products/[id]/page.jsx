"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext'; // 🌟 1. Imported the Auth Context
import API from '@/api/api';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, Truck, ShieldCheck, Tag, Zap, Star, MessageSquare, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

const normalizeProduct = (raw) => {
    if (!raw) return null;

    const sellingPrice = raw?.pricing?.sellingPrice ?? raw?.sellingPrice ?? 0;
    const discount = raw?.pricing?.discount ?? raw?.discount ?? 0;
    const finalPrice = raw?.finalPrice ?? Math.round(sellingPrice - (sellingPrice * discount) / 100);
    const stock = raw?.totalStock ?? raw?.stock ?? (Array.isArray(raw?.variants)
        ? raw.variants.reduce((sum, variant) => sum + (variant?.stock || 0), 0)
        : 0);

    return {
        ...raw,
        sellingPrice,
        discount,
        finalPrice,
        stock,
        averageRating: raw?.averageRating || 0,
        numReviews: raw?.numReviews || 0,
        images: raw?.images?.length > 0 ? raw.images : [raw?.imageUrl || 'https://via.placeholder.com/600'],
        variants: raw?.variants || [],
        features: raw?.features || [],
        specifications: raw?.specifications || [],
        comments: raw?.comments || []
    };
};

export default function ProductDetails({ params }) {
    const { subdomain, id } = React.use(params);
    const { addToCart } = useCart();

    // 🌟 2. Grab the user session directly from the Context
    const { user } = useAuth();
    const isLoggedIn = !!user;

    const router = useRouter();

    const [product, setProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Reviews State
    const [reviews, setReviews] = useState([]);
    const [newReview, setNewReview] = useState({ rating: 0, comment: "" });
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewMessage, setReviewMessage] = useState({ type: '', text: '' });

    // UI State
    const [activeImageIdx, setActiveImageIdx] = useState(0);
    const [selectedAttributes, setSelectedAttributes] = useState({});
    const [isImageZoomed, setIsImageZoomed] = useState(false);

    const fetchReviews = async () => {
        try {
            const { data } = await API.get(`/storefront/${subdomain}/products/${id}/reviews`);
            setReviews(data.data || []);
        } catch (err) {
            console.error("Failed to fetch reviews:", err);
        }
    };

    useEffect(() => {
        const fetchProductAndRelated = async () => {
            try {
                const { data } = await API.get(`/storefront/${subdomain}/products/${id}`);
                const normalized = normalizeProduct(data);
                setProduct(normalized);

                if (normalized.variants?.length > 0) {
                    const firstActiveVariant = normalized.variants.find(v => v.isActive) || normalized.variants[0];
                    const initialAttrs = {};
                    firstActiveVariant.attributes.forEach(attr => {
                        initialAttrs[attr.name] = attr.value;
                    });
                    setSelectedAttributes(initialAttrs);
                }

                // Fetch Reviews
                await fetchReviews();

                if (normalized.category) {
                    try {
                        const { data: relatedData } = await API.get(`/storefront/${subdomain}/products`, {
                            params: { category: normalized.category }
                        });
                        const allProducts = Array.isArray(relatedData) ? relatedData : (relatedData.products || relatedData.data || []);
                        const filteredRelated = allProducts
                            .filter(p => p.category === normalized.category && p._id !== id)
                            .map(normalizeProduct)
                            .slice(0, 5);
                        setRelatedProducts(filteredRelated);
                    } catch (err) {
                        console.error("Failed to fetch related products:", err);
                    }
                }
            } catch (err) {
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchProductAndRelated();
    }, [id, subdomain]);

    const availableAttributes = useMemo(() => {
        if (!product?.variants) return {};
        const attrs = {};
        product.variants.forEach(variant => {
            if (!variant.isActive) return;
            variant.attributes.forEach(attr => {
                if (!attrs[attr.name]) attrs[attr.name] = new Set();
                attrs[attr.name].add(attr.value);
            });
        });
        return Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, Array.from(v)]));
    }, [product]);

    const currentVariant = useMemo(() => {
        if (!product?.variants?.length) return null;
        return product.variants.find(variant =>
            variant.attributes.every(attr => selectedAttributes[attr.name] === attr.value)
        );
    }, [product, selectedAttributes]);

    const displayStock = currentVariant ? currentVariant.stock : (product?.stock || 0);
    const baseOriginalPrice = currentVariant?.priceOverride || product?.sellingPrice || 0;
    const displayDiscount = product?.discount || 0;
    const displayFinalPrice = displayDiscount > 0
        ? Math.round(baseOriginalPrice - (baseOriginalPrice * displayDiscount / 100))
        : baseOriginalPrice;

    const handleAttributeSelect = (name, value) => {
        setSelectedAttributes(prev => ({ ...prev, [name]: value }));
    };

    const handleAddToCart = () => {
        const itemToAdd = {
            ...product,
            selectedVariant: currentVariant,
            cartPrice: displayFinalPrice,
        };
        addToCart(itemToAdd);
    };

    const handleBuyNow = () => {
        handleAddToCart();
        router.push('/checkout');
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (newReview.rating === 0) {
            setReviewMessage({ type: 'error', text: 'Please select a star rating.' });
            return;
        }
        if (!newReview.comment.trim()) {
            setReviewMessage({ type: 'error', text: 'Please write a comment.' });
            return;
        }

        setSubmittingReview(true);
        setReviewMessage({ type: '', text: '' });

        try {
            await API.post(`/storefront/${subdomain}/products/${id}/reviews`, {
                rating: newReview.rating,
                comment: newReview.comment
            });

            setReviewMessage({ type: 'success', text: 'Review submitted successfully!' });
            setNewReview({ rating: 0, comment: "" });

            const { data } = await API.get(`/storefront/${subdomain}/products/${id}`);
            setProduct(prev => ({
                ...prev,
                averageRating: data.averageRating || prev.averageRating,
                numReviews: data.numReviews || prev.numReviews
            }));
            fetchReviews();

        } catch (err) {
            setReviewMessage({
                type: 'error',
                text: err.response?.data?.message || 'Failed to submit review. You might have already reviewed this item.'
            });
        } finally {
            setSubmittingReview(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[70vh] items-center justify-center bg-gray-50/50">
                <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-gray-200"></div>
                    <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-4 border-[var(--sf-accent)] border-t-transparent animate-spin"></div>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] space-y-6 bg-gray-50/30">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                    <ShoppingCart size={40} className="text-gray-300" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900">Product Not Found</h2>
                <Link href="/" className="inline-flex items-center px-6 py-3 bg-[var(--sf-accent)] text-white font-medium rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all">
                    <ArrowLeft size={18} className="mr-2" /> Back to Shop
                </Link>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden bg-white">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-[var(--sf-accent)]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-gradient-to-bl from-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="container mx-auto px-4 py-12 max-w-7xl relative z-10">
                <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-[var(--sf-accent)] mb-8 transition-colors group">
                    <div className="bg-gray-100 p-2 rounded-full mr-3 group-hover:bg-[var(--sf-accent)] group-hover:text-white transition-colors">
                        <ArrowLeft size={16} />
                    </div>
                    Continue Shopping
                </Link>

                {/* Top Section: Images and Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
                    {/* Left Column: Image Gallery */}
                    <div className="flex flex-col space-y-6">
                        <div
                            className="bg-white rounded-3xl overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] border border-gray-100/50 aspect-square flex items-center justify-center p-8 relative group cursor-crosshair transition-all duration-500 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)]"
                            onMouseEnter={() => setIsImageZoomed(true)}
                            onMouseLeave={() => setIsImageZoomed(false)}
                        >
                            <img
                                src={product.images[activeImageIdx]}
                                alt={`${product.title} - Main Image`}
                                className={`w-full h-full object-contain transition-transform duration-700 ease-out ${isImageZoomed ? 'scale-110' : 'scale-100'}`}
                            />
                            <div className="absolute top-6 left-6 flex flex-col gap-2">
                                <span className="bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-gray-800 shadow-sm border border-white/50">
                                    {product.category}
                                </span>
                            </div>
                            {displayDiscount > 0 && (
                                <div className="absolute top-6 right-6 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-red-500/30 flex items-center animate-pulse-slow">
                                    <Zap size={14} className="mr-1.5 fill-current" />
                                    {displayDiscount}% OFF
                                </div>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {product.images.length > 1 && (
                            <div className="flex space-x-4 overflow-x-auto py-2 scrollbar-hide px-1">
                                {product.images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveImageIdx(idx)}
                                        className={`w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 transition-all duration-300 relative 
                                        ${activeImageIdx === idx
                                            ? 'ring-2 ring-[var(--sf-accent)] ring-offset-2 scale-105 shadow-md'
                                            : 'border border-gray-200 hover:border-[var(--sf-accent)]/50 hover:scale-105 opacity-70 hover:opacity-100'}`}
                                    >
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Product Details */}
                    <div className="flex flex-col justify-start py-2">
                        <div className="mb-2 flex items-center gap-2">
                            <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        size={16}
                                        fill={i < Math.round(product.averageRating) ? "currentColor" : "none"}
                                        className={i < Math.round(product.averageRating) ? "" : "text-gray-300"}
                                    />
                                ))}
                            </div>
                            <span className="text-sm text-gray-500 font-medium">
                                ({product.averageRating} / 5 from {product.numReviews} Reviews)
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight leading-tight">
                            {product.title}
                        </h1>

                        {currentVariant && (
                            <p className="text-sm text-gray-500 bg-gray-100 inline-flex px-3 py-1 rounded-md font-mono mb-6 w-max">
                                SKU: {currentVariant.sku}
                            </p>
                        )}

                        {/* Pricing */}
                        <div className="flex items-end space-x-4 mb-6 p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100">
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500 font-medium mb-1">Final Price</span>
                                <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--sf-accent)] to-purple-600">
                                    ৳ {displayFinalPrice}
                                </p>
                            </div>
                            {displayDiscount > 0 && (
                                <p className="text-xl text-gray-400 line-through font-medium mb-1 relative">
                                    ৳ {baseOriginalPrice}
                                </p>
                            )}
                        </div>

                        <p className="text-gray-600 text-lg leading-relaxed mb-8">
                            {product.description || "Elevate your daily routine with this premium quality product. Meticulously designed for those who appreciate the finer things."}
                        </p>

                        {/* Variants Selection */}
                        {Object.keys(availableAttributes).length > 0 && (
                            <div className="mb-8 space-y-6">
                                {Object.entries(availableAttributes).map(([attrName, values]) => (
                                    <div key={attrName}>
                                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-3 flex items-center">
                                            {attrName}
                                            <span className="ml-3 h-px flex-1 bg-gray-200"></span>
                                        </h3>
                                        <div className="flex flex-wrap gap-3">
                                            {values.map(value => {
                                                const isSelected = selectedAttributes[attrName] === value;
                                                return (
                                                    <button
                                                        key={value}
                                                        onClick={() => handleAttributeSelect(attrName, value)}
                                                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm
                                                            ${isSelected
                                                            ? 'bg-gray-900 text-white shadow-gray-900/20 scale-[1.02] ring-2 ring-gray-900 ring-offset-1'
                                                            : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-900 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {value}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Action Area */}
                        <div className="mt-auto space-y-4">
                            <div className="mb-6 flex items-center justify-between">
                                {displayStock > 0 ? (
                                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-green-50 text-green-700 border border-green-200/50 shadow-sm">
                                        <span className="relative flex h-2.5 w-2.5 mr-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
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
                                onClick={handleAddToCart}
                                disabled={displayStock <= 0}
                                className="group w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-[var(--sf-accent)] to-[var(--sf-accent-strong,blue-600)] text-white px-8 py-5 rounded-2xl font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_15px_30px_-10px_var(--sf-accent)] hover:shadow-[0_20px_40px_-10px_var(--sf-accent)] hover:-translate-y-1"
                            >
                                <ShoppingCart size={24} className="group-hover:animate-bounce" />
                                <span>{displayStock > 0 ? 'Add to Cart' : 'Currently Unavailable'}</span>
                            </button>

                            {displayStock > 0 && (
                                <button
                                    onClick={handleBuyNow}
                                    className="w-full block text-center bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg hover:-translate-y-1"
                                >
                                    Proceed to Checkout
                                </button>
                            )}
                        </div>

                        {/* Trust Badges */}
                        <div className="grid grid-cols-2 gap-4 mt-8">
                            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 flex flex-col items-start gap-2 hover:bg-gray-50 transition-colors">
                                <div className="bg-white p-2 rounded-xl shadow-sm text-[var(--sf-accent)]">
                                    <Truck size={20} />
                                </div>
                                <span className="text-sm font-medium text-gray-700">Fast & Reliable Delivery</span>
                            </div>
                            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 flex flex-col items-start gap-2 hover:bg-gray-50 transition-colors">
                                <div className="bg-white p-2 rounded-xl shadow-sm text-[var(--sf-accent)]">
                                    <ShieldCheck size={20} />
                                </div>
                                <span className="text-sm font-medium text-gray-700">100% Secure Checkout</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Section: Features & Specs */}
                <div className="mt-24 flex flex-col lg:flex-row gap-12 lg:gap-20 pt-16 border-t border-gray-100">
                    <div className="flex-1 space-y-20">
                        {/* Features List */}
                        {product.features?.length > 0 && (
                            <section>
                                <h2 className="text-3xl font-extrabold text-gray-900 mb-10 flex items-center">
                                    <Zap className="mr-4 text-[var(--sf-accent)]" size={28} />
                                    Why You'll Love It
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {product.features.map((feature, idx) => (
                                        <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
                                            <h4 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h4>
                                            <p className="text-gray-600 leading-relaxed">{feature.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Specifications */}
                        {product.specifications?.length > 0 && (
                            <section>
                                <h2 className="text-3xl font-extrabold text-gray-900 mb-10 flex items-center">
                                    <Tag className="mr-4 text-[var(--sf-accent)]" size={28} />
                                    Tech Specs
                                </h2>
                                <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                                    {product.specifications.map((spec, idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row px-8 py-5 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                                            <dt className="text-sm font-bold text-gray-500 sm:w-1/3 uppercase tracking-widest mb-1 sm:mb-0">
                                                {spec.title}
                                            </dt>
                                            <dd className="text-base font-medium text-gray-900 sm:w-2/3">
                                                {spec.value}
                                            </dd>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Sidebar: Important Notes */}
                    {product.comments?.length > 0 && (
                        <div className="lg:w-[380px] shrink-0">
                            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 sticky top-8 shadow-2xl shadow-gray-900/20">
                                <h3 className="text-xl font-bold text-white mb-8 flex items-center border-b border-white/10 pb-4">
                                    <Zap size={22} className="mr-3 text-yellow-400 fill-current" />
                                    Expert Notes
                                </h3>
                                <div className="space-y-6">
                                    {product.comments.map((comment, idx) => (
                                        <div key={idx} className="group">
                                            <strong className="flex items-center text-[var(--sf-accent-light,cyan-400)] font-bold mb-2 text-sm uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                                                <span className="w-1.5 h-1.5 rounded-full bg-current mr-2"></span>
                                                {comment.title}
                                            </strong>
                                            <span className="text-gray-300 text-sm leading-relaxed block pl-3.5 border-l border-white/10 ml-[3px]">
                                                {comment.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Reviews Section */}
                <div className="mt-24 pt-16 border-t border-gray-100">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-10 flex items-center tracking-tight">
                        <MessageSquare className="mr-4 text-[var(--sf-accent)]" size={32} />
                        Customer Reviews
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* Write a Review Form */}
                        <div className="lg:col-span-1">
                            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900 mb-6">Write a Review</h3>

                                {isLoggedIn ? (
                                    <form onSubmit={handleReviewSubmit} className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Rating</label>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        type="button"
                                                        onClick={() => setNewReview({ ...newReview, rating: star })}
                                                        className="focus:outline-none transition-transform hover:scale-110"
                                                    >
                                                        <Star
                                                            size={28}
                                                            className={newReview.rating >= star ? "text-yellow-400 fill-current" : "text-gray-300"}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Comment</label>
                                            <textarea
                                                rows="4"
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[var(--sf-accent)] focus:border-[var(--sf-accent)] outline-none transition-all resize-none"
                                                placeholder="Share your experience with this product..."
                                                value={newReview.comment}
                                                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                                            />
                                        </div>

                                        {reviewMessage.text && (
                                            <p className={`text-sm font-medium ${reviewMessage.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                                                {reviewMessage.text}
                                            </p>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={submittingReview}
                                            className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {submittingReview ? 'Submitting...' : 'Submit Review'}
                                        </button>
                                    </form>
                                ) : (
                                    <div className="text-center py-8">
                                        <User size={48} className="mx-auto text-gray-300 mb-4" />
                                        {/* 🌟 3. Updated specific messaging for unauthenticated users */}
                                        <p className="text-gray-600 mb-4">Log in to submit a comment and share your thoughts.</p>
                                        {/* 🌟 4. Dynamic routing to point directly to the tenant's account page */}
                                        <Link href={`/${subdomain}/account`} className="inline-block bg-[var(--sf-accent)] text-white px-6 py-2.5 rounded-full font-bold shadow-md hover:-translate-y-0.5 transition-all">
                                            Log In / Register
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Reviews List */}
                        <div className="lg:col-span-2">
                            {reviews.length > 0 ? (
                                <div className="space-y-6">
                                    {reviews.map((review) => (
                                        <div key={review._id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 font-bold uppercase">
                                                        {review.name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900">{review.name}</h4>
                                                        <span className="text-xs text-gray-500">
                                                            {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex text-yellow-400">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            size={14}
                                                            fill={i < review.rating ? "currentColor" : "none"}
                                                            className={i < review.rating ? "" : "text-gray-200"}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                    <MessageSquare size={48} className="text-gray-300 mb-4" />
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">No reviews yet</h3>
                                    <p className="text-gray-500 text-center max-w-sm">Be the first to share your experience with this product!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Related Products Carousel */}
                {relatedProducts.length > 0 && (
                    <div className="mt-32 pt-16 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-10">
                            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Complete Your Look</h2>
                        </div>

                        <div className="flex overflow-x-auto gap-8 pb-12 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
                            <style jsx>{`
                                div::-webkit-scrollbar { display: none; }
                            `}</style>

                            {relatedProducts.map((item) => (
                                <Link
                                    href={`/${subdomain}/products/${item._id}`}
                                    key={item._id}
                                    className="group w-72 flex-shrink-0 snap-start bg-white border border-gray-100 rounded-3xl p-5 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-2"
                                >
                                    <div className="aspect-[4/5] bg-gray-50/50 rounded-2xl mb-5 overflow-hidden relative flex items-center justify-center p-4">
                                        <img
                                            src={item.images[0]}
                                            alt={item.title}
                                            className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-700"
                                        />
                                        {item.discount > 0 && (
                                            <div className="absolute top-3 right-3 bg-red-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-md shadow-red-500/30">
                                                -{item.discount}%
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2 px-1">
                                        <h3 className="font-bold text-gray-900 text-lg line-clamp-1 group-hover:text-[var(--sf-accent)] transition-colors">
                                            {item.title}
                                        </h3>
                                        <div className="flex items-center gap-3">
                                            <p className="font-extrabold text-[var(--sf-accent)] text-lg">৳ {item.finalPrice}</p>
                                            {item.discount > 0 && (
                                                <p className="text-sm text-gray-400 line-through font-medium">৳ {item.sellingPrice}</p>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}