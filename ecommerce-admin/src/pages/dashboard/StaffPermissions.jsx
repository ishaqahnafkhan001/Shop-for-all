import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Edit3, Shield, UserMinus, UserPlus } from 'lucide-react';
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
    const [users, setUsers] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(createEmptyForm);
    const [editingStaff, setEditingStaff] = useState(null);
    const [editForm, setEditForm] = useState(createEditForm());

    const staff = useMemo(
        () => users.filter(user => user.role === 'VendorStaff'),
        [users]
    );

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersRes, summaryRes] = await Promise.all([
                API.get('/admin/users'),
                API.get('/admin/staff/summary')
            ]);
            setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.data || []);
            setSummary(summaryRes.data.data || null);
        } catch (err) {
            toast.error(getErrorMessage(err, 'Failed to load staff'));
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
            loadData();
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

        try {
            await API.post('/admin/users', form);
            toast.success('Staff account created. Share the login details securely.');
            setForm(createEmptyForm());
            await reloadAfterChange();
        } catch (err) {
            toast.error(getErrorMessage(err, 'Failed to create staff'));
        }
    };

    const updatePermission = async (user, key, value) => {
        const nextPermissions = {
            ...defaultPermissions,
            ...(user.permissions || {}),
            [key]: value
        };

        try {
            await API.patch(`/admin/users/${user._id}/permissions`, { permissions: nextPermissions });
            setUsers(prev => prev.map(item => (
                item._id === user._id ? { ...item, permissions: nextPermissions } : item
            )));
            toast.success('Permission updated');
        } catch (err) {
            toast.error(getErrorMessage(err, 'Failed to update permission'));
        }
    };

    const updateStatus = async (user, status) => {
        try {
            await API.patch(`/admin/users/${user._id}`, {
                status,
                permissions: user.permissions || {}
            });
            await reloadAfterChange();
            toast.success(status === 'Active' ? 'Staff account reactivated' : 'Staff account deactivated');
        } catch (err) {
            toast.error(getErrorMessage(err, 'Failed to update staff status'));
        }
    };

    const removeStaff = async (user) => {
        if (!window.confirm(`Remove ${user.fullName || user.email} from staff? They will no longer be able to access this shop dashboard, and the staff slot will become available again.`)) {
            return;
        }

        try {
            await API.delete(`/admin/users/${user._id}`);
            await reloadAfterChange();
            toast.success('Staff member removed. The slot is available again.');
        } catch (err) {
            toast.error(getErrorMessage(err, 'Failed to remove staff'));
        }
    };

    const openEditStaff = (user) => {
        setEditingStaff(user);
        setEditForm(createEditForm(user));
    };

    const saveStaffEdit = async (e) => {
        e.preventDefault();
        if (!editingStaff) return;

        try {
            const payload = {
                fullName: editForm.fullName,
                phone: editForm.phone,
                staffTitle: editForm.staffTitle,
                staffNote: editForm.staffNote,
                status: editForm.status,
                permissions: editForm.permissions
            };
            await API.patch(`/admin/users/${editingStaff._id}`, payload);
            setEditingStaff(null);
            await reloadAfterChange();
            toast.success('Staff details updated');
        } catch (err) {
            toast.error(getErrorMessage(err, 'Failed to update staff details'));
        }
    };

    const permissionSummary = (permissions = {}) => {
        const enabled = permissionKeys.filter(key => permissions[key]);
        if (enabled.length === 0) return 'No module access';
        if (enabled.length <= 2) return enabled.map(key => permissionLabels[key]).join(', ');
        return `${enabled.length} permissions enabled`;
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Staff Permissions</h1>
                <p className="text-sm text-slate-500 mt-1">Add team members without sharing the owner password. Staff only see the modules you allow.</p>
            </div>

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

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <form onSubmit={createStaff} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <UserPlus size={18} />
                        New Staff
                    </div>
                    <p className="text-xs text-slate-500">Use a real email and a temporary password. The staff member can change their password later.</p>
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                        {canAddStaff ? remainingText : summary?.message || 'Staff creation is unavailable for this shop.'}
                    </div>
                    <input required disabled={!canAddStaff} value={form.fullName} onChange={e => setForm(prev => ({ ...prev, fullName: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100" placeholder="Full name" />
                    <input required disabled={!canAddStaff} type="email" value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100" placeholder="Email" />
                    <input disabled={!canAddStaff} value={form.phone} onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100" placeholder="Phone optional" />
                    <input disabled={!canAddStaff} value={form.staffTitle} onChange={e => setForm(prev => ({ ...prev, staffTitle: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100" placeholder="Position, e.g. Order manager" />
                    <input required disabled={!canAddStaff} type="password" value={form.password} onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100" placeholder="Temporary password" />
                    <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Starting access</div>
                        <div className="grid grid-cols-2 gap-2">
                            {permissionKeys.map(key => (
                                <label key={key} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                    <input
                                        type="checkbox"
                                        disabled={!canAddStaff}
                                        checked={!!form.permissions[key]}
                                        onChange={e => setForm(prev => ({
                                            ...prev,
                                            permissions: { ...prev.permissions, [key]: e.target.checked }
                                        }))}
                                    />
                                    <span title={`Allow access to ${permissionLabels[key]}`}>{permissionLabels[key]}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <button disabled={!canAddStaff} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                        Create staff
                    </button>
                </form>

                <section className="xl:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-slate-100 flex items-center gap-2 font-semibold text-slate-900">
                        <Shield size={18} />
                        Staff Members
                    </div>
                    {loading ? (
                        <div className="p-8 text-center text-sm text-slate-500">Loading staff accounts...</div>
                    ) : staff.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">No staff accounts yet. Add staff when another person needs limited dashboard access.</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {staff.map(user => (
                                <div key={user._id} className="p-5 space-y-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="font-semibold text-slate-900">{user.fullName}</div>
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {user.status === 'Active' ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-500">{user.email}</div>
                                            <div className="mt-1 text-xs text-slate-500">
                                                {user.staffTitle || 'No position added'} / {permissionSummary(user.permissions)} / Added {formatDate(user.createdAt)}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button onClick={() => openEditStaff(user)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                                <Edit3 size={15} />
                                                Edit
                                            </button>
                                            {user.status === 'Active' ? (
                                                <button onClick={() => removeStaff(user)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                                                    <UserMinus size={15} />
                                                    Remove staff
                                                </button>
                                            ) : (
                                                <button onClick={() => updateStatus(user, 'Active')} className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
                                                    Reactivate
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {permissionKeys.map(key => (
                                            <label key={key} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={!!user.permissions?.[key]}
                                                    onChange={e => updatePermission(user, key, e.target.checked)}
                                                />
                                                <span title={`Allow access to ${permissionLabels[key]}`}>{permissionLabels[key]}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {editingStaff && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <form onSubmit={saveStaffEdit} className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
                        <div className="border-b border-slate-100 p-5">
                            <h2 className="text-lg font-bold text-slate-900">Edit staff member</h2>
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
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {permissionKeys.map(key => (
                                        <label key={key} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={!!editForm.permissions[key]}
                                                onChange={e => setEditForm(prev => ({
                                                    ...prev,
                                                    permissions: { ...prev.permissions, [key]: e.target.checked }
                                                }))}
                                            />
                                            <span>{permissionLabels[key]}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-5 sm:flex-row sm:justify-end">
                            <button type="button" onClick={() => setEditingStaff(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                Cancel
                            </button>
                            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                                Save changes
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default StaffPermissions;
