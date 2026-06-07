import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ChevronDown,
    ChevronUp,
    Copy,
    CreditCard,
    FileText,
    Globe,
    GripVertical,
    History,
    LayoutTemplate,
    Link as LinkIcon,
    Lock,
    Monitor,
    Palette,
    Plus,
    Redo2,
    RotateCcw,
    Save,
    ShieldCheck,
    ShoppingBag,
    Smartphone,
    Star,
    Tablet,
    Trash2,
    Undo2,
    Unlock,
    Upload
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../api/api';

const THEME_SCHEMA_VERSION = 2;
const HISTORY_LIMIT = 30;

const defaultTheme = {
    version: THEME_SCHEMA_VERSION,
    logoUrl: '',
    faviconUrl: '',
    fontFamily: 'Inter',
    productGridStyle: 'Comfortable',
    colors: {
        accent: '#0f766e',
        accentHover: '#115e59',
        accentSoft: '#99f6e4',
        accentBg: '#ecfdf5',
        accentStrong: '#042f2e',
        accentMuted: '#14b8a6',
        accentLight: '#5eead4',
        accentRing: '#ccfbf1',
        background: '#ffffff',
        foreground: '#111827',
        headerBackground: '#ffffff',
        primaryButtonBg: '#0f766e',
        primaryButtonText: '#ffffff',
        primaryButtonHoverBg: '#115e59',
        secondaryButtonBg: '#ffffff',
        secondaryButtonText: '#0f172a',
        secondaryButtonHoverBg: '#f8fafc',
        navbarBackground: '#ffffff',
        navbarText: '#0f172a',
        navbarHover: '#0f766e',
        cardBackground: '#ffffff',
        cardBorder: '#e2e8f0',
        cardHoverBorder: '#99f6e4',
        priceColor: '#0f172a',
        saleBadgeBg: '#dc2626',
        saleBadgeText: '#ffffff',
        ratingColor: '#f59e0b',
        footerBackground: '#0f172a',
        footerText: '#ffffff',
        footerLink: '#99f6e4'
    },
    header: {
        logoPosition: 'Left',
        menuStyle: 'Simple'
    },
    typography: {
        headingFont: 'Inter',
        bodyFont: 'Inter',
        baseSize: 16,
        headingWeight: '800'
    },
    hero: {
        title: '',
        subtitle: '',
        imageUrl: '',
        ctaLabel: 'Shop Now',
        ctaUrl: '/',
        overlayOpacity: 25,
        height: 'Medium'
    },
    layout: {
        maxWidth: 'Wide',
        containerWidth: 'Wide',
        sectionSpacing: 'Comfortable',
        contentSpacing: 'Comfortable',
        sectionWidth: 'Full Width',
        sectionPaddingTop: 40,
        sectionPaddingBottom: 40,
        sectionMarginTop: 0,
        sectionMarginBottom: 40,
        productColumnsDesktop: 3,
        productColumnsMobile: 2,
        productGap: 'Comfortable',
        cardAlignment: 'Left'
    },
    productCard: {
        style: 'Modern',
        imageFit: 'Contain',
        aspectRatio: 'Square',
        imageRadius: 'Rounded',
        hoverZoom: true,
        showCategory: true,
        showRating: true,
        showReviews: true,
        showStock: true,
        showSku: false,
        showDiscountBadge: true,
        showQuickBuy: true,
        showWishlist: false,
        borderRadius: 'Rounded',
        shadow: 'Soft',
        titleSize: 'Medium',
        titleWeight: '800',
        priceSize: 'Medium',
        priceColor: '#0f172a',
        buttonStyle: 'Solid',
        buttonShape: 'Rounded',
        buttonColor: '#0f766e'
    },
    checkoutBranding: {
        logoUrl: '',
        bannerText: '',
        buttonStyle: 'Rounded',
        trustMessage: 'Secure checkout'
    },
    mobile: {
        stickyCheckoutButton: true,
        compactHeader: true,
        showBottomNavigation: false
    },
    paymentSettings: {
        additionalMethodsEnabled: false,
        providers: {
            stripe: false,
            sslcommerz: false,
            bkash: false,
            nagad: false,
            rocket: false,
            paypal: false
        }
    },
    navigation: [
        { label: 'Shop', url: '/', isExternal: false, sortOrder: 0, children: [], megaMenu: false },
        { label: 'Track Order', url: '/track', isExternal: false, sortOrder: 1, children: [], megaMenu: false }
    ],
    footer: { text: '', links: [] },
    policies: { refund: '', shipping: '', privacy: '', terms: '' },
    homepageSections: []
};

const sampleProducts = [
    { title: 'Signature Product', category: 'Featured', price: 1490 },
    { title: 'Customer Favorite', category: 'Best Seller', price: 2190 },
    { title: 'New Arrival', category: 'Latest', price: 990 }
];

const settingsGroups = [
    { id: 'brand', label: 'Brand', icon: Palette, description: 'Logo and store identity' },
    { id: 'colors', label: 'Colors', icon: Palette, description: 'Brand colors and page surfaces' },
    { id: 'typography', label: 'Typography', icon: LayoutTemplate, description: 'Fonts and heading weight' },
    { id: 'layout', label: 'Layout', icon: LayoutTemplate, description: 'Width, spacing, and product grid' },
    { id: 'navigation', label: 'Header and navigation', icon: LinkIcon, description: 'Top menu links' },
    { id: 'hero', label: 'Hero', icon: LayoutTemplate, description: 'Homepage opening banner' },
    { id: 'products', label: 'Product cards', icon: ShoppingBag, description: 'Product grid appearance' },
    { id: 'sections', label: 'Homepage sections', icon: LayoutTemplate, description: 'Order and visibility' },
    { id: 'checkout', label: 'Checkout', icon: CreditCard, description: 'Checkout trust and branding' },
    { id: 'mobile', label: 'Mobile', icon: Smartphone, description: 'Small-screen controls' },
    { id: 'footer', label: 'Footer', icon: FileText, description: 'Footer text and links' },
    { id: 'policies', label: 'Policies', icon: FileText, description: 'Refund, shipping, privacy, terms' },
    { id: 'domain', label: 'Domain', icon: Globe, description: 'Custom domain status' }
];

const structureTree = [
    {
        id: 'header',
        label: 'Header',
        group: 'navigation',
        children: [
            { id: 'logo', label: 'Logo', group: 'brand' },
            { id: 'navigation', label: 'Navigation', group: 'navigation' }
        ]
    },
    {
        id: 'homepage',
        label: 'Homepage',
        group: 'sections',
        children: [
            { id: 'hero', label: 'Hero', group: 'hero' },
            { id: 'heroButton', label: 'Hero button', group: 'hero' },
            { id: 'productCard', label: 'Product cards', group: 'products' },
            { id: 'sections', label: 'Custom sections', group: 'sections' }
        ]
    },
    {
        id: 'checkout',
        label: 'Checkout',
        group: 'checkout',
        children: [
            { id: 'checkoutBranding', label: 'Branding', group: 'checkout' },
            { id: 'policies', label: 'Policies', group: 'policies' }
        ]
    },
    {
        id: 'footer',
        label: 'Footer',
        group: 'footer',
        children: [
            { id: 'footerText', label: 'Footer text', group: 'footer' },
            { id: 'footerLinks', label: 'Footer links', group: 'footer' }
        ]
    }
];

const groupElementMap = {
    brand: 'logo',
    colors: 'themeColors',
    typography: 'typography',
    layout: 'layout',
    navigation: 'navigation',
    hero: 'hero',
    products: 'productCard',
    sections: 'sections',
    checkout: 'checkoutBranding',
    mobile: 'mobile',
    footer: 'footer',
    policies: 'policies',
    domain: 'domain'
};

const colorGroups = [
    {
        title: 'Core',
        fields: [
            { key: 'accent', label: 'Accent', help: 'Links, badges, active filters, and focus states.' },
            { key: 'accentBg', label: 'Accent background', help: 'Soft highlighted panels and category chips.' },
            { key: 'background', label: 'Page background', help: 'Main storefront background color.' },
            { key: 'foreground', label: 'Text color', help: 'Default storefront text color.' }
        ]
    },
    {
        title: 'Buttons',
        fields: [
            { key: 'primaryButtonBg', label: 'Primary button background', help: 'Buy, checkout, and main call-to-action buttons.' },
            { key: 'primaryButtonText', label: 'Primary button text', help: 'Text color used on primary buttons.' },
            { key: 'primaryButtonHoverBg', label: 'Primary button hover', help: 'Desktop hover color for primary buttons.' },
            { key: 'secondaryButtonBg', label: 'Secondary button background', help: 'Cart icon and secondary action buttons.' },
            { key: 'secondaryButtonText', label: 'Secondary button text', help: 'Text and icon color used on secondary buttons.' },
            { key: 'secondaryButtonHoverBg', label: 'Secondary button hover', help: 'Desktop hover color for secondary buttons.' }
        ]
    },
    {
        title: 'Navigation',
        fields: [
            { key: 'navbarBackground', label: 'Navbar background', help: 'Header background across desktop and mobile.' },
            { key: 'navbarText', label: 'Navbar text', help: 'Logo and navigation text color.' },
            { key: 'navbarHover', label: 'Navbar hover', help: 'Desktop hover color for header links and icons.' }
        ]
    },
    {
        title: 'Product cards',
        fields: [
            { key: 'cardBackground', label: 'Card background', help: 'Product card surface color.' },
            { key: 'cardBorder', label: 'Card border', help: 'Default product card border color.' },
            { key: 'cardHoverBorder', label: 'Card hover border', help: 'Desktop hover border color for product cards.' },
            { key: 'priceColor', label: 'Price color', help: 'Default product price color.' },
            { key: 'saleBadgeBg', label: 'Sale badge background', help: 'Discount badge background color.' },
            { key: 'saleBadgeText', label: 'Sale badge text', help: 'Discount badge text color.' },
            { key: 'ratingColor', label: 'Rating color', help: 'Star and rating color.' }
        ]
    },
    {
        title: 'Footer',
        fields: [
            { key: 'footerBackground', label: 'Footer background', help: 'Main footer background.' },
            { key: 'footerText', label: 'Footer text', help: 'Footer paragraph and copyright text.' },
            { key: 'footerLink', label: 'Footer links', help: 'Footer link and trust icon color.' }
        ]
    }
];
const colorFields = colorGroups.flatMap(group => group.fields);

const mergeTheme = (base, incoming = {}) => ({
    ...base,
    ...incoming,
    version: Number(incoming.version) || THEME_SCHEMA_VERSION,
    colors: { ...base.colors, ...(incoming.colors || {}) },
    header: { ...base.header, ...(incoming.header || {}) },
    typography: { ...base.typography, ...(incoming.typography || {}) },
    hero: { ...base.hero, ...(incoming.hero || {}) },
    layout: { ...base.layout, ...(incoming.layout || {}) },
    productCard: { ...base.productCard, ...(incoming.productCard || {}) },
    checkoutBranding: { ...base.checkoutBranding, ...(incoming.checkoutBranding || {}) },
    mobile: { ...base.mobile, ...(incoming.mobile || {}) },
    paymentSettings: {
        ...base.paymentSettings,
        ...(incoming.paymentSettings || {}),
        providers: {
            ...base.paymentSettings.providers,
            ...(incoming.paymentSettings?.providers || {})
        }
    },
    navigation: incoming.navigation || base.navigation,
    footer: { ...base.footer, ...(incoming.footer || {}) },
    policies: { ...base.policies, ...(incoming.policies || {}) },
    homepageSections: incoming.homepageSections || base.homepageSections
});

const sortForSnapshot = (value) => {
    if (Array.isArray(value)) return value.map(sortForSnapshot);
    if (!value || typeof value !== 'object') return value;

    return Object.keys(value).sort().reduce((acc, key) => {
        acc[key] = sortForSnapshot(value[key]);
        return acc;
    }, {});
};
const stableStringify = (value) => JSON.stringify(sortForSnapshot(value));
const safeParseSnapshot = (snapshot) => {
    try {
        return JSON.parse(snapshot);
    } catch {
        return null;
    }
};
const isHexColor = (value) => /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(String(value || ''));

const productRadiusClass = {
    Soft: 'rounded-lg',
    Rounded: 'rounded-2xl',
    Square: 'rounded-none'
};

const productShadowClass = {
    None: '',
    Soft: 'shadow-sm',
    Elevated: 'shadow-xl shadow-black/10'
};

const productAspectClass = {
    Square: 'aspect-square',
    Portrait: 'aspect-[3/4]',
    Landscape: 'aspect-[4/3]'
};

const titleSizeClass = {
    Small: 'text-xs',
    Medium: 'text-sm',
    Large: 'text-base'
};

const priceSizeClass = {
    Small: 'text-sm',
    Medium: 'text-base',
    Large: 'text-lg'
};

const cardAlignmentClass = {
    Left: 'text-left items-start',
    Center: 'text-center items-center',
    Right: 'text-right items-end'
};

const heroHeightClass = {
    Compact: 'min-h-36',
    Medium: 'min-h-48',
    Tall: 'min-h-64'
};

const deviceClasses = {
    desktop: 'w-full max-w-6xl',
    tablet: 'w-[768px] max-w-full',
    mobile: 'w-[390px] max-w-full',
    smallMobile: 'w-[320px] max-w-full'
};

const BuilderButton = ({ children, variant = 'primary', className = '', ...props }) => {
    const variants = {
        primary: 'bg-slate-950 text-white hover:bg-slate-800 border-slate-950',
        secondary: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200',
        subtle: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-100',
        danger: 'bg-white text-red-600 hover:bg-red-50 border-red-200'
    };

    return (
        <button
            className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

const HelpText = ({ children, tone = 'neutral' }) => (
    <p className={`text-xs leading-5 ${tone === 'error' ? 'text-red-600' : 'text-slate-500'}`}>{children}</p>
);

const FieldShell = ({ label, help, error, children }) => (
    <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        {children}
        {error ? <HelpText tone="error">{error}</HelpText> : help ? <HelpText>{help}</HelpText> : null}
    </label>
);

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400';

const BuilderInput = ({ label, help, error, ...props }) => (
    <FieldShell label={label} help={help} error={error}>
        <input className={inputClass} {...props} />
    </FieldShell>
);

const BuilderTextarea = ({ label, help, error, ...props }) => (
    <FieldShell label={label} help={help} error={error}>
        <textarea className={`${inputClass} min-h-24 resize-y`} {...props} />
    </FieldShell>
);

const BuilderSelect = ({ label, help, error, children, ...props }) => (
    <FieldShell label={label} help={help} error={error}>
        <select className={inputClass} {...props}>{children}</select>
    </FieldShell>
);

const BuilderToggle = ({ label, help, checked, onChange, disabled = false }) => (
    <label className={`flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3 ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
        <span>
            <span className="block text-sm font-semibold text-slate-800">{label}</span>
            {help && <span className="mt-1 block text-xs leading-5 text-slate-500">{help}</span>}
        </span>
        <input
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="mt-0.5 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
        />
    </label>
);

const BuilderCard = ({ title, description, icon: Icon, children, actions }) => (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
                {Icon && (
                    <span className="rounded-lg bg-slate-100 p-2 text-slate-700">
                        <Icon size={18} />
                    </span>
                )}
                <div>
                    <h2 className="text-base font-bold text-slate-950">{title}</h2>
                    {description && <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>}
                </div>
            </div>
            {actions}
        </div>
        <div className="space-y-4">{children}</div>
    </section>
);

const DeviceSwitcher = ({ value, onChange }) => {
    const devices = [
        { id: 'desktop', label: 'Desktop', icon: Monitor },
        { id: 'tablet', label: 'Tablet', icon: Tablet },
        { id: 'mobile', label: 'Phone', icon: Smartphone },
        { id: 'smallMobile', label: 'Small', icon: Smartphone }
    ];

    return (
        <div className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-white p-1">
            {devices.map((device) => {
                const Icon = device.icon;
                const active = value === device.id;
                return (
                    <button
                        key={device.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(device.id)}
                        className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            active ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <Icon size={15} />
                        <span className="hidden sm:inline">{device.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

const CheckoutBrandingPreview = ({ theme, shopName }) => {
    const colors = theme.colors || defaultTheme.colors;
    const checkoutBranding = theme.checkoutBranding || defaultTheme.checkoutBranding;
    const policies = theme.policies || defaultTheme.policies;
    const visiblePolicies = [
        ['refund', 'Refund policy'],
        ['shipping', 'Shipping policy'],
        ['privacy', 'Privacy policy'],
        ['terms', 'Terms of service']
    ].filter(([key]) => policies[key]?.trim());
    const buttonRadius = checkoutBranding.buttonStyle === 'Pill'
        ? '999px'
        : checkoutBranding.buttonStyle === 'Solid'
            ? '10px'
            : '16px';

    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <CreditCard size={16} />
                Checkout preview
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" style={{ color: colors.foreground }}>
                {(checkoutBranding.logoUrl || checkoutBranding.bannerText) && (
                    <div className="mb-4 rounded-lg border border-slate-100 bg-white p-3 text-center">
                        {checkoutBranding.logoUrl && (
                            <div
                                className="mx-auto mb-2 h-10 w-32 rounded bg-contain bg-center bg-no-repeat"
                                style={{ backgroundImage: `url(${checkoutBranding.logoUrl})` }}
                            />
                        )}
                        <p className="text-xs font-semibold text-slate-600">
                            {checkoutBranding.bannerText || shopName || 'Checkout'}
                        </p>
                    </div>
                )}
                <div className="grid grid-cols-1 gap-3 text-xs">
                    <div className="rounded-lg border border-slate-100 p-3">
                        <p className="font-bold text-slate-900">Order Summary</p>
                        <div className="mt-3 space-y-2 text-slate-500">
                            <div className="flex justify-between"><span>Subtotal</span><span>৳ 2,190</span></div>
                            <div className="flex justify-between"><span>Delivery Charge</span><span>৳ 80</span></div>
                            <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 font-black text-slate-900"><span>Total</span><span style={{ color: colors.accent }}>৳ 2,270</span></div>
                        </div>
                    </div>
                    <button className="w-full py-3 text-sm font-black" style={{ backgroundColor: colors.primaryButtonBg || colors.accent, color: colors.primaryButtonText || '#ffffff', borderRadius: buttonRadius }}>
                        Place Order
                    </button>
                    <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
                        <ShieldCheck size={14} style={{ color: colors.accent }} />
                        {checkoutBranding.trustMessage || 'Secure checkout'}
                    </p>
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3">
                        <p className="font-bold text-slate-900">Additional payment methods</p>
                        <p className="mt-1 text-xs text-slate-500">Coming soon: Stripe, SSLCommerz, bKash, Nagad, Rocket, and PayPal.</p>
                    </div>
                    {visiblePolicies.length > 0 ? (
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                            <p className="mb-2 font-bold text-slate-900">Visible checkout policies</p>
                            <div className="space-y-1">
                                {visiblePolicies.map(([key, label]) => (
                                    <div key={key} className="rounded bg-white px-3 py-2 font-semibold text-slate-600">
                                        {label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            No checkout policies are visible yet. Add policy text to show them.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

const PreviewTarget = ({ id, activeElement, hoveredElement, onSelectElement, onHoverElement, children, className = '' }) => {
    const active = activeElement === id;
    const hovered = hoveredElement === id;

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={(event) => {
                event.stopPropagation();
                onSelectElement(id);
            }}
            onMouseEnter={() => onHoverElement(id)}
            onMouseLeave={() => onHoverElement('')}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectElement(id);
                }
            }}
            className={`relative cursor-pointer rounded-lg outline-none transition ${
                active
                    ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-slate-100'
                    : hovered
                        ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-100'
                        : ''
            } ${className}`}
        >
            {(active || hovered) && (
                <span className={`absolute left-2 top-2 z-30 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-sm ${active ? 'bg-indigo-600' : 'bg-sky-500'}`}>
                    {id.replace(/([A-Z])/g, ' $1')}
                </span>
            )}
            {children}
        </div>
    );
};

const StorefrontPreview = ({ theme, storewideDiscount, shopName, activeGroup, activeElement, hoveredElement, onSelectElement, onHoverElement, device }) => {
    const colors = theme.colors || defaultTheme.colors;
    const typography = theme.typography || defaultTheme.typography;
    const hero = theme.hero || defaultTheme.hero;
    const layout = theme.layout || defaultTheme.layout;
    const header = theme.header || defaultTheme.header;
    const productCard = theme.productCard || defaultTheme.productCard;
    const navItems = (theme.navigation || []).filter(item => item.label).slice(0, 4);
    const enabledSections = (theme.homepageSections || []).filter(section => section.isEnabled !== false).slice(0, 4);
    const radius = productRadiusClass[productCard.borderRadius] || productRadiusClass.Rounded;
    const imageRadius = productRadiusClass[productCard.imageRadius] || radius;
    const shadow = productCard.style === 'Minimal'
        ? ''
        : productCard.style === 'Premium'
            ? 'shadow-2xl shadow-black/15'
            : productShadowClass[productCard.shadow] || productShadowClass.Soft;
    const imageAspect = productAspectClass[productCard.aspectRatio] || productAspectClass.Square;
    const titleSize = titleSizeClass[productCard.titleSize] || titleSizeClass.Medium;
    const priceSize = priceSizeClass[productCard.priceSize] || priceSizeClass.Medium;
    const alignment = cardAlignmentClass[layout.cardAlignment] || cardAlignmentClass.Left;
    const productGap = layout.productGap || theme.productGridStyle || 'Comfortable';
    const isMobilePreview = device === 'mobile' || device === 'smallMobile';
    const gridColumns = isMobilePreview
        ? (layout.productColumnsMobile === 1 ? 'grid-cols-1' : 'grid-cols-2')
        : layout.productColumnsDesktop >= 4
            ? 'grid-cols-4'
            : layout.productColumnsDesktop === 2
                ? 'grid-cols-2'
                : 'grid-cols-3';
    const gridGapClass = productGap === 'Compact'
        ? 'gap-3'
        : productGap === 'Spacious' || productGap === 'Editorial'
            ? 'gap-6'
            : 'gap-4';
    const containerWidth = layout.containerWidth || (layout.maxWidth === 'Full' ? 'Full Width' : layout.maxWidth === 'Contained' ? 'Narrow' : 'Wide');
    const previewContainerClass = containerWidth === 'Full Width'
        ? 'max-w-none'
        : containerWidth === 'Narrow'
            ? 'max-w-3xl'
            : containerWidth === 'Standard'
                ? 'max-w-4xl'
                : 'max-w-5xl';
    const sectionStyle = {
        paddingTop: `${Math.min(Math.max(Number(layout.sectionPaddingTop) || 0, 0), 160)}px`,
        paddingBottom: `${Math.min(Math.max(Number(layout.sectionPaddingBottom) || 0, 0), 160)}px`,
        marginTop: `${Math.min(Math.max(Number(layout.sectionMarginTop) || 0, 0), 160)}px`,
        marginBottom: `${Math.min(Math.max(Number(layout.sectionMarginBottom) || 0, 0), 160)}px`
    };
    const buttonRadius = productCard.buttonShape === 'Pill'
        ? '999px'
        : productCard.buttonShape === 'Square'
            ? '0px'
            : productCard.buttonShape === 'Soft'
                ? '8px'
                : '16px';
    const productButtonStyle = {
        backgroundColor: productCard.buttonStyle === 'Outline' || productCard.buttonStyle === 'Ghost' ? 'transparent' : (productCard.buttonColor || colors.primaryButtonBg || colors.accent),
        color: productCard.buttonStyle === 'Solid' ? (colors.primaryButtonText || '#ffffff') : (productCard.buttonColor || colors.primaryButtonBg || colors.accent),
        borderColor: productCard.buttonColor || colors.primaryButtonBg || colors.accent,
        borderRadius: buttonRadius
    };
    const previewStyle = {
        color: colors.foreground,
        backgroundColor: colors.background,
        fontFamily: typography.bodyFont || theme.fontFamily || 'Inter'
    };
    const heroStyle = {
        backgroundColor: colors.accentBg,
        ...(hero.imageUrl ? {
            backgroundImage: `linear-gradient(rgba(0,0,0,${Number(hero.overlayOpacity || 25) / 100}), rgba(0,0,0,${Number(hero.overlayOpacity || 25) / 100})), url(${hero.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: '#ffffff'
        } : {})
    };
    const highlight = (groups) => (groups.includes(activeGroup) ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-100' : '');

    return (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-100 p-3">
            <div className={`mx-auto transition-all duration-300 ${deviceClasses[device]}`}>
                <div className={`${isMobilePreview ? 'max-h-[760px] overflow-y-auto rounded-[2rem]' : 'overflow-hidden rounded-lg'} border border-slate-200 bg-white shadow-sm`}>
                    <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                        <span className="ml-2 truncate text-xs text-slate-500">{device} preview</span>
                    </div>
                    <div style={previewStyle} className={`${isMobilePreview ? 'p-3' : 'p-4'}`}>
                        <div className={`mx-auto space-y-5 ${previewContainerClass}`}>
                            <PreviewTarget id="header" activeElement={activeElement} hoveredElement={hoveredElement} onSelectElement={onSelectElement} onHoverElement={onHoverElement}>
                                <header style={{ backgroundColor: colors.navbarBackground || colors.headerBackground, color: colors.navbarText || colors.foreground }} className={`flex items-center gap-4 rounded-lg border border-black/5 px-4 py-3 ${highlight(['brand', 'navigation', 'colors'])}`}>
                                    {header.logoPosition === 'Right' && !isMobilePreview && (
                                        <PreviewTarget id="navigation" activeElement={activeElement} hoveredElement={hoveredElement} onSelectElement={onSelectElement} onHoverElement={onHoverElement} className="mr-auto">
                                            <nav className="flex items-center gap-4 text-xs font-semibold">
                                                {(navItems.length ? navItems : defaultTheme.navigation).map((item, index) => (
                                                    <span key={`${item.label}-${index}`}>{item.label}</span>
                                                ))}
                                            </nav>
                                        </PreviewTarget>
                                    )}
                                    <PreviewTarget id="logo" activeElement={activeElement} hoveredElement={hoveredElement} onSelectElement={onSelectElement} onHoverElement={onHoverElement} className={header.logoPosition === 'Center' ? 'mx-auto' : header.logoPosition === 'Right' ? 'ml-auto' : ''}>
                                        <div className="flex min-w-0 items-center gap-2">
                                            {theme.logoUrl ? (
                                                <div className="h-8 w-8 rounded bg-center bg-cover border border-black/10" style={{ backgroundImage: `url(${theme.logoUrl})` }} />
                                            ) : (
                                                <div className="flex h-8 w-8 items-center justify-center rounded text-xs font-bold text-white" style={{ backgroundColor: colors.accent }}>S</div>
                                            )}
                                            <span className="truncate text-sm font-bold">{shopName || 'Your Store'}</span>
                                        </div>
                                    </PreviewTarget>
                                    {header.logoPosition !== 'Right' && !isMobilePreview && (
                                        <PreviewTarget id="navigation" activeElement={activeElement} hoveredElement={hoveredElement} onSelectElement={onSelectElement} onHoverElement={onHoverElement} className="ml-auto">
                                            <nav className="flex items-center gap-4 text-xs font-semibold">
                                                {(navItems.length ? navItems : defaultTheme.navigation).map((item, index) => (
                                                    <span key={`${item.label}-${index}`}>{item.label}</span>
                                                ))}
                                            </nav>
                                        </PreviewTarget>
                                    )}
                                </header>
                            </PreviewTarget>

                            <PreviewTarget id="hero" activeElement={activeElement} hoveredElement={hoveredElement} onSelectElement={onSelectElement} onHoverElement={onHoverElement}>
                                <section style={{ ...heroStyle, ...sectionStyle }} className={`${heroHeightClass[hero.height] || heroHeightClass.Medium} rounded-lg px-6 flex items-center ${highlight(['hero', 'layout'])}`}>
                                    <div className="max-w-xl">
                                        <p className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: hero.imageUrl ? '#ffffff' : colors.accent }}>
                                            {storewideDiscount > 0 ? `${storewideDiscount}% storewide offer` : 'Featured collection'}
                                        </p>
                                        <h2 className={`${isMobilePreview ? 'text-xl' : 'text-3xl'} font-black leading-tight`} style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight }}>
                                            {hero.title || 'Build a storefront customers trust'}
                                        </h2>
                                        <p className="mt-3 text-sm opacity-80">{hero.subtitle || 'Your homepage hero, colors, font, product cards, and navigation preview here.'}</p>
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onSelectElement('heroButton');
                                            }}
                                            onMouseEnter={() => onHoverElement('heroButton')}
                                            onMouseLeave={() => onHoverElement('')}
                                            className={`mt-5 rounded-lg px-4 py-2 text-sm font-bold transition ${activeElement === 'heroButton' ? 'ring-2 ring-indigo-600 ring-offset-2' : hoveredElement === 'heroButton' ? 'ring-2 ring-sky-400 ring-offset-2' : ''}`}
                                            style={{ backgroundColor: colors.primaryButtonBg || colors.accent, color: colors.primaryButtonText || '#ffffff' }}
                                        >
                                            {hero.ctaLabel || 'Shop Now'}
                                        </button>
                                    </div>
                                </section>
                            </PreviewTarget>

                            <PreviewTarget id="productCard" activeElement={activeElement} hoveredElement={hoveredElement} onSelectElement={onSelectElement} onHoverElement={onHoverElement}>
                            <section className={highlight(['products', 'layout'])}>
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-lg font-black" style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight }}>
                                        Latest products
                                    </h3>
                                    {productCard.showQuickBuy && <span className="text-xs font-bold" style={{ color: colors.accent }}>Quick buy enabled</span>}
                                </div>
                                <div className={`grid ${gridGapClass} ${gridColumns}`}>
                                    {sampleProducts.slice(0, isMobilePreview ? 2 : 3).map((product) => (
                                        <article
                                            key={product.title}
                                            className={`flex flex-col border p-3 ${radius} ${shadow} ${alignment}`}
                                            style={{ backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }}
                                        >
                                            <div className={`${imageAspect} w-full overflow-hidden ${imageRadius} ${productCard.imageFit === 'Cover' ? '' : 'p-6'} flex items-center justify-center`} style={{ backgroundColor: colors.accentBg }}>
                                                <ShoppingBag size={isMobilePreview ? 24 : 36} style={{ color: colors.accent }} />
                                            </div>
                                            {productCard.showCategory && <p className="mt-3 text-[11px] uppercase font-bold opacity-50">{product.category}</p>}
                                            <h4 className={`mt-1 line-clamp-1 ${titleSize}`} style={{ fontWeight: productCard.titleWeight || '800' }}>{product.title}</h4>
                                            {productCard.showRating && (
                                                <div className="mt-1 flex items-center gap-1" style={{ color: colors.ratingColor }}>
                                                    {[1, 2, 3, 4, 5].map(star => <Star key={star} size={12} fill="currentColor" />)}
                                                    {productCard.showReviews && <span className="ml-1 text-[10px] opacity-60">(12)</span>}
                                                </div>
                                            )}
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className={`${priceSize} font-black`} style={{ color: productCard.priceColor || colors.priceColor }}>৳ {product.price}</span>
                                                {storewideDiscount > 0 && productCard.showDiscountBadge !== false && (
                                                    <span className="rounded-full px-2 py-1 text-xs font-bold" style={{ backgroundColor: colors.saleBadgeBg, color: colors.saleBadgeText }}>
                                                        -{storewideDiscount}%
                                                    </span>
                                                )}
                                            </div>
                                            {productCard.showStock !== false && <p className="mt-2 text-[11px] font-bold text-emerald-700">In stock</p>}
                                            {productCard.showSku && <p className="mt-1 text-[10px] font-bold uppercase tracking-wide opacity-50">SKU SAMPLE-{product.price}</p>}
                                            {productCard.showQuickBuy && (
                                                <button className="mt-3 w-full border px-3 py-2 text-xs font-black" style={productButtonStyle}>
                                                    Quick buy
                                                </button>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            </section>
                            </PreviewTarget>

                            <PreviewTarget id="sections" activeElement={activeElement} hoveredElement={hoveredElement} onSelectElement={onSelectElement} onHoverElement={onHoverElement}>
                                <section className={`rounded-lg border border-black/5 p-4 ${highlight(['sections'])}`}>
                                    <h3 className="mb-3 text-sm font-black">Homepage sections</h3>
                                    {enabledSections.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            {enabledSections.map((section, index) => (
                                                <div key={`${section.type}-${index}`} className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ backgroundColor: colors.accentBg }}>
                                                    {section.title || section.type}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500">No custom homepage sections yet.</p>
                                    )}
                                </section>
                            </PreviewTarget>

                            <PreviewTarget id="footer" activeElement={activeElement} hoveredElement={hoveredElement} onSelectElement={onSelectElement} onHoverElement={onHoverElement}>
                                <footer
                                    className={`rounded-lg border border-black/5 p-4 text-xs ${highlight(['footer', 'policies'])}`}
                                    style={{ backgroundColor: colors.footerBackground, color: colors.footerText }}
                                >
                                    {theme.footer?.text || 'Footer text and policy links will appear here.'}
                                    <div className="mt-2 flex flex-wrap gap-2" style={{ color: colors.footerLink }}>
                                        {(theme.footer?.links || []).filter(item => item.label).slice(0, 3).map((item, index) => (
                                            <span key={`${item.label}-${index}`}>{item.label}</span>
                                        ))}
                                    </div>
                                </footer>
                            </PreviewTarget>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StoreBuilder = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [shopName, setShopName] = useState('');
    const [theme, setTheme] = useState(defaultTheme);
    const [customDomain, setCustomDomain] = useState({ domain: '' });
    const [storewideDiscount, setStorewideDiscount] = useState(0);
    const [activeGroup, setActiveGroup] = useState('brand');
    const [activeElement, setActiveElement] = useState('logo');
    const [hoveredElement, setHoveredElement] = useState('');
    const [device, setDevice] = useState('desktop');
    const [mobileWorkspace, setMobileWorkspace] = useState('structure');
    const [initialSnapshot, setInitialSnapshot] = useState('');
    const [editorHistory, setEditorHistory] = useState({ past: [], future: [] });
    const historyModeRef = useRef('record');
    const lastHistorySnapshotRef = useRef('');

    const currentSnapshot = useMemo(() => stableStringify({ theme, customDomain, storewideDiscount: Number(storewideDiscount) || 0 }), [theme, customDomain, storewideDiscount]);
    const hasUnsavedChanges = initialSnapshot && initialSnapshot !== currentSnapshot;
    const canUndo = editorHistory.past.length > 0;
    const canRedo = editorHistory.future.length > 0;
    const selectedLabel = useMemo(() => {
        const flatItems = structureTree.flatMap(item => [item, ...(item.children || [])]);
        return flatItems.find(item => item.id === activeElement)?.label || settingsGroups.find(item => item.id === activeGroup)?.label || 'Store element';
    }, [activeElement, activeGroup]);

    const publishedVersionLabel = useMemo(() => {
        if (!initialSnapshot) return 'Not loaded';
        const parsed = safeParseSnapshot(initialSnapshot);
        return parsed?.theme?.version ? `Theme v${parsed.theme.version}` : 'Published theme';
    }, [initialSnapshot]);

    const selectEditorTarget = (target) => {
        const flatItems = structureTree.flatMap(item => [item, ...(item.children || [])]);
        const item = flatItems.find(entry => entry.id === target);
        setActiveElement(target);
        if (item?.group) setActiveGroup(item.group);
        setMobileWorkspace('edit');
    };

    const selectSettingsGroup = (groupId) => {
        setActiveGroup(groupId);
        setActiveElement(groupElementMap[groupId] || groupId);
        setMobileWorkspace('edit');
    };

    const validation = useMemo(() => {
        const colorErrors = colorFields
            .filter(field => !isHexColor(theme.colors?.[field.key]))
            .map(field => `${field.label} must be a valid hex color.`);
        const discountNumber = Number(storewideDiscount);
        const discountErrors = Number.isNaN(discountNumber) || discountNumber < 0 || discountNumber > 100
            ? ['Storewide discount must be between 0 and 100.']
            : [];
        const navErrors = (theme.navigation || [])
            .filter(item => item?.url && !item?.label)
            .map(() => 'Navigation links with a URL need a label.');
        const navChildErrors = (theme.navigation || [])
            .flatMap(item => item?.children || [])
            .filter(item => item?.url && !item?.label)
            .map(() => 'Nested navigation links with a URL need a label.');
        const productColorErrors = [
            ['Product card price color', theme.productCard?.priceColor || theme.colors?.priceColor],
            ['Product card button color', theme.productCard?.buttonColor || theme.colors?.primaryButtonBg]
        ]
            .filter(([, value]) => value && !isHexColor(value))
            .map(([label]) => `${label} must be a valid hex color.`);

        return [...colorErrors, ...discountErrors, ...navErrors, ...navChildErrors, ...productColorErrors];
    }, [theme.colors, theme.navigation, theme.productCard, storewideDiscount]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await API.get('/store-builder/admin');
                const shop = data.data || {};
                const nextTheme = mergeTheme(defaultTheme, shop.theme || {});
                const nextDomain = shop.customDomain || { domain: '' };
                const nextDiscount = shop.storewideDiscount || 0;
                setShopName(shop.shopName || '');
                setTheme(nextTheme);
                setCustomDomain(nextDomain);
                setStorewideDiscount(nextDiscount);
                const loadedSnapshot = stableStringify({ theme: nextTheme, customDomain: nextDomain, storewideDiscount: Number(nextDiscount) || 0 });
                setInitialSnapshot(loadedSnapshot);
                lastHistorySnapshotRef.current = loadedSnapshot;
                setEditorHistory({ past: [], future: [] });
            } catch {
                toast.error('Failed to load store builder');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (!hasUnsavedChanges) return;
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    useEffect(() => {
        if (loading) return;

        if (!lastHistorySnapshotRef.current) {
            lastHistorySnapshotRef.current = currentSnapshot;
            return;
        }

        if (historyModeRef.current === 'skip') {
            historyModeRef.current = 'record';
            lastHistorySnapshotRef.current = currentSnapshot;
            return;
        }

        if (lastHistorySnapshotRef.current === currentSnapshot) return;

        const previousSnapshot = lastHistorySnapshotRef.current;
        lastHistorySnapshotRef.current = currentSnapshot;
        setEditorHistory(prev => ({
            past: [...prev.past, previousSnapshot].slice(-HISTORY_LIMIT),
            future: []
        }));
    }, [currentSnapshot, loading]);

    const setColor = (key, value) => {
        setTheme(prev => ({
            ...prev,
            colors: { ...prev.colors, [key]: value }
        }));
    };

    const setThemeGroup = (group, key, value) => {
        setTheme(prev => ({
            ...prev,
            [group]: { ...(prev[group] || {}), [key]: value }
        }));
    };

    const toggleThemeGroup = (group, key) => {
        setTheme(prev => ({
            ...prev,
            [group]: { ...(prev[group] || {}), [key]: !prev[group]?.[key] }
        }));
    };

    const isHomepageSectionLocked = (section) => Boolean(section?.settings?.isLocked);

    const updateHomepageSection = (index, field, value) => {
        setTheme(prev => ({
            ...prev,
            homepageSections: (prev.homepageSections || []).map((section, i) => (
                i === index && !isHomepageSectionLocked(section) ? { ...section, [field]: value } : section
            ))
        }));
    };

    const updateHomepageSectionSetting = (index, key, value) => {
        setTheme(prev => ({
            ...prev,
            homepageSections: (prev.homepageSections || []).map((section, i) => (
                i === index && (!isHomepageSectionLocked(section) || key === 'isLocked')
                    ? { ...section, settings: { ...(section.settings || {}), [key]: value } }
                    : section
            ))
        }));
    };

    const normalizeSectionOrder = (sections) => sections.map((section, index) => ({ ...section, sortOrder: index }));

    const moveHomepageSection = (index, direction) => {
        setTheme(prev => {
            const sections = [...(prev.homepageSections || [])];
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= sections.length) return prev;
            if (isHomepageSectionLocked(sections[index]) || isHomepageSectionLocked(sections[targetIndex])) return prev;
            [sections[index], sections[targetIndex]] = [sections[targetIndex], sections[index]];
            return { ...prev, homepageSections: normalizeSectionOrder(sections) };
        });
    };

    const duplicateHomepageSection = (index) => {
        setTheme(prev => {
            const sections = [...(prev.homepageSections || [])];
            const source = sections[index];
            if (!source || isHomepageSectionLocked(source)) return prev;
            sections.splice(index + 1, 0, {
                ...source,
                _id: undefined,
                title: `${source.title || source.type} copy`,
                settings: { ...(source.settings || {}) },
                sortOrder: index + 1
            });
            return { ...prev, homepageSections: normalizeSectionOrder(sections) };
        });
    };

    const removeHomepageSection = (index) => {
        setTheme(prev => ({
            ...prev,
            homepageSections: normalizeSectionOrder((prev.homepageSections || []).filter((section, i) => i !== index || isHomepageSectionLocked(section)))
        }));
    };

    const toggleHomepageSectionLock = (index) => {
        setTheme(prev => ({
            ...prev,
            homepageSections: (prev.homepageSections || []).map((section, i) => (
                i === index
                    ? { ...section, settings: { ...(section.settings || {}), isLocked: !isHomepageSectionLocked(section) } }
                    : section
            ))
        }));
    };

    const addHomepageSection = () => {
        setTheme(prev => ({
            ...prev,
            homepageSections: normalizeSectionOrder([
                ...(prev.homepageSections || []),
                {
                    type: 'FeaturedProducts',
                    title: 'Featured products',
                    isEnabled: true,
                    sortOrder: prev.homepageSections?.length || 0,
                    settings: {}
                }
            ])
        }));
    };

    const updateNavigation = (index, field, value) => {
        setTheme(prev => ({
            ...prev,
            navigation: (prev.navigation || []).map((item, i) => (
                i === index ? { ...item, [field]: value } : item
            ))
        }));
    };

    const normalizeNavigationOrder = (items) => items.map((item, index) => ({ ...item, sortOrder: index }));

    const addNavigation = () => {
        setTheme(prev => ({
            ...prev,
            navigation: normalizeNavigationOrder([
                ...(prev.navigation || []),
                { label: 'New link', url: '/', isExternal: false, sortOrder: prev.navigation?.length || 0, children: [], megaMenu: false }
            ])
        }));
    };

    const removeNavigation = (index) => {
        setTheme(prev => ({
            ...prev,
            navigation: normalizeNavigationOrder((prev.navigation || []).filter((_, i) => i !== index))
        }));
    };

    const moveNavigation = (index, direction) => {
        setTheme(prev => {
            const links = [...(prev.navigation || [])];
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= links.length) return prev;
            [links[index], links[targetIndex]] = [links[targetIndex], links[index]];
            return { ...prev, navigation: normalizeNavigationOrder(links) };
        });
    };

    const addNavigationChild = (index) => {
        setTheme(prev => ({
            ...prev,
            navigation: (prev.navigation || []).map((item, i) => (
                i === index
                    ? {
                        ...item,
                        children: [
                            ...(item.children || []),
                            { label: 'Sub link', url: '/', isExternal: false, sortOrder: item.children?.length || 0 }
                        ]
                    }
                    : item
            ))
        }));
    };

    const updateNavigationChild = (index, childIndex, field, value) => {
        setTheme(prev => ({
            ...prev,
            navigation: (prev.navigation || []).map((item, i) => (
                i === index
                    ? {
                        ...item,
                        children: (item.children || []).map((child, c) => (
                            c === childIndex ? { ...child, [field]: value } : child
                        ))
                    }
                    : item
            ))
        }));
    };

    const removeNavigationChild = (index, childIndex) => {
        setTheme(prev => ({
            ...prev,
            navigation: (prev.navigation || []).map((item, i) => (
                i === index
                    ? {
                        ...item,
                        children: (item.children || [])
                            .filter((_, c) => c !== childIndex)
                            .map((child, c) => ({ ...child, sortOrder: c }))
                    }
                    : item
            ))
        }));
    };

    const updatePolicy = (key, value) => {
        setTheme(prev => ({
            ...prev,
            policies: { ...prev.policies, [key]: value }
        }));
    };

    const updateFooter = (key, value) => {
        setTheme(prev => ({
            ...prev,
            footer: { ...(prev.footer || {}), [key]: value }
        }));
    };

    const updateFooterLink = (index, field, value) => {
        setTheme(prev => ({
            ...prev,
            footer: {
                ...(prev.footer || {}),
                links: (prev.footer?.links || []).map((item, i) => (
                    i === index ? { ...item, [field]: value } : item
                ))
            }
        }));
    };

    const addFooterLink = () => {
        setTheme(prev => ({
            ...prev,
            footer: {
                ...(prev.footer || {}),
                links: [
                    ...(prev.footer?.links || []),
                    { label: 'New link', url: '/', isExternal: false, sortOrder: prev.footer?.links?.length || 0 }
                ]
            }
        }));
    };

    const resetStyling = () => {
        setTheme(prev => mergeTheme(defaultTheme, {
            logoUrl: prev.logoUrl,
            faviconUrl: prev.faviconUrl,
            hero: prev.hero,
            navigation: prev.navigation,
            footer: prev.footer,
            policies: prev.policies,
            homepageSections: prev.homepageSections,
            checkoutBranding: {
                ...defaultTheme.checkoutBranding,
                logoUrl: prev.checkoutBranding?.logoUrl || '',
                bannerText: prev.checkoutBranding?.bannerText || '',
                trustMessage: prev.checkoutBranding?.trustMessage || defaultTheme.checkoutBranding.trustMessage
            },
            paymentSettings: prev.paymentSettings
        }));
        setStorewideDiscount(0);
        toast.success('Default styling restored. Save changes to publish it.');
    };

    const applyBuilderSnapshot = (snapshot) => {
        const parsed = safeParseSnapshot(snapshot);
        if (!parsed) return false;

        historyModeRef.current = 'skip';
        setTheme(mergeTheme(defaultTheme, parsed.theme || {}));
        setCustomDomain(parsed.customDomain || { domain: '' });
        setStorewideDiscount(Number(parsed.storewideDiscount) || 0);
        return true;
    };

    const undoBuilderChange = () => {
        if (!canUndo) return;
        const previousSnapshot = editorHistory.past[editorHistory.past.length - 1];
        if (!applyBuilderSnapshot(previousSnapshot)) return;

        setEditorHistory(prev => ({
            past: prev.past.slice(0, -1),
            future: [currentSnapshot, ...prev.future].slice(0, HISTORY_LIMIT)
        }));
    };

    const redoBuilderChange = () => {
        if (!canRedo) return;
        const nextSnapshot = editorHistory.future[0];
        if (!applyBuilderSnapshot(nextSnapshot)) return;

        setEditorHistory(prev => ({
            past: [...prev.past, currentSnapshot].slice(-HISTORY_LIMIT),
            future: prev.future.slice(1)
        }));
    };

    const restorePublishedVersion = () => {
        if (!initialSnapshot || !hasUnsavedChanges) return;
        if (applyBuilderSnapshot(initialSnapshot)) {
            toast.success('Draft restored to the last published version.');
        }
    };

    const handleLogoUpload = async (event, target = 'storefront') => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('logo', file);
        formData.append('target', target);
        setUploadingLogo(true);

        try {
            const { data } = await API.post('/store-builder/admin/logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const url = data.data?.url;
            if (!url) throw new Error('Upload did not return a logo URL');

            if (target === 'checkout') {
                setThemeGroup('checkoutBranding', 'logoUrl', url);
            } else {
                setTheme(prev => ({ ...prev, logoUrl: url }));
            }
            toast.success('Logo uploaded');
        } catch (err) {
            toast.error(err.response?.data?.error || err.message || 'Failed to upload logo');
        } finally {
            setUploadingLogo(false);
            event.target.value = '';
        }
    };

    const handleSave = async () => {
        if (validation.length > 0) {
            toast.error(validation[0]);
            return;
        }

        setSaving(true);
        try {
            const payload = {
                theme,
                customDomain,
                storewideDiscount: Math.max(0, Math.min(100, Number(storewideDiscount) || 0))
            };
            await API.patch('/store-builder/admin', payload);
            const publishedSnapshot = stableStringify({ theme, customDomain, storewideDiscount: payload.storewideDiscount });
            setInitialSnapshot(publishedSnapshot);
            lastHistorySnapshotRef.current = publishedSnapshot;
            setEditorHistory({ past: [], future: [] });
            toast.success('Store design published. Refresh your storefront to see the latest changes.');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save store builder');
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        const handleShortcuts = (event) => {
            const target = event.target;
            const isEditable = target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName);
            const commandKey = event.metaKey || event.ctrlKey;
            if (!commandKey) return;

            const key = event.key.toLowerCase();
            if (!isEditable && key === 'z' && !event.shiftKey) {
                event.preventDefault();
                undoBuilderChange();
            }

            if (!isEditable && ((key === 'z' && event.shiftKey) || key === 'y')) {
                event.preventDefault();
                redoBuilderChange();
            }

            if (key === 's') {
                event.preventDefault();
                if (!saving && validation.length === 0) handleSave();
            }
        };

        window.addEventListener('keydown', handleShortcuts);
        return () => window.removeEventListener('keydown', handleShortcuts);
    });

    const renderPanel = () => {
        switch (activeGroup) {
            case 'brand':
                return (
                    <BuilderCard title="Brand" description="Set the core identity customers see in your storefront header." icon={Palette}>
                        <BuilderInput
                            label="Logo URL"
                            value={theme.logoUrl || ''}
                            onChange={e => setTheme(prev => ({ ...prev, logoUrl: e.target.value }))}
                            placeholder="https://..."
                            help="Paste a public image URL or upload a logo file."
                        />
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500">
                            <Upload size={16} />
                            {uploadingLogo ? 'Uploading...' : 'Upload storefront logo'}
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                disabled={uploadingLogo}
                                onChange={event => handleLogoUpload(event, 'storefront')}
                            />
                        </label>
                        <BuilderSelect
                            label="Logo position"
                            value={theme.header?.logoPosition || 'Left'}
                            onChange={e => setThemeGroup('header', 'logoPosition', e.target.value)}
                            help="Choose where your brand appears in the storefront header. Mobile keeps a compact readable layout."
                        >
                            <option>Left</option><option>Center</option><option>Right</option>
                        </BuilderSelect>
                        <BuilderInput
                            label="Storewide discount"
                            type="number"
                            min="0"
                            max="100"
                            value={storewideDiscount}
                            onChange={e => setStorewideDiscount(e.target.value)}
                            help="Optional percentage discount shown on products. Use 0 when no storewide sale is active."
                            error={Number(storewideDiscount) < 0 || Number(storewideDiscount) > 100 ? 'Use a value from 0 to 100.' : ''}
                        />
                    </BuilderCard>
                );
            case 'colors':
                return (
                    <BuilderCard title="Colors" description="Use a small set of consistent colors so the store feels intentional." icon={Palette}>
                        {colorGroups.map(group => (
                            <div key={group.title} className="rounded-lg border border-slate-200 p-3">
                                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">{group.title}</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {group.fields.map(field => (
                                        <FieldShell
                                            key={field.key}
                                            label={field.label}
                                            help={field.help}
                                            error={!isHexColor(theme.colors?.[field.key]) ? 'Enter a valid hex color, for example #0f766e.' : ''}
                                        >
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={isHexColor(theme.colors?.[field.key]) ? theme.colors[field.key] : '#000000'}
                                                    onChange={e => setColor(field.key, e.target.value)}
                                                    className="h-10 w-12 rounded-lg border border-slate-200 bg-white"
                                                />
                                                <input
                                                    value={theme.colors?.[field.key] || ''}
                                                    onChange={e => setColor(field.key, e.target.value)}
                                                    className={inputClass}
                                                />
                                            </div>
                                        </FieldShell>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </BuilderCard>
                );
            case 'typography':
                return (
                    <BuilderCard title="Typography" description="Choose readable fonts and heading weight for a polished storefront." icon={LayoutTemplate}>
                        <BuilderSelect label="Heading font" value={theme.typography?.headingFont || 'Inter'} onChange={e => setThemeGroup('typography', 'headingFont', e.target.value)} help="Used for hero, product section headings, and important titles.">
                            <option>Inter</option><option>Arial</option><option>Georgia</option><option>Roboto</option>
                        </BuilderSelect>
                        <BuilderSelect label="Body font" value={theme.typography?.bodyFont || 'Inter'} onChange={e => setThemeGroup('typography', 'bodyFont', e.target.value)} help="Used for product names, descriptions, filters, and checkout text.">
                            <option>Inter</option><option>Arial</option><option>Georgia</option><option>Roboto</option>
                        </BuilderSelect>
                        <BuilderSelect label="Heading weight" value={theme.typography?.headingWeight || '800'} onChange={e => setThemeGroup('typography', 'headingWeight', e.target.value)}>
                            <option value="600">Semi bold</option><option value="700">Bold</option><option value="800">Extra bold</option><option value="900">Black</option>
                        </BuilderSelect>
                    </BuilderCard>
                );
            case 'layout':
                return (
                    <BuilderCard title="Layout" description="Control page width, section rhythm, and product grid density." icon={LayoutTemplate}>
                        <BuilderSelect label="Container width" value={theme.layout?.containerWidth || theme.layout?.maxWidth || 'Wide'} onChange={e => {
                            setThemeGroup('layout', 'containerWidth', e.target.value);
                            setThemeGroup('layout', 'maxWidth', e.target.value === 'Full Width' ? 'Full' : e.target.value === 'Narrow' ? 'Contained' : 'Wide');
                        }} help="Controls the main storefront content width. Full Width uses the whole screen.">
                            <option>Narrow</option><option>Standard</option><option>Wide</option><option>Full Width</option>
                        </BuilderSelect>
                        <BuilderSelect label="Content spacing" value={theme.layout?.contentSpacing || theme.layout?.sectionSpacing || 'Comfortable'} onChange={e => {
                            setThemeGroup('layout', 'contentSpacing', e.target.value);
                            setThemeGroup('layout', 'sectionSpacing', e.target.value);
                        }} help="Sets the vertical rhythm between major sections.">
                            <option>Compact</option><option>Comfortable</option><option>Spacious</option>
                        </BuilderSelect>
                        <BuilderSelect label="Section width" value={theme.layout?.sectionWidth || 'Full Width'} onChange={e => setThemeGroup('layout', 'sectionWidth', e.target.value)} help="Prepared for per-section width control and applied to preview rhythm.">
                            <option>Narrow</option><option>Standard</option><option>Wide</option><option>Full Width</option>
                        </BuilderSelect>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <BuilderInput label="Top padding" type="number" min="0" max="160" value={theme.layout?.sectionPaddingTop ?? 40} onChange={e => setThemeGroup('layout', 'sectionPaddingTop', Number(e.target.value))} help="Default section top padding in pixels." />
                            <BuilderInput label="Bottom padding" type="number" min="0" max="160" value={theme.layout?.sectionPaddingBottom ?? 40} onChange={e => setThemeGroup('layout', 'sectionPaddingBottom', Number(e.target.value))} help="Default section bottom padding in pixels." />
                            <BuilderInput label="Top margin" type="number" min="0" max="160" value={theme.layout?.sectionMarginTop ?? 0} onChange={e => setThemeGroup('layout', 'sectionMarginTop', Number(e.target.value))} />
                            <BuilderInput label="Bottom margin" type="number" min="0" max="160" value={theme.layout?.sectionMarginBottom ?? 40} onChange={e => setThemeGroup('layout', 'sectionMarginBottom', Number(e.target.value))} />
                        </div>
                        <BuilderSelect label="Desktop product columns" value={theme.layout?.productColumnsDesktop || 3} onChange={e => setThemeGroup('layout', 'productColumnsDesktop', Number(e.target.value))}>
                            <option value={2}>2 columns</option><option value={3}>3 columns</option><option value={4}>4 columns</option><option value={5}>5 columns</option>
                        </BuilderSelect>
                        <BuilderSelect label="Mobile product columns" value={theme.layout?.productColumnsMobile || 2} onChange={e => setThemeGroup('layout', 'productColumnsMobile', Number(e.target.value))}>
                            <option value={1}>1 column</option><option value={2}>2 columns</option>
                        </BuilderSelect>
                        <BuilderSelect label="Product gap" value={theme.layout?.productGap || theme.productGridStyle || 'Comfortable'} onChange={e => {
                            setThemeGroup('layout', 'productGap', e.target.value);
                            setTheme(prev => ({ ...prev, productGridStyle: e.target.value }));
                        }}>
                            <option>Compact</option><option>Comfortable</option><option>Spacious</option><option>Editorial</option>
                        </BuilderSelect>
                        <BuilderSelect label="Card alignment" value={theme.layout?.cardAlignment || 'Left'} onChange={e => setThemeGroup('layout', 'cardAlignment', e.target.value)} help="Aligns product card text and controls.">
                            <option>Left</option><option>Center</option><option>Right</option>
                        </BuilderSelect>
                    </BuilderCard>
                );
            case 'navigation':
                return (
                    <BuilderCard
                        title="Header and navigation"
                        description="Keep navigation short so customers can find the important pages quickly."
                        icon={LinkIcon}
                        actions={<BuilderButton type="button" variant="secondary" onClick={addNavigation}><Plus size={16} /> Add link</BuilderButton>}
                    >
                        {(theme.navigation || []).map((item, index) => (
                            <div key={index} className="rounded-lg border border-slate-200 p-3">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                                        <GripVertical size={15} />
                                        Link {index + 1}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button type="button" onClick={() => moveNavigation(index, -1)} disabled={index === 0} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30" title="Move link up">
                                            <ChevronUp size={16} />
                                        </button>
                                        <button type="button" onClick={() => moveNavigation(index, 1)} disabled={index === (theme.navigation || []).length - 1} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30" title="Move link down">
                                            <ChevronDown size={16} />
                                        </button>
                                        <button type="button" onClick={() => removeNavigation(index)} className="rounded-md p-2 text-red-500 hover:bg-red-50" title="Delete link">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <BuilderInput
                                        label="Label"
                                        value={item.label || ''}
                                        onChange={e => updateNavigation(index, 'label', e.target.value)}
                                        placeholder="Shop"
                                        error={item.url && !item.label ? 'Add a label for this link.' : ''}
                                    />
                                    <BuilderInput
                                        label="URL"
                                        value={item.url || ''}
                                        onChange={e => updateNavigation(index, 'url', e.target.value)}
                                        placeholder="/products"
                                        help="Use an internal path like /track or a full external URL."
                                    />
                                    <BuilderToggle
                                        label="Mega menu ready"
                                        help="Stores menu intent for future category-rich dropdowns. Current storefront keeps it as a clean nested menu."
                                        checked={Boolean(item.megaMenu)}
                                        onChange={() => updateNavigation(index, 'megaMenu', !item.megaMenu)}
                                    />
                                </div>
                                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Nested menu links</p>
                                            <p className="text-xs text-slate-500">Prepared for dropdown and mega menu expansion.</p>
                                        </div>
                                        <BuilderButton type="button" variant="subtle" onClick={() => addNavigationChild(index)}><Plus size={14} /> Add sub link</BuilderButton>
                                    </div>
                                    {(item.children || []).length === 0 ? (
                                        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-500">No sub links yet.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {(item.children || []).map((child, childIndex) => (
                                                <div key={childIndex} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
                                                    <input
                                                        value={child.label || ''}
                                                        onChange={e => updateNavigationChild(index, childIndex, 'label', e.target.value)}
                                                        placeholder="Sub label"
                                                        className={inputClass}
                                                        aria-label="Sub menu label"
                                                    />
                                                    <input
                                                        value={child.url || ''}
                                                        onChange={e => updateNavigationChild(index, childIndex, 'url', e.target.value)}
                                                        placeholder="/collection"
                                                        className={inputClass}
                                                        aria-label="Sub menu URL"
                                                    />
                                                    <button type="button" onClick={() => removeNavigationChild(index, childIndex)} className="rounded-lg border border-red-200 px-3 text-red-600 hover:bg-red-50" title="Delete sub link">
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </BuilderCard>
                );
            case 'hero':
                return (
                    <BuilderCard title="Hero" description="The first section shoppers see. Use one clear offer and one button." icon={LayoutTemplate}>
                        <BuilderInput label="Hero title" value={theme.hero?.title || ''} onChange={e => setThemeGroup('hero', 'title', e.target.value)} placeholder="Summer sale is live" />
                        <BuilderInput label="Hero subtitle" value={theme.hero?.subtitle || ''} onChange={e => setThemeGroup('hero', 'subtitle', e.target.value)} placeholder="Short supporting message" />
                        <BuilderInput label="Hero image URL" value={theme.hero?.imageUrl || ''} onChange={e => setThemeGroup('hero', 'imageUrl', e.target.value)} placeholder="https://..." help="Use a wide image so desktop and mobile cropping looks good." />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <BuilderInput label="Button label" value={theme.hero?.ctaLabel || ''} onChange={e => setThemeGroup('hero', 'ctaLabel', e.target.value)} />
                            <BuilderInput label="Button URL" value={theme.hero?.ctaUrl || '/'} onChange={e => setThemeGroup('hero', 'ctaUrl', e.target.value)} />
                        </div>
                        <BuilderSelect label="Hero height" value={theme.hero?.height || 'Medium'} onChange={e => setThemeGroup('hero', 'height', e.target.value)}>
                            <option>Compact</option><option>Medium</option><option>Tall</option>
                        </BuilderSelect>
                    </BuilderCard>
                );
            case 'products':
                return (
                    <BuilderCard title="Product cards" description="Control how products appear in grids across desktop and mobile." icon={ShoppingBag}>
                        <BuilderSelect label="Card style" value={theme.productCard?.style || 'Modern'} onChange={e => setThemeGroup('productCard', 'style', e.target.value)} help="Minimal is quieter, Modern is balanced, Premium adds stronger depth.">
                            <option>Minimal</option><option>Modern</option><option>Premium</option>
                        </BuilderSelect>
                        <BuilderSelect label="Image fit" value={theme.productCard?.imageFit || 'Contain'} onChange={e => setThemeGroup('productCard', 'imageFit', e.target.value)}>
                            <option>Contain</option><option>Cover</option>
                        </BuilderSelect>
                        <BuilderSelect label="Image aspect ratio" value={theme.productCard?.aspectRatio || 'Square'} onChange={e => setThemeGroup('productCard', 'aspectRatio', e.target.value)}>
                            <option>Square</option><option>Portrait</option><option>Landscape</option>
                        </BuilderSelect>
                        <BuilderSelect label="Corners" value={theme.productCard?.borderRadius || 'Rounded'} onChange={e => setThemeGroup('productCard', 'borderRadius', e.target.value)}>
                            <option>Soft</option><option>Rounded</option><option>Square</option>
                        </BuilderSelect>
                        <BuilderSelect label="Image corners" value={theme.productCard?.imageRadius || 'Rounded'} onChange={e => setThemeGroup('productCard', 'imageRadius', e.target.value)}>
                            <option>Soft</option><option>Rounded</option><option>Square</option>
                        </BuilderSelect>
                        <BuilderSelect label="Shadow" value={theme.productCard?.shadow || 'Soft'} onChange={e => setThemeGroup('productCard', 'shadow', e.target.value)}>
                            <option>None</option><option>Soft</option><option>Elevated</option>
                        </BuilderSelect>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <BuilderSelect label="Title size" value={theme.productCard?.titleSize || 'Medium'} onChange={e => setThemeGroup('productCard', 'titleSize', e.target.value)}>
                                <option>Small</option><option>Medium</option><option>Large</option>
                            </BuilderSelect>
                            <BuilderSelect label="Title weight" value={theme.productCard?.titleWeight || '800'} onChange={e => setThemeGroup('productCard', 'titleWeight', e.target.value)}>
                                <option value="600">Semi bold</option><option value="700">Bold</option><option value="800">Extra bold</option><option value="900">Black</option>
                            </BuilderSelect>
                            <BuilderSelect label="Price size" value={theme.productCard?.priceSize || 'Medium'} onChange={e => setThemeGroup('productCard', 'priceSize', e.target.value)}>
                                <option>Small</option><option>Medium</option><option>Large</option>
                            </BuilderSelect>
                            <FieldShell
                                label="Price color"
                                help="Overrides the global price color for product cards."
                                error={!isHexColor(theme.productCard?.priceColor || theme.colors?.priceColor) ? 'Enter a valid hex color.' : ''}
                            >
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={isHexColor(theme.productCard?.priceColor || theme.colors?.priceColor) ? (theme.productCard?.priceColor || theme.colors?.priceColor) : '#0f172a'}
                                        onChange={e => setThemeGroup('productCard', 'priceColor', e.target.value)}
                                        className="h-10 w-12 rounded-lg border border-slate-200 bg-white"
                                    />
                                    <input
                                        value={theme.productCard?.priceColor || theme.colors?.priceColor || ''}
                                        onChange={e => setThemeGroup('productCard', 'priceColor', e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                            </FieldShell>
                        </div>
                        <BuilderToggle label="Show category" help="Shows the product category above the product name." checked={theme.productCard?.showCategory !== false} onChange={() => toggleThemeGroup('productCard', 'showCategory')} />
                        <BuilderToggle label="Show rating" help="Shows star rating when a product has reviews." checked={theme.productCard?.showRating !== false} onChange={() => toggleThemeGroup('productCard', 'showRating')} />
                        <BuilderToggle label="Show reviews" help="Shows review count when available." checked={theme.productCard?.showReviews !== false} onChange={() => toggleThemeGroup('productCard', 'showReviews')} />
                        <BuilderToggle label="Show stock" help="Shows stock availability under the price." checked={theme.productCard?.showStock !== false} onChange={() => toggleThemeGroup('productCard', 'showStock')} />
                        <BuilderToggle label="Show SKU" help="Shows SKU or product ID shortcut for product-heavy stores." checked={Boolean(theme.productCard?.showSku)} onChange={() => toggleThemeGroup('productCard', 'showSku')} />
                        <BuilderToggle label="Show discount badge" help="Shows sale percentage badges on product images." checked={theme.productCard?.showDiscountBadge !== false} onChange={() => toggleThemeGroup('productCard', 'showDiscountBadge')} />
                        <BuilderToggle label="Show quick buy" help="Adds add-to-cart and buy-now buttons in product cards." checked={theme.productCard?.showQuickBuy !== false} onChange={() => toggleThemeGroup('productCard', 'showQuickBuy')} />
                        <BuilderToggle label="Show wishlist button" help="Shows a wishlist-ready heart button. Wishlist storage can be added later." checked={Boolean(theme.productCard?.showWishlist)} onChange={() => toggleThemeGroup('productCard', 'showWishlist')} />
                        <BuilderToggle label="Hover image zoom" help="Gently zooms product images on desktop hover." checked={theme.productCard?.hoverZoom !== false} onChange={() => toggleThemeGroup('productCard', 'hoverZoom')} />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <BuilderSelect label="Button style" value={theme.productCard?.buttonStyle || 'Solid'} onChange={e => setThemeGroup('productCard', 'buttonStyle', e.target.value)}>
                                <option>Solid</option><option>Outline</option><option>Ghost</option>
                            </BuilderSelect>
                            <BuilderSelect label="Button shape" value={theme.productCard?.buttonShape || 'Rounded'} onChange={e => setThemeGroup('productCard', 'buttonShape', e.target.value)}>
                                <option>Soft</option><option>Rounded</option><option>Pill</option><option>Square</option>
                            </BuilderSelect>
                            <FieldShell label="Button color" help="Used by quick-buy buttons on product cards." error={!isHexColor(theme.productCard?.buttonColor || theme.colors?.primaryButtonBg) ? 'Enter a valid hex color.' : ''}>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={isHexColor(theme.productCard?.buttonColor || theme.colors?.primaryButtonBg) ? (theme.productCard?.buttonColor || theme.colors?.primaryButtonBg) : '#0f766e'}
                                        onChange={e => setThemeGroup('productCard', 'buttonColor', e.target.value)}
                                        className="h-10 w-12 rounded-lg border border-slate-200 bg-white"
                                    />
                                    <input
                                        value={theme.productCard?.buttonColor || theme.colors?.primaryButtonBg || ''}
                                        onChange={e => setThemeGroup('productCard', 'buttonColor', e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                            </FieldShell>
                        </div>
                    </BuilderCard>
                );
            case 'sections':
                return (
                    <BuilderCard
                        title="Homepage sections"
                        description="Control which homepage blocks are visible and their order."
                        icon={LayoutTemplate}
                        actions={<BuilderButton type="button" variant="secondary" onClick={addHomepageSection}><Plus size={16} /> Add section</BuilderButton>}
                    >
                        {(theme.homepageSections || []).length === 0 && (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                                No custom homepage sections yet. Add a section for featured products, collections, or banners.
                            </div>
                        )}
                        {(theme.homepageSections || []).map((section, index) => {
                            const locked = isHomepageSectionLocked(section);
                            const previousLocked = isHomepageSectionLocked((theme.homepageSections || [])[index - 1]);
                            const nextLocked = isHomepageSectionLocked((theme.homepageSections || [])[index + 1]);

                            return (
                            <div key={section._id || index} className={`rounded-lg border p-3 ${locked ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200'}`}>
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-slate-900">{section.title || section.type}</p>
                                            {locked && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                                                    <Lock size={12} /> Locked
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500">{section.type}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button type="button" onClick={() => moveHomepageSection(index, -1)} disabled={locked || previousLocked || index === 0} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30" title="Move section up">
                                            <ChevronUp size={16} />
                                        </button>
                                        <button type="button" onClick={() => moveHomepageSection(index, 1)} disabled={locked || nextLocked || index === (theme.homepageSections || []).length - 1} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30" title="Move section down">
                                            <ChevronDown size={16} />
                                        </button>
                                        <button type="button" onClick={() => duplicateHomepageSection(index)} disabled={locked} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30" title="Duplicate section">
                                            <Copy size={16} />
                                        </button>
                                        <button type="button" onClick={() => toggleHomepageSectionLock(index)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" title={locked ? 'Unlock section' : 'Lock section'}>
                                            {locked ? <Unlock size={16} /> : <Lock size={16} />}
                                        </button>
                                        <button type="button" onClick={() => removeHomepageSection(index)} disabled={locked} className="rounded-md p-2 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30" title="Remove section">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <BuilderSelect label="Section type" value={section.type || 'FeaturedProducts'} onChange={e => updateHomepageSection(index, 'type', e.target.value)} disabled={locked}>
                                        <option>Hero</option><option>FeaturedProducts</option><option>Collection</option><option>TextBlock</option><option>Newsletter</option><option>Reviews</option><option>BannerGrid</option><option>CategoryList</option>
                                    </BuilderSelect>
                                    <BuilderInput label="Section title" value={section.title || ''} onChange={e => updateHomepageSection(index, 'title', e.target.value)} disabled={locked} />
                                </div>
                                {['TextBlock', 'Newsletter', 'Reviews'].includes(section.type) && (
                                    <div className="mt-3">
                                        <BuilderTextarea
                                            label="Section text"
                                            value={section.settings?.text || ''}
                                            onChange={e => updateHomepageSectionSetting(index, 'text', e.target.value)}
                                            disabled={locked}
                                            help="Shown below the section title on the storefront."
                                        />
                                    </div>
                                )}
                                <div className="mt-3">
                                    <BuilderToggle label="Visible on storefront" checked={section.isEnabled !== false} onChange={() => updateHomepageSection(index, 'isEnabled', section.isEnabled === false)} disabled={locked} />
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                    {locked
                                        ? 'This section is protected from accidental edits. Unlock it before changing content, visibility, order, or deletion.'
                                        : `Sort order: ${index + 1}. Move controls update the saved sort order used by the storefront.`}
                                </p>
                            </div>
                            );
                        })}
                    </BuilderCard>
                );
            case 'checkout':
                return (
                    <BuilderCard title="Checkout" description="Build trust at the moment customers place an order." icon={CreditCard}>
                        <BuilderInput label="Checkout logo URL" value={theme.checkoutBranding?.logoUrl || ''} onChange={e => setThemeGroup('checkoutBranding', 'logoUrl', e.target.value)} placeholder="https://..." />
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500">
                            <Upload size={16} />
                            {uploadingLogo ? 'Uploading...' : 'Upload checkout logo'}
                            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingLogo} onChange={event => handleLogoUpload(event, 'checkout')} />
                        </label>
                        <BuilderInput label="Checkout banner text" value={theme.checkoutBranding?.bannerText || ''} onChange={e => setThemeGroup('checkoutBranding', 'bannerText', e.target.value)} placeholder="Free returns for 7 days" />
                        <BuilderInput label="Trust message" value={theme.checkoutBranding?.trustMessage || ''} onChange={e => setThemeGroup('checkoutBranding', 'trustMessage', e.target.value)} placeholder="Secure checkout" />
                        <BuilderSelect label="Button style" value={theme.checkoutBranding?.buttonStyle || 'Rounded'} onChange={e => setThemeGroup('checkoutBranding', 'buttonStyle', e.target.value)}>
                            <option>Solid</option><option>Rounded</option><option>Pill</option>
                        </BuilderSelect>
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                            <div className="flex items-start gap-3">
                                <span className="rounded-lg bg-white p-2 text-slate-600 shadow-sm">
                                    <CreditCard size={18} />
                                </span>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Additional Payment Methods Coming Soon</p>
                                    <p className="mt-1 text-sm leading-5 text-slate-500">
                                        The theme now stores a scalable payment settings object for Stripe, SSLCommerz, bKash, Nagad, Rocket, and PayPal without changing the current checkout flow.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {['stripe', 'sslcommerz', 'bkash', 'nagad', 'rocket', 'paypal'].map(provider => (
                                    <label key={provider} className="flex cursor-not-allowed items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold capitalize text-slate-500">
                                        {provider}
                                        <input type="checkbox" checked={Boolean(theme.paymentSettings?.providers?.[provider])} readOnly disabled className="h-4 w-4 rounded border-slate-300" />
                                    </label>
                                ))}
                            </div>
                        </div>
                        <CheckoutBrandingPreview theme={theme} shopName={shopName} />
                    </BuilderCard>
                );
            case 'mobile':
                return (
                    <BuilderCard title="Mobile" description="Tune storefront controls for small screens." icon={Smartphone}>
                        <BuilderToggle label="Sticky checkout button" help="Keeps checkout easy to reach on cart and checkout flows." checked={Boolean(theme.mobile?.stickyCheckoutButton)} onChange={() => toggleThemeGroup('mobile', 'stickyCheckoutButton')} />
                        <BuilderToggle label="Compact header" help="Reduces header height on mobile." checked={Boolean(theme.mobile?.compactHeader)} onChange={() => toggleThemeGroup('mobile', 'compactHeader')} />
                        <BuilderToggle label="Bottom navigation" help="Shows a mobile bottom bar with key actions." checked={Boolean(theme.mobile?.showBottomNavigation)} onChange={() => toggleThemeGroup('mobile', 'showBottomNavigation')} />
                    </BuilderCard>
                );
            case 'footer':
                return (
                    <BuilderCard
                        title="Footer"
                        description="Add footer copy and links for policies, support, or important pages."
                        icon={FileText}
                        actions={<BuilderButton type="button" variant="secondary" onClick={addFooterLink}><Plus size={16} /> Add link</BuilderButton>}
                    >
                        <BuilderTextarea
                            label="Footer text"
                            value={theme.footer?.text || ''}
                            onChange={e => updateFooter('text', e.target.value)}
                            help="Shown at the bottom of the storefront. Keep it short and trustworthy."
                        />
                        {(theme.footer?.links || []).length === 0 && (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                                No footer links yet. Add links for policies, contact, or collections.
                            </div>
                        )}
                        {(theme.footer?.links || []).map((item, index) => (
                            <div key={index} className="rounded-lg border border-slate-200 p-3">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <BuilderInput
                                        label="Label"
                                        value={item.label || ''}
                                        onChange={e => updateFooterLink(index, 'label', e.target.value)}
                                        placeholder="Refund policy"
                                    />
                                    <BuilderInput
                                        label="URL"
                                        value={item.url || ''}
                                        onChange={e => updateFooterLink(index, 'url', e.target.value)}
                                        placeholder="/policy/refund"
                                    />
                                </div>
                            </div>
                        ))}
                    </BuilderCard>
                );
            case 'policies':
                return (
                    <BuilderCard title="Policies" description="Policies appear on checkout when text is added. Empty policies stay hidden." icon={FileText}>
                        {['refund', 'shipping', 'privacy', 'terms'].map(key => (
                            <BuilderTextarea key={key} label={`${key.charAt(0).toUpperCase()}${key.slice(1)} policy`} value={theme.policies?.[key] || ''} onChange={e => updatePolicy(key, e.target.value)} help={theme.policies?.[key]?.trim() ? 'Visible on checkout.' : 'Hidden on checkout until text is added.'} />
                        ))}
                    </BuilderCard>
                );
            case 'domain':
                return (
                    <BuilderCard title="Domain" description="Use this after your domain DNS points to the platform." icon={Globe}>
                        <BuilderInput label="Custom domain" value={customDomain.domain || ''} onChange={e => setCustomDomain(prev => ({ ...prev, domain: e.target.value }))} placeholder="www.example.com" help="Customers can use this instead of the default subdomain after verification." />
                        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            Status: <span className="font-semibold text-slate-900">{customDomain.status || 'NotConfigured'}</span>
                        </div>
                    </BuilderCard>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return <div className="p-8 text-sm text-slate-500">Loading store builder...</div>;
    }

    return (
        <div className="min-h-full bg-slate-50">
            <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-slate-950">Store Builder</h1>
	                            {hasUnsavedChanges && (
	                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
	                                    Draft changes
	                                </span>
	                            )}
	                        </div>
	                        <p className="mt-1 text-sm text-slate-500">Customize your storefront without code. Preview draft changes, then publish when ready.</p>
	                    </div>
	                    <div className="flex flex-wrap items-center gap-2">
	                        <DeviceSwitcher value={device} onChange={setDevice} />
	                        <BuilderButton type="button" variant="secondary" onClick={undoBuilderChange} disabled={!canUndo || saving} title="Undo last editor change">
	                            <Undo2 size={16} />
	                            Undo
	                        </BuilderButton>
	                        <BuilderButton type="button" variant="secondary" onClick={redoBuilderChange} disabled={!canRedo || saving} title="Redo last editor change">
	                            <Redo2 size={16} />
	                            Redo
	                        </BuilderButton>
	                        <BuilderButton type="button" variant="secondary" onClick={resetStyling} disabled={saving}>
	                            <RotateCcw size={16} />
	                            Reset styling
	                        </BuilderButton>
	                        <BuilderButton type="button" onClick={handleSave} disabled={saving || validation.length > 0}>
	                            <Save size={16} />
	                            {saving ? 'Publishing...' : 'Publish changes'}
	                        </BuilderButton>
	                    </div>
                </div>
                <div className="mx-auto flex max-w-[1600px] gap-2 px-4 pb-3 xl:hidden">
                    {[
                        ['structure', 'Structure'],
                        ['edit', 'Edit'],
                        ['preview', 'Preview']
                    ].map(([id, label]) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setMobileWorkspace(id)}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                mobileWorkspace === id
                                    ? 'border-slate-950 bg-slate-950 text-white'
                                    : 'border-slate-200 bg-white text-slate-600'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 p-4 xl:grid-cols-[360px_minmax(0,1fr)]">
                <aside className={`${mobileWorkspace === 'structure' ? 'block' : 'hidden'} space-y-4 xl:sticky xl:top-28 xl:block xl:self-start`}>
                    <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                        <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">Structure</p>
                        <div className="space-y-1">
                            {structureTree.map(item => {
                                const active = activeElement === item.id || item.children?.some(child => child.id === activeElement);
                                return (
                                    <div key={item.id} className="rounded-lg">
                                        <button
                                            type="button"
                                            onClick={() => selectEditorTarget(item.id)}
                                            onMouseEnter={() => setHoveredElement(item.id)}
                                            onMouseLeave={() => setHoveredElement('')}
                                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                                active ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-slate-50'
                                            }`}
                                        >
                                            <span>{item.label}</span>
                                            <span className="text-xs opacity-60">{item.children?.length || 0}</span>
                                        </button>
                                        {item.children?.length > 0 && (
                                            <div className="ml-3 mt-1 space-y-1 border-l border-slate-200 pl-2">
                                                {item.children.map(child => {
                                                    const childActive = activeElement === child.id;
                                                    return (
                                                        <button
                                                            key={child.id}
                                                            type="button"
                                                            onClick={() => selectEditorTarget(child.id)}
                                                            onMouseEnter={() => setHoveredElement(child.id)}
                                                            onMouseLeave={() => setHoveredElement('')}
                                                            className={`flex w-full items-center rounded-md px-3 py-2 text-left text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                                                childActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                                            }`}
                                                        >
                                                            {child.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                            Hover a row to highlight the preview. Click a row or preview area to edit it.
                        </div>
                    </div>

	                    <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
	                        <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">Theme settings</p>
	                        <div className="space-y-1">
                            {settingsGroups.map(group => {
                                const Icon = group.icon;
                                const active = activeGroup === group.id;
                                return (
                                    <button
                                        key={group.id}
                                        type="button"
                                        onClick={() => selectSettingsGroup(group.id)}
                                        className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                            active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                                        }`}
                                    >
                                        <Icon size={18} className={active ? 'mt-0.5 text-indigo-600' : 'mt-0.5 text-slate-400'} />
                                        <span>
                                            <span className="block text-sm font-semibold">{group.label}</span>
                                            <span className="mt-0.5 block text-xs leading-4 opacity-75">{group.description}</span>
                                        </span>
                                    </button>
                                );
	                            })}
	                        </div>
	                    </div>
	                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
	                        <div className="flex items-start gap-3">
	                            <span className="rounded-lg bg-slate-100 p-2 text-slate-600">
	                                <History size={17} />
	                            </span>
	                            <div>
	                                <p className="text-sm font-black text-slate-950">Draft and version</p>
	                                <p className="mt-1 text-xs leading-5 text-slate-500">
	                                    Changes stay in this editor until you publish them.
	                                </p>
	                            </div>
	                        </div>
	                        <div className="mt-4 space-y-2 text-xs">
	                            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
	                                <span className="font-semibold text-slate-500">Current draft</span>
	                                <span className={`font-black ${hasUnsavedChanges ? 'text-amber-700' : 'text-emerald-700'}`}>
	                                    {hasUnsavedChanges ? 'Unpublished' : 'Published'}
	                                </span>
	                            </div>
	                            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
	                                <span className="font-semibold text-slate-500">Last published</span>
	                                <span className="font-black text-slate-800">{publishedVersionLabel}</span>
	                            </div>
	                        </div>
	                        <div className="mt-3 grid grid-cols-2 gap-2">
	                            <BuilderButton type="button" variant="secondary" onClick={restorePublishedVersion} disabled={!hasUnsavedChanges || saving} className="w-full text-xs">
	                                Restore
	                            </BuilderButton>
	                            <BuilderButton type="button" variant="secondary" onClick={handleSave} disabled={saving || validation.length > 0} className="w-full text-xs">
	                                Publish
	                            </BuilderButton>
	                        </div>
	                        <p className="mt-3 text-[11px] leading-5 text-slate-500">
	                            Shortcuts: Cmd/Ctrl+S publish, Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z or Ctrl+Y redo.
	                        </p>
	                    </div>
	                    {validation.length > 0 && (
	                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            <p className="font-bold">Fix before saving</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5">
                                {validation.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}
                            </ul>
                        </div>
                    )}
                </aside>

                <main className={`${mobileWorkspace === 'structure' ? 'hidden' : 'grid'} grid-cols-1 gap-4 xl:grid 2xl:grid-cols-[420px_minmax(0,1fr)]`}>
                    <div className={`${mobileWorkspace === 'edit' ? 'block' : 'hidden'} order-2 space-y-4 xl:block 2xl:order-1`}>
                        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wide text-indigo-500">Selected</p>
                                    <h2 className="mt-1 text-lg font-black text-indigo-950">{selectedLabel}</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setMobileWorkspace('preview')}
                                    className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-100 xl:hidden"
                                >
                                    Preview selected
                                </button>
                            </div>
                            <p className="mt-1 text-sm leading-5 text-indigo-700">
                                Edit the selected storefront element below. Existing settings and saved theme fields are preserved.
                            </p>
                        </div>
                        {renderPanel()}
                    </div>
                    <section className={`${mobileWorkspace === 'preview' ? 'block' : 'hidden'} order-1 rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:block 2xl:order-2`}>
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-base font-bold text-slate-950">Live preview</h2>
                                <p className="mt-1 text-sm text-slate-500">The highlighted area shows what you are editing now.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setMobileWorkspace('edit')}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 xl:hidden"
                                >
                                    Edit selected
                                </button>
                                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-600">
                                    {device}
                                </div>
                            </div>
                        </div>
                        <StorefrontPreview
                            theme={theme}
                            storewideDiscount={Number(storewideDiscount) || 0}
                            shopName={shopName}
                            activeGroup={activeGroup}
                            activeElement={activeElement}
                            hoveredElement={hoveredElement}
                            onSelectElement={selectEditorTarget}
                            onHoverElement={setHoveredElement}
                            device={device}
                        />
                    </section>
                </main>
            </div>
        </div>
    );
};

export default StoreBuilder;
