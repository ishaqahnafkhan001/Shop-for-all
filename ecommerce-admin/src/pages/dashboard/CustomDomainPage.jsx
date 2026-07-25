import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

import API from '../../api/api.js';
import AdminPageHeader from '../../components/ui/AdminPageHeader.jsx';
import { AdminErrorState, AdminLoadingState } from '../../components/ui/AdminState.jsx';
import { BuilderButton } from './StoreBuilder/builderUi.jsx';
import { DomainEditor } from './StoreBuilder/editors/DomainEditor.jsx';

const getDomainBootstrap = (response = {}) => {
    const payload = response.data?.bootstrap;
    const legacy = response.data?.data;
    const shop = payload?.shop || legacy?.shop || legacy;
    if (!shop) throw new Error('Custom domain settings were not included in the response.');
    return {
        customDomain: shop.customDomain || { domain: '' },
        revision: Number(payload?.publication?.revision ?? shop.themeRevision ?? 0)
    };
};

const serializeDomain = (customDomain = {}) => JSON.stringify(customDomain || {});

export default function CustomDomainPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState('');
    const [customDomain, setCustomDomain] = useState({ domain: '' });
    const [savedDomainSnapshot, setSavedDomainSnapshot] = useState(serializeDomain({ domain: '' }));
    const [themeRevision, setThemeRevision] = useState(0);

    const hasUnsavedChanges = useMemo(
        () => serializeDomain(customDomain) !== savedDomainSnapshot,
        [customDomain, savedDomainSnapshot]
    );

    const loadDomain = useCallback(async ({ preserveDraft = false } = {}) => {
        setLoading(true);
        setError('');
        try {
            const response = await API.get('/store-builder/admin');
            const next = getDomainBootstrap(response);
            setThemeRevision(next.revision);
            if (!preserveDraft) {
                setCustomDomain(next.customDomain);
                setSavedDomainSnapshot(serializeDomain(next.customDomain));
            }
        } catch (requestError) {
            setError(requestError.response?.data?.error || requestError.message || 'Custom domain settings could not be loaded.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => loadDomain(), 0);
        return () => window.clearTimeout(timer);
    }, [loadDomain]);

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (!hasUnsavedChanges) return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const saveDomain = async () => {
        if (!hasUnsavedChanges || saving) return;
        setSaving(true);
        setError('');
        try {
            const response = await API.patch('/store-builder/admin', {
                customDomain,
                expectedRevision: themeRevision
            });
            const savedShop = response.data?.data || {};
            const nextDomain = savedShop.customDomain || customDomain;
            setCustomDomain(nextDomain);
            setSavedDomainSnapshot(serializeDomain(nextDomain));
            setThemeRevision(Number(savedShop.themeRevision ?? themeRevision + 1));
            toast.success(nextDomain.domain ? 'Custom domain saved. Complete the DNS steps below.' : 'Custom domain removed.');
        } catch (requestError) {
            const conflict = requestError.response?.status === 409;
            const message = conflict
                ? 'Store settings changed in another session. Reload the latest version, then save the domain again.'
                : requestError.response?.data?.error || requestError.response?.data?.message || 'Custom domain could not be saved.';
            setError(message);
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const reloadDomain = () => {
        if (hasUnsavedChanges && !window.confirm('Discard the unsaved domain change and reload the published value?')) return;
        loadDomain();
    };

    const checkDomain = async () => {
        if (!customDomain.domain) {
            toast.error('Save a custom domain first.');
            return;
        }
        if (hasUnsavedChanges) {
            toast.error('Save the domain before checking DNS.');
            return;
        }

        setChecking(true);
        setError('');
        try {
            const response = await API.post('/store-builder/admin/custom-domain/check');
            const nextDomain = { ...customDomain, ...(response.data?.data || {}) };
            setCustomDomain(nextDomain);
            setSavedDomainSnapshot(serializeDomain(nextDomain));
            toast.success(response.data?.data?.message || 'Domain verification checked.');
        } catch (requestError) {
            const nextData = requestError.response?.data?.data;
            if (nextData) {
                const nextDomain = { ...customDomain, ...nextData };
                setCustomDomain(nextDomain);
                setSavedDomainSnapshot(serializeDomain(nextDomain));
            }
            const message = requestError.response?.data?.message || requestError.response?.data?.error || 'Domain verification failed.';
            setError(message);
            toast.error(message);
        } finally {
            setChecking(false);
        }
    };

    if (loading && !customDomain.domain && savedDomainSnapshot === serializeDomain({ domain: '' })) {
        return (
            <div className="p-4 sm:p-6">
                <AdminLoadingState title="Loading custom domain" description="Preparing your domain and DNS status." />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6 p-4 pb-12 sm:p-6">
            <AdminPageHeader
                eyebrow="Storefront"
                title="Custom Domain"
                description="Connect your own web address, verify ownership, and confirm that storefront routing is ready."
                action={(
                    <div className="flex flex-wrap gap-2">
                        <BuilderButton type="button" variant="secondary" onClick={reloadDomain} disabled={loading || saving || checking}>
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Reload
                        </BuilderButton>
                        <BuilderButton type="button" onClick={saveDomain} disabled={!hasUnsavedChanges || loading || saving || checking}>
                            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                            {saving ? 'Saving…' : 'Save domain'}
                        </BuilderButton>
                    </div>
                )}
            />

            {error && (
                <AdminErrorState
                    title="Custom domain needs attention"
                    description={error}
                    action={<BuilderButton type="button" variant="secondary" onClick={() => loadDomain({ preserveDraft: hasUnsavedChanges })}>Retry</BuilderButton>}
                />
            )}

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                <DomainEditor
                    customDomain={customDomain}
                    setCustomDomain={setCustomDomain}
                    hasUnsavedChanges={hasUnsavedChanges}
                    checkingDomain={checking}
                    onCheckDomain={checkDomain}
                />

                <aside className="space-y-4 lg:sticky lg:top-20">
                    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="font-black text-slate-950">Connection order</h2>
                        <ol className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                            <li><strong className="text-slate-900">1.</strong> Enter and save the exact hostname customers will use.</li>
                            <li><strong className="text-slate-900">2.</strong> Add the ownership TXT record at your DNS provider.</li>
                            <li><strong className="text-slate-900">3.</strong> Point the hostname to the displayed Scaleup target.</li>
                            <li><strong className="text-slate-900">4.</strong> Run the verification check after DNS updates propagate.</li>
                        </ol>
                    </section>
                    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                        Saving a domain does not make it public immediately. Ownership and storefront routing must both be verified.
                    </section>
                </aside>
            </div>
        </div>
    );
}
