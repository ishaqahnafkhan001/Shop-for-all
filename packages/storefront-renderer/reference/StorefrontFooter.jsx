"use client";

import { BarChart3, ChevronDown, CircleCheck, Home, Lock, Mail, Search, ShoppingBag, Truck, User } from "lucide-react";

import { getSortedNavigation, normalizeTheme } from "@scaleup/storefront-theme";
import {
    DefaultLink,
    EditorSelectionFrame,
    getContainerClass,
    getReferenceThemeStyle,
    headingStyle,
    isPreviewNarrow,
    LinkSlot,
} from "./referenceCore";

const FooterColumn = ({ title, links, LinkComponent }) => (
    <div>
        <h3 className="text-sm font-black" style={{ ...headingStyle, color: "var(--sf-footer-heading)" }}>{title}</h3>
        <div className="mt-4 grid gap-3 text-sm font-semibold text-[var(--sf-footer-link)]">
            {links.map((link) => (
                <LinkSlot key={link.label} LinkComponent={LinkComponent} href={link.href} prefetch={false} className="transition hover:text-[var(--sf-footer-link-hover)]">
                    {link.label}
                </LinkSlot>
            ))}
        </div>
    </div>
);

const FooterSupportColumn = ({ links, contactHref, contactLabel, socialLinks, LinkComponent }) => (
    <div>
        <h3 className="text-sm font-black" style={{ ...headingStyle, color: "var(--sf-footer-heading)" }}>Support</h3>
        <div className="mt-4 grid gap-3 text-sm font-semibold text-[var(--sf-footer-link)]">
            {links.map((link) => (
                <LinkSlot key={link.label} LinkComponent={LinkComponent} href={link.href} prefetch={false} className="transition hover:text-[var(--sf-footer-link-hover)]">
                    {link.label}
                </LinkSlot>
            ))}
        </div>
        {contactHref && (
            <LinkSlot LinkComponent={LinkComponent} href={contactHref} prefetch={false} className="mt-6 inline-flex items-center gap-2 text-base font-black text-[var(--sf-footer-link)] transition hover:text-[var(--sf-footer-link-hover)]">
                <Mail size={18} />
                {contactLabel}
            </LinkSlot>
        )}
        {socialLinks.length > 0 && (
            <div className="mt-7 flex flex-wrap items-center gap-3">
                {socialLinks.map((item) => (
                    <LinkSlot key={item.key} LinkComponent={LinkComponent} href={item.href} prefetch={false} target="_blank" rel="noreferrer" aria-label={item.label} className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-xs font-black uppercase text-[var(--sf-footer-link)] transition hover:bg-[var(--sf-footer-link-hover)] hover:text-white">
                        {item.short}
                    </LinkSlot>
                ))}
            </div>
        )}
    </div>
);

const FooterAccordion = ({ title, links, LinkComponent }) => (
    <details className="group border-b py-3.5" style={{ borderColor: "var(--sf-footer-border)" }}>
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black" style={{ ...headingStyle, color: "var(--sf-footer-heading)" }}>
            {title}
            <ChevronDown size={17} className="transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 grid gap-2.5 pb-1 text-sm font-semibold text-[var(--sf-footer-link)]">
            {links.map((link) => (
                <LinkSlot key={link.label} LinkComponent={LinkComponent} href={link.href} prefetch={false} className="transition hover:text-[var(--sf-footer-link-hover)]">
                    {link.label}
                </LinkSlot>
            ))}
        </div>
    </details>
);

const socialPlatforms = [
    { key: "facebookUrl", label: "Facebook", short: "f" },
    { key: "instagramUrl", label: "Instagram", short: "ig" },
    { key: "twitterUrl", label: "X / Twitter", short: "x" },
    { key: "youtubeUrl", label: "YouTube", short: "yt" },
    { key: "tiktokUrl", label: "TikTok", short: "tt" },
];

const policyLinks = [
    { label: "Shipping Policy", href: "/policies/shipping" },
    { label: "Refund Policy", href: "/policies/refund" },
    { label: "Privacy Policy", href: "/policies/privacy" },
    { label: "Terms & Conditions", href: "/policies/terms" },
];

const getInitials = (name = "") => {
    const words = String(name || "Storefront").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "S";
    return words.slice(0, 2).map(word => word[0]).join("").toUpperCase();
};

const buildMailto = (email = "") => {
    const cleanEmail = String(email || "").trim();
    return cleanEmail ? `mailto:${cleanEmail}` : "";
};

export function ReferenceStorefrontFooter({ theme: themeCandidate, shopName, subdomain, cartCount = 0, LinkComponent = DefaultLink, preview = false, previewDevice, editor, shopVerification }) {
    const theme = normalizeTheme(themeCandidate);
    const storefrontContainerClass = getContainerClass(theme.layout);
    const brandName = shopName || subdomain || "Storefront";
    const footerLinks = (theme.footer?.links || []).filter((item) => item?.label && item?.url);
    const navigationLinks = getSortedNavigation(theme).map((item) => ({ label: item.label, href: item.url }));
    const storeLinks = [
        ...(navigationLinks.length ? navigationLinks : [{ label: "Shop", href: "/" }, { label: "Policies", href: "/policies" }, { label: "Track Order", href: "/track" }]),
        { label: "Account", href: "/account" },
        { label: "Cart", href: "/cart" },
    ].slice(0, 8);
    const supportLinks = [
        ...policyLinks,
        ...footerLinks.map((item) => ({ label: item.label, href: item.url })),
    ].slice(0, 10);
    const contactHref = buildMailto(theme.footer?.contactEmail);
    const socialLinks = socialPlatforms
        .map((item) => ({ ...item, href: theme.footer?.[item.key] || "" }))
        .filter((item) => item.href);
    const forceNarrowFooter = isPreviewNarrow(previewDevice);
    const footerGridClass = `grid min-w-0 gap-6 sm:gap-9 ${forceNarrowFooter ? "" : "lg:grid-cols-[1.25fr_0.7fr_1fr] xl:gap-20"}`;
    const desktopColumnsClass = forceNarrowFooter ? "hidden" : "hidden lg:contents";
    const mobileColumnsClass = forceNarrowFooter ? "block" : "lg:hidden";
    const bottomNavClass = `${preview ? "sticky bottom-0" : "fixed inset-x-0 bottom-0"} z-50 ${previewDevice ? (previewDevice === "desktop" ? "hidden" : "grid") : "grid md:hidden"} grid-cols-5 border-t border-slate-200 bg-white/95 px-1 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur`;
    const bottomNavStyle = preview
        ? { minHeight: "4rem" }
        : {
            height: "var(--sf-mobile-nav-offset, calc(4rem + env(safe-area-inset-bottom)))",
            paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        };
    const mobileLinks = [
        { label: "Home", href: "/", icon: Home },
        { label: "Search", href: "/#products", icon: Search },
        { label: "Track", href: "/track", icon: Truck },
        { label: "Account", href: "/account", icon: User },
        { label: "Cart", href: "/cart", icon: ShoppingBag, badge: cartCount },
    ];
    const isVerifiedSeller = Boolean(shopVerification?.isVerified);

    return (
        <>
            <EditorSelectionFrame editor={editor} id="footer" label="Footer" locked>
                <footer className="min-w-0 overflow-x-hidden border-t pb-20 pt-7 text-[var(--sf-footer-text)] sm:pt-10 md:pb-8 md:pt-12 lg:pt-14" style={{ ...getReferenceThemeStyle(theme), borderColor: "var(--sf-footer-border)", backgroundColor: "var(--sf-footer-background)" }}>
                    <div className={storefrontContainerClass}>
                        <div className={footerGridClass}>
                            <div className="min-w-0">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--sf-accent)] text-base font-black text-white sm:h-12 sm:w-12">
                                        {getInitials(brandName)}
                                    </span>
                                    <div className="min-w-0">
                                        <h2 className="truncate text-lg font-black sm:text-xl" style={{ ...headingStyle, color: "var(--sf-footer-heading)" }}>{brandName}</h2>
                                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-footer-text)] sm:text-sm">Storefront</p>
                                    </div>
                                </div>
                                {theme.footer?.text && (
                                    <p className="mt-4 max-w-sm text-sm leading-7 text-[var(--sf-footer-text)] sm:mt-6 sm:text-base sm:leading-8">
                                        {theme.footer.text}
                                    </p>
                                )}
                                {isVerifiedSeller && (
                                    <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-black text-emerald-700 sm:mt-6 sm:px-4">
                                        <CircleCheck size={17} />
                                        {shopVerification?.label || "Verified seller"}
                                    </span>
                                )}
                            </div>

                            <div className={desktopColumnsClass}>
                                <FooterColumn title="Store" links={storeLinks} LinkComponent={LinkComponent} />
                                <FooterSupportColumn
                                    links={supportLinks}
                                    contactHref={contactHref}
                                    contactLabel={theme.footer?.contactLabel || "Contact store"}
                                    socialLinks={socialLinks}
                                    LinkComponent={LinkComponent}
                                />
                            </div>
                            <div className={mobileColumnsClass}>
                                <FooterAccordion title="Store" links={storeLinks} LinkComponent={LinkComponent} />
                                <FooterAccordion title="Support" links={supportLinks} LinkComponent={LinkComponent} />
                                {contactHref && (
                                    <LinkSlot LinkComponent={LinkComponent} href={contactHref} prefetch={false} className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-black text-[var(--sf-footer-link)]">
                                        <Mail size={17} />
                                        {theme.footer?.contactLabel || "Contact store"}
                                    </LinkSlot>
                                )}
                                {socialLinks.length > 0 && (
                                    <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:gap-3">
                                        {socialLinks.map((item) => (
                                            <LinkSlot key={item.key} LinkComponent={LinkComponent} href={item.href} prefetch={false} target="_blank" rel="noreferrer" aria-label={item.label} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-black uppercase text-[var(--sf-footer-link)] transition hover:bg-[var(--sf-footer-link-hover)] hover:text-white">
                                                {item.short}
                                            </LinkSlot>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-7 flex min-w-0 flex-col gap-3 border-t pt-4 text-xs font-semibold text-[var(--sf-footer-text)] sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:text-sm" style={{ borderColor: "var(--sf-footer-border)" }}>
                            <p className="min-w-0 break-words" style={{ color: "var(--sf-footer-powered-by)" }}>© {new Date().getFullYear()} {brandName}. Powered by Scaleup.</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                <span className="inline-flex items-center gap-2">
                                    <Lock size={16} className="text-[var(--sf-footer-link)]" />
                                    Secure checkout
                                </span>
                                {isVerifiedSeller && (
                                    <span className="inline-flex items-center gap-2">
                                        <CircleCheck size={16} className="text-[var(--sf-footer-link)]" />
                                        Verified seller
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-2">
                                    <BarChart3 size={16} className="text-[var(--sf-footer-link)]" />
                                    Privacy-friendly analytics
                                </span>
                            </div>
                        </div>
                    </div>
                </footer>
            </EditorSelectionFrame>

            {theme.mobile?.showBottomNavigation && (
                <nav className={bottomNavClass} style={bottomNavStyle}>
                    {mobileLinks.map((item) => {
                        const Icon = item.icon;
                        return (
                            <LinkSlot key={item.label} LinkComponent={LinkComponent} href={item.href} prefetch={false} className="relative flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[var(--sf-accent)]">
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
