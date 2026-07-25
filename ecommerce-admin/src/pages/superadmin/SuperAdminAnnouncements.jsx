import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Megaphone, RefreshCw, Search } from 'lucide-react';
import API from '../../api/api';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import { EmptyState, PaginationControls, SectionCard, StatusBadge } from './SuperAdminComponents.jsx';

const defaultPagination = { page: 1, limit: 10, total: 0, pages: 1 };
const defaultAnnouncement = {
    title: '',
    message: '',
    severity: 'Info',
    audience: 'All',
    targetPlan: '',
    targetPlans: [],
    targetStatus: '',
    targetShopId: '',
    expiresAt: ''
};
const defaultRegistry = {
    plans: [
        { key: 'beginner', name: 'Beginner' },
        { key: 'starter', name: 'Starter' },
        { key: 'growth', name: 'Growth' },
        { key: 'pro', name: 'Pro' }
    ],
    subscriptionStatuses: []
};

const SuperAdminAnnouncements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [registry, setRegistry] = useState(defaultRegistry);
    const [filters, setFilters] = useState({ page: 1, search: '', status: 'all' });
    const [pagination, setPagination] = useState(defaultPagination);
    const [form, setForm] = useState(defaultAnnouncement);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const debouncedFilters = useDebouncedValue(filters, 300);

    useEffect(() => {
        const controller = new AbortController();
        API.get('/super-admin/announcements', {
            params: { ...debouncedFilters, limit: 10 },
            signal: controller.signal
        })
            .then(({ data }) => {
                setAnnouncements(data.data || []);
                setPagination(data.pagination || defaultPagination);
                setRegistry(previous => ({ ...previous, ...(data.registry || {}) }));
            })
            .catch(error => {
                if (error.code !== 'ERR_CANCELED') toast.error('Announcements could not be refreshed');
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [debouncedFilters, refreshVersion]);

    const resetForm = () => {
        setEditingId(null);
        setForm(defaultAnnouncement);
    };

    const saveAnnouncement = async (event) => {
        event.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
            const payload = {
                ...form,
                expiresAt: form.expiresAt || null,
                targetPlan: '',
                targetPlans: form.targetPlans || [],
                targetStatuses: form.targetStatus ? [form.targetStatus] : [],
                targetShopId: form.targetShopId?.trim() || null
            };
            if (editingId) {
                await API.patch(`/super-admin/announcements/${editingId}`, payload);
                toast.success('Announcement updated');
            } else {
                await API.post('/super-admin/announcements', payload);
                toast.success('Announcement created');
            }
            resetForm();
            setRefreshVersion(version => version + 1);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save announcement');
        } finally {
            setSaving(false);
        }
    };

    const editAnnouncement = (announcement) => {
        setEditingId(announcement._id);
        setForm({
            title: announcement.title || '',
            message: announcement.message || '',
            severity: announcement.severity || 'Info',
            audience: announcement.audience || 'All',
            targetPlan: announcement.targetPlan || '',
            targetPlans: announcement.targetPlans?.length
                ? announcement.targetPlans
                : (announcement.targetPlan ? [announcement.targetPlan] : []),
            targetStatus: announcement.targetStatuses?.[0] || '',
            targetShopId: announcement.targetShopId || '',
            expiresAt: announcement.expiresAt
                ? new Date(announcement.expiresAt).toISOString().slice(0, 10)
                : ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const updateAnnouncement = async (announcement, action) => {
        try {
            if (action === 'archive') {
                await API.delete(`/super-admin/announcements/${announcement._id}`);
            } else {
                await API.patch(`/super-admin/announcements/${announcement._id}/${action}`);
            }
            toast.success(`Announcement ${action === 'archive' ? 'archived' : `${action}ed`}`);
            setRefreshVersion(version => version + 1);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update announcement');
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-950">Announcements</h1>
                    <p className="mt-1 text-sm text-slate-500">Create, target, publish, and archive vendor announcements.</p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setLoading(true);
                        setRefreshVersion(version => version + 1);
                    }}
                    disabled={loading}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 disabled:opacity-60"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </header>

            <form onSubmit={saveAnnouncement} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-indigo-600" />
                    <h2 className="font-black text-slate-950">{editingId ? 'Edit announcement' : 'Create announcement'}</h2>
                </div>
                <fieldset disabled={saving} className="space-y-3 disabled:opacity-70">
                    <input required maxLength={140} value={form.title} onChange={event => setForm(previous => ({ ...previous, title: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Announcement title" />
                    <textarea required maxLength={2000} value={form.message} onChange={event => setForm(previous => ({ ...previous, message: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" rows={4} placeholder="Message vendors will see" />
                    <div className="grid gap-3 md:grid-cols-3">
                        <label>
                            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Severity</span>
                            <select value={form.severity} onChange={event => setForm(previous => ({ ...previous, severity: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                                <option>Info</option><option>Warning</option><option>Critical</option>
                            </select>
                        </label>
                        <label>
                            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Audience</span>
                            <select value={form.audience} onChange={event => setForm(previous => ({ ...previous, audience: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                                <option>All</option><option>VendorAdmin</option><option>VendorStaff</option>
                            </select>
                        </label>
                        <label>
                            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Expires</span>
                            <input type="date" value={form.expiresAt} onChange={event => setForm(previous => ({ ...previous, expiresAt: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                        </label>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(12rem,1fr)_minmax(14rem,1fr)]">
                        <fieldset className="rounded-xl border border-slate-200 px-3 py-2">
                            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-slate-500">Target plans</legend>
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
                                {registry.plans.map(plan => (
                                    <label key={plan.key} className="inline-flex min-h-8 items-center gap-2 text-sm font-semibold text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={form.targetPlans.includes(plan.key)}
                                            onChange={event => setForm(previous => ({
                                                ...previous,
                                                targetPlans: event.target.checked
                                                    ? [...new Set([...previous.targetPlans, plan.key])]
                                                    : previous.targetPlans.filter(key => key !== plan.key)
                                            }))}
                                            className="h-4 w-4 rounded border-slate-300"
                                        />
                                        {plan.name}
                                    </label>
                                ))}
                            </div>
                            <p className="mt-1 text-xs text-slate-400">No selection targets every plan.</p>
                        </fieldset>
                        <label>
                            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Subscription status</span>
                            <select value={form.targetStatus} onChange={event => setForm(previous => ({ ...previous, targetStatus: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm capitalize">
                                <option value="">All statuses</option>
                                {registry.subscriptionStatuses.map(status => (
                                    <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Target shop ID</span>
                            <input value={form.targetShopId} onChange={event => setForm(previous => ({ ...previous, targetShopId: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Optional shop ID" />
                        </label>
                    </div>
                </fieldset>
                <div className="mt-4 flex flex-wrap gap-2">
                    <button disabled={saving} className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">
                        {saving ? 'Saving...' : editingId ? 'Update announcement' : 'Publish announcement'}
                    </button>
                    {editingId && (
                        <button type="button" onClick={resetForm} className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                            Cancel edit
                        </button>
                    )}
                </div>
            </form>

            <SectionCard
                title="Announcement history"
                icon={Megaphone}
                actions={(
                    <div className="grid gap-2 sm:grid-cols-[minmax(12rem,18rem)_10rem]">
                        <label className="relative block">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input value={filters.search} onChange={event => setFilters(previous => ({ ...previous, search: event.target.value, page: 1 }))} className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm" placeholder="Search announcements" />
                        </label>
                        <select value={filters.status} onChange={event => setFilters(previous => ({ ...previous, status: event.target.value, page: 1 }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                            <option value="all">Active</option>
                            <option value="published">Published</option>
                            <option value="unpublished">Unpublished</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>
                )}
            >
                <div className="divide-y divide-slate-100">
                    {loading && announcements.length === 0 ? (
                        <p className="px-5 py-10 text-center text-sm text-slate-500">Loading announcements...</p>
                    ) : announcements.length === 0 ? (
                        <EmptyState message="No announcements found." />
                    ) : announcements.map(item => (
                        <article key={item._id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-bold text-slate-950">{item.title}</h3>
                                    <StatusBadge value={item.severity} />
                                    <StatusBadge value={item.isPublished ? 'Active' : 'Dismissed'} />
                                    {(item.targetPlans?.length > 0 || item.targetPlan) && (
                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                                            Plans: {(item.targetPlans?.length ? item.targetPlans : [item.targetPlan]).join(', ')}
                                        </span>
                                    )}
                                    {item.targetShopId && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">Shop targeted</span>}
                                </div>
                                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.message}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => editAnnouncement(item)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100">Edit</button>
                                <button type="button" onClick={() => updateAnnouncement(item, item.isPublished ? 'unpublish' : 'publish')} className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100">{item.isPublished ? 'Unpublish' : 'Publish'}</button>
                                <button type="button" onClick={() => updateAnnouncement(item, 'archive')} className="min-h-10 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-700 hover:bg-rose-50">Archive</button>
                            </div>
                        </article>
                    ))}
                </div>
                <PaginationControls pagination={pagination} onPageChange={page => setFilters(previous => ({ ...previous, page }))} />
            </SectionCard>
        </div>
    );
};

export default SuperAdminAnnouncements;
