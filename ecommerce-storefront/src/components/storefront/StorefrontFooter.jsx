"use client";

import Link from 'next/link';
import { Home, Search, ShoppingBag, Truck, User } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { getSortedNavigation } from '@/lib/theme';
import { useStorefrontTheme } from '@/components/storefront/StorefrontThemeProvider';

export default function StorefrontFooter({ subdomain }) {
    const { cartCount } = useCart();
    const { theme, settings } = useStorefrontTheme();
    const footerLinks = (theme.footer?.links || []).filter(item => item?.label && item?.url);
    const mobileLinks = [
        { label: 'Home', href: '/', icon: Home },
        { label: 'Search', href: '/#products', icon: Search },
        { label: 'Track', href: '/track', icon: Truck },
        { label: 'Account', href: '/account', icon: User },
        { label: 'Cart', href: '/cart', icon: ShoppingBag, badge: cartCount },
    ];
    const navLinks = footerLinks.length ? footerLinks : getSortedNavigation(theme);

    return (
        <>
            <footer className="border-t py-10 sm:py-12 mt-16 sm:mt-20 bg-gray-50">
                <div className="container mx-auto px-4 text-center text-gray-500 text-sm font-medium">
                    <p>
                        {theme.footer?.text || `© ${new Date().getFullYear()} ${settings?.shopName || subdomain}. Powered by ShopForAll.`}
                    </p>
                    {navLinks.length > 0 && (
                        <nav className="mt-4 flex flex-wrap items-center justify-center gap-4">
                            {navLinks.slice(0, 6).map((item, index) => (
                                <Link
                                    key={`${item.label}-${index}`}
                                    href={item.url}
                                    className="hover:text-[var(--sf-accent)] transition-colors"
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    )}
                </div>
            </footer>

            {theme.mobile?.showBottomNavigation && (
                <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-gray-200 bg-white/95 px-1 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
                    {mobileLinks.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className="relative flex flex-col items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-[var(--sf-accent)]"
                            >
                                <Icon size={18} />
                                <span>{item.label}</span>
                                {item.badge > 0 && (
                                    <span className="absolute right-4 top-0 h-4 min-w-4 rounded-full bg-[var(--sf-accent)] px-1 text-[10px] leading-4 text-white">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            )}
        </>
    );
}
