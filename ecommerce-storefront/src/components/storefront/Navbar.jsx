"use client";
import Link from 'next/link';
import { ShoppingBag, Search, User } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function Navbar({ subdomain }) {
    const { cart } = useCart();

    // Calculate total number of items in the cart
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur-md">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
                <Link href="/" className="text-xl font-extrabold tracking-tight text-gray-900 capitalize">
                    {subdomain}
                </Link>

                <div className="flex items-center space-x-6">
                    <button className="text-gray-500 hover:text-indigo-600 transition">
                        <Search size={20} />
                    </button>
                    <Link href="/account" className="text-gray-500 hover:text-gray-900 transition">
                        <User size={20} />
                    </Link>

                    {/* The Cart Icon with Dynamic Badge */}
                    <Link href="/cart" className="relative text-gray-500 hover:text-indigo-600 transition flex items-center">
                        <ShoppingBag size={20} />

                        {/* Only show the badge if there is at least 1 item in the cart */}
                        {cartCount > 0 && (
                            <span className="absolute -top-2 -right-2.5 bg-indigo-600 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full shadow-sm animate-in zoom-in duration-200">
                                {cartCount}
                            </span>
                        )}
                    </Link>
                </div>
            </div>
        </header>
    );
}