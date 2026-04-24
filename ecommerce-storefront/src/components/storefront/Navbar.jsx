"use client";
import Link from 'next/link';
// ✨ THE FIX: Import the Truck icon for tracking
import { ShoppingBag, Search, User, Truck } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function Navbar({ subdomain }) {
    const { cartCount } = useCart();

    return (
        <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md shadow-sm">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
                <Link href="/" className="text-xl font-extrabold tracking-tight text-gray-900 capitalize hover:text-indigo-600 transition">
                    {subdomain}
                </Link>

                <div className="flex items-center space-x-5 sm:space-x-7">
                    <button className="text-gray-500 hover:text-indigo-600 transition transform hover:scale-110" title="Search">
                        <Search size={22} strokeWidth={2.5} />
                    </button>

                    {/* ✨ THE NEW TRACKING LINK */}
                    <Link href="/track" className="text-gray-500 hover:text-indigo-600 transition transform hover:scale-110" title="Track Order">
                        <Truck size={22} strokeWidth={2.5} />
                    </Link>

                    <Link href="/account" className="text-gray-500 hover:text-indigo-600 transition transform hover:scale-110" title="My Account">
                        <User size={22} strokeWidth={2.5} />
                    </Link>

                    {/* The Cart Icon with Dynamic Badge */}
                    <Link href="/cart" className="relative text-gray-500 hover:text-indigo-600 transition flex items-center transform hover:scale-110" title="Cart">
                        <ShoppingBag size={22} strokeWidth={2.5} />

                        {/* Only show the badge if there is at least 1 item in the cart */}
                        {cartCount > 0 && (
                            <span className="absolute -top-2.5 -right-2.5 bg-indigo-600 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full shadow-md animate-in zoom-in duration-200 border-2 border-white">
                                {cartCount}
                            </span>
                        )}
                    </Link>
                </div>
            </div>
        </header>
    );
}