"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Search, User, Truck, ShieldCheck } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useEffect, useState } from 'react';

import SearchModal from '@/components/search/SearchModal';
import API from '@/api/api';
import { getSortedNavigation } from '@/lib/theme';
import { useStorefrontTheme } from '@/components/storefront/StorefrontThemeProvider';

export default function Navbar({ subdomain }) {
    const { cartCount } = useCart();
    const { settings: shopSettings, theme } = useStorefrontTheme();

    const [searchOpen, setSearchOpen] = useState(false);
    const [products, setProducts] = useState([]);

    useEffect(() => {
        const fetchSearchProducts = async () => {
            try {
                const productsRes = await API.get(`/storefront/${subdomain}/products`, {
                    params: { limit: 12 }
                });

                const rawProducts =
                    productsRes.data?.products ||
                    productsRes.data?.data ||
                    [];

                const normalized = rawProducts.map((p) => {
                    const sellingPrice = p?.pricing?.sellingPrice ?? p?.sellingPrice ?? 0;
                    const discount = p?.pricing?.discount ?? p?.discount ?? 0;
                    const finalPrice = p?.finalPrice ?? Math.round(sellingPrice - (sellingPrice * (discount / 100)));

                    return {
                        ...p,
                        sellingPrice,
                        discount,
                        finalPrice,
                        imageUrl: p?.imageUrl || p?.images?.[0] || 'https://via.placeholder.com/400',
                    };
                });

                setProducts(normalized);
            } catch (err) {
                console.error("Search products fetch failed:", err);
            }
        };

        if (searchOpen && subdomain && products.length === 0) {
            fetchSearchProducts();
        }
    }, [searchOpen, subdomain, products.length]);

    const navLinks = getSortedNavigation(theme).slice(0, 4);

    return (
        <>
            <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-[var(--sf-header-background)]/90 shadow-sm backdrop-blur-xl">
                <div className="hidden border-b border-slate-200/70 bg-slate-950 text-white lg:block">
                    <div className="sf-shell-wide flex h-9 items-center justify-between text-xs font-semibold text-white/72">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={14} className="text-emerald-300" />
                            Secure shopping, fast delivery, and tenant-safe customer accounts.
                        </div>
                        <div className="flex items-center gap-5">
                            <span>Support ready</span>
                            <span>Order tracking available</span>
                            <span>Cash on delivery supported</span>
                        </div>
                    </div>
                </div>

                <div className="sf-shell-wide flex h-16 items-center justify-between gap-4">

                    <Link
                        href="/"
                        className="flex min-w-0 items-center gap-3 text-lg font-black tracking-tight text-slate-950 capitalize transition hover:text-[var(--sf-accent)] sm:text-xl"
                    >
                        {theme.logoUrl && (
                            <Image src={theme.logoUrl} alt="" width={36} height={36} className="h-9 w-9 rounded-xl border border-slate-200 object-cover" />
                        )}
                        <span className="truncate">{shopSettings?.shopName || subdomain}</span>
                    </Link>

                    <nav className="hidden items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-sm font-bold text-slate-600 md:flex">
                        {navLinks.map((item, index) => (
                            <Link
                                key={`${item.label}-${index}`}
                                href={item.url}
                                className="rounded-full px-4 py-2 transition hover:bg-slate-100 hover:text-slate-950"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2">

                        {/* SEARCH */}
                        <button
                            onClick={() => setSearchOpen(true)}
                            className="sf-btn sf-btn-secondary h-11 min-h-0 px-3 text-slate-600 sm:px-4"
                            title="Search"
                            aria-label="Search products"
                        >
                            <Search size={18} strokeWidth={2.5} />
                            <span className="hidden text-sm sm:inline">Search</span>
                        </button>

                        <Link
                            href="/track"
                            className="hidden h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 sm:flex"
                        >
                            <Truck size={18} strokeWidth={2.5} />
                            Track
                        </Link>

                        <Link
                            href="/account"
                            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                            aria-label="Account"
                        >
                            <User size={19} strokeWidth={2.5} />
                        </Link>

                        <Link
                            href="/cart"
                            className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white transition hover:bg-[var(--sf-accent)]"
                            aria-label="Cart"
                        >
                            <ShoppingBag size={19} strokeWidth={2.5} />

                            {cartCount > 0 && (
                                <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 px-1 text-[10px] font-black text-white shadow-md">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>
            </header>

            <SearchModal
                isOpen={searchOpen}
                onClose={() => setSearchOpen(false)}
                products={products}
            />
        </>
    );
}
