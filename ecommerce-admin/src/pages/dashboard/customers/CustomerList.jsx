import { useState, useEffect } from 'react';
import { Mail, ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../../api/api';
import Table from '../../../components/ui/Table';

const CustomerList = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const { data } = await API.get('/admin/customers');
                setCustomers(data);
            } catch (err) {
                toast.error("Failed to load customers");
            } finally {
                setLoading(false);
            }
        };
        fetchCustomers();
    }, []);

    const handleToggleStatus = async (id, currentStatus) => {
        const action = currentStatus === 'Active' ? 'ban' : 'unban';
        if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            const res = await API.patch(`/admin/customers/${id}/status`);
            setCustomers(customers.map(cust =>
                cust._id === id ? { ...cust, status: res.data.status } : cust
            ));
            toast.success(res.data.message);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update status");
        }
    };

    // --- Desktop Table Configuration ---
    const columns = [
        {
            label: 'Customer',
            key: 'fullName',
            render: (row) => (
                <div className="flex items-center">
                    <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs uppercase
                        ${row.status === 'Suspended' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}
                    `}>
                        {row.fullName?.charAt(0) || 'U'}
                    </div>
                    <div className="ml-3">
                        <p className={`text-sm font-medium ${row.status === 'Suspended' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {row.fullName}
                        </p>
                    </div>
                </div>
            )
        },
        {
            label: 'Email',
            key: 'email',
            render: (row) => <span className="text-gray-500">{row.email}</span>
        },
        {
            label: 'Joined',
            key: 'createdAt',
            render: (row) => (
                <span className="text-gray-500">
                    {new Date(row.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
            )
        },
        {
            label: 'Status',
            key: 'status',
            render: (row) => (
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    row.status === 'Suspended'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-green-100 text-green-800'
                }`}>
                    {row.status || 'Active'}
                </span>
            )
        },
    ];

    const renderActions = (row) => (
        <div className="flex justify-end space-x-2">
            <button
                onClick={() => window.location.href = `mailto:${row.email}`}
                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                title="Email Customer"
            >
                <Mail size={18} />
            </button>
            <button
                onClick={() => handleToggleStatus(row._id, row.status || 'Active')}
                className={`p-1.5 rounded transition-colors ${
                    row.status === 'Suspended'
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                }`}
                title={row.status === 'Suspended' ? "Reactivate Account" : "Suspend Account"}
            >
                {row.status === 'Suspended' ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
            </button>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                <p className="mt-1 text-sm text-gray-500">Manage your store's registered users.</p>
            </div>

            {/* Search Bar - Now vertically stacks on mobile using flex-col */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    placeholder="Search customers by name or email..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button className="w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition">
                    Filter
                </button>
            </div>

            {loading ? (
                <div className="py-10 text-center text-gray-500">Loading your customers...</div>
            ) : (
                <>
                    {/* DESKTOP VIEW: Standard Table (Hidden on screens smaller than 'md') */}
                    <div className="hidden md:block">
                        <Table columns={columns} data={customers} actions={renderActions} />
                    </div>

                    {/* MOBILE VIEW: Card Layout (Hidden on screens 'md' and larger) */}
                    <div className="md:hidden space-y-4">
                        {customers.length === 0 ? (
                            <div className="py-10 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
                                No customers found.
                            </div>
                        ) : (
                            customers.map((cust) => (
                                <div key={cust._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                                    <div className="flex items-start justify-between">
                                        {/* Avatar & Info */}
                                        <div className="flex items-center space-x-3">
                                            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm uppercase
                                                ${cust.status === 'Suspended' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}
                                            `}>
                                                {cust.fullName?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <p className={`text-sm font-bold ${cust.status === 'Suspended' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                                    {cust.fullName}
                                                </p>
                                                <p className="text-xs text-gray-500">{cust.email}</p>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                                            cust.status === 'Suspended'
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-green-100 text-green-800'
                                        }`}>
                                            {cust.status || 'Active'}
                                        </span>
                                    </div>

                                    {/* Bottom Row: Date & Actions */}
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                        <span className="text-xs text-gray-400">
                                            Joined {new Date(cust.createdAt).toLocaleDateString('en-GB')}
                                        </span>
                                        {/* Reusing the exact same renderActions logic! */}
                                        <div>
                                            {renderActions(cust)}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default CustomerList;