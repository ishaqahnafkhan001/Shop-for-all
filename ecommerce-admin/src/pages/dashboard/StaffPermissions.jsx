import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Edit3, Shield, UserMinus, UserPlus, Search, RefreshCw, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../api/api';
import {
    DEFAULT_STAFF_PERMISSIONS,
    STAFF_OPERATIONAL_PERMISSIONS,
    STAFF_PERMISSION_LABELS
} from '../../utils/staffPermissions';

const permissionKeys = STAFF_OPERATIONAL_PERMISSIONS;
const permissionLabels = STAFF_PERMISSION_LABELS;
const defaultPermissions = DEFAULT_STAFF_PERMISSIONS;

const permissionGroups = {
    Commerce: ['products', 'catalogTools', 'orders', 'returns', 'customers', 'privacyRequests'],
    'Inventory & purchasing': ['inventoryRead', 'inventoryManage', 'inventoryAlertsManage', 'purchaseOrdersRead', 'purchaseOrdersManage', 'purchaseOrdersReceive'],
    Marketing: ['promotions', 'notifications', 'growthCenter', 'growthRead', 'collectionsAi', 'productsSchedule', 'salesManage', 'bannersManage'],
    'Store & operations': ['overview', 'analytics', 'storeBuilder', 'settings', 'shipping', 'activityLogs']
};

function PermissionFields({ permissions, disabled, onChange }) {
    return <div className="space-y-4">{Object.entries(permissionGroups).map(([title, keys]) => (
        <fieldset key={title} disabled={disabled} className="min-w-0">
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{title}</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{keys.map(key => (
                <label key={key} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors has-disabled:cursor-not-allowed has-disabled:opacity-60 ${permissions?.[key] ? 'border-indigo-200 bg-indigo-50 text-indigo-950' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'}`}>
                    <input type="checkbox" className="h-4 w-4 shrink-0 accent-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" checked={!!permissions?.[key]} onChange={event => onChange(key, event.target.checked)} />
                    <span>{permissionLabels[key]}</span>
                </label>
            ))}</div>
        </fieldset>
    ))}</div>;
}

const createEmptyForm = () => ({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    staffTitle: '',
    role: 'VendorStaff',
    permissions: { ...defaultPermissions }
});

const createEditForm = (staff = {}) => ({
    fullName: staff.fullName || '',
    email: staff.email || '',
    phone: staff.phone || '',
    staffTitle: staff.staffTitle || '',
    staffNote: staff.staffNote || '',
    status: staff.status || 'Active',
    permissions: { ...defaultPermissions, ...(staff.permissions || {}) }
});

const formatLimit = (limit) => {
    if (limit === null || limit === 'unlimited') return 'Unlimited';
    return Number.isFinite(Number(limit)) ? Number(limit).toLocaleString() : '0';
};

const formatDate = (value) => {
    if (!value) return 'Not tracked yet';
    return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const getErrorMessage = (err, fallback) => (
    err.response?.data?.message ||
    err.response?.data?.error ||
    fallback
);

const StaffPermissions = () => {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [busy, setBusy] = useState(false);
    const pendingRef = useRef(false);
    const dialogRef = useRef(null);
    const [loadError, setLoadError] = useState('');
    const beginChange = () => {
        if (pendingRef.current) return false;
        pendingRef.current = true; setBusy(true); return true;
    };
    const endChange = () => { pendingRef.current = false; setBusy(false); };
    const [users, setUsers] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(createEmptyForm);
    const [editingStaff, setEditingStaff] = useState(null);
    const [editForm, setEditForm] = useState(createEditForm());

    useEffect(() => {
        const dialog = dialogRef.current;
        if (editingStaff && dialog && !dialog.open) dialog.showModal();
        return () => { if (dialog?.open) dialog.close(); };
    }, [editingStaff]);

    const staff = useMemo(
        () => users.filter(user => user.role === 'VendorStaff'),
        [users]
    );

    const visibleStaff = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        return staff.filter(user => (statusFilter === 'all' || user.status === statusFilter)
            && [user.fullName, user.email, user.staffTitle].some(value => String(value || '').toLocaleLowerCase().includes(query)));
    }, [staff, search, statusFilter]);

    const loadData = async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [usersRes, summaryRes] = await Promise.all([
                API.get('/admin/users'),
                API.get('/admin/staff/summary')
            ]);
            setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.data || []);
            setSummary(summaryRes.data.data || null);
        } catch (err) {
            setLoadError(getErrorMessage(err, 'Failed to load staff'));
            setSummary(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(loadData, 0);
        return () => clearTimeout(timer);
    }, []);

    const reloadAfterChange = async () => {
        try {
            const [usersRes, summaryRes] = await Promise.all([
                API.get('/admin/users'),
                API.get('/admin/staff/summary')
            ]);
            setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.data || []);
            setSummary(summaryRes.data.data || null);
        } catch {
            await loadData();
        }
    };

    const canAddStaff = Boolean(summary?.canAddStaff);
    const remainingText = summary?.remainingStaffSlots === null
        ? 'Unlimited staff slots available'
        : `${summary?.remainingStaffSlots ?? 0} remaining`;
    const limitReached = summary && !summary.canAddStaff;

    const createStaff = async (e) => {
        e.preventDefault();
        if (!canAddStaff) {
            toast.error(summary?.message || 'You cannot add more staff on this plan.');
            return;
        }

        if (!beginChange()) return;
        try {
            await API.post('/admin/users', form);
            toast.success('Staff account created. Share the login details securely.');
            setForm(createEmptyForm());
            await reloadAfterChange();
        } catch (err) {
            toast.error(getErrorMessage(err, 'Failed to create staff'));
        } finally { endChange(); }
    };

    const updatePermission = async (user, key, value) => {
        if (!beginChange()) return;
        try {
            const { data } = await API.patch(`/admin/users/${user._id}/permissions`, { permissions: { [key]: value } });
            setUsers(prev => prev.map(item => (
                item._id === user._id ? { ...item, permissions: data.user.permissions } : item
            )));
            toast.success('Permission updated');
        } catch (err) {
            toast.error(getErrorMessage(err, 'Failed to update permission'));
        } finally { endChange(); }
    };

    const updateStatus = async (user, status) => {
        if (!beginChange()) return;
        try {
            await API.patch(`/admin/users/${user._id}`, {
                status
            });
            await reloadAfterChange();
            toast.success(status === 'Active' ? 'Staff account reactivated' : 'Staff account deactivated');
        } catch (err) {
            toast.error(getErrorMessage(err, 'Failed to update staff status'));
        } finally { endChange(); }
    };

    const removeStaff = async (user) => {
        if (!window.confirm(`Deactivate ${user.fullName || user.email}? They will no longer be able to access this shop dashboard, and the staff slot will become available again.`)) {
            return;
        }

        if (!beginChange()) return;
        try {
            await API.delete(`/admin/users/${user._id}`);
            await reloadAfterChange();
            toast.success('Staff member deactivated. The slot is available again.');
        } catch (err) {
            toast.error(getErrorMessage(err, 'Failed to remove staff'));
        } finally { endChange(); }
    };

    const openEditStaff = (user) => {
        setEditingStaff(user);
        setEditForm(createEditForm(user));
    };

    const saveStaffEdit = async (e) => {
        e.preventDefault();
        if (!editingStaff) return;

        if (!beginChange()) return;
        try {
            const payload = {
                fullName: editForm.fullName,
                phone: editForm.phone,
                staffTitle: editForm.staffTitle,
                staffNote: editForm.staffNote,
                status: editForm.status,
                permissions: Object.fromEntries(permissionKeys.filter(key => editForm.permissions[key] !== Boolean(editingStaff.permissions?.[key])).map(key => [key, editForm.permissions[key]]))
            };
            await API.patch(`/admin/users/${editingStaff._id}`, payload);
            setEditingStaff(null);
            await reloadAfterChange();
            toast.success('Staff details updated');
        } catch (err) {
            toast.error(getErrorMessage(err, 'Failed to update staff details'));
        } finally { endChange(); }
    };

    const permissionSummary = (permissions = {}) => {
        const enabled = permissionKeys.filter(key => permissions[key]);
        if (enabled.length === 0) return 'No module access';
        if (enabled.length <= 2) return enabled.map(key => permissionLabels[key]).join(', ');
        return `${enabled.length} permissions enabled`;
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8 [&_button]:min-h-11 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-2 [&_button]:focus-visible:outline-indigo-600">
            <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Team workspace</p><h1 className="text-3xl font-bold tracking-tight text-slate-950">Your team, the right access</h1>
                <p className="text-sm text-slate-500 mt-1">Add team members without sharing the owner password. Staff only see the modules you allow.</p>
            </div>

            {loadError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4"><p>{loadError}</p><button type="button" onClick={loadData} className="mt-2 font-semibold underline">Retry loading staff</button></div>}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                            <Shield size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Staff Accounts</h2>
                            <p className="text-sm text-slate-500">
                                {loading
                                    ? 'Checking your plan...'
                                    : `${summary?.usedStaffCount ?? staff.length} of ${formatLimit(summary?.staffLimit)} used on ${summary?.planName || 'your'} plan`}
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div className="rounded-lg bg-slate-50 px-4 py-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Used</div>
                            <div className="mt-1 text-xl font-bold text-slate-900">{summary?.usedStaffCount ?? staff.length}</div>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-4 py-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Limit</div>
                            <div className="mt-1 text-xl font-bold text-slate-900">{formatLimit(summary?.staffLimit)}</div>
                        </div>
                        <div className="col-span-2 rounded-lg bg-slate-50 px-4 py-3 sm:col-span-1">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Available</div>
                            <div className="mt-1 text-sm font-bold text-slate-900">{remainingText}</div>
                        </div>
                    </div>
                </div>
                {limitReached && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        <AlertCircle size={17} className="mt-0.5 flex-shrink-0" />
                        <span>{summary?.message || 'Staff limit reached. Upgrade your plan or deactivate an active staff member to add another.'}</span>
                    </div>
                )}
                {!loading && summary?.featureEnabled && canAddStaff && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                        <CheckCircle2 size={17} className="mt-0.5 flex-shrink-0" />
                        <span>You can add {summary.remainingStaffSlots === null ? 'more staff members' : `${summary.remainingStaffSlots} more staff member${summary.remainingStaffSlots === 1 ? '' : 's'}`} on this plan.</span>
                    </div>
                )}
            </section>

            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                <form onSubmit={createStaff} className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <UserPlus size={18} />
                        Add a team member
                    </div>
                    <p className="text-xs text-slate-500">Use a real email and a temporary password. The staff member can change their password later.</p>
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                        {canAddStaff ? remainingText : summary?.message || 'Staff creation is unavailable for this shop.'}
                    </div>
                    <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-700">Full name *</span><input required disabled={!canAddStaff || busy} value={form.fullName} onChange={e => setForm(prev => ({ ...prev, fullName: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100" aria-label="Full name" minLength={3} maxLength={50} placeholder="Full name" /></label>
                    <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-700">Email *</span><input required disabled={!canAddStaff || busy} type="email" value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100" aria-label="Email" placeholder="Email" /></label>
                    <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-700">Phone (optional)</span><input disabled={!canAddStaff || busy} value={form.phone} onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100" aria-label="Phone" maxLength={40} placeholder="Phone optional" /></label>
                    <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-700">Position (optional)</span><input disabled={!canAddStaff || busy} value={form.staffTitle} onChange={e => setForm(prev => ({ ...prev, staffTitle: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100" aria-label="Position" maxLength={80} placeholder="Position, e.g. Order manager" /></label>
                    <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-700">Temporary password *</span><input required disabled={!canAddStaff || busy} type="password" value={form.password} onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100" aria-label="Temporary password" autoComplete="new-password" minLength={8} maxLength={128} placeholder="Password (at least 8 characters)" /></label>
                    <details className="rounded-xl border border-slate-200 p-3">
                        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-slate-700">Starting access · {permissionKeys.filter(key => form.permissions[key]).length} selected</summary>
                        <p className="mb-3 text-xs leading-5 text-slate-500">Review the modules this person can use before creating their account.</p>
                        <PermissionFields permissions={form.permissions} disabled={!canAddStaff || busy} onChange={(key, value) => setForm(prev => ({ ...prev, permissions: { ...prev.permissions, [key]: value } }))} />
                    </details>
                    <button disabled={!canAddStaff || busy} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                        {busy ? 'Please wait…' : 'Create staff'}
                    </button>
                </form>

                <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="space-y-4 border-b border-slate-100 p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2"><Users size={20} className="text-indigo-600" /><h2 className="font-bold text-slate-900">Team members</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{staff.length}</span></div>
                            <button type="button" disabled={loading || busy} onClick={loadData} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Refresh</button>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <label className="relative min-w-0 flex-1"><span className="sr-only">Search staff</span><Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, email or position" className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" /></label>
                            <label><span className="sr-only">Staff status</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="all">All statuses</option><option value="Active">Active</option><option value="Suspended">Inactive</option></select></label>
                        </div>
                        <p role="status" className="text-xs text-slate-500">{loading ? 'Loading your team…' : 'Showing ' + visibleStaff.length + ' of ' + staff.length + ' team members'}</p>
                    </div>
                    {loading ? (
                        <div className="p-8 text-center text-sm text-slate-500">Loading staff accounts...</div>
                    ) : loadError ? (<p className="p-8 text-sm">Staff could not be loaded. Use Retry above.</p>) : staff.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">No staff accounts yet. Add staff when another person needs limited dashboard access.</div>
                    ) : visibleStaff.length === 0 ? (
                        <div className="p-8 text-center"><p className="font-semibold text-slate-900">No matching team members</p><p className="mt-1 text-sm text-slate-500">Try another name or change the status filter.</p><button type="button" onClick={() => { setSearch(''); setStatusFilter('all'); }} className="mt-3 font-semibold text-indigo-600">Clear filters</button></div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {visibleStaff.map(user => (
                                <div key={user._id} className="p-5 space-y-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="break-words font-semibold text-slate-900">{user.fullName}</div>
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {user.status === 'Active' ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <div className="break-all text-sm text-slate-500">{user.email}</div>
                                            <div className="mt-1 text-xs text-slate-500">
                                                {user.staffTitle || 'No position added'} / {permissionSummary(user.permissions)} / Added {formatDate(user.createdAt)}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button disabled={busy} onClick={() => openEditStaff(user)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                                <Edit3 size={15} />
                                                Edit
                                            </button>
                                            {user.status === 'Active' ? (
                                                <button disabled={busy} onClick={() => removeStaff(user)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                                                    <UserMinus size={15} />
                                                    Deactivate
                                                </button>
                                            ) : (
                                                <button disabled={busy} onClick={() => updateStatus(user, 'Active')} className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
                                                    Reactivate
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <details className="rounded-xl border border-slate-200 bg-slate-50/60">
                                        <summary className="min-h-11 cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-indigo-600">Manage access · {permissionSummary(user.permissions)}</summary>
                                        <div className="border-t border-slate-200 p-4"><p className="mb-4 text-xs text-slate-500">Changes save immediately. Staff can only use features included in your shop’s plan.</p><PermissionFields permissions={user.permissions} disabled={busy} onChange={(key, value) => updatePermission(user, key, value)} /></div>
                                    </details>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {editingStaff && (
                <dialog ref={dialogRef} aria-labelledby="staff-edit-title" onCancel={event => { event.preventDefault(); if (!pendingRef.current) setEditingStaff(null); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl p-0 backdrop:bg-slate-950/40">
                    <form onSubmit={saveStaffEdit} className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
                        <div className="border-b border-slate-100 p-5">
                            <h2 id="staff-edit-title" className="text-lg font-bold text-slate-900">Edit staff member</h2>
                            <p className="mt-1 text-sm text-slate-500">Email is read-only because it is used for login. Use password reset if login access changes.</p>
                        </div>
                        <div className="max-h-[75vh] overflow-y-auto p-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="space-y-1">
                                    <span className="text-sm font-semibold text-slate-700">Full name</span>
                                    <input required value={editForm.fullName} onChange={e => setEditForm(prev => ({ ...prev, fullName: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-sm font-semibold text-slate-700">Email</span>
                                    <input value={editForm.email} readOnly className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-500" />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-sm font-semibold text-slate-700">Phone</span>
                                    <input value={editForm.phone} onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-sm font-semibold text-slate-700">Position/title</span>
                                    <input value={editForm.staffTitle} onChange={e => setEditForm(prev => ({ ...prev, staffTitle: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Order manager" />
                                </label>
                                <label className="space-y-1 sm:col-span-2">
                                    <span className="text-sm font-semibold text-slate-700">Internal note</span>
                                    <textarea value={editForm.staffNote} onChange={e => setEditForm(prev => ({ ...prev, staffNote: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" rows={3} placeholder="Optional note for the owner/admin" />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-sm font-semibold text-slate-700">Status</span>
                                    <select value={editForm.status} onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2">
                                        <option>Active</option>
                                        <option>Suspended</option>
                                    </select>
                                </label>
                            </div>
                            <div>
                                <div className="mb-2 text-sm font-semibold text-slate-700">Permissions</div>
                                <PermissionFields permissions={editForm.permissions} disabled={busy} onChange={(key, value) => setEditForm(prev => ({ ...prev, permissions: { ...prev.permissions, [key]: value } }))} />
                            </div>
                        </div>
                        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-5 sm:flex-row sm:justify-end">
                            <button disabled={busy} type="button" onClick={() => setEditingStaff(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                Cancel
                            </button>
                            <button disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                                {busy ? 'Saving…' : 'Save changes'}
                            </button>
                        </div>
                    </form>
                </dialog>
            )}
        </div>
    );
};

export default StaffPermissions;
