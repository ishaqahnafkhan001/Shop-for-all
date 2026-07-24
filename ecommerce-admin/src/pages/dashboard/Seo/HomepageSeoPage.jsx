import { lazy, Suspense, useEffect, useMemo } from 'react';
import { ExternalLink, RefreshCw, Save, Search, Trash2, Upload } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { SeoHealthCard, SeoLengthHint, SeoSnippetPreview } from '../../../components/seo/SeoPreview.jsx';
import {
    BuilderButton,
    BuilderCard,
    BuilderInput,
    BuilderSelect,
    BuilderTextarea,
    BuilderToggle
} from '../StoreBuilder/builderUi.jsx';
import { useHomepageSeo } from './hooks/useHomepageSeo.js';

const SeoAiPanel = lazy(() => import('./SeoAiPanel.jsx'));

const tabs = [
    ['search-appearance', 'Search Appearance'],
    ['search-identity', 'Search Identity'],
    ['social-sharing', 'Social Sharing'],
    ['indexing', 'Indexing'],
    ['ai-assistant', 'AI Assistant'],
    ['health', 'SEO Health']
];

const fieldTab = (field = '') => {
    if (/social/i.test(field)) return 'social-sharing';
    if (/visibility|googleSiteVerification|robots|canonical/i.test(field)) return 'indexing';
    if (/siteName|language|spelling|primaryCategory|topics|alias/i.test(field)) return 'search-identity';
    return 'search-appearance';
};

const statusLabel = (status, dirty, publishing) => {
    if (publishing) return 'Publishing…';
    if (status === 'saving') return 'Saving draft…';
    if (status === 'saved') return dirty ? 'Draft saved' : 'Published';
    if (status === 'failed') return 'Draft save failed';
    if (status === 'offline') return 'Offline';
    if (status === 'conflict') return 'Conflict detected';
    return dirty ? 'Unpublished changes' : 'Published';
};

export default function HomepageSeoPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = tabs.some(([id]) => id === searchParams.get('tab')) ? searchParams.get('tab') : 'search-appearance';
    const seo = useHomepageSeo();
    const aliasesText = seo.draftAliases.join('\n');
    const topicsText = (seo.draftSeo.topics || []).join(', ');
    const preview = useMemo(() => seo.resolvedSeo ? {
        ...seo.resolvedSeo,
        url: seo.resolvedSeo.canonical
    } : null, [seo.resolvedSeo]);

    const selectTab = (tab, field = '') => {
        const next = new URLSearchParams(searchParams);
        next.set('tab', tab);
        if (field) next.set('field', field);
        else next.delete('field');
        setSearchParams(next);
    };

    useEffect(() => {
        const field = searchParams.get('field');
        if (!field) return;
        const timer = window.setTimeout(() => {
            const target = document.getElementById(`seo-${field}`);
            target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            target?.focus?.({ preventScroll: true });
        }, 80);
        return () => window.clearTimeout(timer);
    }, [activeTab, searchParams]);

    if (seo.loading && !seo.bootstrap) {
        return (
            <div className="space-y-4 p-4 sm:p-6">
                <div className="h-28 animate-pulse rounded-lg bg-slate-200" />
                <div className="h-96 animate-pulse rounded-lg bg-slate-100" />
            </div>
        );
    }
    if (seo.error && !seo.bootstrap) {
        return (
            <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-5 sm:m-6">
                <h1 className="text-lg font-black text-red-900">Homepage SEO could not be loaded</h1>
                <p className="mt-2 text-sm text-red-700">{seo.error}</p>
                <BuilderButton className="mt-4" onClick={() => seo.load()}><RefreshCw size={16} />Retry</BuilderButton>
            </div>
        );
    }

    return (
        <div className="min-w-0 bg-slate-50 pb-12">
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-xl font-black text-slate-950">Homepage SEO</h1>
                            <span aria-live="polite" className={`rounded-full px-2.5 py-1 text-xs font-black ${
                                seo.conflict ? 'bg-red-100 text-red-800' : seo.isDirty ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                                {statusLabel(seo.draftStatus, seo.isDirty, seo.publishing)}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">Control homepage search identity, social sharing, indexing, and diagnostics without changing storefront layout.</p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">Published storefront revision {seo.themeRevision}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <BuilderButton variant="secondary" onClick={() => seo.saveDraft()} disabled={!seo.isDirty || seo.publishing || seo.draftStatus === 'saving'}>
                            <Save size={16} /> Save draft now
                        </BuilderButton>
                        <BuilderButton variant="danger" onClick={() => {
                            if (window.confirm('Discard only the Homepage SEO draft? Other Store Builder draft changes will be kept.')) seo.discardDraft();
                        }} disabled={!seo.isDirty || seo.publishing}>
                            <Trash2 size={16} /> Discard SEO draft
                        </BuilderButton>
                        <BuilderButton onClick={seo.publish} disabled={!seo.isDirty || seo.publishing || Boolean(seo.conflict)}>
                            {seo.publishing ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                            {seo.publishing ? 'Publishing…' : 'Publish SEO'}
                        </BuilderButton>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
                {seo.bootstrap?.compatibilityMode && (
                    <div role="status" className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        <p className="font-black">Compatibility mode</p>
                        <p className="mt-1 leading-6">
                            Homepage SEO can still be published safely, but server-side SEO drafts and revision conflict checks require the latest backend deployment.
                        </p>
                    </div>
                )}
                {seo.conflict && (
                    <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4">
                        <h2 className="font-black text-red-900">Another session published storefront changes</h2>
                        <p className="mt-1 text-sm leading-6 text-red-700">{seo.conflict.message} Your local SEO draft has been preserved and was not published.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <BuilderButton variant="secondary" onClick={seo.rebaseDraftOnLatest}>Load latest revision, keep my draft</BuilderButton>
                            <BuilderButton variant="danger" onClick={() => {
                                if (window.confirm('Discard your local SEO draft and load the latest published values?')) seo.discardDraft().then(() => seo.load());
                            }}>Discard local draft</BuilderButton>
                        </div>
                    </div>
                )}

                <div className="mb-5 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1" role="tablist" aria-label="Homepage SEO settings">
                    <div className="flex min-w-max gap-1">
                        {tabs.map(([id, label]) => (
                            <button
                                key={id}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === id}
                                onClick={() => selectTab(id)}
                                className={`min-h-11 rounded-md px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${activeTab === id ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {activeTab === 'search-appearance' && (
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
                        <BuilderCard title="Search appearance" description="Manual values override safe store-name fallbacks." icon={Search}>
                            <BuilderInput id="seo-title" label="Homepage SEO title" value={seo.draftSeo.title || ''} onChange={event => seo.updateSeo('title', event.target.value)} placeholder={`${seo.bootstrap?.shop?.shopName || 'Your Store'} - Online Store`} />
                            <SeoLengthHint value={seo.draftSeo.title || ''} min={50} max={70} label="SEO title" />
                            <BuilderTextarea id="seo-description" label="Meta description" value={seo.draftSeo.description || ''} onChange={event => seo.updateSeo('description', event.target.value)} placeholder={`Shop products from ${seo.bootstrap?.shop?.shopName || 'your store'}.`} />
                            <SeoLengthHint value={seo.draftSeo.description || ''} min={120} max={160} label="SEO description" />
                            <BuilderSelect id="seo-mode" label="SEO mode" value={seo.draftSeo.mode || 'auto'} onChange={event => seo.updateSeo('mode', event.target.value)}>
                                <option value="auto">Auto with manual overrides</option>
                                <option value="manual">Manual</option>
                            </BuilderSelect>
                            <div className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                                <strong>Resolved sources:</strong> title {preview?.source?.title || 'unknown'}, description {preview?.source?.description || 'unknown'}.
                            </div>
                        </BuilderCard>
                        {preview && <SeoSnippetPreview {...preview} />}
                    </div>
                )}

                {activeTab === 'search-identity' && (
                    <BuilderCard title="Search identity" description="Keep the official store identity stable while adding genuine spelling variants.">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Official store name</p>
                            <p className="mt-1 text-base font-black text-slate-950">{seo.bootstrap?.shop?.shopName || 'Not configured'}</p>
                            <p className="mt-1 text-xs text-slate-500">Search aliases never replace this public identity.</p>
                        </div>
                        <BuilderInput id="seo-siteName" label="Google site name" value={seo.draftSeo.siteName || ''} onChange={event => seo.updateSeo('siteName', event.target.value)} placeholder={seo.bootstrap?.shop?.shopName || 'Your store name'} help="Google may show this name above the homepage title." />
                        <BuilderTextarea id="seo-searchAliases" label="Search aliases" value={aliasesText} onChange={event => seo.setDraftAliases(event.target.value.split(/[\n,]/).slice(0, 8))} placeholder={'Brand spelling variant\nAnother genuine variant'} help="One genuine spelling variant per line, maximum 8. Do not add product keywords or competitor names." />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <BuilderSelect id="seo-language" label="Store language" value={seo.draftSeo.language || 'en-BD'} onChange={event => seo.updateSeo('language', event.target.value)}>
                                <option value="en-BD">English (Bangladesh)</option><option value="bn-BD">Bangla (Bangladesh)</option><option value="en">English</option><option value="bn">Bangla</option>
                            </BuilderSelect>
                            <BuilderSelect id="seo-spellingPreference" label="Regional spelling" value={seo.draftSeo.spellingPreference || 'british'} onChange={event => seo.updateSeo('spellingPreference', event.target.value)}>
                                <option value="british">British English</option><option value="american">American English</option>
                            </BuilderSelect>
                        </div>
                        <BuilderInput id="seo-primaryCategory" label="Primary business category" value={seo.draftSeo.primaryCategory || ''} onChange={event => seo.updateSeo('primaryCategory', event.target.value)} placeholder="Jewellery" />
                        <BuilderTextarea id="seo-topics" label="SEO topics" value={topicsText} onChange={event => {
                            const topics = event.target.value.split(',').map(value => value.trim()).filter(Boolean).slice(0, 20);
                            seo.updateSeo('topics', topics);
                            seo.updateSeo('keywords', topics);
                        }} placeholder="bridal jewellery, handmade accessories" help="Topics guide recommendations; they are not a direct ranking control." />
                    </BuilderCard>
                )}

                {activeTab === 'social-sharing' && (
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
                        <BuilderCard title="Social sharing" description="Control Open Graph and social preview content.">
                            <BuilderInput id="seo-socialTitle" label="Social title" value={seo.draftSeo.socialTitle || ''} onChange={event => seo.updateSeo('socialTitle', event.target.value)} placeholder={preview?.title || ''} />
                            <BuilderTextarea id="seo-socialDescription" label="Social description" value={seo.draftSeo.socialDescription || ''} onChange={event => seo.updateSeo('socialDescription', event.target.value)} placeholder={preview?.description || ''} />
                            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500">
                                <Upload size={16} /> {seo.uploading ? 'Uploading…' : 'Upload social image'}
                                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={seo.uploading} onChange={event => seo.uploadSocialImage(event.target.files?.[0])} />
                            </label>
                            {seo.draftSeo.socialImage && (
                                <div className="space-y-2">
                                    <img src={seo.draftSeo.socialImage} alt={seo.draftSeo.socialImageAlt || ''} className="aspect-[1.91/1] w-full rounded-lg border border-slate-200 object-cover" />
                                    <BuilderButton variant="danger" onClick={seo.removeSocialImage}><Trash2 size={15} /> Remove social image</BuilderButton>
                                </div>
                            )}
                            <BuilderInput id="seo-socialImageAlt" label="Social image alt text" value={seo.draftSeo.socialImageAlt || ''} onChange={event => seo.updateSeo('socialImageAlt', event.target.value)} />
                            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Image: {seo.draftSeo.socialImageWidth || '?'} × {seo.draftSeo.socialImageHeight || '?'} px · {seo.draftSeo.socialImageMimeType || 'type unavailable'} · {seo.bootstrap?.socialAsset?.status || 'not uploaded in this draft'}</p>
                        </BuilderCard>
                        {preview && <SeoSnippetPreview {...preview} />}
                    </div>
                )}

                {activeTab === 'indexing' && (
                    <BuilderCard title="Indexing" description="The effective state combines your visibility choice with platform publication and domain status.">
                        <BuilderToggle id="seo-searchEngineVisibility" label="Allow search engines to index this store" help="Turning this off produces noindex while keeping public pages crawlable where the platform allows it." checked={seo.draftSeo.searchEngineVisibility !== false} onChange={event => seo.updateSeo('searchEngineVisibility', event.target.checked)} />
                        <BuilderInput id="seo-googleSiteVerification" label="Google Search Console verification code" value={seo.draftSeo.googleSiteVerification || ''} onChange={event => seo.updateSeo('googleSiteVerification', event.target.value)} help="Paste the content value or full Google meta tag; the backend keeps only the safe code." />
                        <dl className="grid gap-3 sm:grid-cols-2">
                            {[
                                ['Canonical URL', preview?.canonical],
                                ['Effective robots', `${preview?.robots?.index ? 'index' : 'noindex'}, ${preview?.robots?.follow ? 'follow' : 'nofollow'}`],
                                ['Custom domain', seo.bootstrap?.domain?.customDomain?.domain || 'Platform subdomain'],
                                ['Domain status', seo.bootstrap?.domain?.customDomain?.status || 'Platform domain']
                            ].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><dt className="text-xs font-black uppercase text-slate-400">{label}</dt><dd className="mt-1 break-all text-sm font-bold text-slate-800">{value || 'Unavailable'}</dd></div>)}
                        </dl>
                        <div className="flex flex-wrap gap-2">
                            <a href={seo.bootstrap?.domain?.sitemap} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-indigo-700"><ExternalLink size={16} />Open sitemap</a>
                            <a href={seo.bootstrap?.domain?.robots} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-indigo-700"><ExternalLink size={16} />Open robots.txt</a>
                        </div>
                    </BuilderCard>
                )}

                {activeTab === 'ai-assistant' && (
                    <Suspense fallback={<div className="h-56 animate-pulse rounded-lg bg-slate-100" />}>
                        <SeoAiPanel state={seo.aiState} onGenerate={seo.requestAiSuggestions} onApply={seo.applyAiSuggestion} />
                    </Suspense>
                )}

                {activeTab === 'health' && seo.health && (
                    <SeoHealthCard
                        score={seo.health.score}
                        status={seo.health.status}
                        groups={seo.health.groups}
                        tasks={seo.health.tasks || []}
                        onIssueClick={issue => selectTab(fieldTab(issue.fieldPath), String(issue.fieldPath || '').replace(/^seo\./, ''))}
                        description="Health combines resolved metadata, catalog signals, social media, canonical domain, and indexing settings."
                    />
                )}
            </main>
        </div>
    );
}
