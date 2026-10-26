import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
        <div className="rounded-xl border border-gray-100 bg-white/90 p-4 shadow-xl backdrop-blur-md">
            <p className="mb-2 text-sm font-semibold text-gray-800">{label}</p>
            {payload.map((entry, index) => (
                <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
                    {entry.name}: <span className="font-bold">৳{Number(entry.value || 0).toLocaleString()}</span>
                </p>
            ))}
        </div>
    );
};

const DashboardRevenueChart = ({ data = [] }) => (
    <div className="h-full flex flex-col"><div className="report-chart-legend"><span><i className="report-dot bg-blue-500" />Net product sales</span><span><i className="report-dot bg-emerald-500" />Product gross profit</span></div><div className="min-h-0 flex-1">
    <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            <Bar dataKey="Revenue" name="Net product sales" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={40} isAnimationActive={false} />
            <Bar dataKey="Profit" name="Product gross profit" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={40} isAnimationActive={false} />
        </BarChart>
    </ResponsiveContainer></div></div>
);

export default DashboardRevenueChart;
