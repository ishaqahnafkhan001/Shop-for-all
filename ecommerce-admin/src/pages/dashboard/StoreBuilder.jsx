import { useEffect, useMemo, useState } from 'react';
import {
    ChevronDown,
    ChevronUp,
    Copy,
    CreditCard,
    FileText,
    Globe,
    LayoutTemplate,
    Link as LinkIcon,
    Monitor,
    Palette,
    Plus,
    RotateCcw,
    Save,
    ShieldCheck,
    ShoppingBag,
    Smartphone,
    Star,
    Tablet,
    Upload
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../api/api';

const defaultTheme = {
    logoUrl: '',
    faviconUrl: '',
    fontFamily: 'Inter',
    productGridStyle: 'Comfortable',
    colors: {
        accent: '#4f46e5',
        accentHover: '#4338ca',
        accentSoft: '#c7d2fe',
        accentBg: '#eef2ff',
        accentStrong: '#3730a3',
        accentMuted: '#818cf8',
        accentLight: '#a5b4fc',
        accentRing: '#e0e7ff',
        background: '#ffffff',
        foreground: '#111827',
        headerBackground: '#ffffff'
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
        sectionSpacing: 'Comfortable',
        productColumnsDesktop: 3,
        productColumnsMobile: 2
    },
    productCard: {
        imageFit: 'Contain',
        showCategory: true,
        showRating: true,
        showQuickBuy: true,
        borderRadius: 'Rounded',
        shadow: 'Soft'
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
    navigation: [
        { label: 'Shop', url: '/', isExternal: false, sortOrder: 0 },
        { label: 'Track Order', url: '/track', isExternal: false, sortOrder: 1 }
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

const colorFields = [
    { key: 'accent', label: 'Accent', help: 'Main button and link color.' },
    { key: 'accentBg', label: 'Accent background', help: 'Soft background used in previews and highlights.' },
    { key: 'background', label: 'Page background', help: 'Main storefront background color.' },
    { key: 'foreground', label: 'Text color', help: 'Default text color for the storefront.' },
    { key: 'headerBackground', label: 'Header background', help: 'Navigation bar background color.' }
];

const mergeTheme = (base, incoming = {}) => ({
    ...base,
    ...incoming,
    colors: { ...base.colors, ...(incoming.colors || {}) },
    typography: { ...base.typography, ...(incoming.typography || {}) },
    hero: { ...base.hero, ...(incoming.hero || {}) },
    layout: { ...base.layout, ...(incoming.layout || {}) },
    productCard: { ...base.productCard, ...(incoming.productCard || {}) },
    checkoutBranding: { ...base.checkoutBranding, ...(incoming.checkoutBranding || {}) },
    mobile: { ...base.mobile, ...(incoming.mobile || {}) },
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

const heroHeightClass = {
    Compact: 'min-h-36',
    Medium: 'min-h-48',
    Tall: 'min-h-64'
};

const deviceClasses = {
    desktop: 'w-full max-w-5xl',
    tablet: 'w-[760px] max-w-full',
    mobile: 'w-[360px] max-w-full'
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

const BuilderToggle = ({ label, help, checked, onChange }) => (
    <label className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3">
        <span>
            <span className="block text-sm font-semibold text-slate-800">{label}</span>
            {help && <span className="mt-1 block text-xs leading-5 text-slate-500">{help}</span>}
        </span>
        <input
            type="checkbox"
            checked={checked}
            onChange={onChange}
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
        { id: 'mobile', label: 'Mobile', icon: Smartphone }
    ];

    return (
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
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
                    <button className="w-full py-3 text-sm font-black text-white" style={{ backgroundColor: colors.accent, borderRadius: buttonRadius }}>
                        Place Order
                    </button>
                    <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
                        <ShieldCheck size={14} style={{ color: colors.accent }} />
                        {checkoutBranding.trustMessage || 'Secure checkout'}
                    </p>
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

const StorefrontPreview = ({ theme, storewideDiscount, shopName, activeGroup, device }) => {
    const colors = theme.colors || defaultTheme.colors;
    const typography = theme.typography || defaultTheme.typography;
    const hero = theme.hero || defaultTheme.hero;
    const layout = theme.layout || defaultTheme.layout;
    const productCard = theme.productCard || defaultTheme.productCard;
    const navItems = (theme.navigation || []).filter(item => item.label).slice(0, 4);
    const enabledSections = (theme.homepageSections || []).filter(section => section.isEnabled !== false).slice(0, 4);
    const radius = productRadiusClass[productCard.borderRadius] || productRadiusClass.Rounded;
    const shadow = productShadowClass[productCard.shadow] || productShadowClass.Soft;
    const gridColumns = device === 'mobile'
        ? (layout.productColumnsMobile === 1 ? 'grid-cols-1' : 'grid-cols-2')
        : layout.productColumnsDesktop >= 4
            ? 'grid-cols-4'
            : layout.productColumnsDesktop === 2
                ? 'grid-cols-2'
                : 'grid-cols-3';
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
        <div className="rounded-lg border border-slate-200 bg-slate-100 p-3">
            <div className={`mx-auto transition-all duration-300 ${deviceClasses[device]}`}>
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                        <span className="ml-2 truncate text-xs text-slate-500">{device} preview</span>
                    </div>
                    <div style={previewStyle} className="p-4">
                        <div className={`mx-auto space-y-5 ${layout.maxWidth === 'Contained' ? 'max-w-3xl' : layout.maxWidth === 'Full' ? 'max-w-none' : 'max-w-5xl'}`}>
                            <header style={{ backgroundColor: colors.headerBackground }} className={`flex items-center justify-between rounded-lg border border-black/5 px-4 py-3 ${highlight(['brand', 'navigation', 'colors'])}`}>
                                <div className="flex min-w-0 items-center gap-2">
                                    {theme.logoUrl ? (
                                        <div className="h-8 w-8 rounded bg-center bg-cover border border-black/10" style={{ backgroundImage: `url(${theme.logoUrl})` }} />
                                    ) : (
                                        <div className="flex h-8 w-8 items-center justify-center rounded text-xs font-bold text-white" style={{ backgroundColor: colors.accent }}>S</div>
                                    )}
                                    <span className="truncate text-sm font-bold">{shopName || 'Your Store'}</span>
                                </div>
                                {device !== 'mobile' && (
                                    <nav className="flex items-center gap-4 text-xs font-semibold">
                                        {(navItems.length ? navItems : defaultTheme.navigation).map((item, index) => (
                                            <span key={`${item.label}-${index}`}>{item.label}</span>
                                        ))}
                                    </nav>
                                )}
                            </header>

                            <section style={heroStyle} className={`${heroHeightClass[hero.height] || heroHeightClass.Medium} rounded-lg p-6 flex items-center ${highlight(['hero', 'layout'])}`}>
                                <div className="max-w-xl">
                                    <p className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: hero.imageUrl ? '#ffffff' : colors.accent }}>
                                        {storewideDiscount > 0 ? `${storewideDiscount}% storewide offer` : 'Featured collection'}
                                    </p>
                                    <h2 className={`${device === 'mobile' ? 'text-xl' : 'text-3xl'} font-black leading-tight`} style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight }}>
                                        {hero.title || 'Build a storefront customers trust'}
                                    </h2>
                                    <p className="mt-3 text-sm opacity-80">{hero.subtitle || 'Your homepage hero, colors, font, product cards, and navigation preview here.'}</p>
                                    <button className="mt-5 rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ backgroundColor: colors.accent }}>
                                        {hero.ctaLabel || 'Shop Now'}
                                    </button>
                                </div>
                            </section>

                            <section className={highlight(['products', 'layout'])}>
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-lg font-black" style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight }}>
                                        Latest products
                                    </h3>
                                    {productCard.showQuickBuy && <span className="text-xs font-bold" style={{ color: colors.accent }}>Quick buy enabled</span>}
                                </div>
                                <div className={`grid gap-4 ${gridColumns}`}>
                                    {sampleProducts.slice(0, device === 'mobile' ? 2 : 3).map((product) => (
                                        <article key={product.title} className={`bg-white border border-black/5 p-3 ${radius} ${shadow}`}>
                                            <div className={`aspect-square ${radius} ${productCard.imageFit === 'Cover' ? '' : 'p-6'} flex items-center justify-center`} style={{ backgroundColor: colors.accentBg }}>
                                                <ShoppingBag size={device === 'mobile' ? 24 : 36} style={{ color: colors.accent }} />
                                            </div>
                                            {productCard.showCategory && <p className="mt-3 text-[11px] uppercase font-bold opacity-50">{product.category}</p>}
                                            <h4 className="mt-1 text-sm font-bold line-clamp-1">{product.title}</h4>
                                            {productCard.showRating && (
                                                <div className="mt-1 flex items-center gap-1 text-amber-400">
                                                    {[1, 2, 3, 4, 5].map(star => <Star key={star} size={12} fill="currentColor" />)}
                                                </div>
                                            )}
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="text-sm font-black">৳ {product.price}</span>
                                                {storewideDiscount > 0 && <span className="text-xs font-bold text-red-500">-{storewideDiscount}%</span>}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>

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

                            <footer className={`rounded-lg border border-black/5 p-4 text-xs opacity-70 ${highlight(['footer', 'policies'])}`}>
                                {theme.footer?.text || 'Footer text and policy links will appear here.'}
                            </footer>
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
    const [device, setDevice] = useState('desktop');
    const [initialSnapshot, setInitialSnapshot] = useState('');

    const currentSnapshot = useMemo(() => stableStringify({ theme, customDomain, storewideDiscount: Number(storewideDiscount) || 0 }), [theme, customDomain, storewideDiscount]);
    const hasUnsavedChanges = initialSnapshot && initialSnapshot !== currentSnapshot;

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

        return [...colorErrors, ...discountErrors, ...navErrors];
    }, [theme.colors, theme.navigation, storewideDiscount]);

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
                setInitialSnapshot(stableStringify({ theme: nextTheme, customDomain: nextDomain, storewideDiscount: Number(nextDiscount) || 0 }));
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

    const updateHomepageSection = (index, field, value) => {
        setTheme(prev => ({
            ...prev,
            homepageSections: (prev.homepageSections || []).map((section, i) => (
                i === index ? { ...section, [field]: value } : section
            ))
        }));
    };

    const normalizeSectionOrder = (sections) => sections.map((section, index) => ({ ...section, sortOrder: index }));

    const moveHomepageSection = (index, direction) => {
        setTheme(prev => {
            const sections = [...(prev.homepageSections || [])];
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= sections.length) return prev;
            [sections[index], sections[targetIndex]] = [sections[targetIndex], sections[index]];
            return { ...prev, homepageSections: normalizeSectionOrder(sections) };
        });
    };

    const duplicateHomepageSection = (index) => {
        setTheme(prev => {
            const sections = [...(prev.homepageSections || [])];
            const source = sections[index];
            if (!source) return prev;
            sections.splice(index + 1, 0, {
                ...source,
                _id: undefined,
                title: `${source.title || source.type} copy`,
                sortOrder: index + 1
            });
            return { ...prev, homepageSections: normalizeSectionOrder(sections) };
        });
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

    const addNavigation = () => {
        setTheme(prev => ({
            ...prev,
            navigation: [
                ...(prev.navigation || []),
                { label: 'New link', url: '/', isExternal: false, sortOrder: prev.navigation?.length || 0 }
            ]
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
            navigation: prev.navigation,
            footer: prev.footer,
            policies: prev.policies,
            homepageSections: prev.homepageSections
        }));
        setStorewideDiscount(0);
        toast.success('Default styling restored. Save changes to publish it.');
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
            setInitialSnapshot(stableStringify({ theme, customDomain, storewideDiscount: payload.storewideDiscount }));
            toast.success('Store design saved. Refresh your storefront to see the latest changes.');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save store builder');
        } finally {
            setSaving(false);
        }
    };

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
                        <div className="grid grid-cols-1 gap-4">
                            {colorFields.map(field => (
                                <FieldShell
                                    key={field.key}
                                    label={field.label}
                                    help={field.help}
                                    error={!isHexColor(theme.colors?.[field.key]) ? 'Enter a valid hex color, for example #4f46e5.' : ''}
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
                        <BuilderSelect label="Max width" value={theme.layout?.maxWidth || 'Wide'} onChange={e => setThemeGroup('layout', 'maxWidth', e.target.value)}>
                            <option>Contained</option><option>Wide</option><option>Full</option>
                        </BuilderSelect>
                        <BuilderSelect label="Section spacing" value={theme.layout?.sectionSpacing || 'Comfortable'} onChange={e => setThemeGroup('layout', 'sectionSpacing', e.target.value)}>
                            <option>Compact</option><option>Comfortable</option><option>Spacious</option>
                        </BuilderSelect>
                        <BuilderSelect label="Desktop product columns" value={theme.layout?.productColumnsDesktop || 3} onChange={e => setThemeGroup('layout', 'productColumnsDesktop', Number(e.target.value))}>
                            <option value={2}>2 columns</option><option value={3}>3 columns</option><option value={4}>4 columns</option><option value={5}>5 columns</option>
                        </BuilderSelect>
                        <BuilderSelect label="Mobile product columns" value={theme.layout?.productColumnsMobile || 2} onChange={e => setThemeGroup('layout', 'productColumnsMobile', Number(e.target.value))}>
                            <option value={1}>1 column</option><option value={2}>2 columns</option>
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
                        <BuilderSelect label="Image fit" value={theme.productCard?.imageFit || 'Contain'} onChange={e => setThemeGroup('productCard', 'imageFit', e.target.value)}>
                            <option>Contain</option><option>Cover</option>
                        </BuilderSelect>
                        <BuilderSelect label="Corners" value={theme.productCard?.borderRadius || 'Rounded'} onChange={e => setThemeGroup('productCard', 'borderRadius', e.target.value)}>
                            <option>Soft</option><option>Rounded</option><option>Square</option>
                        </BuilderSelect>
                        <BuilderSelect label="Shadow" value={theme.productCard?.shadow || 'Soft'} onChange={e => setThemeGroup('productCard', 'shadow', e.target.value)}>
                            <option>None</option><option>Soft</option><option>Elevated</option>
                        </BuilderSelect>
                        <BuilderToggle label="Show category" help="Shows the product category above the product name." checked={theme.productCard?.showCategory !== false} onChange={() => toggleThemeGroup('productCard', 'showCategory')} />
                        <BuilderToggle label="Show rating" help="Shows star rating when a product has reviews." checked={theme.productCard?.showRating !== false} onChange={() => toggleThemeGroup('productCard', 'showRating')} />
                        <BuilderToggle label="Show quick buy" help="Adds add-to-cart and buy-now buttons in product cards." checked={theme.productCard?.showQuickBuy !== false} onChange={() => toggleThemeGroup('productCard', 'showQuickBuy')} />
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
                        {(theme.homepageSections || []).map((section, index) => (
                            <div key={section._id || index} className="rounded-lg border border-slate-200 p-3">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{section.title || section.type}</p>
                                        <p className="text-xs text-slate-500">{section.type}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button type="button" onClick={() => moveHomepageSection(index, -1)} disabled={index === 0} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30" title="Move section up">
                                            <ChevronUp size={16} />
                                        </button>
                                        <button type="button" onClick={() => moveHomepageSection(index, 1)} disabled={index === (theme.homepageSections || []).length - 1} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30" title="Move section down">
                                            <ChevronDown size={16} />
                                        </button>
                                        <button type="button" onClick={() => duplicateHomepageSection(index)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" title="Duplicate section">
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <BuilderSelect label="Section type" value={section.type || 'FeaturedProducts'} onChange={e => updateHomepageSection(index, 'type', e.target.value)}>
                                        <option>Hero</option><option>FeaturedProducts</option><option>Collection</option><option>TextBlock</option><option>BannerGrid</option><option>CategoryList</option>
                                    </BuilderSelect>
                                    <BuilderInput label="Section title" value={section.title || ''} onChange={e => updateHomepageSection(index, 'title', e.target.value)} />
                                </div>
                                <div className="mt-3">
                                    <BuilderToggle label="Visible on storefront" checked={section.isEnabled !== false} onChange={() => updateHomepageSection(index, 'isEnabled', section.isEnabled === false)} />
                                </div>
                            </div>
                        ))}
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
                                    Unsaved changes
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">Customize your storefront without code. Preview changes, then save when ready.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <DeviceSwitcher value={device} onChange={setDevice} />
                        <BuilderButton type="button" variant="secondary" onClick={resetStyling} disabled={saving}>
                            <RotateCcw size={16} />
                            Reset styling
                        </BuilderButton>
                        <BuilderButton type="button" onClick={handleSave} disabled={saving || validation.length > 0}>
                            <Save size={16} />
                            {saving ? 'Saving...' : 'Save changes'}
                        </BuilderButton>
                    </div>
                </div>
            </div>

            <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 p-4 xl:grid-cols-[360px_minmax(0,1fr)]">
                <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
                    <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                        <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">Settings</p>
                        <div className="space-y-1">
                            {settingsGroups.map(group => {
                                const Icon = group.icon;
                                const active = activeGroup === group.id;
                                return (
                                    <button
                                        key={group.id}
                                        type="button"
                                        onClick={() => setActiveGroup(group.id)}
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
                    {validation.length > 0 && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            <p className="font-bold">Fix before saving</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5">
                                {validation.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}
                            </ul>
                        </div>
                    )}
                </aside>

                <main className="grid grid-cols-1 gap-4 2xl:grid-cols-[420px_minmax(0,1fr)]">
                    <div className="order-2 2xl:order-1">
                        {renderPanel()}
                    </div>
                    <section className="order-1 rounded-lg border border-slate-200 bg-white p-4 shadow-sm 2xl:order-2">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-base font-bold text-slate-950">Live preview</h2>
                                <p className="mt-1 text-sm text-slate-500">The highlighted area shows what you are editing now.</p>
                            </div>
                            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-600">
                                {device}
                            </div>
                        </div>
                        <StorefrontPreview
                            theme={theme}
                            storewideDiscount={Number(storewideDiscount) || 0}
                            shopName={shopName}
                            activeGroup={activeGroup}
                            device={device}
                        />
                    </section>
                </main>
            </div>
        </div>
    );
};

export default StoreBuilder;
