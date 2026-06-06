"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Search, User, Truck } from 'lucide-react';
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
            <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-[var(--sf-header-background)]/80 backdrop-blur-md shadow-sm">
                <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">

                    <Link
                        href="/"
                        className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-gray-900 capitalize hover:text-[var(--sf-accent)] transition"
                    >
                        {theme.logoUrl && (
                            <Image src={theme.logoUrl} alt="" width={32} height={32} className="h-8 w-8 rounded object-cover" />
                        )}
                        <span>{shopSettings?.shopName || subdomain}</span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-5 text-sm font-semibold text-gray-600">
                        {navLinks.map((item, index) => (
                            <Link key={`${item.label}-${index}`} href={item.url} className="hover:text-[var(--sf-accent)] transition">
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center space-x-5 sm:space-x-7">

                        {/* SEARCH */}
                        <button
                            onClick={() => setSearchOpen(true)}
                            className="text-gray-500 hover:text-[var(--sf-accent)] transition transform hover:scale-110"
                            title="Search"
                        >
                            <Search size={22} strokeWidth={2.5} />
                        </button>

                        <Link
                            href="/track"
                            className="text-gray-500 hover:text-[var(--sf-accent)] transition transform hover:scale-110"
                        >
                            <Truck size={22} strokeWidth={2.5} />
                        </Link>

                        <Link
                            href="/account"
                            className="text-gray-500 hover:text-[var(--sf-accent)] transition transform hover:scale-110"
                        >
                            <User size={22} strokeWidth={2.5} />
                        </Link>

                        <Link
                            href="/cart"
                            className="relative text-gray-500 hover:text-[var(--sf-accent)] transition flex items-center transform hover:scale-110"
                        >
                            <ShoppingBag size={22} strokeWidth={2.5} />

                            {cartCount > 0 && (
                                <span className="absolute -top-2.5 -right-2.5 bg-[var(--sf-accent)] text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full shadow-md animate-in zoom-in duration-200 border-2 border-white">
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
