import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ExternalLink,
    Image as ImageIcon,
    Monitor,
    Palette,
    RotateCcw,
    Save,
    Smartphone,
    Trash2,
    Upload
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import API from '../../../api/api';
import { useAuth } from '../../../context/AuthContext';
import AdminPageHeader from '../../../components/ui/AdminPageHeader';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { AdminErrorState, AdminLoadingState } from '../../../components/ui/AdminState.jsx';

const EMPTY_BRANDING = {
    logoUrl: '',
    faviconUrl: '',
    heroImageUrl: '',
    heroTitle: '',
    heroSubtitle: '',
    heroCta: {
        label: '',
        type: 'SHOP',
        targetId: null,
        url: null
    },
    heroHidden: false,
    source: 'default',
    version: 0,
    updatedAt: null
};

const EMPTY_DESTINATIONS = {
    products: [],
    categories: [],
    collections: []
};

const comparableBranding = value => JSON.stringify({
    logoUrl: value.logoUrl || '',
    faviconUrl: value.faviconUrl || '',
    heroImageUrl: value.heroImageUrl || '',
    heroTitle: value.heroTitle || '',
    heroSubtitle: value.heroSubtitle || '',
    heroCta: {
        label: value.heroCta?.label || '',
        type: value.heroCta?.type || 'NONE',
        targetId: value.heroCta?.targetId || null,
        url: value.heroCta?.url || null
    },
    heroHidden: Boolean(value.heroHidden)
});

const targetHelp = {
    logo: 'PNG, JPG, or WebP. At least 64 × 64 px, up to 2 MB.',
    favicon: 'Square PNG, WebP, or ICO. At least 16 × 16 px, up to 1 MB.',
    hero: 'PNG, JPG, or WebP. At least 640 × 320 px, up to 6 MB.'
};

const destinationLabels = {
    SHOP: 'Shop products',
    PRODUCT: 'A product',
    CATEGORY: 'A category',
    COLLECTION: 'A collection',
    CUSTOM_URL: 'Custom HTTPS link',
    NONE: 'No button'
};

const mergeUploadResult = (draft, next, target) => ({
    ...draft,
    version: next.version,
    updatedAt: next.updatedAt,
    source: next.source,
    ...(target === 'logo' ? { logoUrl: next.logoUrl } : {}),
    ...(target === 'favicon' ? { faviconUrl: next.faviconUrl } : {}),
    ...(target === 'hero' ? { heroImageUrl: next.heroImageUrl } : {})
});

const AssetEditor = ({
    target,
    title,
    description,
    imageUrl,
    uploading,
    progress,
    inputRef,
    onUpload,
    onRemove
}) => (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div>
            <h2 className="font-bold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className={`flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-50 ${target === 'hero' ? 'aspect-[16/7] w-full sm:w-56' : 'h-24 w-24 rounded-lg'}`}>
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={target === 'logo' ? 'Current storefront logo' : target === 'favicon' ? 'Current browser icon' : ''}
                        className={`h-full w-full ${target === 'hero' ? 'object-cover' : 'object-contain'}`}
                    />
                ) : (
                    <ImageIcon size={26} className="text-slate-300" aria-hidden="true" />
                )}
            </div>
            <div className="min-w-0 flex-1">
                <input
                    ref={inputRef}
                    type="file"
                    accept={target === 'favicon'
                        ? 'image/png,image/webp,image/x-icon,image/vnd.microsoft.icon,.ico'
                        : 'image/png,image/jpeg,image/webp'}
                    className="hidden"
                    onChange={event => {
                        onUpload(event.target.files?.[0], target);
                        event.target.value = '';
                    }}
                />
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        isLoading={uploading === target}
                        disabled={Boolean(uploading)}
                        onClick={() => inputRef.current?.click()}
                    >
                        <Upload size={16} /> {imageUrl ? 'Replace' : 'Upload'}
                    </Button>
                    {imageUrl && (
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={Boolean(uploading)}
                            onClick={() => onRemove(target)}
                        >
                            <Trash2 size={16} /> Remove
                        </Button>
                    )}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">{targetHelp[target]}</p>
                {uploading === target && (
                    <div className="mt-3" aria-live="polite">
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className="h-full rounded-full bg-indigo-600 transition-[width]"
                                style={{ width: `${Math.max(progress, 8)}%` }}
                            />
                        </div>
                        <p className="mt-1 text-xs font-semibold text-indigo-700">Uploading {progress}%</p>
                    </div>
                )}
            </div>
        </div>
    </section>
);

const StoreBranding = () => {
    const { user } = useAuth();
    const [saved, setSaved] = useState(EMPTY_BRANDING);
    const [draft, setDraft] = useState(EMPTY_BRANDING);
    const [destinations, setDestinations] = useState(EMPTY_DESTINATIONS);
    const [previewDevice, setPreviewDevice] = useState('desktop');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');
    const [conflictVersion, setConflictVersion] = useState(null);
    const logoInputRef = useRef(null);
    const faviconInputRef = useRef(null);
    const heroInputRef = useRef(null);
    const isDirty = useMemo(
        () => comparableBranding(saved) !== comparableBranding(draft),
        [draft, saved]
    );

    const loadBranding = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [brandingResponse, destinationResponse] = await Promise.all([
                API.get('/admin/store-branding'),
                API.get('/admin/store-branding/destinations')
            ]);
            const branding = { ...EMPTY_BRANDING, ...(brandingResponse.data?.data || {}) };
            setSaved(branding);
            setDraft(branding);
            setDestinations({ ...EMPTY_DESTINATIONS, ...(destinationResponse.data?.data || {}) });
            setConflictVersion(null);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Store branding could not be loaded.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(loadBranding, 0);
        return () => window.clearTimeout(timer);
    }, [loadBranding]);

    useEffect(() => {
        const warnBeforeUnload = event => {
            if (!isDirty) return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', warnBeforeUnload);
        return () => window.removeEventListener('beforeunload', warnBeforeUnload);
    }, [isDirty]);

    const updateHero = (field, value) => {
        setDraft(previous => ({
            ...previous,
            ...(field.startsWith('heroCta.')
                ? {
                    heroCta: {
                        ...previous.heroCta,
                        [field.split('.')[1]]: value
                    }
                }
                : { [field]: value })
        }));
    };

    const handleConflict = requestError => {
        if (requestError.response?.status !== 409) return false;
        setConflictVersion(requestError.response?.data?.currentVersion ?? null);
        toast.error('Branding changed in another session. Your unsaved text has been kept.');
        return true;
    };

    const reloadLatest = () => {
        if (isDirty && !window.confirm('Discard your unsaved branding changes and load the latest saved version?')) return;
        loadBranding();
    };

    const saveBranding = async event => {
        event?.preventDefault();
        if (!isDirty) return;
        setSaving(true);
        try {
            const response = await API.patch('/admin/store-branding', {
                heroTitle: draft.heroTitle,
                heroSubtitle: draft.heroSubtitle,
                heroCtaLabel: draft.heroCta?.label || '',
                heroCtaType: draft.heroCta?.type || 'NONE',
                heroCtaTargetId: draft.heroCta?.targetId || '',
                heroCtaUrl: draft.heroCta?.url || '',
                heroHidden: Boolean(draft.heroHidden),
                expectedVersion: draft.version
            });
            const next = { ...EMPTY_BRANDING, ...(response.data?.data || {}) };
            setSaved(next);
            setDraft(next);
            toast.success('Store branding saved');
        } catch (requestError) {
            if (!handleConflict(requestError)) {
                toast.error(requestError.response?.data?.message || 'Store branding could not be saved.');
            }
        } finally {
            setSaving(false);
        }
    };

    const uploadAsset = async (file, target) => {
        if (!file) return;
        const formData = new FormData();
        formData.append('asset', file);
        formData.append('expectedVersion', String(draft.version));
        setUploading(target);
        setUploadProgress(0);
        try {
            const response = await API.post(`/admin/store-branding/${target}`, formData, {
                onUploadProgress: progressEvent => {
                    if (!progressEvent.total) return;
                    setUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
                }
            });
            const next = { ...EMPTY_BRANDING, ...(response.data?.data || {}) };
            setSaved(next);
            setDraft(previous => mergeUploadResult(previous, next, target));
            toast.success(target === 'hero' ? 'Hero image updated' : target === 'favicon' ? 'Browser icon updated' : 'Store logo updated');
        } catch (requestError) {
            if (!handleConflict(requestError)) {
                toast.error(requestError.response?.data?.message || 'This image could not be uploaded.');
            }
        } finally {
            setUploading('');
            setUploadProgress(0);
        }
    };

    const removeAsset = async target => {
        if (!window.confirm(`Remove the current ${target === 'hero' ? 'hero image' : target === 'favicon' ? 'browser icon' : 'store logo'}?`)) return;
        setUploading(target);
        try {
            const response = await API.delete(`/admin/store-branding/${target}`, {
                data: { expectedVersion: draft.version }
            });
            const next = { ...EMPTY_BRANDING, ...(response.data?.data || {}) };
            setSaved(next);
            setDraft(previous => mergeUploadResult(previous, next, target));
            toast.success('Image removed');
        } catch (requestError) {
            if (!handleConflict(requestError)) {
                toast.error(requestError.response?.data?.message || 'This image could not be removed.');
            }
        } finally {
            setUploading('');
        }
    };

    const resetBranding = async () => {
        if (!window.confirm('Restore safe branding defaults? Your premium Store Builder theme will not be deleted.')) return;
        setSaving(true);
        try {
            const response = await API.post('/admin/store-branding/reset', {
                expectedVersion: draft.version
            });
            const next = { ...EMPTY_BRANDING, ...(response.data?.data || {}) };
            setSaved(next);
            setDraft(next);
            toast.success('Safe branding defaults restored');
        } catch (requestError) {
            if (!handleConflict(requestError)) {
                toast.error(requestError.response?.data?.message || 'Branding could not be reset.');
            }
        } finally {
            setSaving(false);
        }
    };

    const destinationOptions = draft.heroCta?.type === 'PRODUCT'
        ? destinations.products
        : draft.heroCta?.type === 'CATEGORY'
            ? destinations.categories
            : draft.heroCta?.type === 'COLLECTION'
                ? destinations.collections
                : [];
    const previewTitle = draft.heroTitle || user?.shop?.shopName || 'Your store';
    const previewSubtitle = draft.heroSubtitle || 'Browse our latest products';

    if (loading) {
        return <AdminLoadingState title="Loading store branding" description="Preparing your logo, icon, and storefront hero." />;
    }
    if (error) {
        return (
            <AdminErrorState
                title="Store branding could not load"
                description={error}
                action={<Button onClick={loadBranding}>Retry</Button>}
            />
        );
    }

    return (
        <form onSubmit={saveBranding} className="mx-auto max-w-7xl space-y-6 pb-28">
            <AdminPageHeader
                title="Store Branding"
                description="Manage the essential identity of your storefront. Layout, sections, colors, and advanced design remain in Store Builder."
                action={(
                    <Button type="submit" isLoading={saving} disabled={!isDirty || Boolean(uploading)}>
                        <Save size={17} /> Save changes
                    </Button>
                )}
            />

            {conflictVersion !== null && (
                <section className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-amber-950">A newer branding version is available</h2>
                        <p className="mt-1 text-sm text-amber-900/75">
                            Your unsaved text is still here. Reload the saved version before making another change.
                        </p>
                    </div>
                    <Button type="button" variant="secondary" onClick={reloadLatest}>
                        Reload latest
                    </Button>
                </section>
            )}

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.78fr)]">
                <div className="space-y-5">
                    <AssetEditor
                        target="logo"
                        title="Storefront logo"
                        description="Shown in your storefront header. This is separate from the browser tab icon."
                        imageUrl={draft.logoUrl}
                        uploading={uploading}
                        progress={uploadProgress}
                        inputRef={logoInputRef}
                        onUpload={uploadAsset}
                        onRemove={removeAsset}
                    />
                    <AssetEditor
                        target="favicon"
                        title="Browser tab icon"
                        description="A small square icon displayed in browser tabs and bookmarks."
                        imageUrl={draft.faviconUrl}
                        uploading={uploading}
                        progress={uploadProgress}
                        inputRef={faviconInputRef}
                        onUpload={uploadAsset}
                        onRemove={removeAsset}
                    />
                    <AssetEditor
                        target="hero"
                        title="Hero image"
                        description="The main storefront image. Customers may see a cropped version on smaller screens."
                        imageUrl={draft.heroImageUrl}
                        uploading={uploading}
                        progress={uploadProgress}
                        inputRef={heroInputRef}
                        onUpload={uploadAsset}
                        onRemove={removeAsset}
                    />

                    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <h2 className="font-bold text-slate-950">Hero content</h2>
                        <p className="mt-1 text-sm leading-6 text-slate-500">Keep the message short and clear. Promotional claims are never added automatically.</p>
                        <div className="mt-5 space-y-4">
                            <Input
                                id="brandingHeroTitle"
                                label="Heading"
                                value={draft.heroTitle}
                                maxLength={80}
                                required
                                helperText={`${draft.heroTitle.length}/80 characters`}
                                onChange={event => updateHero('heroTitle', event.target.value)}
                            />
                            <div className="space-y-1.5">
                                <label htmlFor="brandingHeroSubtitle" className="admin-label">Short description</label>
                                <textarea
                                    id="brandingHeroSubtitle"
                                    value={draft.heroSubtitle}
                                    maxLength={180}
                                    rows={3}
                                    className="admin-input min-h-24 resize-y"
                                    aria-describedby="brandingHeroSubtitle-help"
                                    onChange={event => updateHero('heroSubtitle', event.target.value)}
                                />
                                <p id="brandingHeroSubtitle-help" className="admin-help">{draft.heroSubtitle.length}/180 characters</p>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Input
                                    id="brandingCtaLabel"
                                    label="Button label"
                                    value={draft.heroCta?.label || ''}
                                    maxLength={30}
                                    helperText="Leave empty to hide the button."
                                    onChange={event => updateHero('heroCta.label', event.target.value)}
                                />
                                <label className="space-y-1.5">
                                    <span className="admin-label">Button destination</span>
                                    <select
                                        className="admin-input"
                                        value={draft.heroCta?.type || 'NONE'}
                                        onChange={event => {
                                            const type = event.target.value;
                                            setDraft(previous => ({
                                                ...previous,
                                                heroCta: {
                                                    ...previous.heroCta,
                                                    type,
                                                    targetId: null,
                                                    url: null
                                                }
                                            }));
                                        }}
                                    >
                                        {Object.entries(destinationLabels).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                            {destinationOptions.length > 0 && (
                                <label className="block space-y-1.5">
                                    <span className="admin-label">Select destination</span>
                                    <select
                                        className="admin-input"
                                        value={draft.heroCta?.targetId || ''}
                                        onChange={event => updateHero('heroCta.targetId', event.target.value)}
                                    >
                                        <option value="">Choose one</option>
                                        {destinationOptions.map(option => (
                                            <option key={option.id} value={option.id}>{option.label}</option>
                                        ))}
                                    </select>
                                </label>
                            )}
                            {draft.heroCta?.type === 'CUSTOM_URL' && (
                                <Input
                                    id="brandingCtaUrl"
                                    type="url"
                                    label="HTTPS destination"
                                    value={draft.heroCta?.url || ''}
                                    placeholder="https://example.com"
                                    helperText="Administrative, API, javascript, data, and file URLs are blocked."
                                    onChange={event => updateHero('heroCta.url', event.target.value)}
                                />
                            )}
                            <label className="flex min-h-12 items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
                                <span>
                                    <span className="block text-sm font-bold text-slate-900">Hide hero</span>
                                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">Start the homepage directly with products and categories.</span>
                                </span>
                                <input
                                    type="checkbox"
                                    checked={Boolean(draft.heroHidden)}
                                    onChange={event => updateHero('heroHidden', event.target.checked)}
                                    className="h-5 w-5"
                                />
                            </label>
                        </div>
                    </section>
                </div>

                <aside className="space-y-4 xl:sticky xl:top-24">
                    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="font-bold text-slate-950">Storefront preview</h2>
                                <p className="mt-1 text-xs text-slate-500">A safe basic-layout preview.</p>
                            </div>
                            <div className="inline-flex rounded-lg border border-slate-200 p-1" aria-label="Preview device">
                                {[
                                    { id: 'desktop', label: 'Desktop', icon: Monitor },
                                    { id: 'mobile', label: 'Mobile', icon: Smartphone }
                                ].map(option => {
                                    const Icon = option.icon;
                                    const selected = previewDevice === option.id;
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            aria-pressed={selected}
                                            onClick={() => setPreviewDevice(option.id)}
                                            className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-bold ${selected ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            <Icon size={16} /> <span className="hidden sm:inline">{option.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className={`mx-auto mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-[max-width] ${previewDevice === 'mobile' ? 'max-w-[360px]' : 'max-w-full'}`}>
                            <div className="flex h-14 items-center gap-3 border-b border-slate-200 px-4">
                                {draft.logoUrl ? (
                                    <img src={draft.logoUrl} alt="Store logo preview" className="h-9 w-9 rounded-lg object-contain" />
                                ) : (
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-sm font-black text-white">
                                        {previewTitle.slice(0, 1).toUpperCase()}
                                    </span>
                                )}
                                <span className="truncate text-sm font-black text-slate-950">{previewTitle}</span>
                            </div>
                            {draft.heroHidden ? (
                                <div className="p-4">
                                    <div className="h-5 w-32 rounded bg-slate-200" />
                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                        {[1, 2, 3, 4].map(item => <div key={item} className="aspect-square rounded-lg bg-slate-100" />)}
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className={`relative flex flex-col justify-end overflow-hidden p-5 ${draft.heroImageUrl ? 'min-h-64 text-white' : 'min-h-48 bg-slate-50 text-slate-950'}`}
                                    style={draft.heroImageUrl ? {
                                        backgroundImage: `url(${draft.heroImageUrl})`,
                                        backgroundPosition: 'center',
                                        backgroundSize: 'cover'
                                    } : undefined}
                                >
                                    <h3 className="max-w-md text-2xl font-black leading-tight [text-shadow:0_1px_8px_rgba(0,0,0,0.35)]">{previewTitle}</h3>
                                    <p className={`mt-2 max-w-md text-sm font-semibold ${draft.heroImageUrl ? 'text-white' : 'text-slate-600'}`}>{previewSubtitle}</p>
                                    {draft.heroCta?.label && draft.heroCta?.type !== 'NONE' && (
                                        <span className="mt-4 inline-flex min-h-10 w-fit items-center rounded-full bg-slate-950 px-4 text-xs font-black text-white">
                                            {draft.heroCta.label}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="rounded-lg border border-indigo-200 bg-indigo-50 p-5">
                        <div className="flex items-center gap-2 text-indigo-700">
                            <Palette size={18} />
                            <h2 className="font-bold">Need advanced design?</h2>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-indigo-950/75">
                            Eligible Store Builder plans add multiple banners, layouts, colors, typography, navigation, and custom sections.
                        </p>
                        <Link to="/dashboard/billing" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-700 px-4 text-sm font-bold text-white hover:bg-indigo-800">
                            Explore eligible plans <ExternalLink size={15} className="ml-2" />
                        </Link>
                    </section>
                </aside>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:left-[var(--sidebar-width,0px)]">
                <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-semibold text-slate-500" aria-live="polite">
                        {isDirty ? 'You have unsaved branding changes.' : 'All branding changes are saved.'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="ghost" disabled={!isDirty || saving} onClick={() => setDraft(saved)}>
                            Cancel
                        </Button>
                        <Button type="button" variant="secondary" disabled={saving || Boolean(uploading)} onClick={resetBranding}>
                            <RotateCcw size={16} /> Restore defaults
                        </Button>
                        <Button type="submit" isLoading={saving} disabled={!isDirty || Boolean(uploading)}>
                            <Save size={16} /> Save changes
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default StoreBranding;
