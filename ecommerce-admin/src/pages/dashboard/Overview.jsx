import { useState, useEffect } from 'react';
import {
  DollarSign, Package, ShoppingCart, TrendingUp, AlertTriangle,
  BarChart2, ArrowUpDown, SlidersHorizontal
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import API from '../../api/api';
import StatCard from '../../components/dashboard/StatCard';

const Overview = () => {
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
        const [
          statsRes,
          revenueRes,
          movementRes,
          adjustmentRes,
          topRes,
          lowRes
        ] = await Promise.all([
          API.get('/admin/dashboard-stats').catch(() => ({ data: { data: {} } })),
          API.get('/admin/inventory/revenue/analytics').catch(() => ({ data: { data: {} } })),
          API.get('/admin/inventory/movement').catch(() => ({ data: { data: [] } })),
          API.get('/admin/inventory/adjustments').catch(() => ({ data: { data: [] } })),
          API.get('/admin/inventory/top-products').catch(() => ({ data: { data: [] } })),
          API.get('/admin/inventory/low-stock').catch(() => ({ data: { data: [] } }))
        ]);

        // FIX: was setStats(statsRes.data) which set stats to { success, data:{...} }
        // making stats.activeOrders always undefined. Must unwrap the inner data object.
        setStats(statsRes.data.data || {});
        setRevenue(revenueRes.data.data || {});
        setMovement(movementRes.data.data || []);
        setAdjustments(adjustmentRes.data.data || []);
        setTopProducts(topRes.data.data || []);
        setLowStock(lowRes.data.data || []);

      } catch (err) {
        toast.error("Dashboard load failed");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
        <div className="flex h-64 items-center justify-center">
          <div className="animate-pulse text-indigo-500 font-medium">Loading dashboard...</div>
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
    { title: 'Revenue',     value: `৳ ${overview.totalRevenue?.toLocaleString() || 0}`,  icon: DollarSign  },
    { title: 'Profit',      value: `৳ ${overview.netProfit?.toLocaleString() || 0}`,      icon: TrendingUp  },
    { title: 'Items Sold',  value: overview.totalItemsSold || 0,                           icon: Package     },
    // FIX: was stats?.activeOrders which was always undefined because stats was the
    // full { success, data } envelope. Now stats is correctly set to data.data.
    { title: 'Active Orders', value: stats?.activeOrders || 0,                            icon: ShoppingCart }
  ];

  return (
      <div className="space-y-6 px-3 sm:px-0">

        {/* HEADER */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-sm text-gray-500">Real-time business insights</p>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((s, i) => (
              <div key={i} className="transition transform hover:-translate-y-1 hover:shadow-lg duration-300">
                <StatCard {...s} />
              </div>
          ))}
        </div>

        {/* MAIN GRID: Chart (2/3) + Side Panel (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* CHART */}
          <div className="bg-white rounded-xl p-5 border shadow-sm lg:col-span-2 transition hover:shadow-md">
            <h2 className="font-semibold mb-4">Financial Performance</h2>
            {chartData.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Profit"  fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
            ) : (
                <div className="text-center text-gray-400 py-20">No revenue data yet</div>
            )}
          </div>

          {/* SIDE PANEL
                    FIX: was 3 raw JSX blocks floating directly inside the grid div with no
                    card wrappers, no titles, and no structural container — completely broken layout.
                    Now each section is a proper self-contained card. */}
          <div className="flex flex-col gap-4">

            {/* Low Stock */}
            <div className="bg-white rounded-xl p-5 border shadow-sm transition hover:shadow-md">
              <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <AlertTriangle size={15} className="text-red-500" /> Low Stock
              </h2>
              {lowStock.length > 0 ? (
                  lowStock.slice(0, 5).map((p, i) => {
                    const totalStock = p.variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
                    return (
                        <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                          <span className="text-gray-700 truncate pr-2">{p.title}</span>
                          <span className="text-red-500 font-bold flex-shrink-0">{totalStock} left</span>
                        </div>
                    );
                  })
              ) : (
                  <p className="text-gray-400 text-sm">All good</p>
              )}
            </div>

            {/* Stock Movement */}
            <div className="bg-white rounded-xl p-5 border shadow-sm transition hover:shadow-md">
              <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <ArrowUpDown size={15} className="text-indigo-500" /> Stock Movement
              </h2>
              {movement.length > 0 ? (
                  movement.slice(0, 5).map((m, i) => (
                      <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                        <span className="text-gray-500">{m.date}</span>
                        <span>
                                        <span className="text-green-600 font-medium">+{m.stockIn}</span>
                                        <span className="text-gray-300 mx-1">|</span>
                                        <span className="text-red-500 font-medium">{m.stockOut}</span>
                                    </span>
                      </div>
                  ))
              ) : (
                  <p className="text-gray-400 text-sm">No activity</p>
              )}
            </div>

            {/* Stock Adjustments */}
            <div className="bg-white rounded-xl p-5 border shadow-sm transition hover:shadow-md">
              <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <SlidersHorizontal size={15} className="text-purple-500" /> Adjustments
              </h2>
              {adjustments.length > 0 ? (
                  adjustments.slice(0, 5).map((a, i) => (
                      <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                        <span className="text-gray-700 truncate pr-2">{a.title}</span>
                        <span className={`font-bold flex-shrink-0 ${a.totalAdjustment >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {a.totalAdjustment > 0 ? '+' : ''}{a.totalAdjustment}
                                    </span>
                      </div>
                  ))
              ) : (
                  <p className="text-gray-400 text-sm">No adjustments</p>
              )}
            </div>

          </div>
        </div>

        {/* TOP PRODUCTS */}
        {topProducts.length > 0 && (
            <div className="bg-white rounded-xl p-5 border shadow-sm">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart2 size={16} className="text-indigo-500" /> Top Selling Products
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase border-b">
                    <th className="pb-2 pr-4">Product</th>
                    <th className="pb-2 pr-4 text-right">Price</th>
                    <th className="pb-2 text-right">Units Sold</th>
                  </tr>
                  </thead>
                  <tbody>
                  {topProducts.map((p, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 pr-4 font-medium text-gray-900">{p.title}</td>
                        <td className="py-2 pr-4 text-right text-gray-500">৳ {p.price}</td>
                        <td className="py-2 text-right font-bold text-indigo-600">{p.totalSold}</td>
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