import { useState, useEffect, useMemo } from 'react';
import { Mail } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../../api/api';
import Table from '../../../components/ui/Table';
import SendMailModal from './SendMailModal';

// 👇 1. Import your auth hook (adjust the path if necessary)
import { useAuth } from '../../../context/AuthContext';

const CustomerList = () => {
    // 👇 2. Extract the current user from context
    const { user } = useAuth();
    // console.log(user.shopName)

    // --- State ---
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [isMailModalOpen, setIsMailModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // --- Fetch Data ---
    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const { data } = await API.get('/admin/customers');
                setCustomers(Array.isArray(data) ? data : []);
            } catch {
                toast.error("Failed to load customers");
            } finally {
                setLoading(false);
            }
        };
        fetchCustomers();
    }, []);

    // --- Handlers ---
    const openMailModal = (customer) => {
        setSelectedCustomer(customer);
        setIsMailModalOpen(true);
    };

    // --- Filter Logic ---
    const filteredCustomers = useMemo(() => {
        return customers.filter(cust =>
            cust.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cust.email?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [customers, searchQuery]);

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
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search customers by name or email..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {/* Data Rendering */}
            {loading ? (
                <div className="py-10 text-center text-gray-500">Loading your customers...</div>
            ) : (
                <>
                    {/* Desktop View */}
                    <div className="hidden md:block">
                        <Table columns={columns} data={filteredCustomers} actions={renderActions} />
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden space-y-4">
                        {filteredCustomers.length === 0 ? (
                            <div className="py-10 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
                                {searchQuery ? 'No customers match your search.' : 'Customers appear here after they sign up or place an order.'}
                            </div>
                        ) : (
                            filteredCustomers.map((cust) => (
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
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Email Modal Component */}
            <SendMailModal
                isOpen={isMailModalOpen}
                onClose={() => setIsMailModalOpen(false)}
                customer={selectedCustomer}
                // 👇 3. Pass the dynamic shop name straight to the modal!
                shopName={user?.shopName}
            />
        </div>
    );
};

export default CustomerList;
