import { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { Mail, Send, ShoppingBag, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../../api/api';
import Table from '../../../components/ui/Table';
import { AdminEmptyState, AdminLoadingState } from '../../../components/ui/AdminState.jsx';
import PaginationBar from '../../../components/ui/PaginationBar.jsx';
import { isAbortError, useAbortableRequest } from '../../../hooks/useAbortableRequest.js';
import useDebouncedValue from '../../../hooks/useDebouncedValue.js';

// 👇 1. Import your auth hook (adjust the path if necessary)
import { useAuth } from '../../../context/AuthContext';

const SendMailModal = lazy(() => import('./SendMailModal'));
const CustomerCampaignModal = lazy(() => import('./CustomerCampaignModal'));

const CustomerList = () => {
    // 👇 2. Extract the current user from context
    const { user } = useAuth();
    // console.log(user.shopName)

    // --- State ---
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, pages: 1, total: 0, limit: 25 });
    const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
    const runAbortable = useAbortableRequest();
    const fetchIdRef = useRef(0);

    // Modal State
    const [isMailModalOpen, setIsMailModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [campaignMode, setCampaignMode] = useState(null);

    // --- Fetch Data ---
    const fetchCustomers = useCallback(async (page = 1) => {
        const fetchId = fetchIdRef.current + 1;
        fetchIdRef.current = fetchId;
        setLoading(true);
        try {
            await runAbortable(async ({ signal, isLatest }) => {
            const { data } = await API.get('/admin/customers', {
                params: {
                    page,
                    limit: 25,
                    search: debouncedSearchQuery || undefined,
                    status: statusFilter || undefined
                },
                signal
            });
            if (!isLatest() || fetchId !== fetchIdRef.current) return;
            setCustomers(data.data || []);
            setPagination(data.pagination || { page, totalPages: 1, pages: 1, total: data.data?.length || 0, limit: 25 });
            });
        } catch (error) {
            if (isAbortError(error)) return;
            toast.error("Failed to load customers");
            setCustomers([]);
        } finally {
            if (fetchId === fetchIdRef.current) setLoading(false);
        }
    }, [debouncedSearchQuery, runAbortable, statusFilter]);

    useEffect(() => {
        const timer = setTimeout(() => fetchCustomers(1), 250);
        return () => clearTimeout(timer);
    }, [fetchCustomers]);

    // --- Handlers ---
    const openMailModal = (customer) => {
        setSelectedCustomer(customer);
        setIsMailModalOpen(true);
    };

    // --- Table Configuration ---
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
                onClick={() => openMailModal(row)}
                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                title="Email this customer about orders, offers, or support"
                aria-label={`Email ${row.fullName || 'customer'}`}
            >
                <Mail size={18} />
            </button>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                <p className="mt-1 text-sm text-gray-500">View shop customers, contact them, and suspend accounts only when necessary.</p>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search customers by name or email..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">All status</option>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                </select>
                <button
                    type="button"
                    onClick={() => setCampaignMode('plain')}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-100"
                >
                    <Send size={16} /> Email all customers
                </button>
                <button
                    type="button"
                    onClick={() => setCampaignMode('product')}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                    <ShoppingBag size={16} /> Send product email
                </button>
            </div>

            {/* Data Rendering */}
            {loading ? (
                <AdminLoadingState
                    title="Loading customers"
                    description="We are checking registered customers and shopper accounts for this store."
                />
            ) : customers.length === 0 ? (
                <AdminEmptyState
                    icon={Users}
                    title={searchQuery ? 'No matching customers' : 'Customers will appear here'}
                    description={searchQuery ? 'Try searching by a different name or email address.' : 'Customer profiles appear after shoppers sign up or place an order.'}
                />
            ) : (
                <>
                    {/* Desktop View */}
                    <div className="hidden md:block">
                        <Table columns={columns} data={customers} actions={renderActions} />
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden space-y-4">
                        {customers.map((cust) => (
                                <div key={cust._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                                    <div className="flex items-start justify-between">
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
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                                            cust.status === 'Suspended'
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-green-100 text-green-800'
                                        }`}>
                                            {cust.status || 'Active'}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                        <span className="text-xs text-gray-400">
                                            Joined {new Date(cust.createdAt).toLocaleDateString('en-GB')}
                                        </span>
                                        <div>{renderActions(cust)}</div>
                                    </div>
                                </div>
                            ))}
                    </div>
                    {pagination.total > pagination.limit && (
                        <PaginationBar
                            pagination={pagination}
                            label="customers"
                            onPrevious={() => fetchCustomers(pagination.page - 1)}
                            onNext={() => fetchCustomers(pagination.page + 1)}
                            className="mt-4"
                        />
                    )}
                </>
            )}

            {/* Email Modal Component */}
            {(isMailModalOpen || campaignMode) && (
                <Suspense fallback={null}>
                    {isMailModalOpen && (
                        <SendMailModal
                            isOpen={isMailModalOpen}
                            onClose={() => setIsMailModalOpen(false)}
                            customer={selectedCustomer}
                            shopName={user?.shopName}
                        />
                    )}
                    {campaignMode && (
                        <CustomerCampaignModal
                            isOpen={Boolean(campaignMode)}
                            onClose={() => setCampaignMode(null)}
                            mode={campaignMode || 'plain'}
                            recipientCount={pagination.total}
                            shopName={user?.shopName}
                        />
                    )}
                </Suspense>
            )}
        </div>
    );
};

export default CustomerList;
