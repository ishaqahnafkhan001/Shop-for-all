import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Eye, Layers3, Search, ShieldCheck, X } from 'lucide-react';
import { getPrebuiltThemes, resolvePrebuiltTheme } from '@scaleup/storefront-theme/prebuilt';
import { BuilderButton, DeviceSwitcher } from '../builderUi.jsx';
import { StorefrontPreview } from '../StorefrontPreview.jsx';
const availableThemes = getPrebuiltThemes();
const industryFilters = ['All', ...new Set(availableThemes.map(theme => theme.industry))];
const styleFilters = ['All styles', ...new Set(availableThemes.map(theme => theme.style))];

export const buildPreviewTheme = ({ currentTheme, presetId, planAccess }) => {
    let sectionIndex = 0;
    return resolvePrebuiltTheme({
        currentTheme,
        presetId,
        planAccess,
        appliedAt: '2026-01-01T00:00:00.000Z',
        createSectionId: type => `preview-${presetId}-${String(type).toLowerCase()}-${sectionIndex += 1}`
    });
};

// The full Gallery preview consumes the resolved candidate that Apply uses.
// Keep its input forwarding in one place for Gallery/Builder/live comparisons.
export function ThemeGalleryPreview({ theme, planAccess, branding, storewideDiscount, shopName, trustedBadge, shopVerification, device, products, previewCatalog, categories, reviews }) {
    return <StorefrontPreview theme={theme} planAccess={planAccess} branding={branding}
        storewideDiscount={storewideDiscount} shopName={shopName} trustedBadge={trustedBadge} shopVerification={shopVerification}
        device={device} previewPage="home" previewZoom="fit"
        availableProducts={products} previewCatalog={previewCatalog} availableCategories={categories} availableReviews={reviews} activeElement="" />;
}

const ThemeCard = ({ theme, resolvedTheme, previewProps, current, updateAvailable, onPreview, onUse }) => (
    <article className={`overflow-hidden rounded-lg border bg-white transition ${current ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'}`}>
        <div className="relative aspect-[8/5] overflow-hidden border-b border-slate-200 bg-slate-100">
            {resolvedTheme ? <StorefrontPreview {...previewProps} theme={resolvedTheme} device="desktop" thumbnail /> : <p className="p-4 text-sm text-slate-500">Preview unavailable. Open Preview for details.</p>}
            {current && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-black text-white shadow"><Check size={13} /> Current theme</span>}
        </div>
        <div className="p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-base font-black text-slate-950">{theme.name}</h3>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-indigo-600">{theme.industry} · {theme.style}</p>
                </div>
                <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500">v{theme.version}</span>
            </div>
            <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">{theme.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
                {theme.tags.map(tag => <span key={tag} className="rounded bg-slate-50 px-2 py-1 text-xs font-bold text-slate-500">{tag}</span>)}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
                <BuilderButton type="button" variant="secondary" onClick={() => onPreview(theme)}><Eye size={15} /> Preview</BuilderButton>
                <BuilderButton type="button" onClick={() => onUse(theme)} disabled={current}>{current ? 'Applied' : updateAvailable ? 'Apply update' : 'Use theme'}</BuilderButton>
            </div>
        </div>
    </article>
);

const ApplyThemeDialog = ({ theme, limited, onCancel, onConfirm }) => {
    return (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4" onMouseDown={event => {
            if (event.target === event.currentTarget) onCancel();
        }}>
            <section role="alertdialog" aria-modal="true" aria-labelledby="apply-theme-title" aria-describedby="apply-theme-description" className="w-full rounded-t-xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-lg sm:p-6">
                <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700"><Layers3 size={21} /></span>
                    <div>
                        <h2 id="apply-theme-title" className="text-xl font-black text-slate-950">Use {theme.name}?</h2>
                        <p id="apply-theme-description" className="mt-2 text-sm leading-6 text-slate-600">
                            This updates your current draft only. Your logo, hero media and copy, navigation, footer details, policies, SEO, products, payment settings, and domain remain unchanged.
                        </p>
                    </div>
                </div>
                {limited && (
                    <div className="mt-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                        <ShieldCheck className="mt-0.5 shrink-0" size={18} />
                        <p>Your plan keeps advanced layout and section structure unchanged. The theme will apply only the design controls available to you.</p>
                    </div>
                )}
                <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-600">You can undo this change or continue editing before you publish.</p>
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <BuilderButton type="button" variant="secondary" onClick={onCancel}>Keep current draft</BuilderButton>
                    <BuilderButton type="button" onClick={onConfirm} autoFocus>Apply to draft</BuilderButton>
                </div>
            </section>
        </div>
    );
};

export default function ThemeGallery({
    open,
    onClose,
    currentTheme,
    planAccess,
    branding,
    storewideDiscount,
    trustedBadge,
    shopVerification,
    shopName,
    products,
    previewCatalog,
    categories,
    reviews,
    onApply
}) {
    const [industry, setIndustry] = useState('All');
    const [style, setStyle] = useState('All styles');
    const [search, setSearch] = useState('');
    const [previewTheme, setPreviewTheme] = useState(null);
    const [pendingTheme, setPendingTheme] = useState(null);
    const [device, setDevice] = useState('desktop');
    const closeRef = useRef(null);
    const currentPresetId = currentTheme?.preset?.id || '';
    const currentPreset = availableThemes.find(theme => theme.id === currentPresetId) || null;
    const limited = planAccess?.storeBuilderAccess !== 'full';

    const filteredThemes = useMemo(() => {
        const query = search.trim().toLowerCase();
        return availableThemes.filter(theme => (
            (industry === 'All' || theme.industry === industry) &&
            (style === 'All styles' || theme.style === style) &&
            (!query || [theme.name, theme.description, theme.industry, theme.style, ...theme.tags].join(' ').toLowerCase().includes(query))
        ));
    }, [industry, search, style]);

    const cardPreviewThemes = useMemo(() => {
        const resolved = new Map();
        availableThemes.forEach(theme => {
            try {
                resolved.set(theme.id, buildPreviewTheme({ currentTheme, presetId: theme.id, planAccess }));
            } catch {
                resolved.set(theme.id, null);
            }
        });
        return resolved;
    }, [currentTheme, planAccess, branding, shopName]);

    const previewResolution = useMemo(() => {
        if (!previewTheme) return { theme: null, error: '' };
        try {
            return { theme: buildPreviewTheme({ currentTheme, presetId: previewTheme.id, planAccess }), error: '' };
        } catch (error) {
            return { theme: null, error: error?.message || 'This theme could not be previewed.' };
        }
    }, [currentTheme, planAccess, previewTheme]);

    useEffect(() => {
        if (!open) return undefined;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();
        const onKeyDown = event => {
            if (event.key !== 'Escape') return;
            if (pendingTheme) setPendingTheme(null);
            else if (previewTheme) setPreviewTheme(null);
            else onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [onClose, open, pendingTheme, previewTheme]);

    if (!open) return null;

    const applyPendingTheme = () => {
        onApply(pendingTheme);
        setPendingTheme(null);
        setPreviewTheme(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[95] bg-slate-100" role="dialog" aria-modal="true" aria-labelledby="theme-gallery-title">
            <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
                <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wide text-indigo-600">Store Builder</p>
                    <h2 id="theme-gallery-title" className="truncate text-xl font-black text-slate-950">{previewTheme ? `Preview: ${previewTheme.name}` : 'Prebuilt themes'}</h2>
                </div>
                <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
                    {previewTheme && (
                        <>
                            <DeviceSwitcher value={device} onChange={setDevice} />
                            <BuilderButton type="button" onClick={() => setPendingTheme(previewTheme)} disabled={previewTheme.id === currentPresetId && Number(currentTheme?.preset?.version) === previewTheme.version}>{previewTheme.id === currentPresetId && Number(currentTheme?.preset?.version) === previewTheme.version ? 'Current theme' : 'Use theme'}</BuilderButton>
                        </>
                    )}
                    <button ref={closeRef} type="button" aria-label="Close theme gallery" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"><X size={20} /></button>
                </div>
            </header>

            {previewTheme ? (
                <main className="h-[calc(100vh-65px)] overflow-auto p-3 sm:p-5">
                    <div className="mx-auto max-w-[1500px]">
                        <button type="button" onClick={() => setPreviewTheme(null)} className="mb-3 min-h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">Back to themes</button>
                        {previewResolution.error ? (
                            <div className="rounded-lg border border-red-200 bg-white p-8 text-center"><p className="font-black text-red-800">Theme preview unavailable</p><p className="mt-2 text-sm text-red-700">{previewResolution.error}</p></div>
                        ) : (
                            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                                <ThemeGalleryPreview
                                    theme={previewResolution.theme}
                                    planAccess={planAccess}
                                    branding={branding}
                                    storewideDiscount={storewideDiscount}
                                    trustedBadge={trustedBadge}
                                    shopVerification={shopVerification}
                                    shopName={shopName}
                                    device={device}
                                    products={products}
                                    previewCatalog={previewCatalog}
                                    categories={categories}
                                    reviews={reviews}
                                />
                            </div>
                        )}
                    </div>
                </main>
            ) : (
                <main className="h-[calc(100vh-65px)] overflow-y-auto">
                    <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 sm:py-7">
                        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(260px,1fr)_auto_auto] lg:items-end">
                            <label className="block">
                                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Find a theme</span>
                                <span className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:ring-2 focus-within:ring-indigo-500"><Search size={17} className="text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name, industry, or style" className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-slate-900 outline-none" /></span>
                            </label>
                            <label className="block">
                                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Industry</span>
                                <select value={industry} onChange={event => setIndustry(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 lg:w-44">{industryFilters.map(value => <option key={value}>{value}</option>)}</select>
                            </label>
                            <label className="block">
                                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Style</span>
                                <select value={style} onChange={event => setStyle(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 lg:w-44">{styleFilters.map(value => <option key={value}>{value}</option>)}</select>
                            </label>
                        </div>

                        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="text-lg font-black text-slate-950">Choose a starting point</h3>
                                <p className="mt-1 text-sm text-slate-600">Preview with your current products and content. Applying a theme never publishes automatically.</p>
                                <p className="mt-1 text-sm font-bold text-slate-700">Current design: {currentPreset ? `Based on ${currentPreset.name}` : currentPresetId ? `Based on ${currentPresetId}` : 'Custom'}</p>
                            </div>
                            <p className="text-sm font-bold text-slate-500">{filteredThemes.length} theme{filteredThemes.length === 1 ? '' : 's'}</p>
                        </div>

                        {filteredThemes.length ? (
                            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {filteredThemes.map(theme => (
                                    <ThemeCard key={theme.id} theme={theme} resolvedTheme={cardPreviewThemes.get(theme.id)} previewProps={{ planAccess, branding, storewideDiscount, trustedBadge, shopVerification, shopName, availableProducts: products, previewCatalog, availableCategories: categories, availableReviews: reviews }} current={theme.id === currentPresetId && Number(currentTheme?.preset?.version) === theme.version} updateAvailable={theme.id === currentPresetId && Number(currentTheme?.preset?.version) < theme.version} onPreview={setPreviewTheme} onUse={setPendingTheme} />
                                ))}
                            </div>
                        ) : (
                            <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center"><p className="font-black text-slate-900">No themes match these filters.</p><button type="button" onClick={() => { setSearch(''); setIndustry('All'); setStyle('All styles'); }} className="mt-3 min-h-11 text-sm font-black text-indigo-600">Clear filters</button></div>
                        )}
                    </div>
                </main>
            )}

            {pendingTheme && <ApplyThemeDialog theme={pendingTheme} limited={limited} onCancel={() => setPendingTheme(null)} onConfirm={applyPendingTheme} />}
        </div>
    );
}
