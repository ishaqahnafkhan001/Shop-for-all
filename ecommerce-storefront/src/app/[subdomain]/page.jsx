"use client";
import React, { useState } from 'react';
import { useShopData } from '@/hooks/useShopData';
import { useCart } from '@/context/CartContext';
import { ShoppingCart, PackageX, ShoppingBag, ArrowRight, Filter } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function VendorHomePage({ params }) {
    const { subdomain } = React.use(params);
    const { addToCart } = useCart();
    const router = useRouter();

    // ✨ Master Filter State
// Change this line...
    const [filters, setFilters] = useState({ category: 'All', minPrice: '', maxPrice: '', sort: 'newest' });
    // ✨ Local inputs for Price (so it doesn't search on every single keystroke)
    const [priceInput, setPriceInput] = useState({ min: '', max: '' });

    // Pass the filters into our upgraded hook!
    const { shop, products, categories, loading, error, hasMore, loadingMore, loadMore } = useShopData(subdomain, filters);

    // Apply Price Filter Button
    const handlePriceApply = () => {
        setFilters({ ...filters, minPrice: priceInput.min, maxPrice: priceInput.max });
    };

    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <PackageX size={48} className="text-gray-300 mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">Store Unavailable</h2>
            <p className="text-gray-500 text-sm">This storefront is currently inactive.</p>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8 sm:px-6 mb-24 max-w-7xl">

            {/* HERO SECTION */}
            <section className="relative bg-gray-900 text-white rounded-[2rem] py-16 px-6 md:py-24 mb-12 overflow-hidden flex flex-col items-center text-center shadow-xl shadow-gray-900/10">
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="relative z-10 max-w-3xl">
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 capitalize">
                        {shop?.name || subdomain}
                    </h1>
                    <p className="text-gray-400 text-lg md:text-xl font-light">
                        {shop?.description || "Curated essentials for the modern lifestyle. Discover the latest collection."}
                    </p>
                </div>
            </section>

            {/* ✨ NEW: 2-COLUMN LAYOUT */}
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

                {/* ⬅️ LEFT COLUMN: SIDEBAR */}
                <aside className="w-full lg:w-64 flex-shrink-0">
                    <div className="sticky top-24 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6 text-gray-900 font-bold text-lg">
                            <Filter size={20} />
                            <h2>Filters</h2>
                        </div>

                        {/* Category Filter */}
                        <div className="mb-8">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Categories</h3>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => setFilters({ ...filters, category: 'All' })}
                                    className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${filters.category === 'All' ? 'bg-gray-900 text-white font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    All Products
                                </button>
                                {categories?.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setFilters({ ...filters, category: cat })}
                                        className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${filters.category === cat ? 'bg-gray-900 text-white font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Price Filter */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Price Range</h3>
                            <div className="flex items-center gap-2 mb-3">
                                <input
                                    type="number"
                                    placeholder="Min"
                                    value={priceInput.min}
                                    onChange={(e) => setPriceInput({...priceInput, min: e.target.value})}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="number"
                                    placeholder="Max"
                                    value={priceInput.max}
                                    onChange={(e) => setPriceInput({...priceInput, max: e.target.value})}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                                />
                            </div>
                            <button
                                onClick={handlePriceApply}
                                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-semibold rounded-lg transition-colors"
                            >
                                Apply Price
                            </button>
                        </div>
                    </div>
                </aside>

                {/* ➡️ RIGHT COLUMN: PRODUCT GRID */}
                <main className="flex-1">

                    {/* ✨ NEW: SORTING HEADER BAR ✨ */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 bg-gray-50 border border-gray-100 p-3 rounded-2xl">

                        {/* Left Side: Price Sort */}
                        <div className="flex items-center">
                            <label className="text-sm font-semibold text-gray-500 mr-3 hidden sm:block whitespace-nowrap">Price Sort:</label>
                            <select
                                value={['priceAsc', 'priceDesc'].includes(filters.sort) ? filters.sort : 'default'}
                                onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                                className="w-full sm:w-auto bg-white border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none px-4 py-2 cursor-pointer transition"
                            >
                                <option value="default" disabled>Select Price</option>
                                <option value="priceAsc">Low to High</option>
                                <option value="priceDesc">High to Low</option>
                            </select>
                        </div>

                        {/* Right Side: Name Sort */}
                        <div className="flex items-center">
                            <label className="text-sm font-semibold text-gray-500 mr-3 hidden sm:block whitespace-nowrap">A-Z Sort:</label>
                            <select
                                value={['nameAsc', 'nameDesc'].includes(filters.sort) ? filters.sort : 'default'}
                                onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                                className="w-full sm:w-auto bg-white border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none px-4 py-2 cursor-pointer transition"
                            >
                                <option value="default" disabled>Select Name</option>
                                <option value="nameAsc">A to Z</option>
                                <option value="nameDesc">Z to A</option>
                            </select>
                        </div>
                    </div>


                    {loading ? (
                        // SKELETON LOADER
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="flex flex-col space-y-4 animate-pulse">
                                    <div className="aspect-square bg-gray-100 rounded-2xl"></div>
                                    <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                                    <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* THE GRID (Now 3 columns instead of 4 because of the sidebar) */}
                            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                                {products?.map((product, index) => (
                                    <div
                                        key={product._id}
                                        className="group flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                                        style={{ animationDelay: `${(index % 16) * 50}ms` }}
                                    >
                                        <div className="aspect-square relative overflow-hidden bg-gray-50 rounded-2xl mb-6">
                                            <Link href={`/products/${product._id}`} className="absolute inset-0 z-10" />
                                            <img
                                                src={product.imageUrl || 'https://via.placeholder.com/400'}
                                                alt={product.title}
                                                className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-105 mix-blend-multiply"
                                            />
                                            {product.stock <= 0 && (
                                                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur text-gray-900 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest z-20">
                                                    Sold Out
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col flex-grow px-1">
                                            <div className="flex justify-between items-start mb-1.5">
                                                <h3 className="text-base font-semibold text-gray-900 pr-4 leading-snug">
                                                    <Link href={`/products/${product._id}`} className="hover:text-indigo-600 transition-colors relative z-10">
                                                        {product.title}
                                                    </Link>
                                                </h3>
                                            </div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{product.category}</p>
                                            <p className="text-lg font-extrabold text-gray-900 mb-6">৳ {product.sellingPrice}</p>

                                            <div className="flex items-center gap-2 mt-auto relative z-20">
                                                <button onClick={(e) => { e.preventDefault(); addToCart(product); }} disabled={product.stock <= 0} className="p-3 border border-gray-200 rounded-xl text-gray-600 hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-50">
                                                    <ShoppingBag size={18} />
                                                </button>
                                                <button onClick={(e) => { e.preventDefault(); addToCart(product); router.push('/checkout'); }} disabled={product.stock <= 0} className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white py-3 px-4 rounded-xl text-sm font-bold hover:bg-indigo-600 transition-colors disabled:bg-gray-300">
                                                    <span>Buy Now</span>
                                                    <ArrowRight size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* LOAD MORE */}
                            {hasMore && (
                                <div className="flex justify-center mt-20 mb-8">
                                    <button onClick={loadMore} disabled={loadingMore} className="px-10 py-4 bg-white border-2 border-gray-200 text-gray-900 text-sm font-bold rounded-2xl hover:border-gray-900 transition-colors disabled:opacity-50">
                                        {loadingMore ? 'Loading...' : 'Load More'}
                                    </button>
                                </div>
                            )}

                            {/* EMPTY STATE */}
                            {products?.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <ShoppingCart size={32} className="text-gray-300 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">No products found</h3>
                                    <p className="text-gray-500 text-sm">Try adjusting your category or price filters.</p>
                                    <button onClick={() => { setFilters({category: 'All', minPrice: '', maxPrice: ''}); setPriceInput({min:'', max:''}); }} className="mt-4 text-indigo-600 hover:underline text-sm font-medium">Clear all filters</button>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}