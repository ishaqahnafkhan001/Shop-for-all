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

import { getSortedNavigation, normalizeTheme } from "@scaleup/storefront-theme";
import {
    DefaultLink,
    EditorSelectionFrame,
    getContainerClass,
    isPreviewNarrow,
    LinkSlot,
    noop,
    optimizeCloudinaryImage,
} from "./referenceCore";

const TrustedBadge = ({ badge }) => {
    if (!badge?.active) return null;

    return (
        <span
            className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase text-emerald-800 ring-1 ring-emerald-200"
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
            className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-black uppercase text-sky-800 ring-1 ring-sky-200"
            title="This seller has completed Scaleup identity and phone verification."
            aria-label="Verified seller: completed Scaleup identity and phone verification"
        >
            <ShieldCheck className="h-3 w-3 shrink-0" />
            <span className="truncate">{verification.label || "Verified seller"}</span>
        </span>
    );
};

const BrandMark = ({ theme, brandName, trustedBadge, shopVerification, compact = false }) => (
    <span className={`flex min-w-0 items-center ${compact ? "gap-2" : "gap-2.5 sm:gap-3"}`}>
        {theme.logoUrl ? (
            <img
                src={optimizeCloudinaryImage(theme.logoUrl, { width: 96 })}
                alt={brandName}
                width="48"
                height="48"
                className={`${compact ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-2xl sm:h-12 sm:w-12"} border border-slate-200 object-cover shadow-sm`}
                loading="eager"
                decoding="async"
            />
        ) : (
            <span className={`flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-teal-600 text-sm font-black text-white shadow-sm shadow-teal-900/20 ${compact ? "h-9 w-9" : "h-11 w-11 sm:h-12 sm:w-12"}`}>
                {brandName.slice(0, 1).toUpperCase()}
            </span>
        )}
        <span className="min-w-0">
            <span className="block truncate text-base font-black leading-tight text-[var(--sf-navbar-text)] sm:text-lg">{brandName}</span>
            <span className="hidden truncate text-xs font-semibold text-[var(--sf-navbar-muted-text)] sm:block">Storefront</span>
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
                prefetch={false}
                onClick={onClick}
                className="inline-flex max-w-32 items-center rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-[var(--sf-navbar-hover)]"
                title={item.label}
            >
                <span className="truncate whitespace-nowrap">{item.label}</span>
            </LinkSlot>
        );
    }

    return (
        <div className="group relative">
            <LinkSlot
                LinkComponent={LinkComponent}
                href={item.url || "#"}
                prefetch={false}
                onClick={onClick}
                className="inline-flex max-w-36 items-center gap-1 rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-[var(--sf-navbar-hover)]"
                title={item.label}
            >
                <span className="truncate whitespace-nowrap">{item.label}</span>
                <ChevronDown size={14} className="shrink-0 transition group-hover:rotate-180" />
            </LinkSlot>
            <div className="invisible absolute left-0 top-full z-40 min-w-56 translate-y-2 rounded-2xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl shadow-slate-900/10 transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                {children.map((child, index) => (
                    <LinkSlot
                        key={`${child.label}-${index}`}
                        LinkComponent={LinkComponent}
                        href={child.url}
                        prefetch={false}
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

const HeaderOverflowMenu = ({ items, LinkComponent }) => {
    if (!items.length) return null;

    return (
        <div className="group relative">
            <button
                type="button"
                className="inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm font-bold text-[var(--sf-navbar-text)] transition hover:bg-slate-100 hover:text-[var(--sf-navbar-hover)]"
                aria-label="Open more navigation links"
                aria-haspopup="menu"
            >
                More
                <ChevronDown size={14} className="transition group-hover:rotate-180 group-focus-within:rotate-180" />
            </button>
            <div role="menu" className="invisible absolute right-0 top-full z-40 min-w-56 max-w-72 translate-y-2 rounded-2xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl shadow-slate-900/10 transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                {items.map((item, index) => (
                    <div key={`${item.label}-${index}`} role="none">
                        <LinkSlot
                            LinkComponent={LinkComponent}
                            href={item.url || "#"}
                            prefetch={false}
                            className="block truncate rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-[var(--sf-navbar-hover)]"
                            role="menuitem"
                            title={item.label}
                        >
                            {item.label}
                        </LinkSlot>
                        {(item.children || []).map((child, childIndex) => (
                            <LinkSlot
                                key={`${child.label}-${childIndex}`}
                                LinkComponent={LinkComponent}
                                href={child.url || "#"}
                                prefetch={false}
                                className="ml-3 block truncate rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-[var(--sf-navbar-hover)]"
                                role="menuitem"
                                title={child.label}
                            >
                                {child.label}
                            </LinkSlot>
                        ))}
                    </div>
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
    const headerVariant = theme.header?.variant || "standard";
    const storefrontContainerClass = getContainerClass(theme.layout);
    const compactMobileHeader = theme.mobile?.compactHeader !== false;
    const brandName = shopName || subdomain || "Storefront";
    const navLinks = getSortedNavigation(theme);
    const headerNavLinks = navLinks.filter((item) => !["track order", "account", "cart"].includes(String(item.label || "").toLowerCase()));
    const visibleHeaderNavLinks = headerNavLinks.slice(0, 3);
    const overflowHeaderNavLinks = headerNavLinks.slice(3);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const forcedDesktopLayoutClass = "grid-cols-[minmax(190px,0.8fr)_minmax(0,1fr)_minmax(260px,1.05fr)]";
    const desktopLayoutClass = "lg:grid-cols-[minmax(190px,0.8fr)_minmax(0,1fr)_minmax(260px,1.05fr)]";
    const brandSlot = (
        <LinkSlot LinkComponent={LinkComponent} href="/" prefetch={false} className="min-w-0">
            <BrandMark theme={theme} brandName={brandName} trustedBadge={trustedBadge} shopVerification={shopVerification} />
        </LinkSlot>
    );
    const searchSlot = (
        <div className="flex min-w-0 justify-center">
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
    const navigationSlot = (
        <nav className="flex min-w-0 items-center justify-center gap-0.5 overflow-visible text-sm font-bold text-[var(--sf-navbar-text)] 2xl:gap-1">
                {visibleHeaderNavLinks.map((item, index) => (
                    <HeaderNavItem
                        key={`${item.label}-${index}`}
                        item={item}
                        LinkComponent={LinkComponent}
                    />
                ))}
                <HeaderOverflowMenu items={overflowHeaderNavLinks} LinkComponent={LinkComponent} />
        </nav>
    );
    const utilitySlot = (
        <div className="flex shrink-0 items-center justify-end gap-1 xl:gap-2">
            <LinkSlot LinkComponent={LinkComponent} href="/track" prefetch={false} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-2 text-sm font-bold text-[var(--sf-navbar-text)] transition hover:bg-slate-100 hover:text-[var(--sf-navbar-hover)] xl:px-3">
                <Truck size={17} className="shrink-0" />
                <span className="hidden 2xl:inline">Track Order</span>
            </LinkSlot>
            <LinkSlot LinkComponent={LinkComponent} href="/account" prefetch={false} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-2 text-sm font-bold text-[var(--sf-navbar-text)] transition hover:bg-slate-100 hover:text-[var(--sf-navbar-hover)] xl:px-3">
                <User size={17} className="shrink-0" />
                <span className="hidden 2xl:inline">Account</span>
            </LinkSlot>
            <LinkSlot
                LinkComponent={LinkComponent}
                href="/cart"
                prefetch={false}
                className="relative inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--sf-primary-button-bg)] px-3 text-sm font-black text-[var(--sf-primary-button-text)] shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--sf-primary-button-hover-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-accent)] xl:px-4"
            >
                <ShoppingBag size={17} className="shrink-0" />
                <span className="hidden 2xl:inline">Cart</span>
                {cartCount > 0 && (
                    <span className="absolute -right-1.5 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black" style={{ backgroundColor: "var(--sf-header-cart-badge-bg)", color: "var(--sf-header-cart-badge-text)" }}>
                        {cartCount}
                    </span>
                )}
            </LinkSlot>
        </div>
    );
    const compactSearchSlot = (
        <button
            type="button"
            onClick={onSearch}
            aria-label="Search products"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-[var(--sf-accent-soft)] hover:bg-white hover:text-[var(--sf-navbar-hover)]"
        >
            <Search size={18} />
        </button>
    );
    const standardActionSlot = (
        <div className="flex min-w-0 items-center justify-end gap-1 xl:gap-2">
            <div className="mr-1 hidden min-w-0 xl:block 2xl:mr-2">{navigationSlot}</div>
            {utilitySlot}
        </div>
    );
    const forceNarrowHeader = isPreviewNarrow(previewDevice);
    const desktopHeaderClass = previewDevice
        ? (forceNarrowHeader ? "hidden" : headerVariant === "centered" ? "block py-4" : "flex h-[76px] items-center gap-6")
        : (headerVariant === "centered" ? "hidden py-4 lg:block" : "hidden h-[76px] items-center gap-6 lg:flex");
    const mobileHeaderClass = previewDevice
        ? (forceNarrowHeader ? `flex items-center justify-between gap-2.5 ${compactMobileHeader ? "h-[58px] sm:h-[64px]" : "h-[72px] sm:h-[80px]"}` : "hidden")
        : `flex items-center justify-between gap-2.5 lg:hidden ${compactMobileHeader ? "h-[58px] sm:h-[64px]" : "h-[72px] sm:h-[80px]"}`;
    const mobileSearchClass = headerVariant === "minimal"
        ? "hidden"
        : previewDevice
            ? (forceNarrowHeader ? (compactMobileHeader ? "pb-2.5" : "pb-4") : "hidden")
            : `${compactMobileHeader ? "pb-2.5" : "pb-4"} lg:hidden`;

    const desktopHeader = headerVariant === "minimal" ? (
        <div className="grid w-full min-w-0 grid-cols-[minmax(170px,0.7fr)_minmax(0,1fr)_auto] items-center gap-4">
            <div className="min-w-0">{brandSlot}</div>
            <div className="min-w-0">{navigationSlot}</div>
            <div className="flex items-center gap-1">{compactSearchSlot}{utilitySlot}</div>
        </div>
    ) : headerVariant === "centered" ? (
        <div className="min-w-0" data-header-composition="centered">
            <div className="flex justify-center">{brandSlot}</div>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)_minmax(0,1fr)] items-center gap-4 border-t pt-3" style={{ borderColor: "var(--sf-header-border)" }}>
                <div className="min-w-0 justify-self-start">{navigationSlot}</div>
                <div className="min-w-0">{searchSlot}</div>
                <div className="justify-self-end">{utilitySlot}</div>
            </div>
        </div>
    ) : (
        <div className={`grid w-full min-w-0 items-center gap-6 ${previewDevice ? forcedDesktopLayoutClass : desktopLayoutClass}`}>
            {[brandSlot, searchSlot, standardActionSlot].map((slot, index) => <div key={index} className="min-w-0">{slot}</div>)}
        </div>
    );

    return (
        <>
            <EditorSelectionFrame editor={editor} id="header" label="Navbar" locked>
                <header data-structural-variant={headerVariant} className="sticky top-0 z-50 border-b bg-[var(--sf-navbar-background)] text-[var(--sf-navbar-text)] backdrop-blur-xl" style={{ borderColor: "var(--sf-header-border)" }}>
                    <div className={storefrontContainerClass}>
                        <div className={desktopHeaderClass}>
                            {desktopHeader}
                        </div>

                        <div className={mobileHeaderClass}>
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(true)}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--sf-header-border)] bg-[var(--sf-header-background)] text-[var(--sf-header-icon)] sm:h-11 sm:w-11"
                                aria-label="Open menu"
                            >
                                <Menu size={20} />
                            </button>
                            <LinkSlot LinkComponent={LinkComponent} href="/" prefetch={false} className={`min-w-0 flex-1 ${headerVariant === "centered" ? "flex justify-center" : ""}`}>
                                <BrandMark theme={theme} brandName={brandName} trustedBadge={trustedBadge} shopVerification={shopVerification} compact={compactMobileHeader} />
                            </LinkSlot>
                            <div className="flex shrink-0 items-center gap-1">
                                {headerVariant === "minimal" && <button type="button" onClick={onSearch} aria-label="Search products" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--sf-header-border)] bg-[var(--sf-header-background)] text-[var(--sf-header-icon)] sm:h-11 sm:w-11"><Search size={18} /></button>}
                                <LinkSlot
                                    LinkComponent={LinkComponent}
                                    href="/cart"
                                    prefetch={false}
                                    className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--sf-primary-button-bg)] text-[var(--sf-primary-button-text)] shadow-sm sm:h-11 sm:w-11"
                                    aria-label="Cart"
                                >
                                    <ShoppingBag size={18} />
                                    {cartCount > 0 && (
                                        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black" style={{ backgroundColor: "var(--sf-header-cart-badge-bg)", color: "var(--sf-header-cart-badge-text)" }}>
                                            {cartCount}
                                        </span>
                                    )}
                                </LinkSlot>
                            </div>
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
                                        prefetch={false}
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
                                                    prefetch={false}
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
