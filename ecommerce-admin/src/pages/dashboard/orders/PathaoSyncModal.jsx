import { useEffect, useState } from 'react';
import {
    AlertCircle,
    CheckCircle2,
    Loader2,
    MapPin,
    PackageCheck,
    Search,
    Truck,
    X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../../api/api';

const PathaoSyncModal = ({
                             isOpen,
                             onClose,
                             order,
                             onSyncSuccess,
                             onJustConfirm,
                             onConfirmBeforeSync,
                             courierSettings
                         }) => {
    const [loading, setLoading] = useState(false);
    const [orderConfirmed, setOrderConfirmed] = useState(false);
    const [provider, setProvider] = useState('pathao');
    const [formData, setFormData] = useState({
        recipient_name: '',
        recipient_phone: '',
        recipient_address: '',
        amount_to_collect: 0,
        item_weight: '0.5',
        special_instruction: ''
    });
    const [redxData, setRedxData] = useState({
        deliveryArea: '',
        deliveryAreaId: '',
        parcelWeight: 500,
        instruction: '',
        declaredValue: '',
        isClosedBox: true
    });
    const [redxAreaSearch, setRedxAreaSearch] = useState({
        districtName: '',
        postCode: ''
    });
    const [redxAreaResults, setRedxAreaResults] = useState([]);
    const [redxAreaLoading, setRedxAreaLoading] = useState(false);

    const pathaoConfigured = Boolean(courierSettings?.pathao?.configured && courierSettings?.pathao?.enabled);
    const redxConfigured = Boolean(courierSettings?.redx?.configured && courierSettings?.redx?.enabled);
    const hasConfiguredCourier = pathaoConfigured || redxConfigured;

    const orderCode = order?._id ? `#${String(order._id).slice(-6).toUpperCase()}` : '';

    useEffect(() => {
        if (!order) return;

        queueMicrotask(() => {
            setOrderConfirmed(order.status === 'Confirmed');
            setFormData({
                recipient_name: order.shipping?.address?.fullName || order.customer?.fullName || '',
                recipient_phone: order.shipping?.address?.phone || '',
                recipient_address: `${order.shipping?.address?.addressLine || ''}, ${order.shipping?.address?.city || ''}`
                    .trim()
                    .replace(/^,|,$/g, ''),
                amount_to_collect: order.payment?.method === 'COD' ? order.pricing?.total : 0,
                item_weight: '0.5',
                special_instruction: order.notes || ''
            });
            setRedxData((previous) => ({
                ...previous,
                parcelWeight: 500,
                instruction: order.notes || '',
                declaredValue: order.pricing?.subtotal || order.pricing?.total || ''
            }));
            setRedxAreaResults([]);
            setRedxAreaSearch({ districtName: '', postCode: '' });
        });
    }, [order]);

    useEffect(() => {
        const preferredProvider = courierSettings?.defaultCourier === 'redx' && redxConfigured
            ? 'redx'
            : courierSettings?.defaultCourier === 'pathao' && pathaoConfigured
                ? 'pathao'
                : pathaoConfigured
                    ? 'pathao'
                    : redxConfigured
                        ? 'redx'
                        : 'pathao';
        queueMicrotask(() => setProvider(preferredProvider));
    }, [courierSettings, pathaoConfigured, redxConfigured]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !loading) onClose();
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, loading, onClose]);

    if (!isOpen || !order) return null;

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((previous) => ({ ...previous, [name]: value }));
    };

    const handleSearchRedxAreas = async () => {
        if (!redxAreaSearch.districtName.trim() && !redxAreaSearch.postCode.trim()) {
            toast.error('Enter a district or post code to search');
            return;
        }

        setRedxAreaLoading(true);

        try {
            const { data } = await API.post('/admin/shipping/couriers/redx/areas/search', {
                districtName: redxAreaSearch.districtName,
                postCode: redxAreaSearch.postCode
            });

            const areas = data.data?.areas || [];
            setRedxAreaResults(areas);
            if (areas.length === 0) toast('No RedX areas found for this search');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to search RedX areas');
        } finally {
            setRedxAreaLoading(false);
        }
    };

    const handleSyncPathao = async () => {
        if (!hasConfiguredCourier || (provider === 'pathao' && !pathaoConfigured) || (provider === 'redx' && !redxConfigured)) {
            toast.error('Enable and configure the selected courier in Shipping Settings first');
            return;
        }

        if (provider === 'pathao' && (!formData.recipient_name || !formData.recipient_phone || !formData.recipient_address)) {
            toast.error('Please fill in all required recipient fields');
            return;
        }

        if (provider === 'redx' && (!redxData.deliveryArea || !redxData.deliveryAreaId)) {
            toast.error('Select a RedX delivery area first');
            return;
        }

        setLoading(true);

        try {
            if (!orderConfirmed && typeof onConfirmBeforeSync === 'function') {
                const confirmed = await onConfirmBeforeSync();
                if (!confirmed) return;
                setOrderConfirmed(true);
            }

            const { data } = provider === 'redx'
                ? await API.post(`/admin/orders/${order._id}/courier`, {
                    provider: 'redx',
                    shipmentInput: {
                        deliveryArea: redxData.deliveryArea,
                        deliveryAreaId: redxData.deliveryAreaId,
                        parcelWeight: redxData.parcelWeight,
                        instruction: redxData.instruction,
                        declaredValue: redxData.declaredValue,
                        isClosedBox: redxData.isClosedBox
                    }
                })
                : await API.post(`/admin/orders/${order._id}/pathao`, formData);

            toast.success(data.status === 'queued'
                ? `${provider === 'redx' ? 'RedX parcel' : 'Pathao sync'} queued for processing.`
                : data.message || 'Courier shipment queued');

            onSyncSuccess(data.data || null);
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create courier shipment');
        } finally {
            setLoading(false);
        }
    };

    const handleJustConfirm = async () => {
        if (loading) return;
        setLoading(true);
        try {
            await onJustConfirm();
        } finally {
            setLoading(false);
        }
    };

    const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';
    const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-700';

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !loading) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="courier-modal-title"
                className="flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl sm:max-h-[92vh] sm:max-w-2xl sm:rounded-3xl"
            >
                <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                                <Truck size={21} aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 id="courier-modal-title" className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl">
                                        Create courier shipment
                                    </h2>
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600">
                                        {orderCode}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    Confirm the order and send its delivery details to your courier.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            aria-label="Close courier shipment modal"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40"
                        >
                            <X size={19} aria-hidden="true" />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3 sm:p-4">
                            <div className="col-span-2 min-w-0 sm:col-span-1">
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Recipient</p>
                                <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                                    {order.shipping?.address?.fullName || order.customer?.fullName || 'Unknown customer'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Payment</p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">{order.payment?.method || '—'}</p>
                            </div>
                            <div className="text-right sm:text-left">
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Order total</p>
                                <p className="mt-1 text-sm font-bold text-slate-950">
                                    ৳ {Number(order.pricing?.total || 0).toLocaleString('en-BD')}
                                </p>
                            </div>
                        </div>

                        {!hasConfiguredCourier && (
                            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700">
                                <AlertCircle className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
                                <div>
                                    <p className="font-semibold">No courier is configured</p>
                                    <p className="mt-0.5 text-xs leading-5 text-rose-600">Open Shipping Settings and configure Pathao or RedX before creating a parcel.</p>
                                </div>
                            </div>
                        )}

                        <section>
                            <div className="mb-2.5 flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Courier service</h3>
                                    <p className="mt-0.5 text-xs text-slate-500">Choose where this shipment should be created.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => setProvider('pathao')}
                                    disabled={!pathaoConfigured || loading}
                                    className={`flex min-h-[64px] items-center justify-between rounded-2xl border p-3.5 text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 ${provider === 'pathao' && pathaoConfigured
                                        ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-100'
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                                >
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Pathao</p>
                                        <p className="mt-0.5 text-xs text-slate-500">Parcel delivery</p>
                                    </div>
                                    {provider === 'pathao' && pathaoConfigured && <CheckCircle2 size={19} className="text-indigo-600" aria-hidden="true" />}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setProvider('redx')}
                                    disabled={!redxConfigured || loading}
                                    className={`flex min-h-[64px] items-center justify-between rounded-2xl border p-3.5 text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 ${provider === 'redx' && redxConfigured
                                        ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-100'
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                                >
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">RedX</p>
                                        <p className="mt-0.5 text-xs text-slate-500">Courier delivery</p>
                                    </div>
                                    {provider === 'redx' && redxConfigured && <CheckCircle2 size={19} className="text-indigo-600" aria-hidden="true" />}
                                </button>
                            </div>
                        </section>

                        <div className="h-px bg-slate-100" />

                        {provider === 'pathao' ? (
                            <section className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Recipient & parcel</h3>
                                    <p className="mt-0.5 text-xs text-slate-500">Review the delivery information before submitting.</p>
                                </div>

                                <div>
                                    <label htmlFor="recipient_name" className={labelClass}>Recipient name <span className="text-rose-500">*</span></label>
                                    <input
                                        id="recipient_name"
                                        type="text"
                                        name="recipient_name"
                                        value={formData.recipient_name}
                                        onChange={handleChange}
                                        className={inputClass}
                                        autoComplete="name"
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="recipient_phone" className={labelClass}>Phone number <span className="text-rose-500">*</span></label>
                                        <input
                                            id="recipient_phone"
                                            type="tel"
                                            name="recipient_phone"
                                            value={formData.recipient_phone}
                                            onChange={handleChange}
                                            className={inputClass}
                                            autoComplete="tel"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="item_weight" className={labelClass}>Weight (kg)</label>
                                        <input
                                            id="item_weight"
                                            type="number"
                                            min="0.1"
                                            step="0.1"
                                            name="item_weight"
                                            value={formData.item_weight}
                                            onChange={handleChange}
                                            className={inputClass}
                                            inputMode="decimal"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="recipient_address" className={labelClass}>Full delivery address <span className="text-rose-500">*</span></label>
                                    <textarea
                                        id="recipient_address"
                                        name="recipient_address"
                                        rows="3"
                                        value={formData.recipient_address}
                                        onChange={handleChange}
                                        className={`${inputClass} h-auto min-h-[92px] resize-y py-3 leading-6`}
                                        autoComplete="street-address"
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="amount_to_collect" className={labelClass}>Amount to collect (৳)</label>
                                        <input
                                            id="amount_to_collect"
                                            type="number"
                                            min="0"
                                            name="amount_to_collect"
                                            value={formData.amount_to_collect}
                                            onChange={handleChange}
                                            className={`${inputClass} font-semibold`}
                                            inputMode="decimal"
                                        />
                                        <p className="mt-1.5 text-[11px] text-slate-500">Use 0 for prepaid orders.</p>
                                    </div>
                                    <div>
                                        <label htmlFor="special_instruction" className={labelClass}>Special instruction</label>
                                        <input
                                            id="special_instruction"
                                            type="text"
                                            name="special_instruction"
                                            placeholder="e.g. Call before delivery"
                                            value={formData.special_instruction}
                                            onChange={handleChange}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            </section>
                        ) : (
                            <section className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">RedX parcel details</h3>
                                    <p className="mt-0.5 text-xs text-slate-500">Find the exact delivery area first, then review parcel details.</p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 sm:p-4">
                                    <div className="flex items-start gap-2.5">
                                        <MapPin className="mt-0.5 shrink-0 text-indigo-500" size={17} aria-hidden="true" />
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Find RedX delivery area</p>
                                            <p className="mt-1 text-xs leading-5 text-slate-500">Search by district, post code, or both.</p>
                                        </div>
                                    </div>

                                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                                        <input
                                            type="text"
                                            value={redxAreaSearch.districtName}
                                            onChange={(event) => setRedxAreaSearch((previous) => ({
                                                ...previous,
                                                districtName: event.target.value
                                            }))}
                                            className={inputClass}
                                            placeholder="District, e.g. Dhaka"
                                            aria-label="RedX district"
                                        />
                                        <input
                                            type="text"
                                            value={redxAreaSearch.postCode}
                                            onChange={(event) => setRedxAreaSearch((previous) => ({
                                                ...previous,
                                                postCode: event.target.value
                                            }))}
                                            className={inputClass}
                                            placeholder="Post code, e.g. 1207"
                                            aria-label="RedX post code"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSearchRedxAreas}
                                            disabled={redxAreaLoading}
                                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {redxAreaLoading
                                                ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                                                : <Search size={16} aria-hidden="true" />}
                                            {redxAreaLoading ? 'Searching' : 'Search'}
                                        </button>
                                    </div>

                                    {redxAreaResults.length > 0 && (
                                        <div className="mt-3">
                                            <label htmlFor="redx_area_result" className={labelClass}>Matching areas</label>
                                            <select
                                                id="redx_area_result"
                                                value={redxData.deliveryAreaId}
                                                onChange={(event) => {
                                                    const area = redxAreaResults.find((item) => String(item.id) === event.target.value);
                                                    setRedxData((previous) => ({
                                                        ...previous,
                                                        deliveryAreaId: event.target.value,
                                                        deliveryArea: area?.name || ''
                                                    }));
                                                }}
                                                className={inputClass}
                                            >
                                                <option value="">Select RedX area</option>
                                                {redxAreaResults.map((area) => (
                                                    <option key={area.id} value={area.id}>
                                                        {area.name} · {area.post_code} · {area.division_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="redx_delivery_area" className={labelClass}>Delivery area <span className="text-rose-500">*</span></label>
                                        <input
                                            id="redx_delivery_area"
                                            type="text"
                                            value={redxData.deliveryArea}
                                            onChange={(event) => setRedxData((previous) => ({ ...previous, deliveryArea: event.target.value }))}
                                            className={inputClass}
                                            placeholder="e.g. Mirpur"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="redx_delivery_area_id" className={labelClass}>Delivery area ID <span className="text-rose-500">*</span></label>
                                        <input
                                            id="redx_delivery_area_id"
                                            type="text"
                                            value={redxData.deliveryAreaId}
                                            onChange={(event) => setRedxData((previous) => ({ ...previous, deliveryAreaId: event.target.value }))}
                                            className={inputClass}
                                            placeholder="RedX area ID"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="redx_weight" className={labelClass}>Parcel weight (grams)</label>
                                        <input
                                            id="redx_weight"
                                            type="number"
                                            min="1"
                                            value={redxData.parcelWeight}
                                            onChange={(event) => setRedxData((previous) => ({ ...previous, parcelWeight: event.target.value }))}
                                            className={inputClass}
                                            inputMode="numeric"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="redx_declared_value" className={labelClass}>Declared value (৳)</label>
                                        <input
                                            id="redx_declared_value"
                                            type="number"
                                            min="0"
                                            value={redxData.declaredValue}
                                            onChange={(event) => setRedxData((previous) => ({ ...previous, declaredValue: event.target.value }))}
                                            className={inputClass}
                                            inputMode="decimal"
                                        />
                                    </div>
                                </div>

                                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:bg-slate-50">
                                    <input
                                        type="checkbox"
                                        checked={redxData.isClosedBox}
                                        onChange={(event) => setRedxData((previous) => ({ ...previous, isClosedBox: event.target.checked }))}
                                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span>
                                        <span className="block text-sm font-semibold text-slate-800">Closed box parcel</span>
                                        <span className="mt-0.5 block text-xs leading-5 text-slate-500">Keep enabled when the package is sealed before courier pickup.</span>
                                    </span>
                                </label>

                                <div>
                                    <label htmlFor="redx_instruction" className={labelClass}>Instruction</label>
                                    <input
                                        id="redx_instruction"
                                        type="text"
                                        value={redxData.instruction}
                                        onChange={(event) => setRedxData((previous) => ({ ...previous, instruction: event.target.value }))}
                                        className={inputClass}
                                        placeholder="e.g. Call before delivery"
                                    />
                                </div>
                            </section>
                        )}
                    </div>
                </div>

                <footer className="shrink-0 border-t border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:py-4">
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <button
                            type="button"
                            onClick={handleJustConfirm}
                            disabled={loading}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? 'Please wait…' : 'Confirm order only'}
                        </button>

                        <button
                            type="button"
                            onClick={handleSyncPathao}
                            disabled={loading || !hasConfiguredCourier}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                        >
                            {loading
                                ? <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                                : <PackageCheck size={17} aria-hidden="true" />}
                            {loading
                                ? 'Creating shipment…'
                                : `Confirm & send to ${provider === 'redx' ? 'RedX' : 'Pathao'}`}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default PathaoSyncModal;
