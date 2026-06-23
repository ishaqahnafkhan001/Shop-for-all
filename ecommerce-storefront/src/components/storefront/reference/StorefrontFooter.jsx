"use client";

import { ChevronDown, Home, Mail, Search, ShoppingBag, Truck, User } from "lucide-react";

import { getSortedNavigation, normalizeTheme } from "../../../lib/theme";
import {
    containerClass,
    DefaultLink,
    EditorSelectionFrame,
    getReferenceThemeStyle,
    isPreviewNarrow,
    LinkSlot,
} from "./referenceCore";

const FooterColumn = ({ title, links, LinkComponent }) => (
    <div>
        <h3 className="text-sm font-black text-[var(--sf-footer-link)]">{title}</h3>
        <div className="mt-4 grid gap-3 text-sm font-semibold text-[var(--sf-footer-text)]">
            {links.map((link) => (
                <LinkSlot key={link.label} LinkComponent={LinkComponent} href={link.href} className="transition hover:text-[var(--sf-footer-link)]">
                    {link.label}
                </LinkSlot>
            ))}
        </div>
    </div>
);

const FooterAccordion = ({ title, links, LinkComponent }) => (
    <details className="group border-b border-slate-200 py-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black text-[var(--sf-footer-link)]">
            {title}
            <ChevronDown size={17} className="transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 grid gap-3 pb-2 text-sm font-semibold text-[var(--sf-footer-text)]">
            {links.map((link) => (
                <LinkSlot key={link.label} LinkComponent={LinkComponent} href={link.href} className="transition hover:text-[var(--sf-footer-link)]">
                    {link.label}
                </LinkSlot>
            ))}
        </div>
    </details>
);

export function ReferenceStorefrontFooter({ theme: themeCandidate, shopName, subdomain, cartCount = 0, LinkComponent = DefaultLink, preview = false, previewDevice, editor }) {
    const theme = normalizeTheme(themeCandidate);
    const brandName = shopName || subdomain || "Storefront";
    const footerLinks = (theme.footer?.links || []).filter((item) => item?.label && item?.url);
    const navLinks = footerLinks.length
        ? footerLinks.map((item) => ({ label: item.label, href: item.url }))
        : getSortedNavigation(theme).map((item) => ({ label: item.label, href: item.url }));
    const columns = navLinks.length ? [{ title: "Store Links", links: navLinks.slice(0, 8) }] : [];
    const forceNarrowFooter = isPreviewNarrow(previewDevice);
    const footerGridClass = `grid min-w-0 gap-8 ${columns.length && !forceNarrowFooter ? "lg:grid-cols-[1.3fr_minmax(0,1fr)]" : ""}`;
    const desktopColumnsClass = forceNarrowFooter ? "hidden" : "hidden contents lg:contents";
    const mobileColumnsClass = forceNarrowFooter ? "block" : "lg:hidden";
    const bottomNavClass = `${preview ? "sticky bottom-0" : "fixed inset-x-0 bottom-0"} z-50 ${previewDevice ? (previewDevice === "desktop" ? "hidden" : "grid") : "grid md:hidden"} grid-cols-5 border-t border-slate-200 bg-white/95 px-1 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur`;
    const mobileLinks = [
        { label: "Home", href: "/", icon: Home },
        { label: "Search", href: "/#products", icon: Search },
        { label: "Track", href: "/track", icon: Truck },
        { label: "Account", href: "/account", icon: User },
        { label: "Cart", href: "/cart", icon: ShoppingBag, badge: cartCount },
    ];

    return (
        <>
            <EditorSelectionFrame editor={editor} id="footer" label="Footer" locked>
                <footer className="min-w-0 overflow-x-hidden border-t border-slate-200 bg-[var(--sf-footer-background)] pb-20 pt-8 text-[var(--sf-footer-text)] md:pb-8 md:pt-10" style={getReferenceThemeStyle(theme)}>
                    <div className={containerClass}>
                        <div className={footerGridClass}>
                            <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                    <span className="h-10 w-10 rounded-full bg-[var(--sf-accent)]" />
                                    <div className="min-w-0">
                                        <h2 className="truncate text-lg font-black text-[var(--sf-footer-link)]">{brandName}</h2>
                                        <p className="text-xs font-semibold text-[var(--sf-footer-text)]">Storefront</p>
                                    </div>
                                </div>
                                {theme.footer?.text && (
                                    <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--sf-footer-text)]">
                                        {theme.footer.text}
                                    </p>
                                )}
                                <form className="mt-5 flex max-w-sm flex-col gap-2 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-1.5 min-[420px]:flex-row min-[420px]:rounded-full min-[420px]:p-1" onSubmit={(event) => event.preventDefault()}>
                                    <input type="email" aria-label="Email for updates" placeholder="Email for updates" className="min-h-10 min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 min-[420px]:min-h-11 min-[420px]:px-4" />
                                    <button type="submit" className="min-h-10 rounded-full bg-slate-950 px-5 py-2 text-sm font-black text-white min-[420px]:min-h-11 min-[420px]:py-2.5">Subscribe</button>
                                </form>
                            </div>
                            <div className={desktopColumnsClass}>
                                {columns.map((column) => <FooterColumn key={column.title} {...column} LinkComponent={LinkComponent} />)}
                            </div>
                            <div className={mobileColumnsClass}>
                                {columns.map((column) => <FooterAccordion key={column.title} {...column} LinkComponent={LinkComponent} />)}
                            </div>
                        </div>
                        <div className="mt-6 flex min-w-0 flex-col gap-3 border-t border-slate-200 pt-4 text-xs font-semibold text-[var(--sf-footer-text)] sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pt-5">
                            <p className="min-w-0 break-words">© {new Date().getFullYear()} {brandName}. Powered by Commerce SaaS.</p>
                            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                                <Mail size={16} />
                                {["f", "ig", "x"].map((item) => (
                                    <span key={item} className="flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-1 text-[10px] font-black uppercase text-[var(--sf-footer-text)]">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </footer>
            </EditorSelectionFrame>

            {theme.mobile?.showBottomNavigation && (
                <nav className={bottomNavClass}>
                    {mobileLinks.map((item) => {
                        const Icon = item.icon;
                        return (
                            <LinkSlot key={item.label} LinkComponent={LinkComponent} href={item.href} className="relative flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[var(--sf-accent)]">
                                <Icon size={18} />
                                <span>{item.label}</span>
                                {item.badge > 0 && <span className="absolute right-4 top-0 h-4 min-w-4 rounded-full bg-[var(--sf-accent)] px-1 text-[10px] leading-4 text-white">{item.badge}</span>}
                            </LinkSlot>
                        );
                    })}
                </nav>
            )}
        </>
    );
}
