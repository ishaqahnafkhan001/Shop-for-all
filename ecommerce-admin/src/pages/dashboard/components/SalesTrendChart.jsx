import { useState } from 'react';
import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function SalesTrendChart({ data = [] }) {
    const [view, setView] = useState('sales');
    if (!data.length) return <p className="report-chart-empty">No recorded activity in this period.</p>;
    return <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="report-chart-legend" aria-hidden="true">{view === 'sales' ? <><span><i className="report-dot bg-indigo-600" />Net product sales</span><span><i className="report-dot bg-emerald-600" />Product gross profit</span></> : <span><i className="report-dot bg-cyan-600" />Delivered orders</span>}</div>
            <div className="report-chart-controls" aria-label="Chart metric"><button type="button" aria-pressed={view === 'sales'} onClick={() => setView('sales')}>Sales</button><button type="button" aria-pressed={view === 'orders'} onClick={() => setView('orders')}>Orders</button></div>
        </div>
        <div className="h-[280px] sm:h-[340px] w-full min-w-0" role="region" aria-label={view === 'sales' ? 'Daily net sales and product gross profit in BDT' : 'Daily delivered orders'}>
            <ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 8 }} accessibilityLayer>
                <CartesianGrid strokeDasharray="3 5" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={40} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={value => value.slice(5)} />
                <YAxis axisLine={false} tickLine={false} width={56} tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={view === 'sales'} tickFormatter={value => new Intl.NumberFormat('en', { notation: 'compact' }).format(value)} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(value, name) => [view === 'sales' ? `BDT ${Number(value).toLocaleString()}` : Number(value).toLocaleString(), name]} />
                {view === 'sales' ? <><Area type="linear" dataKey="revenue" name="Net product sales" fill="#e0e7ff" stroke="#4f46e5" strokeWidth={2} isAnimationActive={false} /><Area type="linear" dataKey="profit" name="Product gross profit" fill="transparent" stroke="#059669" strokeWidth={2} connectNulls={false} isAnimationActive={false} /></> : <Bar dataKey="orders" name="Delivered orders" fill="#0891b2" radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={false} />}
            </ComposedChart></ResponsiveContainer>
        </div>
    </div>;
}
