import { useEffect, useState } from 'react';
import { BarChart3, Package, Repeat, ShoppingCart, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import API from '../../api/api';

const Stat = ({ title, value, icon: Icon, tone = 'indigo' }) => {
    const toneClass = {
        indigo: 'bg-indigo-50 text-indigo-700',
        emerald: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
        rose: 'bg-rose-50 text-rose-700'
    }[tone];

    return (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">{title}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
                </div>
                <div className={`rounded-lg p-3 ${toneClass}`}>
                    <Icon size={22} />
                </div>
            </div>
        </div>
    );
};

const AdvancedAnalytics = () => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await API.get('/admin/analytics');
                setAnalytics(data.data);
            } catch {
                toast.error('Failed to load analytics');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) {
        return <div className="p-8 text-sm text-slate-500">Loading analytics...</div>;
    }

    const summary = analytics?.summary || {};
    const salesByDay = analytics?.salesByDay || [];
    const bestSelling = analytics?.bestSellingProducts || [];
    const lowStock = analytics?.lowStockProducts || [];
    const traffic = analytics?.trafficSource || [];

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Advanced Analytics</h1>
                <p className="text-sm text-slate-500 mt-1">Revenue, profit, and best sellers are counted only after orders are delivered.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Stat title="Revenue" value={`BDT ${(summary.revenue || 0).toLocaleString()}`} icon={TrendingUp} tone="emerald" />
                <Stat title="Profit" value={`BDT ${(summary.profit || 0).toLocaleString()}`} icon={BarChart3} />
                <Stat title="Average Order" value={`BDT ${Math.round(summary.averageOrderValue || 0).toLocaleString()}`} icon={ShoppingCart} tone="amber" />
                <Stat title="Abandoned Carts" value={summary.abandonedCarts || 0} icon={AlertTriangle} tone="rose" />
                <Stat title="Returning Customers" value={summary.returningCustomers || 0} icon={Repeat} />
                <Stat title="Total Customers" value={summary.totalCustomers || 0} icon={Repeat} tone="emerald" />
                <Stat title="Orders" value={summary.orders || 0} icon={ShoppingCart} tone="amber" />
                <Stat title="Conversion Rate" value={`${summary.conversionRate || 0}%`} icon={BarChart3} />
            </div>

            <section className="bg-white border border-slate-200 rounded-lg p-5">
                    <div className="font-semibold text-slate-900 mb-1">Sales by Day</div>
                    <p className="text-xs text-slate-500 mb-4">Revenue and profit are grouped by delivery date.</p>
                <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesByDay}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="bg-white border border-slate-200 rounded-lg p-5">
                    <div className="flex items-center gap-2 font-semibold text-slate-900 mb-4">
                        <Package size={18} />
                        Best Selling Products
                    </div>
                    <div className="space-y-3">
                        {bestSelling.length === 0 ? (
                            <div className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">No delivered sales yet. Best sellers appear after orders are delivered.</div>
                        ) : bestSelling.map(product => (
                            <div key={product._id} className="flex justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                                <span className="text-sm font-medium text-slate-800 truncate">{product.title}</span>
                                <span className="text-sm text-slate-500">{product.quantity}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-lg p-5">
                    <div className="flex items-center gap-2 font-semibold text-slate-900 mb-4">
                        <AlertTriangle size={18} />
                        Low Stock
                    </div>
                    <div className="space-y-3">
                        {lowStock.length === 0 ? (
                            <div className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">No products are currently below their stock alert level.</div>
                        ) : lowStock.map(product => {
                            const total = product.variants?.reduce((sum, variant) => sum + (variant.stock || 0), 0) || 0;
                            return (
                                <div key={product._id} className="flex justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2">
                                    <span className="text-sm font-medium text-amber-900 truncate">{product.title}</span>
                                    <span className="text-sm text-amber-700">{total}</span>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-lg p-5">
                    <div className="font-semibold text-slate-900 mb-1">Traffic Source</div>
                    <p className="text-xs text-slate-500 mb-4">Orders are grouped by the source captured at checkout.</p>
                    <div className="space-y-3">
                        {traffic.length === 0 ? (
                            <div className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">No traffic source data yet. New orders will show direct, social, or campaign sources here.</div>
                        ) : traffic.map(source => (
                            <div key={source._id || 'direct'} className="rounded-lg bg-slate-50 px-3 py-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-slate-800">{source._id || 'direct'}</span>
                                    <span className="text-slate-500">{source.orders} orders</span>
                                </div>
                                <div className="text-xs text-slate-500 mt-1">BDT {(source.revenue || 0).toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AdvancedAnalytics;
