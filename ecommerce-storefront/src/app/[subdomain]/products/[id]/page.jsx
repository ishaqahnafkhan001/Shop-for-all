"use client";
import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import API from '@/api/api';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, Truck, ShieldCheck } from 'lucide-react';

export default function ProductDetails({ params }) {
    // Unwrap the Next.js 15 params promise
    const { subdomain, id } = React.use(params);

    const { addToCart } = useCart();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                // Fetch the single product from our backend
                const { data } = await API.get(`/public/products/${id}`);
                setProduct(data);
            } catch (err) {
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchProduct();
    }, [id]);

    if (loading) {
        return (
            <div className="flex h-[70vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">Product Not Found</h2>
                <Link href="/" className="text-indigo-600 hover:underline flex items-center">
                    <ArrowLeft size={16} className="mr-2" /> Back to Shop
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12">
            {/* Breadcrumb Navigation */}
            <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600 mb-8 transition">
                <ArrowLeft size={16} className="mr-2" />
                Back to {subdomain}'s Shop
            </Link>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
                {/* Left Column: Image */}
                <div className="bg-gray-50 rounded-3xl overflow-hidden border border-gray-100 aspect-square flex items-center justify-center p-8 relative">
                    <img
                        src={product.imageUrl || 'https://via.placeholder.com/600'}
                        alt={product.title}
                        className="w-full h-full object-contain mix-blend-multiply"
                    />
                    <div className="absolute top-4 left-4 bg-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-gray-600 shadow-sm">
                        {product.category}
                    </div>
                </div>

                {/* Right Column: Details */}
                <div className="flex flex-col justify-center">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2">{product.title}</h1>
                    <p className="text-3xl font-bold text-indigo-600 mb-6">৳ {product.sellingPrice}</p>

                    <p className="text-gray-600 leading-relaxed mb-8">
                        {product.description || "Experience premium quality with this carefully crafted product. Designed to meet the highest standards of performance and durability for your everyday needs."}
                    </p>

                    {/* Stock Status */}
                    <div className="mb-8">
                        {product.stock > 0 ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                                In Stock ({product.stock} available)
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-50 text-red-700">
                                Out of Stock
                            </span>
                        )}
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={() => addToCart(product)}
                        disabled={product.stock <= 0}
                        className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-gray-900 hover:bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-indigo-500/30"
                    >
                        <ShoppingCart size={20} />
                        <span>{product.stock > 0 ? 'Add to Cart' : 'Sold Out'}</span>
                    </button>

                    {/* Trust Badges */}
                    <div className="grid grid-cols-2 gap-4 mt-12 pt-8 border-t border-gray-100">
                        <div className="flex items-center text-sm text-gray-500">
                            <Truck size={20} className="mr-3 text-indigo-600" />
                            <span>Fast, reliable delivery across Bangladesh</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                            <ShieldCheck size={20} className="mr-3 text-indigo-600" />
                            <span>100% secure payment processing</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}