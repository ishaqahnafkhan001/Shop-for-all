import { ReportHeader, ChartPanel, RankedBars, DistributionRing } from '../../components/dashboard/ReportVisuals.jsx';
import useReportPeriod from '../../hooks/useReportPeriod.js';
import ReportPeriod from '../../components/dashboard/ReportPeriod.jsx';
import ReportComparison from '../../components/dashboard/ReportComparison.jsx';
import { lazy, Suspense, useEffect, useState } from 'react';
import { BarChart3, Package, Repeat, ShoppingCart, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../api/api';

const SalesTrendChart = lazy(() => import('./components/SalesTrendChart.jsx'));

const Stat = ({ title, value, icon: Icon, tone = 'indigo' }) => {
    const toneClass = {
        indigo: 'bg-indigo-50 text-indigo-700',
        emerald: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
        rose: 'bg-rose-50 text-rose-700'
    }[tone];

    return (
        <div className="report-metric bg-white border border-slate-200 rounded-lg p-5">
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
    const { period, setPeriod } = useReportPeriod();
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState('');
    const [refresh, setRefresh] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        const load = async () => {
            try {
                const { data } = await API.get('/admin/analytics', { params: period, signal: controller.signal });
                if (!controller.signal.aborted) setAnalytics(data.data);
            } catch {
                if (!controller.signal.aborted) { setError('Analytics could not load. Retry to view this period.'); toast.error('Failed to load analytics'); }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };
        const timer = setTimeout(() => { setLoading(true); setError(''); load(); }, 0);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [period, refresh]);

    if (loading) {
        return <div className="p-8 text-sm text-slate-500">Loading analytics...</div>;
    }

    if (error) return <div role="alert" className="p-8 space-y-4"><ReportPeriod key={JSON.stringify(period)} period={period} onChange={setPeriod} /><p>{error}</p><button onClick={() => setRefresh(value => value + 1)} className="rounded bg-indigo-700 px-4 py-2 text-white">Retry</button></div>;

    const summary = analytics?.summary || {};
    const salesByDay = analytics?.salesByDay || [];
    const bestSelling = analytics?.bestSellingProducts || [];
    const lowStock = analytics?.lowStockProducts || [];
    const traffic = analytics?.trafficSource || [];

    return (
        <div className="report-workspace max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            <ReportHeader eyebrow="Business intelligence" title="Advanced Analytics" description="Understand the numbers behind your store. Explore sales, orders and the channels your customers use." />

            <div className="flex flex-wrap items-center gap-3">
                <ReportPeriod key={JSON.stringify(period)} period={period} onChange={setPeriod} />
                <button disabled={exporting} className="rounded border px-3 py-2 disabled:opacity-50" onClick={async () => {
                    setExporting(true);
                    try {
                        const response = await API.get('/admin/analytics', { params: { from: analytics.meta.from, to: analytics.meta.to, format: 'csv' }, responseType: 'blob' });
                        const url = URL.createObjectURL(response.data), link = document.createElement('a');
                        link.href = url; link.download = 'sales-report.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
                    } catch { toast.error('Export failed. Please retry.'); } finally { setExporting(false); }
                }}>{exporting ? 'Exporting…' : 'Export CSV'}</button>
                <button className="rounded border px-3 py-2" onClick={() => setRefresh(value => value + 1)}>Refresh</button>
                <span className="text-xs text-slate-500">Asia/Dhaka · Current-day totals are partial · Updated {analytics?.meta?.generatedAt ? new Date(analytics.meta.generatedAt).toLocaleString() : '—'}</span>
            </div>
            {(analytics?.meta?.warnings || []).map(warning => <p key={warning} className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{warning}</p>)}
            <p className="text-xs text-slate-500">Product gross profit excludes courier, payment, advertising and operating costs.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Stat title="Net product sales" value={`BDT ${(summary.revenue || 0).toLocaleString()}`} icon={TrendingUp} tone="emerald" />
                <Stat title="Product gross profit" value={summary.profit === null ? "Unavailable" : `BDT ${(summary.profit || 0).toLocaleString()}`} icon={BarChart3} />
                <Stat title="Average delivered product order" value={`BDT ${Math.round(summary.averageOrderValue || 0).toLocaleString()}`} icon={ShoppingCart} tone="amber" />
                <Stat title="Abandoned Carts" value="Not measured" icon={AlertTriangle} tone="rose" />
                <Stat title="Returning Customers" value={summary.returningCustomers || 0} icon={Repeat} />
                <Stat title="Registered customers · Current" value={summary.totalCustomers || 0} icon={Repeat} tone="emerald" />
                <Stat title="Delivered orders" value={summary.orders || 0} icon={ShoppingCart} tone="amber" />
                <Stat title="Conversion Rate" value="Not measured" icon={BarChart3} />
            </div>

            <ReportComparison comparison={analytics?.comparison} />
            <ChartPanel title="Sales & order trends" description="Delivered sales and completed refunds by occurrence date, in Asia/Dhaka. Exact values are available in the daily sales table below.">
                <Suspense fallback={<div className="report-chart-empty">Loading chart…</div>}><SalesTrendChart data={salesByDay} /></Suspense>
            </ChartPanel>
            <div className="grid gap-6 lg:grid-cols-2">
                <ChartPanel title="From gross to net" description="Product sales in BDT. Discounts and completed refunds are deductions; net sales can be negative.">
                    <RankedBars signed unit="BDT" items={[
                        { label: 'Gross delivered sales', value: summary.gross, color: '#4f46e5' },
                        { label: 'Coupon discounts', value: -Number(summary.discount || 0), color: '#d97706' },
                        { label: 'Completed product refunds', value: -Number(summary.refunds || 0), color: '#e11d48' },
                        { label: 'Net product sales', value: summary.revenue, color: '#059669' },
                    ]} />
                </ChartPanel>
                <ChartPanel title="Order channel mix" description="Share of recorded order counts by channel. This is not marketing attribution.">
                    <DistributionRing label="Orders" items={traffic.map(source => ({ label: source._id || 'Direct', value: source.orders }))} />
                </ChartPanel>
            </div>
            <section className="rounded-lg border border-slate-200 bg-white p-5">
                <h2 className="font-semibold">Sales reconciliation</h2>
                <dl className="mt-3 grid gap-4 sm:grid-cols-3">
                    {[
                        ['Gross delivered product sales', summary.gross], ['Coupon discounts', summary.discount],
                        ['Completed product refunds', summary.refunds], ['Net product sales', summary.revenue],
                        ['Delivery charges on delivered orders', summary.shipping], ['Tax on delivered orders', summary.tax],
                        ['Completed delivery refunds', summary.shippingRefunds], ['Completed tax refunds', summary.taxRefunds],
                    ].map(([label, amount]) => <div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="font-semibold">BDT {Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</dd></div>)}
                </dl>
                <p className="mt-3 text-xs text-slate-500">Delivery charges and tax are separate from product sales. Completed delivery and tax refunds are shown separately. Courier expenses are not yet measured.</p>
            </section>

            <details className="rounded border bg-white p-4">
                <summary className="cursor-pointer font-semibold">Daily sales table</summary>
                <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Daily sales in BDT, Asia/Dhaka</caption><thead><tr>{['Date', 'Delivered orders', 'Net sales (BDT)', 'Product gross profit (BDT)'].map(title => <th scope="col" key={title} className="p-2">{title}</th>)}</tr></thead><tbody>{salesByDay.map(row => <tr key={row.date}><th scope="row" className="p-2">{row.date}</th><td className="p-2">{row.orders}</td><td className="p-2">{row.revenue.toLocaleString()}</td><td className="p-2">{row.profit == null ? 'Unavailable' : row.profit.toLocaleString()}</td></tr>)}</tbody></table>{!salesByDay.length && <p>No recorded activity in this period.</p>}</div>
            </details>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="bg-white border border-slate-200 rounded-lg p-5">
                    <div className="flex items-center gap-2 font-semibold text-slate-900 mb-4">
                        <Package size={18} />
                        Best Selling Products
                    </div>
                    <RankedBars items={bestSelling.slice(0, 6).map(product => ({ label: product.title, value: product.quantity }))} unit="sold" empty="No delivered sales yet. Best sellers appear after orders are delivered." />
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
                            const total = product.stock;
                            return (
                                <div key={`${product.productId}:${product.variantId}`} className="flex justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2">
                                    <span className="text-sm font-medium text-amber-900 truncate">{product.title} · {product.variantLabel}</span>
                                    <span className="text-sm text-amber-700">{total}</span>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-lg p-5">
                    <div className="font-semibold text-slate-900 mb-1">Order channel</div>
                    <p className="text-xs text-slate-500 mb-4">Order channels are not campaign attribution. Values show net product sales.</p>
                    <div className="space-y-3">
                        {traffic.length === 0 ? (
                            <div className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">No traffic source data yet. New orders will show their recorded order channel here.</div>
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
