import { useEffect, useState } from 'react';
import { Shield, UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../api/api';

const permissionKeys = [
    'products',
    'orders',
    'customers',
    'promotions',
    'analytics',
    'storeBuilder',
    'settings',
    'staff'
];

const defaultPermissions = {
    products: true,
    orders: true,
    customers: false,
    promotions: false,
    analytics: false,
    storeBuilder: false,
    settings: false,
    staff: false
};

const StaffPermissions = () => {
    const [users, setUsers] = useState([]);
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        password: '',
        role: 'VendorStaff',
        permissions: defaultPermissions
    });

    const loadUsers = async () => {
        try {
            const { data } = await API.get('/admin/users');
            setUsers(Array.isArray(data) ? data : data.data || []);
        } catch {
            toast.error('Failed to load staff');
        }
    };

    useEffect(() => {
        const timer = setTimeout(loadUsers, 0);
        return () => clearTimeout(timer);
    }, []);

    const createStaff = async (e) => {
        e.preventDefault();
        try {
            await API.post('/admin/users', form);
            toast.success('Staff account created');
            setForm({ fullName: '', email: '', password: '', role: 'VendorStaff', permissions: defaultPermissions });
            loadUsers();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create staff');
        }
    };

    const updatePermission = async (user, key, value) => {
        const nextPermissions = {
            ...(user.permissions || {}),
            [key]: value
        };

        try {
            await API.patch(`/admin/users/${user._id}/permissions`, { permissions: nextPermissions });
            setUsers(prev => prev.map(item => (
                item._id === user._id ? { ...item, permissions: nextPermissions } : item
            )));
        } catch {
            toast.error('Failed to update permission');
        }
    };

    const updateStatus = async (user, status) => {
        try {
            await API.patch(`/admin/users/${user._id}/permissions`, {
                permissions: user.permissions || {},
                status
            });
            setUsers(prev => prev.map(item => (
                item._id === user._id ? { ...item, status } : item
            )));
        } catch {
            toast.error('Failed to update staff status');
        }
    };

    const staff = users.filter(user => user.role === 'VendorStaff');

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Staff Permissions</h1>
                <p className="text-sm text-slate-500 mt-1">Control what each staff member can access in the vendor dashboard.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <form onSubmit={createStaff} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <UserPlus size={18} />
                        New Staff
                    </div>
                    <input required value={form.fullName} onChange={e => setForm(prev => ({ ...prev, fullName: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Full name" />
                    <input required type="email" value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Email" />
                    <input required type="password" value={form.password} onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Password" />
                    <div className="grid grid-cols-2 gap-2">
                        {permissionKeys.map(key => (
                            <label key={key} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={!!form.permissions[key]}
                                    onChange={e => setForm(prev => ({
                                        ...prev,
                                        permissions: { ...prev.permissions, [key]: e.target.checked }
                                    }))}
                                />
                                <span className="capitalize">{key}</span>
                            </label>
                        ))}
                    </div>
                    <button className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                        Create staff
                    </button>
                </form>

                <section className="xl:col-span-2 bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center gap-2 font-semibold text-slate-900">
                        <Shield size={18} />
                        Staff Accounts
                    </div>
                    {staff.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">No staff accounts yet.</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {staff.map(user => (
                                <div key={user._id} className="p-5 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <div className="font-semibold text-slate-900">{user.fullName}</div>
                                            <div className="text-sm text-slate-500">{user.email}</div>
                                        </div>
                                        <select
                                            value={user.status}
                                            onChange={e => updateStatus(user, e.target.value)}
                                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        >
                                            <option>Active</option>
                                            <option>Suspended</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {permissionKeys.map(key => (
                                            <label key={key} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={!!user.permissions?.[key]}
                                                    onChange={e => updatePermission(user, key, e.target.checked)}
                                                />
                                                <span className="capitalize">{key}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default StaffPermissions;
