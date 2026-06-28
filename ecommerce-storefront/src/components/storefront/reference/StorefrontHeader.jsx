/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import {
    ChevronDown,
    Menu,
    Search,
    ShieldCheck,
    ShoppingBag,
    Truck,
    User,
    X,
} from "lucide-react";

import { getSortedNavigation, normalizeTheme } from "../../../lib/theme";
import {
    containerClass,
    DefaultLink,
    EditorSelectionFrame,
    isPreviewNarrow,
    LinkSlot,
    noop,
    optimizeCloudinaryImage,
} from "./referenceCore";

const TrustedBadge = ({ badge }) => {
    if (!badge?.active) return null;

    return (
        <span
            className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100"
            title={badge.tooltip || "Verified by ScaleUp based on identity verification, sales history, store age, and customer review quality."}
            aria-label={`${badge.label || "ScaleUp Trusted"}: ${badge.tooltip || "Verified by ScaleUp"}`}
        >
            <ShieldCheck className="h-3 w-3 shrink-0" />
            <span className="truncate">{badge.label || "ScaleUp Trusted"}</span>
        </span>
    );
};

const VerifiedSellerBadge = ({ verification }) => {
    if (!verification?.isVerified) return null;

    return (
        <span
            className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-sky-700 ring-1 ring-sky-100"
            title="This seller has completed Scaleup identity and phone verification."
            aria-label="Verified seller: completed Scaleup identity and phone verification"
        >
            <ShieldCheck className="h-3 w-3 shrink-0" />
            <span className="truncate">{verification.label || "Verified seller"}</span>
        </span>
    );
};

const BrandMark = ({ theme, brandName, trustedBadge, shopVerification }) => (
    <span className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        {theme.logoUrl ? (
            <img
                src={optimizeCloudinaryImage(theme.logoUrl, { width: 96 })}
                alt={brandName}
                width="40"
                height="40"
                className="h-9 w-9 rounded-2xl border border-slate-200 object-cover shadow-sm sm:h-10 sm:w-10"
                loading="eager"
                decoding="async"
            />
        ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-teal-600 text-sm font-black text-white shadow-sm shadow-teal-900/20 sm:h-10 sm:w-10">
                {brandName.slice(0, 1).toUpperCase()}
            </span>
        )}
        <span className="min-w-0">
            <span className="block truncate text-sm font-black leading-tight text-[var(--sf-navbar-text)] sm:text-base">{brandName}</span>
            <span className="hidden truncate text-xs font-semibold text-[var(--sf-navbar-text)] opacity-60 sm:block">Storefront</span>
            <VerifiedSellerBadge verification={shopVerification} />
            <TrustedBadge badge={trustedBadge} />
        </span>
    </span>
);

const HeaderNavItem = ({ item, LinkComponent, onClick }) => {
    const children = item.children || [];
    const hasChildren = children.length > 0;

    if (!hasChildren) {
        return (
            <LinkSlot
                LinkComponent={LinkComponent}
                href={item.url || "#"}
                onClick={onClick}
                className="rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-[var(--sf-navbar-hover)]"
            >
                {item.label}
            </LinkSlot>
        );
    }

    return (
        <div className="group relative">
            <LinkSlot
                LinkComponent={LinkComponent}
                href={item.url || "#"}
                onClick={onClick}
                className="inline-flex items-center gap-1 rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-[var(--sf-navbar-hover)]"
            >
                {item.label}
                <ChevronDown size={14} className="transition group-hover:rotate-180" />
            </LinkSlot>
            <div className="invisible absolute left-0 top-full z-40 min-w-56 translate-y-2 rounded-2xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl shadow-slate-900/10 transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                {children.map((child, index) => (
                    <LinkSlot
                        key={`${child.label}-${index}`}
                        LinkComponent={LinkComponent}
                        href={child.url}
                        onClick={onClick}
                        className="block rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-[var(--sf-navbar-hover)]"
                    >
                        {child.label}
                    </LinkSlot>
                ))}
            </div>
        </div>
    );
};

export function ReferenceStorefrontHeader({
    theme: themeCandidate,
    shopName,
    subdomain,
    cartCount = 0,
    onSearch = noop,
    LinkComponent = DefaultLink,
    preview = false,
    previewDevice,
    editor,
    trustedBadge,
    shopVerification,
}) {
    const theme = normalizeTheme(themeCandidate);
    const brandName = shopName || subdomain || "Storefront";
    const navLinks = getSortedNavigation(theme);
    const headerNavLinks = navLinks.filter((item) => !["track order", "account", "cart"].includes(String(item.label || "").toLowerCase()));
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const logoPosition = theme.header?.logoPosition || "Left";
    const forcedDesktopLayoutClass = logoPosition === "Center"
        ? "grid-cols-[minmax(0,1fr)_minmax(190px,auto)_minmax(0,1fr)]"
        : logoPosition === "Right"
            ? "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(190px,auto)]"
            : "grid-cols-[minmax(190px,0.8fr)_minmax(0,1fr)_minmax(260px,1.05fr)]";
    const desktopLayoutClass = logoPosition === "Center"
        ? "lg:grid-cols-[minmax(0,1fr)_minmax(190px,auto)_minmax(0,1fr)]"
        : logoPosition === "Right"
            ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(190px,auto)]"
            : "lg:grid-cols-[minmax(190px,0.8fr)_minmax(0,1fr)_minmax(260px,1.05fr)]";
    const brandSlot = (
        <LinkSlot LinkComponent={LinkComponent} href="/" className="min-w-0">
            <BrandMark theme={theme} brandName={brandName} trustedBadge={trustedBadge} shopVerification={shopVerification} />
        </LinkSlot>
    );
    const searchSlot = (
        <div className={`flex min-w-0 ${logoPosition === "Left" ? "justify-center" : "justify-start"}`}>
            <button
                type="button"
                onClick={onSearch}
                aria-label="Search products"
                className="flex h-11 w-full max-w-[420px] min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-500 transition hover:border-[var(--sf-accent-soft)] hover:bg-white hover:text-slate-900 xl:px-5"
            >
                <Search size={17} className="shrink-0" />
                <span className="truncate">Search products</span>
            </button>
        </div>
    );
    const actionSlot = (
        <div className={`flex min-w-0 items-center gap-1 xl:gap-2 ${logoPosition === "Right" ? "justify-start" : "justify-end"}`}>
            <nav className="mr-2 hidden max-w-full items-center gap-1 overflow-visible text-sm font-bold text-[var(--sf-navbar-text)] xl:flex">
                {headerNavLinks.slice(0, 5).map((item, index) => (
                    <HeaderNavItem
                        key={`${item.label}-${index}`}
                        item={item}
                        LinkComponent={LinkComponent}
                    />
                ))}
            </nav>
            <LinkSlot LinkComponent={LinkComponent} href="/track" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-2 text-sm font-bold text-[var(--sf-navbar-text)] transition hover:bg-slate-100 hover:text-[var(--sf-navbar-hover)] xl:px-3">
                <Truck size={17} className="shrink-0" />
                <span className="hidden xl:inline">Track Order</span>
            </LinkSlot>
            <LinkSlot LinkComponent={LinkComponent} href="/account" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-2 text-sm font-bold text-[var(--sf-navbar-text)] transition hover:bg-slate-100 hover:text-[var(--sf-navbar-hover)] xl:px-3">
                <User size={17} className="shrink-0" />
                <span className="hidden xl:inline">Account</span>
            </LinkSlot>
            <LinkSlot
                LinkComponent={LinkComponent}
                href="/cart"
                className="relative inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-slate-950 px-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 xl:px-4"
            >
                <ShoppingBag size={17} className="shrink-0" />
                <span className="hidden xl:inline">Cart</span>
                {cartCount > 0 && (
                    <span className="absolute -right-1.5 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--sf-accent)] px-1 text-[10px] font-black text-white">
                        {cartCount}
                    </span>
                )}
            </LinkSlot>
        </div>
    );
    const desktopSlots = logoPosition === "Center"
        ? [searchSlot, brandSlot, actionSlot]
        : logoPosition === "Right"
            ? [searchSlot, actionSlot, brandSlot]
            : [brandSlot, searchSlot, actionSlot];
    const forceNarrowHeader = isPreviewNarrow(previewDevice);
    const desktopHeaderClass = previewDevice
        ? (forceNarrowHeader ? "hidden" : `grid h-[76px] items-center gap-6 ${forcedDesktopLayoutClass}`)
        : `hidden h-[76px] items-center gap-6 lg:grid ${desktopLayoutClass}`;
    const mobileHeaderClass = previewDevice
        ? (forceNarrowHeader ? "flex h-[58px] items-center justify-between gap-2.5 sm:h-[64px]" : "hidden")
        : "flex h-[58px] items-center justify-between gap-2.5 sm:h-[64px] lg:hidden";
    const mobileSearchClass = previewDevice
        ? (forceNarrowHeader ? "pb-2.5" : "hidden")
        : "pb-2.5 lg:hidden";

    return (
        <>
            <EditorSelectionFrame editor={editor} id="header" label="Navbar" locked>
                <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-[var(--sf-navbar-background)] text-[var(--sf-navbar-text)] backdrop-blur-xl">
                    <div className={containerClass}>
                        <div className={desktopHeaderClass}>
                            {desktopSlots.map((slot, index) => <div key={index} className="min-w-0">{slot}</div>)}
                        </div>

                        <div className={mobileHeaderClass}>
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(true)}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[var(--sf-navbar-text)] sm:h-11 sm:w-11"
                                aria-label="Open menu"
                            >
                                <Menu size={20} />
                            </button>
                            <LinkSlot LinkComponent={LinkComponent} href="/" className="min-w-0 flex-1">
                                <BrandMark theme={theme} brandName={brandName} trustedBadge={trustedBadge} shopVerification={shopVerification} />
                            </LinkSlot>
                            <LinkSlot
                                LinkComponent={LinkComponent}
                                href="/cart"
                                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm sm:h-11 sm:w-11"
                                aria-label="Cart"
                            >
                                <ShoppingBag size={18} />
                                {cartCount > 0 && (
                                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--sf-accent)] px-1 text-[10px] font-black">
                                        {cartCount}
                                    </span>
                                )}
                            </LinkSlot>
                        </div>

                        <div className={mobileSearchClass}>
                            <button
                                type="button"
                                onClick={onSearch}
                                aria-label="Search products"
                                className="flex h-10 w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-500 shadow-sm shadow-slate-200/50"
                            >
                                <Search size={16} className="shrink-0" />
                                <span className="truncate">Search products</span>
                            </button>
                        </div>
                    </div>
                </header>
            </EditorSelectionFrame>

            {mobileMenuOpen && !preview && (
                <div className="fixed inset-0 z-[90] bg-slate-950/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)}>
                    <aside className="h-full w-[86vw] max-w-sm bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                        <div className="mb-6 flex items-center justify-between gap-4">
                            <BrandMark theme={theme} brandName={brandName} trustedBadge={trustedBadge} shopVerification={shopVerification} />
                            <button type="button" onClick={() => setMobileMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700" aria-label="Close menu">
                                <X size={20} />
                            </button>
                        </div>
                        <nav className="grid gap-2">
                            {[...headerNavLinks, { label: "Track Order", url: "/track" }, { label: "Account", url: "/account" }].map((item, index) => (
                                <div key={`${item.label}-${index}`} className="rounded-2xl border border-slate-200 bg-white">
                                    <LinkSlot
                                        LinkComponent={LinkComponent}
                                        href={item.url || "#"}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block px-4 py-3 text-sm font-black text-slate-800 transition hover:text-[var(--sf-navbar-hover)]"
                                    >
                                        {item.label}
                                    </LinkSlot>
                                    {(item.children || []).length > 0 && (
                                        <div className="border-t border-slate-100 px-3 pb-3">
                                            {item.children.map((child, childIndex) => (
                                                <LinkSlot
                                                    key={`${child.label}-${childIndex}`}
                                                    LinkComponent={LinkComponent}
                                                    href={child.url}
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    className="mt-2 block rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600"
                                                >
                                                    {child.label}
                                                </LinkSlot>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </nav>
                    </aside>
                </div>
            )}
        </>
    );
}
