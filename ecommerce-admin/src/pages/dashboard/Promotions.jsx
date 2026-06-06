import { useEffect, useState } from 'react';
import { Plus, TicketPercent, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../api/api';

const emptyForm = {
    name: '',
    code: '',
    type: 'PERCENTAGE',
    value: 0,
    minSubtotal: 0,
    expiresAt: '',
    usageLimit: '',
    isActive: true,
    appliesTo: { scope: 'ALL', categories: [] },
    buyXGetY: { buyQuantity: 1, getQuantity: 1, getDiscountPercent: 100 }
};

const Promotions = () => {
    const [promotions, setPromotions] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);

    const loadPromotions = async () => {
        try {
            const { data } = await API.get('/promotions/admin');
            setPromotions(data.data || []);
        } catch {
            toast.error('Failed to load promotions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(loadPromotions, 0);
        return () => clearTimeout(timer);
    }, []);

    const submit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...form,
                code: form.code.toUpperCase(),
                usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
                expiresAt: form.expiresAt || undefined
            };
            await API.post('/promotions/admin', payload);
            toast.success('Promotion created. Customers can use this code at checkout while it is active.');
            setForm(emptyForm);
            loadPromotions();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create promotion');
        }
    };

    const toggle = async (promotion) => {
        try {
            await API.patch(`/promotions/admin/${promotion._id}`, { isActive: !promotion.isActive });
            loadPromotions();
        } catch {
            toast.error('Failed to update promotion');
        }
    };

    const remove = async (promotion) => {
        if (!window.confirm(`Delete ${promotion.code}? Customers will no longer be able to use this code.`)) return;
        try {
            await API.delete(`/promotions/admin/${promotion._id}`);
            toast.success('Promotion deleted');
            loadPromotions();
        } catch {
            toast.error('Failed to delete promotion');
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Discounts and Promotions</h1>
                <p className="text-sm text-slate-500 mt-1">Create checkout codes with clear limits so customers understand when an offer applies.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <form onSubmit={submit} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <Plus size={18} />
                        New Promotion
                    </div>
                    <p className="text-xs text-slate-500">Use short, memorable codes. Set expiry and usage limits for seasonal offers.</p>

                    <input
                        value={form.name}
                        onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                        required
                        className="w-full rounded-lg border border-slate-200 px-3 py-2"
                        placeholder="Promotion name, e.g. Eid sale"
                    />
                    <input
                        value={form.code}
                        onChange={e => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        required
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 uppercase"
                        placeholder="CODE, e.g. SAVE10"
                        title="Customers enter this code at checkout"
                    />
                    <select
                        value={form.type}
                        onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    >
                        <option value="PERCENTAGE">Percentage</option>
                        <option value="FIXED_AMOUNT">Fixed amount</option>
                        <option value="FREE_SHIPPING">Free shipping</option>
                        <option value="FIRST_ORDER">First order</option>
                        <option value="BUY_X_GET_Y">Buy X get Y</option>
                    </select>

                    {form.type !== 'FREE_SHIPPING' && form.type !== 'BUY_X_GET_Y' && (
                        <input
                            type="number"
                            min="0"
                            value={form.value}
                            onChange={e => setForm(prev => ({ ...prev, value: Number(e.target.value) }))}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2"
                            placeholder="Discount value"
                        />
                    )}

                    {form.type === 'BUY_X_GET_Y' && (
                        <div className="grid grid-cols-3 gap-2">
                            <input type="number" min="1" value={form.buyXGetY.buyQuantity} onChange={e => setForm(prev => ({ ...prev, buyXGetY: { ...prev.buyXGetY, buyQuantity: Number(e.target.value) } }))} className="rounded-lg border border-slate-200 px-3 py-2" title="Customer must buy this quantity" />
                            <input type="number" min="1" value={form.buyXGetY.getQuantity} onChange={e => setForm(prev => ({ ...prev, buyXGetY: { ...prev.buyXGetY, getQuantity: Number(e.target.value) } }))} className="rounded-lg border border-slate-200 px-3 py-2" title="Customer receives this quantity" />
                            <input type="number" min="0" max="100" value={form.buyXGetY.getDiscountPercent} onChange={e => setForm(prev => ({ ...prev, buyXGetY: { ...prev.buyXGetY, getDiscountPercent: Number(e.target.value) } }))} className="rounded-lg border border-slate-200 px-3 py-2" title="Discount on the free or discounted item" />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="number"
                            min="0"
                            value={form.minSubtotal}
                            onChange={e => setForm(prev => ({ ...prev, minSubtotal: Number(e.target.value) }))}
                            className="rounded-lg border border-slate-200 px-3 py-2"
                            placeholder="Minimum subtotal"
                        />
                        <input
                            type="number"
                            min="0"
                            value={form.usageLimit}
                            onChange={e => setForm(prev => ({ ...prev, usageLimit: e.target.value }))}
                            className="rounded-lg border border-slate-200 px-3 py-2"
                            placeholder="Usage limit"
                        />
                    </div>

                    <input
                        type="datetime-local"
                        value={form.expiresAt}
                        onChange={e => setForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    />

                    <button className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                        Create promotion
                    </button>
                </form>

                <section className="xl:col-span-2 bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center gap-2 font-semibold text-slate-900">
                        <TicketPercent size={18} />
                        Active Campaigns
                    </div>

                    {loading ? (
                        <div className="p-5 text-sm text-slate-500">Loading promotions...</div>
                    ) : promotions.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">No promotions yet. Create a percentage, free-shipping, or first-order coupon to encourage checkout.</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {promotions.map(promotion => (
                                <div key={promotion._id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-slate-900">{promotion.code}</span>
                                            <span className="text-xs rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{promotion.type}</span>
                                            <span className={`text-xs rounded-full px-2 py-0.5 ${promotion.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {promotion.isActive ? 'Active' : 'Paused'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 mt-1">{promotion.name}</p>
                                        <p className="text-xs text-slate-400 mt-1">Used {promotion.usageCount || 0}{promotion.usageLimit ? ` / ${promotion.usageLimit}` : ''}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => toggle(promotion)}
                                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                            title={promotion.isActive ? 'Pause this code without deleting it' : 'Make this code available at checkout'}
                                        >
                                            {promotion.isActive ? 'Pause' : 'Activate'}
                                        </button>
                                        <button
                                            onClick={() => remove(promotion)}
                                            className="rounded-lg border border-rose-100 px-3 py-2 text-rose-600 hover:bg-rose-50"
                                            title="Delete this promotion permanently"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Promotions;
