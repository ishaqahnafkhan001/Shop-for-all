import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ExternalLink, Globe, RefreshCw, Search } from 'lucide-react';
import API from '../../api/api';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { hasPlatformPermission } from '../../utils/platformAccess.js';
import { EmptyState, PaginationControls, ReasonModal, SectionCard, StatusBadge } from './SuperAdminComponents.jsx';

const defaultPagination = { page: 1, limit: 10, total: 0, pages: 1 };
const DOMAIN_STATUSES = ['PendingVerification', 'OwnershipVerified', 'RoutingPending', 'Verified', 'Failed', 'NotConfigured'];
const CUSTOM_DOMAIN_DNS_TARGET = import.meta.env.VITE_CUSTOM_DOMAIN_DNS_TARGET || import.meta.env.NEXT_PUBLIC_CUSTOM_DOMAIN_DNS_TARGET || '';
const warningLabel = {
    duplicate: 'Duplicate domain',
    platform_domain: 'Platform domain',
    invalid_domain: 'Invalid domain'
};

const getDomainConnectionLabels = (customDomain = {}, dnsTarget = '') => {
    const ownershipVerified = customDomain?.ownershipVerified === true;
    const routingConnected = customDomain?.routingVerified === true || customDomain?.manuallyVerifiedRouting === true;
    const rawStatus = customDomain?.status || 'NotConfigured';
    return {
        displayStatus: rawStatus === 'Verified' && !routingConnected
            ? (ownershipVerified || customDomain?.lastDnsCheckStatus === 'verified' ? 'RoutingPending' : 'PendingVerification')
            : rawStatus,
        ownership: ownershipVerified ? 'Verified' : 'Not verified',
        routing: routingConnected
            ? (customDomain?.manuallyVerifiedRouting ? 'Manually approved' : 'Connected')
            : (dnsTarget ? 'Not connected' : 'Not configured'),
        browserAccess: routingConnected ? 'Ready' : 'Not ready'
    };
};

const SuperAdminDomains = () => {
    const { user } = useAuth();
    const canManage = hasPlatformPermission(user, 'platform.domains.manage');
    const [domains, setDomains] = useState([]);
    const [drafts, setDrafts] = useState({});
    const [filters, setFilters] = useState({ page: 1, search: '', status: 'all' });
    const [pagination, setPagination] = useState(defaultPagination);
    const [loading, setLoading] = useState(true);
    const [checkingId, setCheckingId] = useState('');
    const [savingId, setSavingId] = useState('');
    const [reasonModal, setReasonModal] = useState(null);
    const [reason, setReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const debouncedFilters = useDebouncedValue(filters, 300);

    useEffect(() => {
        const controller = new AbortController();
        API.get('/super-admin/domains', {
            params: { ...debouncedFilters, limit: 10 },
            signal: controller.signal
        })
            .then(({ data }) => {
                const rows = data.data || [];
                setDomains(rows);
                setPagination(data.pagination || defaultPagination);
                setDrafts(rows.reduce((accumulator, shop) => ({
                    ...accumulator,
                    [shop._id]: {
                        status: shop.customDomain?.status || 'NotConfigured',
                        adminNote: shop.customDomain?.adminNote || ''
                    }
                }), {}));
            })
            .catch(error => {
                if (error.code !== 'ERR_CANCELED') toast.error('Domains could not be refreshed');
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [debouncedFilters, refreshVersion]);

    const reload = () => setRefreshVersion(version => version + 1);
    const refreshWithLoadingState = () => {
        setLoading(true);
        reload();
    };
    const openReasonModal = (config) => {
        setReason('');
        setReasonModal(config);
    };

    const confirmReasonAction = async () => {
        if (!reasonModal || !reason.trim()) return;
        setActionLoading(true);
        try {
            await reasonModal.onConfirm(reason.trim());
            setReasonModal(null);
            setReason('');
            reload();
        } catch (error) {
            toast.error(error.response?.data?.error || reasonModal.error || 'Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    const persistDomain = async (shop, draft, actionReason = '') => {
        setSavingId(shop._id);
        try {
            await API.patch(`/super-admin/domains/${shop._id}`, {
                status: draft.status,
                adminNote: draft.adminNote || actionReason,
                reason: actionReason
            });
            toast.success('Domain updated');
        } finally {
            setSavingId('');
        }
    };

    const updateDomain = async (shop, draft) => {
        if (!canManage) return;
        if (draft.status === 'Failed') {
            openReasonModal({
                title: 'Mark domain failed',
                warning: `Marking ${shop.customDomain?.domain} as failed tells the vendor this domain needs attention.`,
                confirmLabel: 'Mark failed',
                onConfirm: actionReason => persistDomain(shop, draft, actionReason),
                error: 'Failed to update domain'
            });
            return;
        }

        if (draft.status === 'Verified' && !String(draft.adminNote || '').trim()) {
            openReasonModal({
                title: 'Manually verify domain',
                warning: `Only verify ${shop.customDomain?.domain} after confirming ownership and storefront routing.`,
                confirmLabel: 'Verify domain',
                onConfirm: actionReason => persistDomain(shop, draft, actionReason),
                error: 'Failed to verify domain'
            });
            return;
        }

        try {
            await persistDomain(shop, draft);
            reload();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update domain');
        }
    };

    const checkDomainDns = async (shop) => {
        if (!canManage) return;
        setCheckingId(shop._id);
        try {
            const { data } = await API.post(`/super-admin/domains/${shop._id}/check-dns`);
            toast.success(data.data?.message || 'Domain DNS checked');
        } catch (error) {
            toast.error(error.response?.data?.message || error.response?.data?.error || 'DNS verification failed');
        } finally {
            setCheckingId('');
            reload();
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-950">Domains</h1>
                    <p className="mt-1 text-sm text-slate-500">Review ownership, routing, DNS health, and manual domain decisions.</p>
                </div>
                <button
                    type="button"
                    onClick={refreshWithLoadingState}
                    disabled={loading}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 disabled:opacity-60"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </header>

            <SectionCard
                title="Connected domains"
                icon={Globe}
                actions={(
                    <div className="grid gap-2 sm:grid-cols-[minmax(12rem,18rem)_12rem]">
                        <label className="relative block">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input value={filters.search} onChange={event => setFilters(previous => ({ ...previous, search: event.target.value, page: 1 }))} className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm" placeholder="Search domains or shops" />
                        </label>
                        <select value={filters.status} onChange={event => setFilters(previous => ({ ...previous, status: event.target.value, page: 1 }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                            <option value="all">All statuses</option>
                            {DOMAIN_STATUSES.map(status => <option key={status}>{status}</option>)}
                        </select>
                    </div>
                )}
            >
                <div className="grid gap-4 p-5 lg:grid-cols-2">
                    {loading && domains.length === 0 ? (
                        <p className="col-span-full py-10 text-center text-sm text-slate-500">Loading domains...</p>
                    ) : domains.length === 0 ? (
                        <div className="col-span-full"><EmptyState message="No domains found." /></div>
                    ) : domains.map(shop => {
                        const draft = drafts[shop._id] || {
                            status: shop.customDomain?.status || 'NotConfigured',
                            adminNote: shop.customDomain?.adminNote || ''
                        };
                        const warnings = shop.customDomainWarnings || [];
                        const domainUrl = shop.customDomain?.domain ? `https://${shop.customDomain.domain}` : '';
                        const expectedTxtValue = shop.customDomain?.expectedTxtValue ||
                            (shop.customDomain?.verificationToken ? `scaleup-verification=${shop.customDomain.verificationToken}` : '');
                        const dnsTarget = shop.customDomain?.dnsTarget || CUSTOM_DOMAIN_DNS_TARGET;
                        const connection = getDomainConnectionLabels(shop.customDomain, dnsTarget);
                        const busy = savingId === shop._id || checkingId === shop._id;

                        return (
                            <article key={shop._id} className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h2 className="break-all font-black text-slate-950">{shop.customDomain?.domain || 'Domain not configured'}</h2>
                                        <p className="mt-1 text-xs text-slate-500">{shop.shopName} · {shop.owner?.email || 'Owner unavailable'}</p>
                                    </div>
                                    {domainUrl && (
                                        <a href={domainUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-900" aria-label={`Open ${shop.customDomain?.domain}`}>
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    )}
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    <StatusBadge value={connection.displayStatus} />
                                    {warnings.map(item => (
                                        <span key={item} className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-100">
                                            {warningLabel[item] || item}
                                        </span>
                                    ))}
                                </div>

                                <dl className="mt-3 grid gap-x-4 gap-y-2 text-xs text-slate-500 sm:grid-cols-2">
                                    <div><dt className="font-bold text-slate-700">Ownership</dt><dd>{connection.ownership}</dd></div>
                                    <div><dt className="font-bold text-slate-700">Routing</dt><dd>{connection.routing}</dd></div>
                                    <div><dt className="font-bold text-slate-700">Browser access</dt><dd>{connection.browserAccess}</dd></div>
                                    <div><dt className="font-bold text-slate-700">DNS check</dt><dd>{shop.customDomain?.lastDnsCheckStatus || 'Not checked'}</dd></div>
                                    <div className="sm:col-span-2"><dt className="font-bold text-slate-700">DNS target</dt><dd className="break-all">{dnsTarget || 'Not configured'}</dd></div>
                                    {expectedTxtValue && <div className="sm:col-span-2"><dt className="font-bold text-slate-700">TXT value</dt><dd className="break-all">{expectedTxtValue}</dd></div>}
                                </dl>

                                {shop.customDomain?.lastDnsCheckError && (
                                    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 ring-1 ring-amber-100">
                                        {shop.customDomain.lastDnsCheckError}
                                    </p>
                                )}

                                <div className="mt-4 grid gap-2">
                                    <select disabled={!canManage} value={draft.status} onChange={event => setDrafts(previous => ({ ...previous, [shop._id]: { ...draft, status: event.target.value } }))} className="min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm disabled:bg-slate-50">
                                        {DOMAIN_STATUSES.map(status => <option key={status}>{status}</option>)}
                                    </select>
                                    <input value={draft.adminNote} onChange={event => setDrafts(previous => ({ ...previous, [shop._id]: { ...draft, adminNote: event.target.value } }))} className="min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Admin note or verification evidence" />
                                    <div className="flex flex-wrap gap-2">
                                        <button type="button" onClick={() => updateDomain(shop, draft)} disabled={!canManage || busy} className="min-h-10 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white disabled:opacity-60">
                                            {savingId === shop._id ? 'Saving...' : 'Save domain'}
                                        </button>
                                        <button type="button" onClick={() => checkDomainDns(shop)} disabled={!canManage || !shop.customDomain?.domain || busy} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60">
                                            <RefreshCw className={`h-3.5 w-3.5 ${checkingId === shop._id ? 'animate-spin' : ''}`} />
                                            {checkingId === shop._id ? 'Checking...' : 'Check DNS'}
                                        </button>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
                <PaginationControls pagination={pagination} onPageChange={page => setFilters(previous => ({ ...previous, page }))} />
            </SectionCard>

            <ReasonModal
                open={Boolean(reasonModal)}
                title={reasonModal?.title}
                warning={reasonModal?.warning}
                reason={reason}
                setReason={setReason}
                onCancel={() => setReasonModal(null)}
                onConfirm={confirmReasonAction}
                confirmLabel={reasonModal?.confirmLabel}
                loading={actionLoading}
            />
        </div>
    );
};

export default SuperAdminDomains;
