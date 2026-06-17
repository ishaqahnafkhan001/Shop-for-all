import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    AlertTriangle,
    Building2,
    CreditCard,
    ExternalLink,
    Globe,
    Megaphone,
    Search,
    ShieldAlert,
    ToggleLeft
} from 'lucide-react';
import API from '../../api/api';
import { EmptyState, PaginationControls, ReasonModal, SectionCard, StatusBadge } from './SuperAdminComponents.jsx';

const featureKeys = ['storeBuilder', 'coupons', 'analytics', 'customDomain', 'staffAccounts', 'bulkProductTools'];
const criticalFeatureKeys = new Set(['storeBuilder', 'analytics', 'staffAccounts']);

const defaultPagination = { page: 1, limit: 10, total: 0, pages: 1 };
const defaultAnnouncement = { title: '', message: '', severity: 'Info', audience: 'All', expiresAt: '' };

const formatMoney = (value) => `BDT ${(Number(value) || 0).toLocaleString()}`;

const SuperAdminPanel = () => {
    const [overview, setOverview] = useState({});
    const [shops, setShops] = useState([]);
    const [plans, setPlans] = useState([]);
    const [domains, setDomains] = useState([]);
    const [failedPayments, setFailedPayments] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [abuseReports, setAbuseReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reasonModal, setReasonModal] = useState(null);
    const [reason, setReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [shopFilters, setShopFilters] = useState({ page: 1, search: '', status: 'all' });
    const [shopPagination, setShopPagination] = useState(defaultPagination);
    const [announcementFilters, setAnnouncementFilters] = useState({ page: 1, search: '', status: 'all' });
    const [announcementPagination, setAnnouncementPagination] = useState(defaultPagination);
    const [domainFilters, setDomainFilters] = useState({ page: 1, search: '', status: 'all' });
    const [domainPagination, setDomainPagination] = useState(defaultPagination);
    const [abuseFilters, setAbuseFilters] = useState({ page: 1, search: '', status: 'all' });
    const [abusePagination, setAbusePagination] = useState(defaultPagination);
    const [failedPaymentPagination, setFailedPaymentPagination] = useState(defaultPagination);
    const [announcementForm, setAnnouncementForm] = useState(defaultAnnouncement);
    const [editingAnnouncementId, setEditingAnnouncementId] = useState(null);
    const [planForm, setPlanForm] = useState({ name: 'Starter', monthlyPrice: 0, productLimit: 100, staffLimit: 2 });
    const [domainDrafts, setDomainDrafts] = useState({});

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [
                overviewRes,
                shopsRes,
                plansRes,
                domainsRes,
                paymentsRes,
                announcementsRes,
                abuseRes
            ] = await Promise.all([
                API.get('/super-admin/overview'),
                API.get('/super-admin/shops', { params: { ...shopFilters, limit: 10 } }),
                API.get('/super-admin/plans'),
                API.get('/super-admin/domains', { params: { ...domainFilters, limit: 10 } }),
                API.get('/super-admin/failed-payments', { params: { page: failedPaymentPagination.page, limit: 5 } }),
                API.get('/super-admin/announcements', { params: { ...announcementFilters, limit: 10 } }),
                API.get('/super-admin/abuse-reports', { params: { ...abuseFilters, limit: 10 } })
            ]);

            setOverview(overviewRes.data.data || {});
            setShops(shopsRes.data.data || []);
            setShopPagination(shopsRes.data.pagination || defaultPagination);
            setPlans(plansRes.data.data || []);
            const domainRows = domainsRes.data.data || [];
            setDomains(domainRows);
            setDomainPagination(domainsRes.data.pagination || defaultPagination);
            setDomainDrafts(domainRows.reduce((acc, shop) => ({
                ...acc,
                [shop._id]: {
                    status: shop.customDomain?.status || 'NotConfigured',
                    adminNote: shop.customDomain?.adminNote || ''
                }
            }), {}));
            setFailedPayments(paymentsRes.data.data || []);
            setFailedPaymentPagination(paymentsRes.data.pagination || defaultPagination);
            setAnnouncements(announcementsRes.data.data || []);
            setAnnouncementPagination(announcementsRes.data.pagination || defaultPagination);
            setAbuseReports(abuseRes.data.data || []);
            setAbusePagination(abuseRes.data.pagination || defaultPagination);
        } catch {
            toast.error('Failed to load super admin');
        } finally {
            setLoading(false);
        }
    }, [abuseFilters, announcementFilters, domainFilters, failedPaymentPagination.page, shopFilters]);

    useEffect(() => {
        const timer = window.setTimeout(load, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

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
            await load();
        } catch (err) {
            toast.error(err.response?.data?.error || reasonModal.error || 'Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    const updateShopStatus = async (shop, status) => {
        const run = async (actionReason = '') => {
            await API.patch(`/super-admin/shops/${shop._id}/status`, { status, reason: actionReason });
            toast.success(`Shop marked ${status}`);
            await load();
        };

        if (status === 'Suspended') {
            openReasonModal({
                title: 'Suspend shop',
                warning: `Suspending ${shop.shopName} will block its public storefront. Give a clear governance reason.`,
                confirmLabel: 'Suspend shop',
                onConfirm: run,
                error: 'Failed to suspend shop'
            });
            return;
        }

        await run('');
    };

    const updateShopPlan = async (shop, planName) => {
        try {
            await API.patch(`/super-admin/shops/${shop._id}/plan`, { plan: { ...(shop.plan || {}), name: planName } });
            toast.success('Shop plan updated');
            await load();
        } catch {
            toast.error('Failed to update plan');
        }
    };

    const toggleFeatureFlag = async (shop, key) => {
        const nextValue = !shop.featureFlags?.[key];
        const run = async (actionReason = '') => {
            await API.patch(`/super-admin/shops/${shop._id}/feature-flags`, {
                featureFlags: { [key]: nextValue },
                reason: actionReason
            });
            toast.success('Feature flag updated');
            await load();
        };

        if (criticalFeatureKeys.has(key) && nextValue === false) {
            openReasonModal({
                title: 'Disable critical feature',
                warning: `Disabling ${key} may affect this vendor's ability to run their store. Explain why this is needed.`,
                confirmLabel: 'Disable feature',
                onConfirm: run,
                error: 'Failed to update feature flag'
            });
            return;
        }

        await run('');
    };

    const savePlan = async (event) => {
        event.preventDefault();
        try {
            await API.post('/super-admin/plans', planForm);
            toast.success('Plan saved');
            await load();
        } catch {
            toast.error('Failed to save plan');
        }
    };

    const saveAnnouncement = async (event) => {
        event.preventDefault();
        try {
            const payload = {
                ...announcementForm,
                expiresAt: announcementForm.expiresAt || null
            };
            if (editingAnnouncementId) {
                await API.patch(`/super-admin/announcements/${editingAnnouncementId}`, payload);
                toast.success('Announcement updated');
            } else {
                await API.post('/super-admin/announcements', payload);
                toast.success('Announcement created');
            }
            setAnnouncementForm(defaultAnnouncement);
            setEditingAnnouncementId(null);
            await load();
        } catch {
            toast.error('Failed to save announcement');
        }
    };

    const editAnnouncement = (announcement) => {
        setEditingAnnouncementId(announcement._id);
        setAnnouncementForm({
            title: announcement.title || '',
            message: announcement.message || '',
            severity: announcement.severity || 'Info',
            audience: announcement.audience || 'All',
            expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt).toISOString().slice(0, 10) : ''
        });
    };

    const announcementAction = async (announcement, action) => {
        try {
            if (action === 'archive') {
                await API.delete(`/super-admin/announcements/${announcement._id}`);
            } else {
                await API.patch(`/super-admin/announcements/${announcement._id}/${action}`);
            }
            toast.success(`Announcement ${action}d`);
            await load();
        } catch {
            toast.error('Failed to update announcement');
        }
    };

    const updateDomain = async (shop, draft) => {
        const run = async (actionReason = '') => {
            await API.patch(`/super-admin/domains/${shop._id}`, {
                status: draft.status,
                adminNote: draft.adminNote,
                reason: actionReason
            });
            toast.success('Domain updated');
            await load();
        };

        if (draft.status === 'Failed') {
            openReasonModal({
                title: 'Mark domain failed',
                warning: `Marking ${shop.customDomain?.domain} as failed tells the vendor this domain needs attention.`,
                confirmLabel: 'Mark failed',
                onConfirm: run,
                error: 'Failed to update domain'
            });
            return;
        }

        await run('');
    };

    const updateReport = async (report, status) => {
        const run = async (actionReason = '') => {
            await API.patch(`/super-admin/abuse-reports/${report._id}/status`, { status, reason: actionReason });
            toast.success(`Report marked ${status}`);
            await load();
        };

        if (['Resolved', 'Dismissed'].includes(status)) {
            openReasonModal({
                title: `${status} abuse report`,
                warning: 'Resolving or dismissing abuse reports needs a clear internal reason for audit history.',
                confirmLabel: status,
                onConfirm: run,
                error: 'Failed to update report'
            });
            return;
        }

        await run('');
    };

    const alerts = overview.alerts || {};
    const alertItems = [
        { label: 'vendor verifications are pending review', value: alerts.pendingVerifications },
        { label: 'verification deadlines have expired', value: alerts.expiredVerifications },
        { label: 'verification deadlines end within 3 days', value: alerts.deadlineSoon },
        { label: 'abuse reports are open', value: alerts.openAbuseReports },
        { label: 'shops are suspended', value: alerts.suspendedShops },
        { label: 'failed payments need review', value: alerts.failedPayments },
        { label: 'domains are pending verification', value: alerts.pendingDomains }
    ].filter(item => Number(item.value) > 0);

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <div>
                <h1 className="text-2xl font-black text-slate-950">Super Admin</h1>
                <p className="mt-1 text-sm text-slate-500">Platform governance, merchant operations, billing visibility, and announcements.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Shops</p><p className="text-2xl font-black">{overview.shops || 0}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Active</p><p className="text-2xl font-black">{overview.activeShops || 0}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Revenue</p><p className="text-2xl font-black">{formatMoney(overview.platformRevenue)}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Failed Payments</p><p className="text-2xl font-black">{overview.failedPayments || 0}</p></div>
            </div>

            <SectionCard title="Priority Alerts" icon={AlertTriangle}>
                {alertItems.length === 0 ? (
                    <EmptyState message="No urgent platform alerts right now." />
                ) : (
                    <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
                        {alertItems.map(item => (
                            <div key={item.label} className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                                <span className="text-lg font-black">{item.value}</span> {item.label}
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>

            <SectionCard
                title="Shops"
                icon={Building2}
                actions={(
                    <div className="grid gap-2 sm:grid-cols-[minmax(12rem,18rem)_10rem]">
                        <label className="relative block">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input value={shopFilters.search} onChange={event => setShopFilters(prev => ({ ...prev, search: event.target.value, page: 1 }))} className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" placeholder="Search shops" />
                        </label>
                        <select value={shopFilters.status} onChange={event => setShopFilters(prev => ({ ...prev, status: event.target.value, page: 1 }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none">
                            <option value="all">All statuses</option>
                            <option value="Approved">Approved</option>
                            <option value="Pending">Pending</option>
                            <option value="Suspended">Suspended</option>
                        </select>
                    </div>
                )}
            >
                <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Shop</th>
                                <th className="px-4 py-3">Owner</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Plan</th>
                                <th className="px-4 py-3">Flags</th>
                                <th className="px-4 py-3 text-right">Detail</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Loading shops...</td></tr>
                            ) : shops.length === 0 ? (
                                <tr><td colSpan={6}><EmptyState message="No shops found." /></td></tr>
                            ) : shops.map(shop => (
                                <tr key={shop._id} className="align-top hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-slate-950">{shop.shopName}</div>
                                        <div className="text-xs text-slate-500">{shop.subdomain}</div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{shop.owner?.email || '-'}</td>
                                    <td className="px-4 py-3">
                                        <select value={shop.approvalStatus} onChange={event => updateShopStatus(shop, event.target.value)} className="rounded-lg border border-slate-200 px-2 py-1">
                                            <option>Pending</option>
                                            <option>Approved</option>
                                            <option>Suspended</option>
                                        </select>
                                        {shop.suspensionReason && <p className="mt-1 max-w-xs text-xs text-rose-600">{shop.suspensionReason}</p>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <select value={shop.plan?.name || 'Starter'} onChange={event => updateShopPlan(shop, event.target.value)} className="rounded-lg border border-slate-200 px-2 py-1">
                                            <option>Starter</option>
                                            <option>Growth</option>
                                            <option>Enterprise</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex max-w-md flex-wrap gap-2">
                                            {featureKeys.map(key => (
                                                <button
                                                    key={key}
                                                    onClick={() => toggleFeatureFlag(shop, key)}
                                                    className={`rounded-full px-2 py-1 text-xs font-semibold ${shop.featureFlags?.[key] ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                                                >
                                                    {key}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Link to={`/super-admin/shops/${shop._id}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
                                            Open <ExternalLink className="h-3.5 w-3.5" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <PaginationControls pagination={shopPagination} onPageChange={page => setShopFilters(prev => ({ ...prev, page }))} />
            </SectionCard>

            <div className="grid gap-6 lg:grid-cols-2">
                <form onSubmit={savePlan} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2 font-black text-slate-950"><CreditCard className="h-5 w-5 text-indigo-600" />Vendor Plans</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <input value={planForm.name} onChange={event => setPlanForm(prev => ({ ...prev, name: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Name" />
                        <input type="number" value={planForm.monthlyPrice} onChange={event => setPlanForm(prev => ({ ...prev, monthlyPrice: Number(event.target.value) }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Monthly price" />
                        <input type="number" value={planForm.productLimit} onChange={event => setPlanForm(prev => ({ ...prev, productLimit: Number(event.target.value) }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Product limit" />
                        <input type="number" value={planForm.staffLimit} onChange={event => setPlanForm(prev => ({ ...prev, staffLimit: Number(event.target.value) }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Staff limit" />
                    </div>
                    <button className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Save plan</button>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        {plans.map(plan => <div key={plan._id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm"><b>{plan.name}</b><br />{formatMoney(plan.monthlyPrice)}</div>)}
                    </div>
                </form>

                <form onSubmit={saveAnnouncement} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2 font-black text-slate-950"><Megaphone className="h-5 w-5 text-indigo-600" />{editingAnnouncementId ? 'Edit Announcement' : 'Create Announcement'}</div>
                    <div className="space-y-3">
                        <input required value={announcementForm.title} onChange={event => setAnnouncementForm(prev => ({ ...prev, title: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Title" />
                        <textarea required value={announcementForm.message} onChange={event => setAnnouncementForm(prev => ({ ...prev, message: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={3} placeholder="Message" />
                        <div className="grid gap-3 sm:grid-cols-3">
                            <select value={announcementForm.severity} onChange={event => setAnnouncementForm(prev => ({ ...prev, severity: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                                <option>Info</option><option>Warning</option><option>Critical</option>
                            </select>
                            <select value={announcementForm.audience} onChange={event => setAnnouncementForm(prev => ({ ...prev, audience: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                                <option>All</option><option>VendorAdmin</option><option>VendorStaff</option>
                            </select>
                            <input type="date" value={announcementForm.expiresAt} onChange={event => setAnnouncementForm(prev => ({ ...prev, expiresAt: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                        </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800">{editingAnnouncementId ? 'Update' : 'Publish'}</button>
                        {editingAnnouncementId && <button type="button" onClick={() => { setEditingAnnouncementId(null); setAnnouncementForm(defaultAnnouncement); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>}
                    </div>
                </form>
            </div>

            <SectionCard
                title="Announcements"
                icon={Megaphone}
                actions={(
                    <div className="grid gap-2 sm:grid-cols-[minmax(12rem,18rem)_10rem]">
                        <input value={announcementFilters.search} onChange={event => setAnnouncementFilters(prev => ({ ...prev, search: event.target.value, page: 1 }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Search announcements" />
                        <select value={announcementFilters.status} onChange={event => setAnnouncementFilters(prev => ({ ...prev, status: event.target.value, page: 1 }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                            <option value="all">Active</option>
                            <option value="published">Published</option>
                            <option value="unpublished">Unpublished</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>
                )}
            >
                <div className="divide-y divide-slate-100">
                    {announcements.length === 0 ? <EmptyState message="No announcements found." /> : announcements.map(item => (
                        <div key={item._id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-bold text-slate-950">{item.title}</p>
                                    <StatusBadge value={item.severity} />
                                    <StatusBadge value={item.isPublished ? 'Active' : 'Dismissed'} />
                                </div>
                                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.message}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => editAnnouncement(item)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">Edit</button>
                                <button onClick={() => announcementAction(item, item.isPublished ? 'unpublish' : 'publish')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">{item.isPublished ? 'Unpublish' : 'Publish'}</button>
                                <button onClick={() => announcementAction(item, 'archive')} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50">Archive</button>
                            </div>
                        </div>
                    ))}
                </div>
                <PaginationControls pagination={announcementPagination} onPageChange={page => setAnnouncementFilters(prev => ({ ...prev, page }))} />
            </SectionCard>

            <div className="grid gap-6 xl:grid-cols-3">
                <SectionCard title="Domains" icon={Globe}>
                    <div className="space-y-3 p-5">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <input value={domainFilters.search} onChange={event => setDomainFilters(prev => ({ ...prev, search: event.target.value, page: 1 }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Search domains" />
                            <select value={domainFilters.status} onChange={event => setDomainFilters(prev => ({ ...prev, status: event.target.value, page: 1 }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                                <option value="all">All statuses</option><option>PendingVerification</option><option>Verified</option><option>Failed</option><option>NotConfigured</option>
                            </select>
                        </div>
                        {domains.length === 0 ? <EmptyState message="No domains found." /> : domains.map(shop => {
                            const draft = domainDrafts[shop._id] || { status: shop.customDomain?.status || 'NotConfigured', adminNote: shop.customDomain?.adminNote || '' };
                            return (
                                <div key={shop._id} className="rounded-xl bg-slate-50 p-3 text-sm">
                                    <div className="font-bold text-slate-950">{shop.customDomain?.domain}</div>
                                    <div className="text-xs text-slate-500">{shop.shopName}</div>
                                    <select value={draft.status} onChange={event => setDomainDrafts(prev => ({ ...prev, [shop._id]: { ...draft, status: event.target.value } }))} className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1">
                                        <option>PendingVerification</option><option>Verified</option><option>Failed</option><option>NotConfigured</option>
                                    </select>
                                    <input value={draft.adminNote} onChange={event => setDomainDrafts(prev => ({ ...prev, [shop._id]: { ...draft, adminNote: event.target.value } }))} className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1" placeholder="Admin note" />
                                    <button onClick={() => updateDomain(shop, draft)} className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Save domain</button>
                                </div>
                            );
                        })}
                    </div>
                    <PaginationControls pagination={domainPagination} onPageChange={page => setDomainFilters(prev => ({ ...prev, page }))} />
                </SectionCard>

                <SectionCard title="Failed Payments" icon={ToggleLeft}>
                    <div className="space-y-3 p-5">
                        {failedPayments.length === 0 ? <EmptyState message="No failed payments." /> : failedPayments.map(order => (
                            <div key={order._id} className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900">
                                <div className="font-bold">{order.customer?.email || 'Customer'}</div>
                                <div>{formatMoney(order.pricing?.total)} · {order.shop_id?.shopName || 'Unknown shop'}</div>
                            </div>
                        ))}
                    </div>
                    <PaginationControls pagination={failedPaymentPagination} onPageChange={page => setFailedPaymentPagination(prev => ({ ...prev, page }))} />
                </SectionCard>

                <SectionCard title="Abuse Reports" icon={ShieldAlert}>
                    <div className="space-y-3 p-5">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <input value={abuseFilters.search} onChange={event => setAbuseFilters(prev => ({ ...prev, search: event.target.value, page: 1 }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Search reports" />
                            <select value={abuseFilters.status} onChange={event => setAbuseFilters(prev => ({ ...prev, status: event.target.value, page: 1 }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                                <option value="all">All statuses</option><option>Open</option><option>Reviewing</option><option>Resolved</option><option>Dismissed</option>
                            </select>
                        </div>
                        {abuseReports.length === 0 ? <EmptyState message="No abuse reports." /> : abuseReports.map(report => (
                            <div key={report._id} className="space-y-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="font-bold text-slate-950">{report.reason}</div>
                                    <StatusBadge value={report.status} />
                                </div>
                                <div className="text-slate-500">{report.shop_id?.shopName || 'Unknown shop'} · {report.reporterEmail || 'No reporter'}</div>
                                <p className="line-clamp-2 text-xs text-slate-500">{report.details}</p>
                                <select value={report.status} onChange={event => updateReport(report, event.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-1">
                                    <option>Open</option><option>Reviewing</option><option>Resolved</option><option>Dismissed</option>
                                </select>
                            </div>
                        ))}
                    </div>
                    <PaginationControls pagination={abusePagination} onPageChange={page => setAbuseFilters(prev => ({ ...prev, page }))} />
                </SectionCard>
            </div>

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

export default SuperAdminPanel;
