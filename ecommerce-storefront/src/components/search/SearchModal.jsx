"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";

export default function SearchModal({
                                        isOpen,
                                        onClose,
                                        products = []
                                    }) {
    const [query, setQuery] = useState("");

    useEffect(() => {
        if (!isOpen) {
            setQuery("");
        }
    }, [isOpen]);

    const filteredProducts = useMemo(() => {
        if (!query.trim()) return [];

        return products.filter((product) => {
            const searchText = `
                ${product.title || ""}
                ${product.category || ""}
                ${product.description || ""}
            `.toLowerCase();

            return searchText.includes(query.toLowerCase());
        });
    }, [query, products]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden mt-10 animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-4">
                    <Search className="text-gray-400" size={20} />

                    <input
                        autoFocus
                        type="text"
                        placeholder="Search products..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-1 outline-none text-sm sm:text-base"
                    />

                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-black transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-[70vh] overflow-y-auto">

                    {!query.trim() && (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            Start typing to search products
                        </div>
                    )}

                    {query.trim() && filteredProducts.length === 0 && (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            No products found
                        </div>
                    )}

                    <div className="divide-y divide-gray-100">
                        {filteredProducts.map((product) => (
                            <Link
                                key={product._id}
                                href={`/products/${product._id}`}
                                onClick={onClose}
                                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition"
                            >
                                <img
                                    src={product.imageUrl}
                                    alt={product.title}
                                    className="w-16 h-16 rounded-xl object-cover bg-gray-100"
                                />

                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm text-gray-900 line-clamp-1">
                                        {product.title}
                                    </h3>

                                    <p className="text-xs text-gray-500 mt-1">
                                        {product.category}
                                    </p>

                                    <p className="text-sm font-bold mt-2 text-gray-900">
                                        ৳ {product.finalPrice}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}