import { useEffect, useState } from 'react';
import { Save, Palette, Globe, Link as LinkIcon, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../api/api';

const defaultTheme = {
    logoUrl: '',
    faviconUrl: '',
    fontFamily: 'Inter',
    productGridStyle: 'Comfortable',
    colors: {
        accent: '#4f46e5',
        background: '#ffffff',
        foreground: '#111827',
        headerBackground: '#ffffff'
    },
    navigation: [
        { label: 'Shop', url: '/', isExternal: false, sortOrder: 0 },
        { label: 'Track Order', url: '/track', isExternal: false, sortOrder: 1 }
    ],
    footer: { text: '', links: [] },
    policies: { refund: '', shipping: '', privacy: '', terms: '' },
    homepageSections: []
};

const StoreBuilder = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [theme, setTheme] = useState(defaultTheme);
    const [customDomain, setCustomDomain] = useState({ domain: '' });
    const [storewideDiscount, setStorewideDiscount] = useState(0);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await API.get('/store-builder/admin');
                const shop = data.data || {};
                setTheme({ ...defaultTheme, ...(shop.theme || {}) });
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

    const handleSave = async () => {
        setSaving(true);
        try {
            await API.patch('/store-builder/admin', {
                theme,
                customDomain,
                storewideDiscount
            });
            toast.success('Store builder saved');
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
                    <p className="text-sm text-slate-500 mt-1">Customize storefront identity, navigation, policies, and domain.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <section className="xl:col-span-2 bg-white border border-slate-200 rounded-lg p-5 space-y-5">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <Palette size={18} />
                        Brand and Theme
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="space-y-1 text-sm">
                            <span className="font-medium text-slate-700">Logo URL</span>
                            <input
                                value={theme.logoUrl || ''}
                                onChange={e => setTheme(prev => ({ ...prev, logoUrl: e.target.value }))}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                placeholder="https://..."
                            />
                        </label>
                        <label className="space-y-1 text-sm">
                            <span className="font-medium text-slate-700">Font Family</span>
                            <select
                                value={theme.fontFamily || 'Inter'}
                                onChange={e => setTheme(prev => ({ ...prev, fontFamily: e.target.value }))}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2"
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
                </section>

                <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <Globe size={18} />
                        Domain
                    </div>
                    <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Custom Domain</span>
                        <input
                            value={customDomain.domain || ''}
                            onChange={e => setCustomDomain(prev => ({ ...prev, domain: e.target.value }))}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2"
                            placeholder="www.example.com"
                        />
                    </label>
                    <p className="text-xs text-slate-500">Status: {customDomain.status || 'NotConfigured'}</p>
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
                    {(theme.navigation || []).map((item, index) => (
                        <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                value={item.label || ''}
                                onChange={e => updateNavigation(index, 'label', e.target.value)}
                                className="rounded-lg border border-slate-200 px-3 py-2"
                                placeholder="Label"
                            />
                            <input
                                value={item.url || ''}
                                onChange={e => updateNavigation(index, 'url', e.target.value)}
                                className="rounded-lg border border-slate-200 px-3 py-2"
                                placeholder="/products"
                            />
                        </div>
                    ))}
                </section>

                <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <FileText size={18} />
                        Policies
                    </div>
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
