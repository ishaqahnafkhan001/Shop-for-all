import { useState, useEffect } from 'react';
import {
  DollarSign, Package, ShoppingCart, TrendingUp, AlertTriangle,
  BarChart2, ArrowUpDown, SlidersHorizontal, ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import API from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import VendorOnboardingChecklist from '../../components/dashboard/VendorOnboardingChecklist.jsx';
import { AdminLoadingState } from '../../components/ui/AdminState.jsx';
import BillingAlert from '../../components/dashboard/BillingAlert.jsx';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-xl border border-gray-100">
          <p className="text-sm font-semibold text-gray-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
              <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
                {entry.name}: <span className="font-bold">৳{entry.value.toLocaleString()}</span>
              </p>
          ))}
        </div>
    );
  }
  return null;
};

const Overview = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [revenue, setRevenue] = useState({});
  const [movement, setMovement] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);

	useEffect(() => {
	    const fetchData = async () => {
	      try {
	        const overviewRes = await API.get('/admin/dashboard-overview');
	        const overviewData = overviewRes.data.data || {};

	        setStats(overviewData.stats || {});
	        setRevenue(overviewData.revenue || {});
	        setMovement(overviewData.movement || []);
	        setAdjustments(overviewData.adjustments || []);
	        setTopProducts(overviewData.topProducts || []);
	        setLowStock(overviewData.lowStock || []);

	      } catch {
        toast.error("Dashboard load failed");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ---------------------------------------------------------
  // SKELETON LOADING STATE (Modern UI UX)
  // ---------------------------------------------------------
  if (loading) {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AdminLoadingState
              title="Loading your dashboard"
              description="We are checking sales, orders, stock alerts, and seller setup progress."
          />
        </div>
    );
  }

  const overview = revenue?.overview || {};

  const chartData = (revenue?.monthlyData || []).map(item => {
    const d = new Date(item.year, item.month - 1);
    return {
      name: d.toLocaleString('default', { month: 'short' }),
      Revenue: item.revenue,
      Profit: item.profit
    };
  });

  const statCards = [
    { title: 'Total Revenue', value: `৳ ${overview.totalRevenue?.toLocaleString() || 0}`, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Net Profit',    value: `৳ ${overview.netProfit?.toLocaleString() || 0}`,     icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Items Sold',    value: overview.totalItemsSold || 0,                         icon: Package,    color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Active Orders', value: stats?.activeOrders || 0,                             icon: ShoppingCart, color: 'text-amber-600', bg: 'bg-amber-50' }
  ];

  return (
      <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-8 pb-12 bg-gray-50/30 min-h-screen">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h1>
            <p className="text-sm text-gray-500 mt-1">Start here each day: review sales, active orders, low stock, and recent inventory changes.</p>
          </div>
        </div>

        {user?.role === 'VendorAdmin' && <VendorOnboardingChecklist />}
        {user?.role === 'VendorAdmin' && <BillingAlert />}

        {/* STAT CARDS - Custom Inline Styling for Modern Look */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((s, i) => (
              <div
                  key={i}
                  className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{s.title}</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-2 tracking-tight">{s.value}</h3>
                  </div>
                  <div className={`p-3 rounded-xl ${s.bg} transition-colors duration-300 group-hover:scale-110`}>
                    <s.icon size={24} className={s.color} strokeWidth={2} />
                  </div>
                </div>
              </div>
          ))}
        </div>

        {/* MAIN GRID: Chart (2/3) + Side Panel (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* CHART SECTION */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm lg:col-span-2 flex flex-col hover:shadow-md transition-shadow duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800">Financial Performance</h2>
            </div>

            {chartData.length > 0 ? (
                <div className="h-[350px] w-full flex-grow">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#6B7280', fontSize: 12 }}
                          dy={10}
                      />
                      <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#6B7280', fontSize: 12 }}
                          tickFormatter={(value) => `৳${value}`}
                      />
                      <Tooltip cursor={{ fill: '#F3F4F6' }} content={<CustomTooltip />} />
                      <Bar dataKey="Revenue" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="Profit"  fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
            ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-gray-400 py-20">
                  <BarChart2 size={48} className="mb-4 text-gray-200" strokeWidth={1.5} />
                  <p>No delivered orders yet. Revenue and profit trends appear after orders are delivered.</p>
                </div>
            )}
          </div>

          {/* SIDE PANEL */}
          <div className="flex flex-col gap-6">

            {/* Low Stock */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
              <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <div className="p-1.5 bg-red-50 rounded-lg">
                  <AlertTriangle size={16} className="text-red-500" />
                </div>
                Low Stock Alerts
              </h2>
              <div className="space-y-1">
                {lowStock.length > 0 ? (
                    lowStock.slice(0, 5).map((p, i) => {
                      const totalStock = p.variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
                      return (
                          <div key={i} className="group flex justify-between items-center text-sm p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                            <span className="text-gray-700 font-medium truncate pr-3 group-hover:text-indigo-600 transition-colors">{p.title}</span>
                            <span className="bg-red-100 text-red-700 py-0.5 px-2 rounded-full text-xs font-bold flex-shrink-0">
                        {totalStock} left
                      </span>
                          </div>
                      );
                    })
                ) : (
                    <div className="text-center py-4 bg-gray-50 rounded-lg text-sm text-gray-500">No products are below their low-stock alert level.</div>
                )}
              </div>
            </div>

            {/* Stock Movement */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
              <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <div className="p-1.5 bg-indigo-50 rounded-lg">
                  <ArrowUpDown size={16} className="text-indigo-600" />
                </div>
                Recent Movements
              </h2>
              <div className="space-y-1">
                {movement.length > 0 ? (
                    movement.slice(0, 5).map((m, i) => (
                        <div key={i} className="flex justify-between items-center text-sm p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors">
                          <span className="text-gray-500 text-xs font-medium">{m.date}</span>
                          <div className="flex items-center bg-gray-50 px-2 py-1 rounded-md">
                            <span className="text-emerald-600 font-bold">+{m.stockIn}</span>
                            <span className="text-gray-300 mx-2">/</span>
                            <span className="text-rose-500 font-bold">-{m.stockOut}</span>
                          </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-4 bg-gray-50 rounded-lg text-sm text-gray-500">Stock movement appears after orders, returns, or manual updates.</div>
                )}
              </div>
            </div>

            {/* Stock Adjustments */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
              <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <div className="p-1.5 bg-purple-50 rounded-lg">
                  <SlidersHorizontal size={16} className="text-purple-600" />
                </div>
                Adjustments
              </h2>
              <div className="space-y-1">
                {adjustments.length > 0 ? (
                    adjustments.slice(0, 5).map((a, i) => (
                        <div key={i} className="flex justify-between items-center text-sm p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                          <span className="text-gray-700 font-medium truncate pr-2 group-hover:text-purple-600">{a.title}</span>
                          <span className={`px-2 py-1 rounded-md text-xs font-bold flex-shrink-0 ${a.totalAdjustment >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {a.totalAdjustment > 0 ? '+' : ''}{a.totalAdjustment}
                    </span>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-4 bg-gray-50 rounded-lg text-sm text-gray-500">Manual stock changes will appear here after you adjust inventory.</div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* TOP PRODUCTS TABLE */}
        {topProducts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 rounded-lg">
                    <BarChart2 size={18} className="text-amber-500" />
                  </div>
                  Top Selling Products
                </h2>
                <button className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 transition-colors">
                  View All <ChevronRight size={16} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-4 px-6 font-semibold">Product Name</th>
                    <th className="py-4 px-6 font-semibold text-right">Unit Price</th>
                    <th className="py-4 px-6 font-semibold text-right">Total Units Sold</th>
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                  {topProducts.map((p, i) => (
                      <tr key={i} className="hover:bg-blue-50/30 transition-colors duration-200 group">
                        <td className="py-4 px-6 font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {p.title}
                        </td>
                        <td className="py-4 px-6 text-right text-gray-500 font-medium">
                          ৳{p.price.toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        {p.totalSold} sold
                      </span>
                        </td>
                      </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </div>
        )}

      </div>
  );
};

export default Overview;
