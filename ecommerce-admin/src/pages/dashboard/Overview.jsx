import { useState, useEffect } from 'react';
import { DollarSign, Package, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import API from '../../api/api';
import StatCard from '../../components/dashboard/StatCard';

const Overview = () => {
    const [stats, setStats] = useState(null);
    const [revenueAnalytics, setRevenueAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch both endpoints in parallel for maximum speed
                const [statsResponse, revenueResponse] = await Promise.all([
                    API.get('/admin/dashboard-stats').catch(() => ({ data: {} })), // Fallback if missing
                    API.get('/admin/analytics/revenue')
                ]);

                setStats(statsResponse.data);
                // Remember, your backend sends: { success: true, data: { overview, monthlyData } }
                setRevenueAnalytics(revenueResponse.data.data);
            } catch (err) {
                toast.error("Failed to load dashboard statistics");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center text-indigo-600 font-medium">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Calculating your stats...
            </div>
        );
    }

    // Safely extract the overview data (defaulting to 0 if no orders exist yet)
    const overviewData = revenueAnalytics?.overview || {};

    // Format the cards combining the old stats and the new financial data
    const statCards = [
        {
            title: 'Total Revenue',
            value: `৳ ${overviewData.totalRevenue?.toLocaleString() || 0}`,
            icon: DollarSign,
        },
        {
            title: 'Net Profit',
            value: `৳ ${overviewData.netProfit?.toLocaleString() || 0}`,
            icon: TrendingUp,
        },
        {
            title: 'Items Sold',
            value: overviewData.totalItemsSold?.toLocaleString() || 0,
            icon: Package
        },
        {
            title: 'Active Orders',
            value: stats?.activeOrders?.toString() || '0',
            icon: ShoppingCart
        },
    ];

    // Transform the backend monthly data into the format Recharts expects
    const formatChartData = (data) => {
        if (!data || data.length === 0) return [];
        return data.map(item => {
            // JavaScript months are 0-indexed, so we subtract 1
            const date = new Date(item.year, item.month - 1);
            return {
                name: date.toLocaleString('default', { month: 'short', year: 'numeric' }), // e.g. "Mar 2026"
                Revenue: item.revenue,
                Cost: item.cost,
                Profit: item.profit
            };
        });
    };

    const chartData = formatChartData(revenueAnalytics?.monthlyData);

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

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Revenue Chart (Takes up 2 columns) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Financial Performance</h2>

                    {chartData.length > 0 ? (
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                    <Tooltip
                                        cursor={{ fill: '#f9fafb' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey="Revenue" fill="#818cf8" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Profit" fill="#34d399" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-80 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <TrendingUp size={32} className="mb-3 text-gray-300" />
                            <p className="font-medium text-sm">No revenue data yet</p>
                            <p className="text-xs text-gray-400 mt-1">Make your first sale to generate the chart!</p>
                        </div>
                    )}
                </div>

                {/* Popular Products / Activity Feed (Takes up 1 column) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-gray-400">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Package size={32} />
                    </div>
                    <p className="font-medium">Popular Products</p>
                    <p className="text-xs text-gray-300 px-8 text-center mt-2">Product analytics coming soon.</p>
                </div>
            </div>
        </div>
    );
};

export default Overview;