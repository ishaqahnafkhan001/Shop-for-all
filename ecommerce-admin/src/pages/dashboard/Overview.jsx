import { useState, useEffect } from 'react';
import { DollarSign, Package, ShoppingCart, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../api/api';
import StatCard from '../../components/dashboard/StatCard';

const Overview = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await API.get('/admin/dashboard-stats');
                setStats(data);
            } catch (err) {
                toast.error("Failed to load dashboard statistics");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return <div className="flex h-64 items-center justify-center text-gray-500">Calculating your stats...</div>;
    }

    // Format the cards with the real data
    const statCards = [
        {
            title: 'Total Revenue',
            value: `৳ ${stats?.totalRevenue?.toLocaleString()}`,
            icon: DollarSign,
            trend: '+0% this month' // Future enhancement: compare with last month's data
        },
        {
            title: 'Active Orders',
            value: stats?.activeOrders?.toString(),
            icon: ShoppingCart
        },
        {
            title: 'Total Products',
            value: stats?.totalProducts?.toString(),
            icon: Package
        },
        {
            title: 'Total Customers',
            value: stats?.totalCustomers?.toString(),
            icon: Users
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                <p className="mt-1 text-sm text-gray-500">Real-time performance metrics for your storefront.</p>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => (
                    <StatCard key={stat.title} {...stat} />
                ))}
            </div>

            {/* Placeholder for future Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-80 flex flex-col items-center justify-center text-gray-400">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <DollarSign size={32} />
                    </div>
                    <p className="font-medium">Revenue Analytics Coming Soon</p>
                    <p className="text-xs text-gray-300 px-8 text-center mt-2">Charts will appear once you have enough order data to generate a trend.</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-80 flex flex-col items-center justify-center text-gray-400">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Package size={32} />
                    </div>
                    <p className="font-medium">Popular Products Coming Soon</p>
                </div>
            </div>
        </div>
    );
};

export default Overview;