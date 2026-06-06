import { useEffect, useState } from 'react';
import { Building2, CreditCard, Globe, Megaphone, ShieldAlert, ToggleLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../api/api';

const featureKeys = ['storeBuilder', 'coupons', 'analytics', 'customDomain', 'staffAccounts', 'bulkProductTools'];

const SuperAdminPanel = () => {
    const [overview, setOverview] = useState({});
    const [shops, setShops] = useState([]);
    const [plans, setPlans] = useState([]);
    const [domains, setDomains] = useState([]);
    const [failedPayments, setFailedPayments] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [abuseReports, setAbuseReports] = useState([]);
    const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '', severity: 'Info', audience: 'All' });
    const [planForm, setPlanForm] = useState({ name: 'Starter', monthlyPrice: 0, productLimit: 100, staffLimit: 2 });

    const load = async () => {
        try {
            const [
                overviewRes,
                shopsRes,
                plansRes,
                domainsRes,
                paymentsRes,
                announcementsRes,
                abuseRes
            ] = await Promise.all([
                API.get('/super-admin/overview'),
                API.get('/super-admin/shops'),
                API.get('/super-admin/plans'),
                API.get('/super-admin/domains'),
                API.get('/super-admin/failed-payments'),
                API.get('/super-admin/announcements'),
                API.get('/super-admin/abuse-reports')
            ]);

            setOverview(overviewRes.data.data || {});
            setShops(shopsRes.data.data || []);
            setPlans(plansRes.data.data || []);
            setDomains(domainsRes.data.data || []);
            setFailedPayments(paymentsRes.data.data || []);
            setAnnouncements(announcementsRes.data.data || []);
            setAbuseReports(abuseRes.data.data || []);
        } catch {
            toast.error('Failed to load super admin');
        }
    };

    useEffect(() => {
        const timer = setTimeout(load, 0);
        return () => clearTimeout(timer);
    }, []);

    const updateShop = async (shop, patch) => {
        try {
            await API.patch(`/super-admin/shops/${shop._id}`, patch);
            toast.success('Shop updated');
            load();
        } catch {
            toast.error('Failed to update shop');
        }
    };

    const savePlan = async (e) => {
        e.preventDefault();
        try {
            await API.post('/super-admin/plans', planForm);
            toast.success('Plan saved');
            load();
        } catch {
            toast.error('Failed to save plan');
        }
    };

    const createAnnouncement = async (e) => {
        e.preventDefault();
        try {
            await API.post('/super-admin/announcements', announcementForm);
            toast.success('Announcement published');
            setAnnouncementForm({ title: '', message: '', severity: 'Info', audience: 'All' });
            load();
        } catch {
            toast.error('Failed to publish announcement');
        }
    };

    const updateReport = async (report, status) => {
        try {
            await API.patch(`/super-admin/abuse-reports/${report._id}`, { status });
            load();
        } catch {
            toast.error('Failed to update report');
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Super Admin</h1>
                <p className="text-sm text-slate-500 mt-1">Platform governance, merchant operations, billing visibility, and announcements.</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-lg p-5"><p className="text-sm text-slate-500">Shops</p><p className="text-2xl font-bold">{overview.shops || 0}</p></div>
                <div className="bg-white border border-slate-200 rounded-lg p-5"><p className="text-sm text-slate-500">Active</p><p className="text-2xl font-bold">{overview.activeShops || 0}</p></div>
                <div className="bg-white border border-slate-200 rounded-lg p-5"><p className="text-sm text-slate-500">Revenue</p><p className="text-2xl font-bold">BDT {(overview.platformRevenue || 0).toLocaleString()}</p></div>
                <div className="bg-white border border-slate-200 rounded-lg p-5"><p className="text-sm text-slate-500">Failed Payments</p><p className="text-2xl font-bold">{overview.failedPayments || 0}</p></div>
            </div>

            <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center gap-2 font-semibold text-slate-900">
                    <Building2 size={18} />
                    Shops
                </div>
                <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Shop</th>
                                <th className="px-4 py-3">Owner</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Plan</th>
                                <th className="px-4 py-3">Flags</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {shops.map(shop => (
                                <tr key={shop._id}>
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-slate-900">{shop.shopName}</div>
                                        <div className="text-xs text-slate-500">{shop.subdomain}</div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{shop.owner?.email || '-'}</td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={shop.approvalStatus}
                                            onChange={e => updateShop(shop, { approvalStatus: e.target.value, isActive: e.target.value !== 'Suspended' })}
                                            className="rounded-lg border border-slate-200 px-2 py-1"
                                        >
                                            <option>Pending</option>
                                            <option>Approved</option>
                                            <option>Suspended</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={shop.plan?.name || 'Starter'}
                                            onChange={e => updateShop(shop, { plan: { ...(shop.plan || {}), name: e.target.value } })}
                                            className="rounded-lg border border-slate-200 px-2 py-1"
                                        >
                                            <option>Starter</option>
                                            <option>Growth</option>
                                            <option>Enterprise</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-2 max-w-md">
                                            {featureKeys.map(key => (
                                                <button
                                                    key={key}
                                                    onClick={() => updateShop(shop, {
                                                        featureFlags: {
                                                            ...(shop.featureFlags || {}),
                                                            [key]: !shop.featureFlags?.[key]
                                                        }
                                                    })}
                                                    className={`rounded-full px-2 py-1 text-xs font-semibold ${shop.featureFlags?.[key] ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                                                >
                                                    {key}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form onSubmit={savePlan} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <CreditCard size={18} />
                        Vendor Plans
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <input value={planForm.name} onChange={e => setPlanForm(prev => ({ ...prev, name: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Name" />
                        <input type="number" value={planForm.monthlyPrice} onChange={e => setPlanForm(prev => ({ ...prev, monthlyPrice: Number(e.target.value) }))} className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Monthly price" />
                        <input type="number" value={planForm.productLimit} onChange={e => setPlanForm(prev => ({ ...prev, productLimit: Number(e.target.value) }))} className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Product limit" />
                        <input type="number" value={planForm.staffLimit} onChange={e => setPlanForm(prev => ({ ...prev, staffLimit: Number(e.target.value) }))} className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Staff limit" />
                    </div>
                    <button className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Save plan</button>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {plans.map(plan => <div key={plan._id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm"><b>{plan.name}</b><br />BDT {plan.monthlyPrice}</div>)}
                    </div>
                </form>

                <form onSubmit={createAnnouncement} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <Megaphone size={18} />
                        Announcement
                    </div>
                    <input required value={announcementForm.title} onChange={e => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Title" />
                    <textarea required value={announcementForm.message} onChange={e => setAnnouncementForm(prev => ({ ...prev, message: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2" rows={3} placeholder="Message" />
                    <div className="grid grid-cols-2 gap-3">
                        <select value={announcementForm.severity} onChange={e => setAnnouncementForm(prev => ({ ...prev, severity: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2">
                            <option>Info</option><option>Warning</option><option>Critical</option>
                        </select>
                        <select value={announcementForm.audience} onChange={e => setAnnouncementForm(prev => ({ ...prev, audience: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2">
                            <option>All</option><option>VendorAdmin</option><option>VendorStaff</option>
                        </select>
                    </div>
                    <button className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Publish</button>
                    <div className="space-y-2">
                        {announcements.slice(0, 3).map(item => <div key={item._id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">{item.title}</div>)}
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-slate-900"><Globe size={18} />Domains</div>
                    {domains.map(shop => <div key={shop._id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">{shop.customDomain?.domain} / {shop.customDomain?.status}</div>)}
                </section>
                <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-slate-900"><ToggleLeft size={18} />Failed Payments</div>
                    {failedPayments.map(order => <div key={order._id} className="rounded-lg bg-rose-50 px-3 py-2 text-sm">{order.customer?.email || 'Customer'} / BDT {order.pricing?.total}</div>)}
                </section>
                <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-slate-900"><ShieldAlert size={18} />Abuse Reports</div>
                    {abuseReports.map(report => (
                        <div key={report._id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm space-y-2">
                            <div className="font-semibold">{report.reason}</div>
                            <div className="text-slate-500">{report.shop_id?.shopName || 'Unknown shop'}</div>
                            <select value={report.status} onChange={e => updateReport(report, e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-1">
                                <option>Open</option><option>Reviewing</option><option>Resolved</option><option>Dismissed</option>
                            </select>
                        </div>
                    ))}
                </section>
            </div>
        </div>
    );
};

export default SuperAdminPanel;
