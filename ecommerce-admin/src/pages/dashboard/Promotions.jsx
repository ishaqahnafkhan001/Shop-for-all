import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Layers, Plus, Search, TicketPercent, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../api/api';
import { AdminEmptyState, AdminLoadingState } from '../../components/ui/AdminState.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { hasStaffPermission } from '../../utils/staffPermissions.js';

const emptyForm = {
    name: '',
    code: '',
    type: 'PERCENTAGE',
    value: 0,
    minSubtotal: 0,
    startsAt: '',
    expiresAt: '',
    usageLimit: '',
    isActive: true,
    appliesTo: { scope: 'ALL', categories: [] },
    buyXGetY: { buyQuantity: 1, getQuantity: 1, getDiscountPercent: 100 }
};

const emptySaleForm = {
    name: '',
    scope: 'all_products',
    productIds: [],
    collectionIds: [],
    discountType: 'percentage',
    discountValue: 10,
    priority: 0,
    startsAt: '',
    endsAt: '',
    popup: {
        enabled: false,
        title: '',
        message: '',
        ctaLabel: 'Shop sale',
        ctaUrl: '#products',
        frequency: 'once_per_session',
        timing: 'active',
        displayStartsAt: '',
        desktopImage: '',
        mobileImage: ''
    }
};

const Promotions = () => {
    const { user } = useAuth();
    const [promotions, setPromotions] = useState([]);
    const [scheduledSales, setScheduledSales] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [saleForm, setSaleForm] = useState(emptySaleForm);
    const [saleProductSearch, setSaleProductSearch] = useState('');
    const [saleProductPage, setSaleProductPage] = useState(1);
    const [saleProductOptions, setSaleProductOptions] = useState([]);
    const [saleProductPagination, setSaleProductPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [saleProductLoading, setSaleProductLoading] = useState(false);
    const [saleCollectionSearch, setSaleCollectionSearch] = useState('');
    const [saleCollectionOptions, setSaleCollectionOptions] = useState([]);
    const [saleCollectionLoading, setSaleCollectionLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [statusNow, setStatusNow] = useState(0);
    const canManageScheduledSales = hasStaffPermission(user, 'salesManage');

    const loadPromotions = useCallback(async () => {
        try {
            const { data } = await API.get('/promotions/admin');
            setPromotions(data.data || []);
            try {
                if (!canManageScheduledSales) {
                    setScheduledSales([]);
                    setStatusNow(Date.now());
                    return;
                }
                const salesRes = await API.get('/admin/scheduled-sales');
                setScheduledSales(salesRes.data?.data || []);
            } catch {
                setScheduledSales([]);
            }
            setStatusNow(Date.now());
        } catch {
            toast.error('Failed to load promotions');
        } finally {
            setLoading(false);
        }
    }, [canManageScheduledSales]);

    useEffect(() => {
        const timer = setTimeout(loadPromotions, 0);
        return () => clearTimeout(timer);
    }, [loadPromotions]);

    useEffect(() => {
        if (!canManageScheduledSales || saleForm.scope !== 'selected_products') return undefined;

        let cancelled = false;
        const timer = setTimeout(async () => {
            setSaleProductLoading(true);
            try {
                const { data } = await API.get('/admin/products', {
                    params: {
                        page: saleProductPage,
                        limit: 8,
                        search: saleProductSearch || undefined,
                        sort: 'nameAsc'
                    }
                });
                if (cancelled) return;
                setSaleProductOptions(data.data || []);
                setSaleProductPagination(data.pagination || { page: 1, pages: 1, total: 0 });
            } catch {
                if (!cancelled) setSaleProductOptions([]);
            } finally {
                if (!cancelled) setSaleProductLoading(false);
            }
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [canManageScheduledSales, saleForm.scope, saleProductPage, saleProductSearch]);

    useEffect(() => {
        if (!canManageScheduledSales || saleForm.scope !== 'selected_collections') return undefined;

        let cancelled = false;
        const timer = setTimeout(async () => {
            setSaleCollectionLoading(true);
            try {
                const { data } = await API.get('/admin/scheduled-sales/collections', {
                    params: { search: saleCollectionSearch || undefined, limit: 50 }
                });
                if (cancelled) return;
                const query = saleCollectionSearch.trim().toLowerCase();
                const collections = (data.data || []).filter(collection => {
                    if (!collection.isActive) return false;
                    if (!query) return true;
                    return String(collection.title || '').toLowerCase().includes(query);
                });
                setSaleCollectionOptions(collections);
            } catch {
                if (!cancelled) setSaleCollectionOptions([]);
            } finally {
                if (!cancelled) setSaleCollectionLoading(false);
            }
        }, 250);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [canManageScheduledSales, saleCollectionSearch, saleForm.scope]);

    const getPromotionStatus = (promotion) => {
        const now = statusNow || 0;
        const startsAt = promotion.startsAt ? new Date(promotion.startsAt).getTime() : null;
        const expiresAt = promotion.expiresAt ? new Date(promotion.expiresAt).getTime() : null;

        if (!promotion.isActive) return { label: 'Paused', className: 'bg-slate-100 text-slate-500' };
        if (startsAt && startsAt > now) return { label: 'Scheduled', className: 'bg-amber-50 text-amber-700' };
        if (expiresAt && expiresAt < now) return { label: 'Expired', className: 'bg-rose-50 text-rose-700' };
        return { label: 'Active', className: 'bg-emerald-50 text-emerald-700' };
    };

    const submit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...form,
                code: form.code.toUpperCase(),
                usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
                startsAt: form.startsAt || undefined,
                expiresAt: form.expiresAt || undefined
            };
            await API.post('/promotions/admin', payload);
            toast.success('Promotion created. Checkout will apply it only during the active schedule.');
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

    const submitScheduledSale = async (e) => {
        e.preventDefault();
        try {
            if (saleForm.scope === 'selected_products' && saleForm.productIds.length === 0) {
                toast.error('Select at least one product for this sale.');
                return;
            }
            if (saleForm.scope === 'selected_collections' && saleForm.collectionIds.length === 0) {
                toast.error('Select at least one collection for this sale.');
                return;
            }
            await API.post('/admin/scheduled-sales', {
                ...saleForm,
                popup: {
                    ...saleForm.popup,
                    displayStartsAt: saleForm.popup.displayStartsAt || undefined
                }
            });
            toast.success('Scheduled sale created. Product prices will change automatically during the sale window.');
            setSaleForm(emptySaleForm);
            setSaleProductSearch('');
            setSaleProductPage(1);
            setSaleCollectionSearch('');
            loadPromotions();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create scheduled sale');
        }
    };

    const selectedSaleProducts = saleProductOptions.filter(product => saleForm.productIds.includes(product._id));
    const selectedSaleCollections = saleCollectionOptions.filter(collection => saleForm.collectionIds.includes(collection._id));
    const toggleSaleProduct = (product) => {
        setSaleForm(prev => {
            const exists = prev.productIds.includes(product._id);
            return {
                ...prev,
                productIds: exists
                    ? prev.productIds.filter(id => id !== product._id)
                    : [...prev.productIds, product._id]
            };
        });
    };
    const toggleSaleCollection = (collection) => {
        setSaleForm(prev => {
            const exists = prev.collectionIds.includes(collection._id);
            return {
                ...prev,
                collectionIds: exists
                    ? prev.collectionIds.filter(id => id !== collection._id)
                    : [...prev.collectionIds, collection._id]
            };
        });
    };

    const cancelScheduledSale = async (sale) => {
        if (!window.confirm(`Cancel ${sale.name}? Sale pricing and popup will stop applying.`)) return;
        try {
            await API.delete(`/admin/scheduled-sales/${sale._id}`);
            toast.success('Scheduled sale cancelled');
            loadPromotions();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to cancel scheduled sale');
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block text-xs font-semibold text-slate-600">
                            Start date and time
                            <input
                                type="datetime-local"
                                value={form.startsAt}
                                onChange={e => setForm(prev => ({ ...prev, startsAt: e.target.value }))}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            />
                        </label>
                        <label className="block text-xs font-semibold text-slate-600">
                            End date and time
                            <input
                                type="datetime-local"
                                value={form.expiresAt}
                                onChange={e => setForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            />
                        </label>
                    </div>
                    <p className="text-xs text-slate-500">
                        Scheduled codes are saved now, but checkout will not apply them before the start time.
                    </p>

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
                        <AdminLoadingState
                            title="Loading promotions"
                            description="We are checking active, paused, expired, and usage-limited discount codes."
                            className="m-5 shadow-none"
                        />
                    ) : promotions.length === 0 ? (
                        <AdminEmptyState
                            icon={TicketPercent}
                            title="Create your first offer"
                            description="Use a percentage, free-shipping, first-order, or seasonal code to encourage checkout."
                            className="m-5 shadow-none"
                        />
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {promotions.map(promotion => {
                                const status = getPromotionStatus(promotion);

                                return (
                                <div key={promotion._id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-slate-900">{promotion.code}</span>
                                            <span className="text-xs rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{promotion.type}</span>
                                            <span className={`text-xs rounded-full px-2 py-0.5 ${status.className}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 mt-1">{promotion.name}</p>
                                        <p className="text-xs text-slate-400 mt-1">Used {promotion.usageCount || 0}{promotion.usageLimit ? ` / ${promotion.usageLimit}` : ''}</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {promotion.startsAt ? `Starts ${new Date(promotion.startsAt).toLocaleString()}` : 'Starts immediately'}
                                            {promotion.expiresAt ? ` · Ends ${new Date(promotion.expiresAt).toLocaleString()}` : ' · No end date'}
                                        </p>
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
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            {canManageScheduledSales && (
            <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center gap-2 font-semibold text-slate-900">
                    <CalendarClock size={18} />
                    Scheduled store sales
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                    <form onSubmit={submitScheduledSale} className="p-5 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-100">
                        <p className="text-xs text-slate-500">Create an automatic sale that changes public product prices only inside the selected time window.</p>
                        <input
                            value={saleForm.name}
                            onChange={e => setSaleForm(prev => ({ ...prev, name: e.target.value }))}
                            required
                            className="w-full rounded-lg border border-slate-200 px-3 py-2"
                            placeholder="Sale name, e.g. Weekend flash sale"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <select
                                value={saleForm.discountType}
                                onChange={e => setSaleForm(prev => ({ ...prev, discountType: e.target.value }))}
                                className="rounded-lg border border-slate-200 px-3 py-2"
                            >
                                <option value="percentage">Percentage</option>
                                <option value="fixed">Fixed amount</option>
                            </select>
                            <input
                                type="number"
                                min="0"
                                max={saleForm.discountType === 'percentage' ? 100 : undefined}
                                value={saleForm.discountValue}
                                onChange={e => setSaleForm(prev => ({ ...prev, discountValue: Number(e.target.value) }))}
                                className="rounded-lg border border-slate-200 px-3 py-2"
                                placeholder="Discount"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="block text-xs font-semibold text-slate-600">
                                Sale scope
                                <select
                                    value={saleForm.scope}
                                    onChange={e => setSaleForm(prev => ({
                                        ...prev,
                                        scope: e.target.value,
                                        productIds: e.target.value === 'selected_products' ? prev.productIds : [],
                                        collectionIds: e.target.value === 'selected_collections' ? prev.collectionIds : []
                                    }))}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                >
                                    <option value="all_products">Entire store</option>
                                    <option value="selected_products">Selected products</option>
                                    <option value="selected_collections">Selected collections</option>
                                </select>
                            </label>
                            <label className="block text-xs font-semibold text-slate-600">
                                Priority
                                <input
                                    type="number"
                                    min="0"
                                    value={saleForm.priority}
                                    onChange={e => setSaleForm(prev => ({ ...prev, priority: Number(e.target.value) }))}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                            </label>
                        </div>
                        {saleForm.scope === 'selected_products' && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-black text-slate-900">Selected products</p>
                                        <p className="text-xs text-slate-500">
                                            Sale applies to every variant of each selected product.
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                                        {saleForm.productIds.length} selected
                                    </span>
                                </div>
                                <label className="relative block">
                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={saleProductSearch}
                                        onChange={e => {
                                            setSaleProductSearch(e.target.value);
                                            setSaleProductPage(1);
                                        }}
                                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm"
                                        placeholder="Search products"
                                    />
                                </label>
                                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                                    {saleProductLoading ? (
                                        <p className="rounded-lg bg-white p-3 text-sm font-semibold text-slate-500">Loading products...</p>
                                    ) : saleProductOptions.length === 0 ? (
                                        <p className="rounded-lg bg-white p-3 text-sm font-semibold text-slate-500">No products found.</p>
                                    ) : saleProductOptions.map(product => {
                                        const selected = saleForm.productIds.includes(product._id);
                                        const thumbnail = product.coverMediaId || product.images?.[0] || '';
                                        return (
                                            <button
                                                key={product._id}
                                                type="button"
                                                onClick={() => toggleSaleProduct(product)}
                                                className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition ${
                                                    selected
                                                        ? 'border-indigo-300 bg-indigo-50'
                                                        : 'border-slate-200 bg-white hover:border-indigo-200'
                                                }`}
                                            >
                                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                                    {thumbnail ? (
                                                        <img src={thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                                                    ) : null}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-black text-slate-900">{product.title}</p>
                                                    <p className="text-xs font-semibold text-slate-500">
                                                        {product.status || 'Draft'} · ৳ {product.pricing?.sellingPrice || 0}
                                                        {product.variantCount > 1 ? ` · ${product.variantCount} variants` : ''}
                                                    </p>
                                                </div>
                                                <span className={`rounded-full px-2 py-1 text-[11px] font-black ${
                                                    selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {selected ? 'Selected' : 'Add'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {saleProductPagination.pages > 1 && (
                                    <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-500">
                                        <button
                                            type="button"
                                            disabled={saleProductPage <= 1}
                                            onClick={() => setSaleProductPage(page => Math.max(1, page - 1))}
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
                                        >
                                            Previous
                                        </button>
                                        <span>Page {saleProductPagination.page} of {saleProductPagination.pages}</span>
                                        <button
                                            type="button"
                                            disabled={saleProductPage >= saleProductPagination.pages}
                                            onClick={() => setSaleProductPage(page => page + 1)}
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                                {selectedSaleProducts.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {selectedSaleProducts.map(product => (
                                            <button
                                                key={product._id}
                                                type="button"
                                                onClick={() => toggleSaleProduct(product)}
                                                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600"
                                            >
                                                {product.title}
                                                <X size={12} />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {saleForm.scope === 'selected_collections' && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-black text-slate-900">Selected collections</p>
                                        <p className="text-xs text-slate-500">
                                            Sale applies to every public product inside each selected collection.
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                                        {saleForm.collectionIds.length} selected
                                    </span>
                                </div>
                                <label className="relative block">
                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={saleCollectionSearch}
                                        onChange={e => setSaleCollectionSearch(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm"
                                        placeholder="Search collections"
                                    />
                                </label>
                                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                                    {saleCollectionLoading ? (
                                        <p className="rounded-lg bg-white p-3 text-sm font-semibold text-slate-500">Loading collections...</p>
                                    ) : saleCollectionOptions.length === 0 ? (
                                        <p className="rounded-lg bg-white p-3 text-sm font-semibold text-slate-500">No active collections found.</p>
                                    ) : saleCollectionOptions.map(collection => {
                                        const selected = saleForm.collectionIds.includes(collection._id);
                                        return (
                                            <button
                                                key={collection._id}
                                                type="button"
                                                onClick={() => toggleSaleCollection(collection)}
                                                className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition ${
                                                    selected
                                                        ? 'border-indigo-300 bg-indigo-50'
                                                        : 'border-slate-200 bg-white hover:border-indigo-200'
                                                }`}
                                            >
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-400">
                                                    {collection.image ? (
                                                        <img src={collection.image} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                                                    ) : <Layers size={18} />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-black text-slate-900">{collection.title}</p>
                                                    <p className="text-xs font-semibold text-slate-500">
                                                        {collection.productIds?.length || collection.productCount || 0} products
                                                    </p>
                                                </div>
                                                <span className={`rounded-full px-2 py-1 text-[11px] font-black ${
                                                    selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {selected ? 'Selected' : 'Add'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedSaleCollections.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {selectedSaleCollections.map(collection => (
                                            <button
                                                key={collection._id}
                                                type="button"
                                                onClick={() => toggleSaleCollection(collection)}
                                                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600"
                                            >
                                                {collection.title}
                                                <X size={12} />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="block text-xs font-semibold text-slate-600">
                                Starts
                                <input
                                    type="datetime-local"
                                    value={saleForm.startsAt}
                                    onChange={e => setSaleForm(prev => ({ ...prev, startsAt: e.target.value }))}
                                    required
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                            </label>
                            <label className="block text-xs font-semibold text-slate-600">
                                Ends
                                <input
                                    type="datetime-local"
                                    value={saleForm.endsAt}
                                    onChange={e => setSaleForm(prev => ({ ...prev, endsAt: e.target.value }))}
                                    required
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                            </label>
                        </div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <input
                                type="checkbox"
                                checked={saleForm.popup.enabled}
                                onChange={e => setSaleForm(prev => ({ ...prev, popup: { ...prev.popup, enabled: e.target.checked } }))}
                                className="h-4 w-4 rounded border-slate-300"
                            />
                            Show sale popup on storefront
                        </label>
                        {saleForm.popup.enabled && (
                            <div className="space-y-3 rounded-lg bg-slate-50 p-3">
                                <input
                                    value={saleForm.popup.title}
                                    onChange={e => setSaleForm(prev => ({ ...prev, popup: { ...prev.popup, title: e.target.value } }))}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                    placeholder="Popup title"
                                />
                                <textarea
                                    value={saleForm.popup.message}
                                    onChange={e => setSaleForm(prev => ({ ...prev, popup: { ...prev.popup, message: e.target.value } }))}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                    rows={3}
                                    placeholder="Short popup message"
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <select
                                        value={saleForm.popup.frequency}
                                        onChange={e => setSaleForm(prev => ({ ...prev, popup: { ...prev.popup, frequency: e.target.value } }))}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        title="How often shoppers see this popup"
                                    >
                                        <option value="once_per_session">Once per session</option>
                                        <option value="once_per_day">Once per day</option>
                                        <option value="every_visit">Every visit</option>
                                    </select>
                                    <select
                                        value={saleForm.popup.timing}
                                        onChange={e => setSaleForm(prev => ({ ...prev, popup: { ...prev.popup, timing: e.target.value } }))}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        title="When the popup should appear"
                                    >
                                        <option value="active">During sale</option>
                                        <option value="upcoming">Before sale starts</option>
                                        <option value="both">Before and during sale</option>
                                    </select>
                                </div>
                                {saleForm.popup.timing !== 'active' && (
                                    <label className="block text-xs font-semibold text-slate-600">
                                        Popup display start
                                        <input
                                            type="datetime-local"
                                            value={saleForm.popup.displayStartsAt}
                                            onChange={e => setSaleForm(prev => ({ ...prev, popup: { ...prev.popup, displayStartsAt: e.target.value } }))}
                                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        />
                                    </label>
                                )}
                                <input
                                    value={saleForm.popup.desktopImage}
                                    onChange={e => setSaleForm(prev => ({ ...prev, popup: { ...prev.popup, desktopImage: e.target.value } }))}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                    placeholder="Desktop popup image URL (optional)"
                                />
                                <input
                                    value={saleForm.popup.mobileImage}
                                    onChange={e => setSaleForm(prev => ({ ...prev, popup: { ...prev.popup, mobileImage: e.target.value } }))}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                    placeholder="Mobile popup image URL (optional)"
                                />
                            </div>
                        )}
                        <button className="w-full rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                            Schedule sale
                        </button>
                    </form>
                    <div className="lg:col-span-2 divide-y divide-slate-100">
                        {scheduledSales.length === 0 ? (
                            <AdminEmptyState
                                icon={CalendarClock}
                                title="No scheduled sales"
                                description="Schedule a future sale to automatically update public product prices at the right time."
                                className="m-5 shadow-none"
                            />
                        ) : scheduledSales.map(sale => (
                            <div key={sale._id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-bold text-slate-900">{sale.name}</span>
                                        <span className="text-xs rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{sale.discountType} {sale.discountValue}</span>
                                        <span className="text-xs rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                                            {sale.scope === 'selected_products'
                                                ? `${sale.productIds?.length || 0} products`
                                                : sale.scope === 'selected_collections'
                                                    ? `${sale.collectionIds?.length || 0} collections`
                                                    : 'Entire store'}
                                        </span>
                                        <span className="text-xs rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">{sale.status}</span>
                                    </div>
                                    {sale.scope === 'selected_collections' && sale.selectedCollections?.length > 0 && (
                                        <p className="mt-1 text-xs text-slate-500">
                                            Collections: {sale.selectedCollections.map(collection => collection.title).join(', ')}
                                        </p>
                                    )}
                                    <p className="text-xs text-slate-400 mt-1">
                                        Starts {new Date(sale.startsAt).toLocaleString()} · Ends {new Date(sale.endsAt).toLocaleString()}
                                        {sale.popup?.enabled ? ' · Popup enabled' : ''}
                                    </p>
                                </div>
                                {sale.status !== 'cancelled' && sale.status !== 'ended' && (
                                    <button
                                        onClick={() => cancelScheduledSale(sale)}
                                        className="rounded-lg border border-rose-100 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                                    >
                                        Cancel sale
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            )}
        </div>
    );
};

export default Promotions;
