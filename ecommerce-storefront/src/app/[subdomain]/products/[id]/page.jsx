"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useCart } from '@/context/CartContext';
import API from '@/api/api';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, Truck, ShieldCheck, Tag } from 'lucide-react';

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
        images: raw?.images?.length > 0 ? raw.images : [raw?.imageUrl || 'https://via.placeholder.com/600'],
        variants: raw?.variants || [],
        features: raw?.features || [],
        specifications: raw?.specifications || [],
        comments: raw?.comments || []
    };
};

export default function ProductDetails({ params }) {
    // Unwrap the Next.js 15 params promise
    const { subdomain, id } = React.use(params);

    const { addToCart } = useCart();
    const [product, setProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // UI State
    const [activeImageIdx, setActiveImageIdx] = useState(0);
    const [selectedAttributes, setSelectedAttributes] = useState({});

    useEffect(() => {
        const fetchProductAndRelated = async () => {
            try {
                // 1. Fetch Main Product
                const { data } = await API.get(`/storefront/${subdomain}/products/${id}`);
                const normalized = normalizeProduct(data);
                setProduct(normalized);

                // Pre-select first variant's attributes if variants exist
                if (normalized.variants?.length > 0) {
                    const firstActiveVariant = normalized.variants.find(v => v.isActive) || normalized.variants[0];
                    const initialAttrs = {};
                    firstActiveVariant.attributes.forEach(attr => {
                        initialAttrs[attr.name] = attr.value;
                    });
                    setSelectedAttributes(initialAttrs);
                }

                // 2. Fetch Related Products (same category)
                if (normalized.category) {
                    try {
                        const { data: relatedData } = await API.get(`/storefront/${subdomain}/products`, {
                            params: { category: normalized.category }
                        });

                        // Handle standard API response structures (array directly, or inside 'data'/'products' property)
                        const allProducts = Array.isArray(relatedData) ? relatedData : (relatedData.products || relatedData.data || []);

                        // Filter to match category (just in case backend doesn't filter), exclude current product, and limit to 5
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

    // Group available attributes (e.g., all colors, all sizes)
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

    // Find the currently matched variant
    const currentVariant = useMemo(() => {
        if (!product?.variants?.length) return null;
        return product.variants.find(variant =>
            variant.attributes.every(attr => selectedAttributes[attr.name] === attr.value)
        );
    }, [product, selectedAttributes]);

    // Calculate display values based on selected variant or base product
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

    if (loading) {
        return (
            <div className="flex h-[70vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--sf-accent-soft)] border-t-[var(--sf-accent)]"></div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">Product Not Found</h2>
                <Link href="/" className="text-[var(--sf-accent)] hover:underline flex items-center">
                    <ArrowLeft size={16} className="mr-2" /> Back to Shop
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-7xl">
            {/* Breadcrumb Navigation */}
            <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-[var(--sf-accent)] mb-8 transition">
                <ArrowLeft size={16} className="mr-2" />
                Back to Shop
            </Link>

            {/* Top Section: Images and Add to Cart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
                {/* Left Column: Image Gallery */}
                <div className="flex flex-col space-y-4">
                    <div className="bg-gray-50 rounded-3xl overflow-hidden border border-gray-100 aspect-square flex items-center justify-center p-8 relative">
                        <img
                            src={product.images[activeImageIdx]}
                            alt={`${product.title} - Image ${activeImageIdx + 1}`}
                            className="w-full h-full object-contain mix-blend-multiply"
                        />
                        <div className="absolute top-4 left-4 bg-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-gray-600 shadow-sm border border-gray-100">
                            {product.category}
                        </div>
                        {displayDiscount > 0 && (
                            <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center">
                                <Tag size={12} className="mr-1" />
                                {displayDiscount}% OFF
                            </div>
                        )}
                    </div>
                    {/* Thumbnails */}
                    {product.images.length > 1 && (
                        <div className="flex space-x-4 overflow-x-auto py-2 scrollbar-hide">
                            {product.images.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveImageIdx(idx)}
                                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${activeImageIdx === idx ? 'border-[var(--sf-accent)]' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: Product Details & Actions */}
                <div className="flex flex-col justify-start py-4">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2">{product.title}</h1>

                    {currentVariant && (
                        <p className="text-sm text-gray-500 font-mono mb-4">SKU: {currentVariant.sku}</p>
                    )}

                    {/* Pricing */}
                    <div className="flex items-end space-x-4 mb-6">
                        <p className="text-3xl font-bold text-[var(--sf-accent)]">৳ {displayFinalPrice}</p>
                        {displayDiscount > 0 && (
                            <p className="text-lg text-gray-400 line-through mb-1">৳ {baseOriginalPrice}</p>
                        )}
                    </div>

                    <p className="text-gray-600 leading-relaxed mb-8">
                        {product.description || "Experience premium quality with this carefully crafted product."}
                    </p>

                    {/* Variants Selection */}
                    {Object.keys(availableAttributes).length > 0 && (
                        <div className="mb-8 space-y-6">
                            {Object.entries(availableAttributes).map(([attrName, values]) => (
                                <div key={attrName}>
                                    <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
                                        {attrName}
                                    </h3>
                                    <div className="flex flex-wrap gap-3">
                                        {values.map(value => {
                                            const isSelected = selectedAttributes[attrName] === value;
                                            return (
                                                <button
                                                    key={value}
                                                    onClick={() => handleAttributeSelect(attrName, value)}
                                                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                                                        isSelected
                                                            ? 'border-[var(--sf-accent)] bg-[var(--sf-accent-bg)] text-[var(--sf-accent-strong)]'
                                                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
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

                    {/* Stock Status */}
                    <div className="mb-8">
                        {displayStock > 0 ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                                In Stock ({displayStock} available)
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-50 text-red-700">
                                Out of Stock
                            </span>
                        )}
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleAddToCart}
                        disabled={displayStock <= 0}
                        className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-gray-900 hover:bg-[var(--sf-accent)] text-white px-8 py-4 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-[0_12px_30px_-14px_var(--sf-accent)]"
                    >
                        <ShoppingCart size={20} />
                        <span>{displayStock > 0 ? 'Add to Cart' : 'Sold Out'}</span>
                    </button>

                    {/* Trust Badges */}
                    <div className="grid grid-cols-2 gap-4 mt-10 pt-8 border-t border-gray-100">
                        <div className="flex items-center text-sm text-gray-500">
                            <Truck size={20} className="mr-3 text-[var(--sf-accent)] shrink-0" />
                            <span>Fast, reliable delivery across Bangladesh</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                            <ShieldCheck size={20} className="mr-3 text-[var(--sf-accent)] shrink-0" />
                            <span>100% secure payment processing</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Features, Specifications, Comments */}
            <div className="mt-20 flex flex-col lg:flex-row gap-12 lg:gap-20 pt-16 border-t border-gray-200">
                <div className="flex-1 space-y-16">
                    {/* Features Section */}
                    {product.features?.length > 0 && (
                        <section>
                            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-8 tracking-tight">Key Features</h2>
                            <ul className="space-y-4">
                                {product.features.map((feature, idx) => (
                                    <li key={idx} className="flex flex-col sm:flex-row sm:items-baseline group">
                                        <span className="text-lg font-bold text-gray-900 sm:min-w-[180px] shrink-0 mb-1 sm:mb-0">
                                            {feature.title}
                                        </span>
                                        <div className="flex-1 flex items-center">
                                            <span className="hidden sm:inline-block w-4 border-b border-gray-300 mr-4 group-hover:border-[var(--sf-accent-muted)] transition-colors"></span>
                                            <span className="text-base text-gray-600">{feature.value}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {/* Specifications Section */}
                    {product.specifications?.length > 0 && (
                        <section>
                            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-8 tracking-tight">Specifications</h2>
                            <dl className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                                {product.specifications.map((spec, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row px-6 py-4 border-b border-gray-200/60 last:border-0 hover:bg-gray-100/50 transition-colors">
                                        <dt className="text-sm font-bold text-gray-800 sm:w-1/3 uppercase tracking-wider mb-1 sm:mb-0">
                                            {spec.title}
                                        </dt>
                                        <dd className="text-base text-gray-700 sm:w-2/3">{spec.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    )}
                </div>

                {/* Sidebar: Comments / Notes */}
                {product.comments?.length > 0 && (
                    <div className="lg:w-1/3 lg:min-w-[320px]">
                        <div className="bg-gray-900 rounded-3xl p-8 sticky top-8 shadow-xl">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                                <Tag size={22} className="mr-3 text-[var(--sf-accent-muted)]" />
                                Important Notes
                            </h3>
                            <div className="space-y-4">
                                {product.comments.map((comment, idx) => (
                                    <div key={idx} className="bg-white/10 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
                                        <strong className="block text-[var(--sf-accent-light)] font-bold mb-2 text-sm uppercase tracking-wide">
                                            {comment.title}
                                        </strong>
                                        <span className="text-gray-300 text-sm leading-relaxed block">{comment.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ✨ NEW: Related Products Section ✨ */}
            {relatedProducts.length > 0 && (
                <div className="mt-24 pt-16 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">You May Also Like</h2>
                    </div>

                    {/* Horizontal Scroll Container */}
                    <div
                        className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Hides scrollbar on Firefox/IE
                    >
                        {/* Hides scrollbar on Chrome/Safari */}
                        <style jsx>{`
                            div::-webkit-scrollbar { display: none; }
                        `}</style>

                        {relatedProducts.map((item) => (
                            <Link
                                href={`/${subdomain}/product/${item._id}`}
                                key={item._id}
                                className="group w-64 flex-shrink-0 snap-start bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className="aspect-square bg-gray-50 rounded-xl mb-4 overflow-hidden relative">
                                    <img
                                        src={item.images[0]}
                                        alt={item.title}
                                        className="w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                                    />
                                    {item.discount > 0 && (
                                        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-[10px] font-bold shadow-sm">
                                            -{item.discount}%
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-gray-900 line-clamp-1 group-hover:text-[var(--sf-accent)] transition-colors">
                                        {item.title}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-[var(--sf-accent)]">৳ {item.finalPrice}</p>
                                        {item.discount > 0 && (
                                            <p className="text-xs text-gray-400 line-through">৳ {item.sellingPrice}</p>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}