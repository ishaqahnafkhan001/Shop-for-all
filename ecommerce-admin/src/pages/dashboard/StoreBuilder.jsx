import { useEffect, useState } from 'react';
import { Save, Palette, Globe, Link as LinkIcon, FileText, LayoutTemplate, ShoppingBag, Smartphone, CreditCard, Star, ShieldCheck, Upload, RotateCcw } from 'lucide-react';
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

const sampleProducts = [
    { title: 'Signature Product', category: 'Featured', price: 1490 },
    { title: 'Customer Favorite', category: 'Best Seller', price: 2190 },
    { title: 'New Arrival', category: 'Latest', price: 990 }
];

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
    Compact: 'min-h-44',
    Medium: 'min-h-56',
    Tall: 'min-h-72'
};

const sectionSpacingClass = {
    Compact: 'space-y-4',
    Comfortable: 'space-y-6',
    Spacious: 'space-y-8'
};

const maxWidthClass = {
    Contained: 'max-w-3xl',
    Wide: 'max-w-5xl',
    Full: 'max-w-none'
};

const StorefrontPreview = ({ theme, storewideDiscount, shopName }) => {
    const colors = theme.colors || defaultTheme.colors;
    const typography = theme.typography || defaultTheme.typography;
    const hero = theme.hero || defaultTheme.hero;
    const layout = theme.layout || defaultTheme.layout;
    const productCard = theme.productCard || defaultTheme.productCard;
    const checkoutBranding = theme.checkoutBranding || defaultTheme.checkoutBranding;
    const navItems = (theme.navigation || []).filter(item => item.label).slice(0, 4);
    const enabledSections = (theme.homepageSections || []).filter(section => section.isEnabled !== false).slice(0, 4);
    const radius = productRadiusClass[productCard.borderRadius] || productRadiusClass.Rounded;
    const shadow = productShadowClass[productCard.shadow] || productShadowClass.Soft;
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

    return (
        <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <LayoutTemplate size={18} />
                        Live Storefront Preview
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Preview updates instantly from the current editor values, before saving.</p>
                </div>
                <div className="text-xs font-semibold text-slate-500 rounded-full border border-slate-200 px-3 py-1">
                    Desktop + mobile snapshot
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
                    <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-300"></span>
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300"></span>
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300"></span>
                        <span className="ml-2 truncate text-xs text-slate-500">store-preview</span>
                    </div>
                    <div style={previewStyle} className="p-4">
                        <div className={`mx-auto ${maxWidthClass[layout.maxWidth] || maxWidthClass.Wide} ${sectionSpacingClass[layout.sectionSpacing] || sectionSpacingClass.Comfortable}`}>
                            <header style={{ backgroundColor: colors.headerBackground }} className="flex items-center justify-between rounded-lg px-4 py-3 border border-black/5">
                                <div className="flex items-center gap-2 min-w-0">
                                    {theme.logoUrl ? (
                                        <div className="h-8 w-8 rounded bg-center bg-cover border border-black/10" style={{ backgroundImage: `url(${theme.logoUrl})` }} />
                                    ) : (
                                        <div className="h-8 w-8 rounded flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: colors.accent }}>S</div>
                                    )}
                                    <span className="truncate text-sm font-bold">{shopName || 'Your Store'}</span>
                                </div>
                                <nav className="hidden sm:flex items-center gap-4 text-xs font-semibold">
                                    {(navItems.length ? navItems : defaultTheme.navigation).map((item, index) => (
                                        <span key={`${item.label}-${index}`}>{item.label}</span>
                                    ))}
                                </nav>
                            </header>

                            <section style={heroStyle} className={`${heroHeightClass[hero.height] || heroHeightClass.Medium} rounded-xl p-6 flex items-center`}>
                                <div className="max-w-xl">
                                    <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: hero.imageUrl ? '#ffffff' : colors.accent }}>
                                        {storewideDiscount > 0 ? `${storewideDiscount}% storewide offer` : 'Featured collection'}
                                    </p>
                                    <h2 className="text-3xl font-black leading-tight" style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight }}>
                                        {hero.title || 'Build a storefront customers trust'}
                                    </h2>
                                    <p className="mt-3 text-sm opacity-80">{hero.subtitle || 'Your homepage hero, colors, font, product cards, and navigation preview here.'}</p>
                                    <button className="mt-5 rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ backgroundColor: colors.accent }}>
                                        {hero.ctaLabel || 'Shop Now'}
                                    </button>
                                </div>
                            </section>

                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-black" style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight }}>
                                        Latest products
                                    </h3>
                                    {productCard.showQuickBuy && <span className="text-xs font-bold" style={{ color: colors.accent }}>Quick buy enabled</span>}
                                </div>
                                <div className={`grid gap-4 ${layout.productColumnsDesktop >= 4 ? 'grid-cols-4' : layout.productColumnsDesktop === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                    {sampleProducts.map((product) => (
                                        <article key={product.title} className={`bg-white border border-black/5 p-3 ${radius} ${shadow}`}>
                                            <div className={`aspect-square ${radius} ${productCard.imageFit === 'Cover' ? '' : 'p-6'} flex items-center justify-center`} style={{ backgroundColor: colors.accentBg }}>
                                                <ShoppingBag size={36} style={{ color: colors.accent }} />
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

                            {enabledSections.length > 0 && (
                                <section className="rounded-xl border border-black/5 p-4">
                                    <h3 className="text-sm font-black mb-3">Homepage sections</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {enabledSections.map((section, index) => (
                                            <div key={`${section.type}-${index}`} className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ backgroundColor: colors.accentBg }}>
                                                {section.title || section.type}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            <footer className="rounded-lg border border-black/5 p-4 text-xs opacity-70">
                                {theme.footer?.text || 'Footer text and policy links will appear here.'}
                            </footer>
                        </div>
                    </div>
                </div>

                <div className="rounded-[2rem] border-8 border-slate-900 bg-slate-900 overflow-hidden max-w-[320px] mx-auto w-full">
                    <div style={previewStyle} className="min-h-[560px] p-3">
                        <header className="flex items-center justify-between rounded-xl px-3 py-2 border border-black/5" style={{ backgroundColor: colors.headerBackground }}>
                            <span className="text-sm font-black truncate">{shopName || 'Your Store'}</span>
                            <ShoppingBag size={18} style={{ color: colors.accent }} />
                        </header>
                        <section style={heroStyle} className="mt-3 rounded-2xl min-h-44 p-4 flex items-end">
                            <div>
                                <h3 className="text-xl font-black leading-tight" style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight }}>
                                    {hero.title || 'Mobile preview'}
                                </h3>
                                <button className="mt-3 rounded-lg px-3 py-2 text-xs font-bold text-white" style={{ backgroundColor: colors.accent }}>
                                    {hero.ctaLabel || 'Shop Now'}
                                </button>
                            </div>
                        </section>
                        <div className={`mt-3 grid gap-3 ${layout.productColumnsMobile === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {sampleProducts.slice(0, 2).map(product => (
                                <article key={product.title} className={`bg-white border border-black/5 p-2 ${radius} ${shadow}`}>
                                    <div className={`${radius} aspect-square flex items-center justify-center`} style={{ backgroundColor: colors.accentBg }}>
                                        <ShoppingBag size={24} style={{ color: colors.accent }} />
                                    </div>
                                    <h4 className="mt-2 text-xs font-bold line-clamp-1">{product.title}</h4>
                                    <p className="text-xs font-black">৳ {product.price}</p>
                                </article>
                            ))}
                        </div>
                        <div className="mt-3 rounded-2xl border border-black/5 p-3 text-xs">
                            <div className="flex items-center gap-2 font-bold">
                                <ShieldCheck size={14} style={{ color: colors.accent }} />
                                {checkoutBranding.trustMessage || 'Secure checkout'}
                            </div>
                            {checkoutBranding.bannerText && <p className="mt-2 opacity-70">{checkoutBranding.bannerText}</p>}
                        </div>
                        {theme.mobile?.showBottomNavigation && (
                            <div className="mt-3 rounded-2xl px-3 py-2 flex justify-around text-[10px] font-bold" style={{ backgroundColor: colors.accentBg }}>
                                <span>Shop</span>
                                <span>Cart</span>
                                <span>Track</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
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
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" style={{ color: colors.foreground }}>
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
                    {visiblePolicies.length > 0 && (
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                            <p className="mb-2 font-bold text-slate-900">Store Policies</p>
                            <div className="space-y-1">
                                {visiblePolicies.map(([key, label]) => (
                                    <div key={key} className="rounded bg-white px-3 py-2 font-semibold text-slate-600">
                                        {label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
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

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await API.get('/store-builder/admin');
                const shop = data.data || {};
                setShopName(shop.shopName || '');
                setTheme(mergeTheme(defaultTheme, shop.theme || {}));
                setCustomDomain(shop.customDomain || { domain: '' });
                setStorewideDiscount(shop.storewideDiscount || 0);
            } catch {
                toast.error('Failed to load store builder');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

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

    const addHomepageSection = () => {
        setTheme(prev => ({
            ...prev,
            homepageSections: [
                ...(prev.homepageSections || []),
                {
                    type: 'FeaturedProducts',
                    title: 'Featured products',
                    isEnabled: true,
                    sortOrder: prev.homepageSections?.length || 0,
                    settings: {}
                }
            ]
        }));
    };

    const updateNavigation = (index, field, value) => {
        setTheme(prev => ({
            ...prev,
            navigation: prev.navigation.map((item, i) => (
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
        setSaving(true);
        try {
            await API.patch('/store-builder/admin', {
                theme,
                customDomain,
                storewideDiscount
            });
            toast.success('Store design saved. Refresh your storefront to see the latest changes.');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save store builder');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-sm text-slate-500">Loading store builder...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Store Builder</h1>
                    <p className="text-sm text-slate-500 mt-1">Control your storefront look without code. Save changes when you are ready to publish them.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={resetStyling}
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                        <RotateCcw size={18} />
                        Reset styling
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save changes'}
                    </button>
                </div>
            </div>

            <StorefrontPreview
                theme={theme}
                storewideDiscount={storewideDiscount}
                shopName={shopName}
            />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <section className="xl:col-span-2 bg-white border border-slate-200 rounded-lg p-5 space-y-5">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <Palette size={18} />
                        Brand and Theme
                    </div>
                    <p className="text-xs text-slate-500">Logo, colors, fonts, and discount settings apply across header, product grids, buttons, and checkout.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="space-y-1 text-sm">
                            <span className="font-medium text-slate-700">Logo URL</span>
                            <input
                                value={theme.logoUrl || ''}
                                onChange={e => setTheme(prev => ({ ...prev, logoUrl: e.target.value }))}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                placeholder="https://..."
                                title="Public image URL for your store logo"
                            />
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                                <Upload size={14} />
                                {uploadingLogo ? 'Uploading...' : 'Upload logo'}
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    disabled={uploadingLogo}
                                    onChange={event => handleLogoUpload(event, 'storefront')}
                                />
                            </label>
                        </label>
                        <label className="space-y-1 text-sm">
                            <span className="font-medium text-slate-700">Font Family</span>
                            <select
                                value={theme.fontFamily || 'Inter'}
                                onChange={e => setTheme(prev => ({ ...prev, fontFamily: e.target.value }))}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                title="Applies the main storefront font"
                            >
                                <option>Inter</option>
                                <option>Arial</option>
                                <option>Georgia</option>
                                <option>Roboto</option>
                            </select>
                        </label>
                        <label className="space-y-1 text-sm">
                            <span className="font-medium text-slate-700">Product Grid Style</span>
                            <select
                                value={theme.productGridStyle || 'Comfortable'}
                                onChange={e => setTheme(prev => ({ ...prev, productGridStyle: e.target.value }))}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                title="Changes product grid spacing and presentation"
                            >
                                <option>Comfortable</option>
                                <option>Compact</option>
                                <option>Editorial</option>
                            </select>
                        </label>
                        <label className="space-y-1 text-sm">
                            <span className="font-medium text-slate-700">Storewide Discount</span>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={storewideDiscount}
                                onChange={e => setStorewideDiscount(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                title="Simple storewide percentage discount shown on products"
                            />
                        </label>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {['accent', 'background', 'foreground', 'headerBackground'].map(key => (
                            <label key={key} className="space-y-1 text-sm">
                                <span className="font-medium text-slate-700 capitalize">{key}</span>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={theme.colors?.[key] || '#ffffff'}
                                        onChange={e => setColor(key, e.target.value)}
                                        className="h-10 w-12 rounded border border-slate-200"
                                    />
                                    <input
                                        value={theme.colors?.[key] || ''}
                                        onChange={e => setColor(key, e.target.value)}
                                        className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-2"
                                    />
                                </div>
                            </label>
                        ))}
                    </div>

                    <div className="border-t border-slate-100 pt-5 space-y-4">
                        <div className="flex items-center gap-2 font-semibold text-slate-900">
                            <LayoutTemplate size={18} />
                            Typography and Layout
                        </div>
                        <p className="text-xs text-slate-500">Use layout settings to make the storefront feel compact, spacious, or wider on desktop.</p>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <label className="space-y-1 text-sm">
                                <span className="font-medium text-slate-700">Heading Font</span>
                                <select value={theme.typography?.headingFont || 'Inter'} onChange={e => setThemeGroup('typography', 'headingFont', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2">
                                    <option>Inter</option>
                                    <option>Arial</option>
                                    <option>Georgia</option>
                                    <option>Roboto</option>
                                </select>
                            </label>
                            <label className="space-y-1 text-sm">
                                <span className="font-medium text-slate-700">Body Font</span>
                                <select value={theme.typography?.bodyFont || 'Inter'} onChange={e => setThemeGroup('typography', 'bodyFont', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2">
                                    <option>Inter</option>
                                    <option>Arial</option>
                                    <option>Georgia</option>
                                    <option>Roboto</option>
                                </select>
                            </label>
                            <label className="space-y-1 text-sm">
                                <span className="font-medium text-slate-700">Max Width</span>
                                <select value={theme.layout?.maxWidth || 'Wide'} onChange={e => setThemeGroup('layout', 'maxWidth', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2">
                                    <option>Contained</option>
                                    <option>Wide</option>
                                    <option>Full</option>
                                </select>
                            </label>
                            <label className="space-y-1 text-sm">
                                <span className="font-medium text-slate-700">Spacing</span>
                                <select value={theme.layout?.sectionSpacing || 'Comfortable'} onChange={e => setThemeGroup('layout', 'sectionSpacing', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2">
                                    <option>Compact</option>
                                    <option>Comfortable</option>
                                    <option>Spacious</option>
                                </select>
                            </label>
                        </div>
                    </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <Globe size={18} />
                        Domain
                    </div>
                    <p className="text-xs text-slate-500">Use this after your domain DNS points to the platform.</p>
                    <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Custom Domain</span>
                        <input
                            value={customDomain.domain || ''}
                            onChange={e => setCustomDomain(prev => ({ ...prev, domain: e.target.value }))}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2"
                            placeholder="www.example.com"
                            title="Custom domain shoppers can use instead of the default subdomain"
                        />
                    </label>
                    <p className="text-xs text-slate-500">Status: {customDomain.status || 'NotConfigured'}</p>
                </section>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <section className="xl:col-span-2 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <LayoutTemplate size={18} />
                        Hero Banner
                    </div>
                    <p className="text-xs text-slate-500">This is the first section shoppers see. Use one clear offer and one button.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input value={theme.hero?.title || ''} onChange={e => setThemeGroup('hero', 'title', e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Hero title" title="Main headline on the homepage hero" />
                        <input value={theme.hero?.subtitle || ''} onChange={e => setThemeGroup('hero', 'subtitle', e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Hero subtitle" title="Short supporting message below the headline" />
                        <input value={theme.hero?.imageUrl || ''} onChange={e => setThemeGroup('hero', 'imageUrl', e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Hero image URL" title="Wide image URL for the homepage hero background" />
                        <input value={theme.hero?.ctaUrl || '/'} onChange={e => setThemeGroup('hero', 'ctaUrl', e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2" placeholder="CTA URL" title="Where the hero button sends shoppers" />
                        <input value={theme.hero?.ctaLabel || 'Shop Now'} onChange={e => setThemeGroup('hero', 'ctaLabel', e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2" placeholder="CTA label" title="Text shown inside the hero button" />
                        <select value={theme.hero?.height || 'Medium'} onChange={e => setThemeGroup('hero', 'height', e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2">
                            <option>Compact</option>
                            <option>Medium</option>
                            <option>Tall</option>
                        </select>
                    </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <ShoppingBag size={18} />
                        Product Cards
                    </div>
                    <p className="text-xs text-slate-500">Choose how products appear in grids across desktop and mobile.</p>
                    <select value={theme.productCard?.imageFit || 'Contain'} onChange={e => setThemeGroup('productCard', 'imageFit', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2">
                        <option>Contain</option>
                        <option>Cover</option>
                    </select>
                    <select value={theme.productCard?.borderRadius || 'Rounded'} onChange={e => setThemeGroup('productCard', 'borderRadius', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2">
                        <option>Soft</option>
                        <option>Rounded</option>
                        <option>Square</option>
                    </select>
                    <select value={theme.productCard?.shadow || 'Soft'} onChange={e => setThemeGroup('productCard', 'shadow', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2">
                        <option>None</option>
                        <option>Soft</option>
                        <option>Elevated</option>
                    </select>
                    {['showCategory', 'showRating', 'showQuickBuy'].map(key => (
                        <label key={key} className="flex items-center justify-between text-sm text-slate-700">
                            <span>{key}</span>
                            <input type="checkbox" checked={theme.productCard?.[key] !== false} onChange={() => toggleThemeGroup('productCard', key)} />
                        </label>
                    ))}
                </section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-semibold text-slate-900">
                            <LayoutTemplate size={18} />
                            Homepage Sections
                        </div>
                        <button onClick={addHomepageSection} className="text-sm font-semibold text-indigo-600">Add section</button>
                    </div>
                    <p className="text-xs text-slate-500">Disable a section to hide it without deleting its settings.</p>
                    {(theme.homepageSections || []).length === 0 && (
                        <div className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">No custom homepage sections yet. Add a section for featured products, collections, or banners.</div>
                    )}
                    {(theme.homepageSections || []).map((section, index) => (
                        <div key={section._id || index} className="grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-lg border border-slate-100 p-3">
                            <select value={section.type || 'FeaturedProducts'} onChange={e => updateHomepageSection(index, 'type', e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2">
                                <option>Hero</option>
                                <option>FeaturedProducts</option>
                                <option>Collection</option>
                                <option>TextBlock</option>
                                <option>BannerGrid</option>
                                <option>CategoryList</option>
                            </select>
                            <input value={section.title || ''} onChange={e => updateHomepageSection(index, 'title', e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 sm:col-span-2" placeholder="Section title" />
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                                <input type="checkbox" checked={section.isEnabled !== false} onChange={() => updateHomepageSection(index, 'isEnabled', section.isEnabled === false)} />
                                Enabled
                            </label>
                        </div>
                    ))}
                </section>

                <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <CreditCard size={18} />
                        Checkout Branding
                    </div>
                    <p className="text-xs text-slate-500">These messages help shoppers feel safe before placing an order.</p>
                    <div className="space-y-2">
                        <input value={theme.checkoutBranding?.logoUrl || ''} onChange={e => setThemeGroup('checkoutBranding', 'logoUrl', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Checkout logo URL" />
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                            <Upload size={14} />
                            {uploadingLogo ? 'Uploading...' : 'Upload checkout logo'}
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                disabled={uploadingLogo}
                                onChange={event => handleLogoUpload(event, 'checkout')}
                            />
                        </label>
                    </div>
                    <input value={theme.checkoutBranding?.bannerText || ''} onChange={e => setThemeGroup('checkoutBranding', 'bannerText', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Checkout banner text" />
                    <input value={theme.checkoutBranding?.trustMessage || ''} onChange={e => setThemeGroup('checkoutBranding', 'trustMessage', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Trust message" />
                    <select value={theme.checkoutBranding?.buttonStyle || 'Rounded'} onChange={e => setThemeGroup('checkoutBranding', 'buttonStyle', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2">
                        <option>Solid</option>
                        <option>Rounded</option>
                        <option>Pill</option>
                    </select>

                    <CheckoutBrandingPreview theme={theme} shopName={shopName} />

                    <div className="flex items-center gap-2 font-semibold text-slate-900 pt-3 border-t border-slate-100">
                        <Smartphone size={18} />
                        Mobile
                    </div>
                    <p className="text-xs text-slate-500">Mobile settings affect small screens where most shoppers browse and checkout.</p>
                    {['stickyCheckoutButton', 'compactHeader', 'showBottomNavigation'].map(key => (
                        <label key={key} className="flex items-center justify-between text-sm text-slate-700">
                            <span>{key}</span>
                            <input type="checkbox" checked={Boolean(theme.mobile?.[key])} onChange={() => toggleThemeGroup('mobile', key)} />
                        </label>
                    ))}
                </section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-semibold text-slate-900">
                            <LinkIcon size={18} />
                            Navigation
                        </div>
                        <button onClick={addNavigation} className="text-sm font-semibold text-indigo-600">Add link</button>
                    </div>
                    <p className="text-xs text-slate-500">Keep navigation short. Link to your most important pages or collections.</p>
                    {(theme.navigation || []).map((item, index) => (
                        <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                value={item.label || ''}
                                onChange={e => updateNavigation(index, 'label', e.target.value)}
                                className="rounded-lg border border-slate-200 px-3 py-2"
                                placeholder="Label"
                                title="Menu text shoppers will see"
                            />
                            <input
                                value={item.url || ''}
                                onChange={e => updateNavigation(index, 'url', e.target.value)}
                                className="rounded-lg border border-slate-200 px-3 py-2"
                                placeholder="/products"
                                title="Internal path or full external URL"
                            />
                        </div>
                    ))}
                </section>

                <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <FileText size={18} />
                        Policies
                    </div>
                    <p className="text-xs text-slate-500">Clear policies reduce support questions and help shoppers trust checkout.</p>
                    {['refund', 'shipping', 'privacy', 'terms'].map(key => (
                        <label key={key} className="space-y-1 text-sm block">
                            <span className="font-medium text-slate-700 capitalize">{key}</span>
                            <textarea
                                value={theme.policies?.[key] || ''}
                                onChange={e => updatePolicy(key, e.target.value)}
                                rows={3}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                            />
                        </label>
                    ))}
                </section>
            </div>
        </div>
    );
};

export default StoreBuilder;
