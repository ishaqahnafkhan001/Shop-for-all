"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Search, X } from "lucide-react";

export default function SearchModal({
                                        isOpen,
                                        onClose,
                                        products = []
                                    }) {
    const [query, setQuery] = useState("");

    useEffect(() => {
        if (!isOpen) {
            queueMicrotask(() => setQuery(""));
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
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-4">
            <div className="mt-4 w-full max-w-3xl overflow-hidden rounded-[1.75rem] border border-white/20 bg-white shadow-2xl shadow-slate-950/30 sm:mt-10">

                {/* Header */}
                <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--sf-accent)] shadow-sm">
                        <Search size={19} />
                    </div>

                    <input
                        autoFocus
                        type="text"
                        placeholder="Search products, categories, descriptions..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-950 outline-none placeholder:text-slate-400"
                    />

                    <button
                        onClick={onClose}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-white hover:text-slate-950"
                        aria-label="Close search"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-[72vh] overflow-y-auto">

                    {!query.trim() && (
                        <div className="grid gap-4 p-5 sm:p-6">
                            <div className="rounded-3xl bg-slate-950 p-5 text-white">
                                <p className="text-sm font-black">Find products faster</p>
                                <p className="mt-2 text-sm leading-6 text-white/58">
                                    Search by product name, category, or keywords. Popular products will appear instantly as you type.
                                </p>
                            </div>
                            {products.length > 0 && (
                                <div>
                                    <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Popular products</p>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {products.slice(0, 4).map((product) => (
                                            <Link
                                                key={product._id}
                                                href={`/products/${product._id}`}
                                                onClick={onClose}
                                                className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 transition hover:border-[var(--sf-accent)] hover:bg-slate-50"
                                            >
                                                <Image
                                                    src={product.imageUrl}
                                                    alt={product.title}
                                                    width={56}
                                                    height={56}
                                                    className="h-14 w-14 rounded-xl bg-slate-100 object-cover"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="line-clamp-1 text-sm font-bold text-slate-950">{product.title}</p>
                                                    <p className="mt-1 text-xs font-semibold text-slate-500">৳ {product.finalPrice}</p>
                                                </div>
                                                <ArrowRight size={16} className="text-slate-300" />
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {query.trim() && filteredProducts.length === 0 && (
                        <div className="p-10 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
                                <Search size={24} />
                            </div>
                            <p className="font-bold text-slate-950">No products found</p>
                            <p className="mt-2 text-sm text-slate-500">Try a shorter keyword or search by category.</p>
                        </div>
                    )}

                    <div className="divide-y divide-slate-100">
                        {filteredProducts.map((product) => (
                            <Link
                                key={product._id}
                                href={`/products/${product._id}`}
                                onClick={onClose}
                                className="flex items-center gap-4 p-4 transition hover:bg-slate-50 sm:p-5"
                            >
	                                <Image
	                                    src={product.imageUrl}
	                                    alt={product.title}
	                                    width={64}
	                                    height={64}
	                                    className="h-16 w-16 rounded-2xl bg-slate-100 object-cover"
	                                />

                                <div className="flex-1 min-w-0">
                                    <h3 className="line-clamp-1 text-sm font-black text-slate-950">
                                        {product.title}
                                    </h3>

                                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        {product.category}
                                    </p>

                                    <p className="mt-2 text-sm font-black text-[var(--sf-accent)]">
                                        ৳ {product.finalPrice}
                                    </p>
                                </div>

                                <ArrowRight size={18} className="text-slate-300" />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
