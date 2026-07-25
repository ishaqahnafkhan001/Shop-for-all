import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Image, Palette, Save, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import API from '../../../api/api';
import { useAuth } from '../../../context/AuthContext';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { AdminErrorState, AdminLoadingState } from '../../../components/ui/AdminState.jsx';

const EMPTY_SETTINGS = {
    shopName: '',
    subdomain: '',
    platformStoreUrl: '',
    logoUrl: '',
    faviconUrl: '',
    contact: { label: 'Contact store', email: '' },
    socialLinks: {
        facebookUrl: '',
        instagramUrl: '',
        twitterUrl: '',
        youtubeUrl: '',
        tiktokUrl: ''
    },
    policies: { refund: '', shipping: '', privacy: '', terms: '' },
    paymentSettings: {
        additionalMethodsEnabled: false,
        providers: { bkash: false, nagad: false, rocket: false }
    }
};

const ShopSettings = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState(EMPTY_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState('');
    const [error, setError] = useState('');
    const logoInputRef = useRef(null);
    const iconInputRef = useRef(null);
    const isBeginner = user?.planAccess?.planKey === 'beginner';

    const loadSettings = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await API.get('/admin/basic-store-settings');
            setSettings({ ...EMPTY_SETTINGS, ...(response.data?.data || {}) });
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Store settings could not load.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const updateField = (path, value) => {
        setSettings(previous => {
            const next = structuredClone(previous);
            const parts = path.split('.');
            let cursor = next;
            parts.slice(0, -1).forEach(part => {
                cursor[part] = cursor[part] || {};
                cursor = cursor[part];
            });
            cursor[parts.at(-1)] = value;
            return next;
        });
    };

    const saveSettings = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const response = await API.patch('/admin/basic-store-settings', settings);
            setSettings({ ...EMPTY_SETTINGS, ...(response.data?.data || settings) });
            toast.success('Store settings saved');
        } catch (requestError) {
            toast.error(requestError.response?.data?.error || 'Store settings could not be saved.');
        } finally {
            setSaving(false);
        }
    };

    const uploadBrandAsset = async (file, target) => {
        if (!file) return;
        const formData = new FormData();
        formData.append('asset', file);
        formData.append('target', target);
        setUploading(target);
        try {
            const response = await API.post('/admin/basic-store-settings/brand-asset', formData);
            setSettings({ ...EMPTY_SETTINGS, ...(response.data?.data || settings) });
            toast.success(target === 'favicon' ? 'Browser icon updated' : 'Store logo updated');
        } catch (requestError) {
            toast.error(requestError.response?.data?.error || 'This image could not be uploaded.');
        } finally {
            setUploading('');
        }
    };

    if (loading) {
        return <AdminLoadingState title="Loading store settings" description="Preparing your essential store information." />;
    }

    if (error) {
        return (
            <AdminErrorState
                title="Store settings could not load"
                description={error}
                action={<Button onClick={loadSettings}>Retry</Button>}
            />
        );
    }

    return (
        <form onSubmit={saveSettings} className="mx-auto max-w-5xl space-y-6 pb-12">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-950">Store Settings</h1>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                        Manage the store identity, contact details, policies, and payment choices customers rely on.
                    </p>
                </div>
                <Button type="submit" isLoading={saving} className="w-full sm:w-auto">
                    <Save size={17} /> Save settings
                </Button>
            </header>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold text-slate-900">Store identity</h2>
                <p className="mt-1 text-sm text-slate-500">Your logo and browser icon remain separate.</p>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <Input
                        id="shopName"
                        label="Store name"
                        value={settings.shopName}
                        onChange={event => updateField('shopName', event.target.value)}
                        required
                    />
                    <Input id="subdomain" label="Scaleup subdomain" value={settings.subdomain} readOnly />
                </div>
                {settings.platformStoreUrl && (
                    <a
                        href={settings.platformStoreUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:underline"
                    >
                        Open live store <ExternalLink size={15} />
                    </a>
                )}

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {[
                        { key: 'logo', label: 'Storefront logo', url: settings.logoUrl, ref: logoInputRef },
                        { key: 'favicon', label: 'Browser tab icon', url: settings.faviconUrl, ref: iconInputRef }
                    ].map(item => (
                        <div key={item.key} className="rounded-xl border border-slate-200 p-4">
                            <p className="text-sm font-bold text-slate-900">{item.label}</p>
                            <div className="mt-3 flex items-center gap-4">
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                                    {item.url ? (
                                        <img src={item.url} alt="" className="h-full w-full object-contain" />
                                    ) : (
                                        <Image size={22} className="text-slate-400" />
                                    )}
                                </div>
                                <div>
                                    <input
                                        ref={item.ref}
                                        type="file"
                                        accept={item.key === 'favicon' ? '.svg,.png,.webp,.jpg,.jpeg,.ico' : '.svg,.png,.webp,.jpg,.jpeg'}
                                        className="hidden"
                                        onChange={event => uploadBrandAsset(event.target.files?.[0], item.key)}
                                    />
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        isLoading={uploading === item.key}
                                        onClick={() => item.ref.current?.click()}
                                    >
                                        <Upload size={16} /> Upload
                                    </Button>
                                    <p className="mt-2 text-xs leading-5 text-slate-500">
                                        {item.key === 'favicon' ? 'Square SVG, PNG, WebP, JPG, or ICO.' : 'SVG, PNG, WebP, or JPG.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold text-slate-900">Contact and social links</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Input id="contactLabel" label="Contact label" value={settings.contact?.label || ''} onChange={event => updateField('contact.label', event.target.value)} />
                    <Input id="contactEmail" type="email" label="Contact email" value={settings.contact?.email || ''} onChange={event => updateField('contact.email', event.target.value)} />
                    {Object.entries({
                        facebookUrl: 'Facebook URL',
                        instagramUrl: 'Instagram URL',
                        youtubeUrl: 'YouTube URL',
                        tiktokUrl: 'TikTok URL'
                    }).map(([key, label]) => (
                        <Input
                            key={key}
                            id={key}
                            type="url"
                            label={label}
                            value={settings.socialLinks?.[key] || ''}
                            onChange={event => updateField(`socialLinks.${key}`, event.target.value)}
                            placeholder="https://"
                        />
                    ))}
                </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold text-slate-900">Store policies</h2>
                <p className="mt-1 text-sm text-slate-500">Plain text is shown on the public policy pages.</p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {Object.entries({
                        refund: 'Refund policy',
                        shipping: 'Shipping policy',
                        privacy: 'Privacy policy',
                        terms: 'Terms and conditions'
                    }).map(([key, label]) => (
                        <label key={key} className="space-y-1.5">
                            <span className="admin-label">{label}</span>
                            <textarea
                                value={settings.policies?.[key] || ''}
                                onChange={event => updateField(`policies.${key}`, event.target.value)}
                                rows={6}
                                className="admin-input min-h-36 resize-y"
                            />
                        </label>
                    ))}
                </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold text-slate-900">Payment information</h2>
                <label className="mt-4 flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 px-4">
                    <input
                        type="checkbox"
                        checked={Boolean(settings.paymentSettings?.additionalMethodsEnabled)}
                        onChange={event => updateField('paymentSettings.additionalMethodsEnabled', event.target.checked)}
                    />
                    <span className="text-sm font-semibold text-slate-700">Show configured mobile payment choices</span>
                </label>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {['bkash', 'nagad', 'rocket'].map(provider => (
                        <label key={provider} className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 px-4">
                            <input
                                type="checkbox"
                                checked={Boolean(settings.paymentSettings?.providers?.[provider])}
                                onChange={event => updateField(`paymentSettings.providers.${provider}`, event.target.checked)}
                            />
                            <span className="text-sm font-bold capitalize text-slate-700">{provider}</span>
                        </label>
                    ))}
                </div>
            </section>

            {isBeginner && (
                <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-indigo-700">
                                <Palette size={18} />
                                <h2 className="font-bold">Beginner storefront</h2>
                            </div>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-900/75">
                                Your fixed layout is responsive and ready to sell. Eligible higher plans can add custom sections, colors, fonts, navigation, SEO controls, and custom domains.
                            </p>
                        </div>
                        <Link
                            to="/dashboard/billing"
                            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-800"
                        >
                            Compare eligible plans
                        </Link>
                    </div>
                </section>
            )}

            <div className="sticky bottom-3 flex justify-end rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
                <Button type="submit" isLoading={saving}>
                    <Save size={17} /> Save settings
                </Button>
            </div>
        </form>
    );
};

export default ShopSettings;
