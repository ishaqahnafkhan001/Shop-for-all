"use client";

import Link from 'next/link';
import { Home, Search, ShoppingBag, Truck, User, ShieldCheck, RotateCcw, Mail } from 'lucide-react';
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
            <footer className="mt-12 border-t border-slate-200 pb-20 pt-10 md:pb-10" style={{ backgroundColor: 'var(--sf-footer-bg)', color: 'var(--sf-footer-text)' }}>
                <div className="sf-shell-wide">
                    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">{settings?.shopName || subdomain}</h2>
                            <p className="mt-3 max-w-lg text-sm leading-6 opacity-70">
                                {theme.footer?.text || `Curated products, secure checkout, and reliable order updates from ${settings?.shopName || subdomain}.`}
                            </p>
                            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                {[
                                    [ShieldCheck, 'Secure checkout'],
                                    [Truck, 'Order tracking'],
                                    [RotateCcw, 'Store policies'],
                                ].map(([Icon, label]) => (
                                    <div key={label} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 text-xs font-bold opacity-85">
                                        <Icon size={16} style={{ color: 'var(--sf-footer-link)' }} />
                                        {label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-black uppercase tracking-[0.18em] opacity-45">Shop</h3>
                            {navLinks.length > 0 && (
                                <nav className="mt-4 grid gap-3 text-sm font-semibold opacity-75">
                                    {navLinks.slice(0, 7).map((item, index) => (
                                        <Link
                                            key={`${item.label}-${index}`}
                                            href={item.url}
                                            className="transition-colors hover:opacity-100"
                                            style={{ color: 'var(--sf-footer-link)' }}
                                        >
                                            {item.label}
                                        </Link>
                                    ))}
                                </nav>
                            )}
                        </div>

                        <div>
                            <h3 className="text-sm font-black uppercase tracking-[0.18em] opacity-45">Help</h3>
                            <div className="mt-4 grid gap-3 text-sm font-semibold opacity-75">
                                <Link href="/track" className="transition-colors hover:opacity-100" style={{ color: 'var(--sf-footer-link)' }}>Track order</Link>
                                <Link href="/account" className="transition-colors hover:opacity-100" style={{ color: 'var(--sf-footer-link)' }}>Customer account</Link>
                                <Link href="/cart" className="transition-colors hover:opacity-100" style={{ color: 'var(--sf-footer-link)' }}>View cart</Link>
                                <div className="flex items-center gap-2 pt-1 opacity-60">
                                    <Mail size={15} />
                                    Support through store email
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs font-semibold opacity-55 sm:flex-row sm:items-center sm:justify-between">
                        <p>© {new Date().getFullYear()} {settings?.shopName || subdomain}. All rights reserved.</p>
                        <p>Powered by ShopForAll commerce platform.</p>
                    </div>
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
