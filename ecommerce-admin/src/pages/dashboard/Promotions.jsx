import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    AlertCircle, ArrowRight, BadgePercent, CalendarClock, Check, CheckCircle2,
    ChevronDown, ChevronLeft, ChevronRight, Clock3, Copy, Gift, Layers,
    Loader2, LockKeyhole, Package, Pause, Play, Plus, RefreshCw, Search,
    ShieldCheck, ShoppingBag, Sparkles, Tag, TicketPercent, Trash2, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import API from '../../api/api';
import { AdminEmptyState, AdminLoadingState } from '../../components/ui/AdminState.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { hasFeature } from '../../utils/featureAccess.js';
import { hasStaffPermission } from '../../utils/staffPermissions.js';
import { getBrowserTimeZoneLabel, localDateTimeToUtcIso } from '../../utils/dateTime.js';

// Keeps the API payloads identical to the existing Promotions page.
const newCoupon = () => ({
    name: '', code: '', type: 'PERCENTAGE', value: 0, minSubtotal: 0,
    startsAt: '', expiresAt: '', usageLimit: '', isActive: true,
    appliesTo: { scope: 'ALL', categories: [] },
    buyXGetY: { buyQuantity: 1, getQuantity: 1, getDiscountPercent: 100 }
});

const newSale = () => ({
    name: '', scope: 'all_products', productIds: [], collectionIds: [],
    discountType: 'percentage', discountValue: 10, priority: 0,
    startsAt: '', endsAt: '',
    popup: {
        enabled: false, title: '', message: '', ctaLabel: 'Shop sale',
        ctaUrl: '#products', frequency: 'once_per_session', timing: 'active',
        displayStartsAt: '', desktopImage: '', mobileImage: ''
    }
});

const inputClass = 'block min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60';
const secondaryButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50';
const primaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50';

const money = value => `৳${(Number(value) || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;
const validDate = value => value && Number.isFinite(new Date(value).getTime());
const dateLabel = value => validDate(value) ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not set';

function validateWindow(start, end, required = false) {
    if (required && (!start || !end)) return 'Choose both the start and end time.';
    if (start && !validDate(start)) return 'Choose a valid start time.';
    if (end && !validDate(end)) return 'Choose a valid end time.';
    if (start && end && new Date(start).getTime() >= new Date(end).getTime()) {
        return 'The end time must be later than the start time.';
    }
    return null;
}

function safeImageUrl(value) {
    if (!value) return true;
    const trimmed = value.trim();
    if (/\s/.test(trimmed) || [...trimmed].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return false;
    if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) return true;
    try {
        const url = new URL(trimmed);
        return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
    } catch {
        return false;
    }
}

function safePopupLink(value) {
    if (!value) return true;
    const link = value.trim();
    if (!link || link.length > 500 || /\s/.test(link) || link.includes('\\')) return false;
    if ((link.startsWith('/') && !link.startsWith('//')) || link.startsWith('#')) return true;
    try {
        const url = new URL(link);
        return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
    } catch {
        return false;
    }
}

function couponStatus(promotion, now) {
    if (!promotion.isActive) return 'Paused';
    const startsAt = promotion.startsAt ? new Date(promotion.startsAt).getTime() : null;
    const expiresAt = promotion.expiresAt ? new Date(promotion.expiresAt).getTime() : null;
    if (expiresAt !== null && Number.isFinite(expiresAt) && expiresAt <= now) return 'Expired';
    if (Number(promotion.usageLimit) > 0 && Number(promotion.usageCount || 0) >= Number(promotion.usageLimit)) return 'Limit reached';
    if (startsAt !== null && Number.isFinite(startsAt) && startsAt > now) return 'Scheduled';
    return 'Active';
}

function couponValue(promotion) {
    switch (promotion.type) {
        case 'PERCENTAGE': return `${Number(promotion.value) || 0}% off`;
        case 'FIXED_AMOUNT': return `${money(promotion.value)} off`;
        case 'FREE_SHIPPING': return 'Free shipping';
        case 'FIRST_ORDER': return 'First-order offer';
        case 'BUY_X_GET_Y': return `Buy ${promotion.buyXGetY?.buyQuantity || 1}, get ${promotion.buyXGetY?.getQuantity || 1}`;
        default: return String(promotion.type || 'Offer').replaceAll('_', ' ');
    }
}

const tones = {
    Active: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    Scheduled: 'border-blue-100 bg-blue-50 text-blue-700',
    Paused: 'border-slate-200 bg-slate-100 text-slate-600',
    Expired: 'border-rose-100 bg-rose-50 text-rose-700',
    'Limit reached': 'border-amber-100 bg-amber-50 text-amber-700'
};

function StatusPill({ label }) {
    return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${tones[label] || 'border-slate-200 bg-slate-100 text-slate-600'}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{label}
    </span>;
}

function Field({ label, hint, required = false, children }) {
    return <label className="block min-w-0 space-y-1.5">
        <span className="block text-xs font-bold tracking-wide text-slate-700">{label}{required && <span className="ml-1 text-rose-500" aria-hidden="true">*</span>}</span>
        {children}
        {hint && <span className="block text-xs leading-relaxed text-slate-500">{hint}</span>}
    </label>;
}

function SectionHeading({ icon: Icon, title, description, accessory }) {
    return <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon size={18} /></div>
            <div><h3 className="font-bold tracking-tight text-slate-900">{title}</h3>{description && <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>}</div>
        </div>{accessory}
    </div>;
}

function Metric({ icon: Icon, title, value, note, tone = 'blue' }) {
    const colors = tone === 'green' ? 'bg-emerald-50 text-emerald-600' : tone === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600';
    return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-500">{title}</span><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors}`}><Icon size={18} /></span></div>
        <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 tabular-nums">{value}</div>
        <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>;
}

function ConfirmDialog({ target, busy, onCancel, onConfirm }) {
    const cancelRef = useRef(null);
    const dialogRef = useRef(null);
    const busyRef = useRef(busy);
    useEffect(() => { busyRef.current = busy; }, [busy]);
    useEffect(() => {
        if (!target) return undefined;
        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        cancelRef.current?.focus();
        const onKeyDown = event => {
            if (event.key === 'Escape' && !busyRef.current) { event.preventDefault(); onCancel(); }
            if (event.key !== 'Tab') return;
            const elements = Array.from(dialogRef.current?.querySelectorAll('button:not(:disabled)') || []);
            if (!elements.length) return;
            const first = elements[0];
            const last = elements[elements.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
            previousFocus?.focus?.();
        };
    }, [target, onCancel]);
    if (!target) return null;
    return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]">
        <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="promotion-dialog-title" aria-describedby="promotion-dialog-desc" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><AlertCircle size={23} /></div>
            <h2 id="promotion-dialog-title" className="text-lg font-extrabold text-slate-950">{target.kind === 'sale' ? 'Cancel scheduled sale?' : 'Delete promotion?'}</h2>
            <p id="promotion-dialog-desc" className="mt-2 text-sm leading-6 text-slate-600">
                {target.kind === 'sale'
                    ? <>Cancel <strong>{target.name}</strong>? Its sale pricing and storefront popup will stop applying.</>
                    : <>Permanently delete <strong>{target.name}</strong>? Customers will no longer be able to use this coupon code.</>}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button ref={cancelRef} type="button" disabled={busy} onClick={onCancel} className={secondaryButton}>Keep it</button>
                <button type="button" disabled={busy} onClick={onConfirm} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700 focus-visible:ring-4 focus-visible:ring-rose-500/20 disabled:opacity-50">
                    {busy && <Loader2 size={16} className="animate-spin" />}{target.kind === 'sale' ? 'Cancel sale' : 'Delete code'}
                </button>
            </div>
        </div>
    </div>;
}

const Promotions = () => {
    const { user } = useAuth();
    const hasScheduledSalesPlan = hasFeature(user, 'scheduledSales');
    const canManageScheduledSales = hasScheduledSalesPlan && hasStaffPermission(user, 'salesManage');
    const browserTimeZone = getBrowserTimeZoneLabel();
    const [activeTab, setActiveTab] = useState('coupons');
    const [promotions, setPromotions] = useState([]);
    const [scheduledSales, setScheduledSales] = useState([]);
    const [form, setForm] = useState(newCoupon);
    const [saleForm, setSaleForm] = useState(newSale);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [salesLoadError, setSalesLoadError] = useState('');
    const [now, setNow] = useState(Date.now);
    const [couponSearch, setCouponSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [showCouponForm, setShowCouponForm] = useState(true);
    const [showSaleForm, setShowSaleForm] = useState(true);
    const [showPopupSettings, setShowPopupSettings] = useState(false);
    const [couponCreating, setCouponCreating] = useState(false);
    const [saleCreating, setSaleCreating] = useState(false);
    const [busyId, setBusyId] = useState('');
    const [confirmTarget, setConfirmTarget] = useState(null);
    const requestSequence = useRef(0);
    const mutationLocks = useRef(new Set());

    const [saleProductSearch, setSaleProductSearch] = useState('');
    const [saleProductPage, setSaleProductPage] = useState(1);
    const [saleProductOptions, setSaleProductOptions] = useState([]);
    const [saleProductPagination, setSaleProductPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [saleProductLoading, setSaleProductLoading] = useState(false);
    const [saleCollectionSearch, setSaleCollectionSearch] = useState('');
    const [saleCollectionOptions, setSaleCollectionOptions] = useState([]);
    const [saleCollectionLoading, setSaleCollectionLoading] = useState(false);
    // Label caches make selections stay visible after a picker search/page change.
    const [productLabels, setProductLabels] = useState({});
    const [collectionLabels, setCollectionLabels] = useState({});

    const loadPromotions = useCallback(async () => {
        const sequence = ++requestSequence.current;
        setLoading(true);
        setLoadError('');
        setSalesLoadError('');
        try {
            const { data } = await API.get('/promotions/admin');
            if (sequence !== requestSequence.current) return;
            setPromotions(Array.isArray(data?.data) ? data.data : []);
            if (canManageScheduledSales) {
                try {
                    const salesResponse = await API.get('/admin/scheduled-sales');
                    if (sequence !== requestSequence.current) return;
                    setScheduledSales(Array.isArray(salesResponse.data?.data) ? salesResponse.data.data : []);
                } catch {
                    if (sequence === requestSequence.current) setSalesLoadError('Scheduled sales could not be refreshed.');
                }
            } else {
                setScheduledSales([]);
            }
            setNow(Date.now());
        } catch {
            if (sequence === requestSequence.current) setLoadError('Could not load discount codes. Check your connection and retry.');
        } finally {
            if (sequence === requestSequence.current) setLoading(false);
        }
    }, [canManageScheduledSales]);

    useEffect(() => {
        const sequenceRef = requestSequence;
        const loadTimer = setTimeout(() => { void loadPromotions(); }, 0);
        const interval = setInterval(() => setNow(Date.now()), 60_000);
        return () => { ++sequenceRef.current; clearTimeout(loadTimer); clearInterval(interval); };
    }, [loadPromotions]);

    useEffect(() => {
        if (!canManageScheduledSales || activeTab !== 'sales' || saleForm.scope !== 'selected_products') return undefined;
        let cancelled = false;
        const timer = setTimeout(async () => {
            setSaleProductLoading(true);
            try {
                const { data } = await API.get('/admin/products', { params: {
                        page: saleProductPage, limit: 8, search: saleProductSearch || undefined, sort: 'nameAsc'
                    } });
                if (cancelled) return;
                setSaleProductOptions(Array.isArray(data?.data) ? data.data : []);
                setSaleProductPagination(data?.pagination || { page: 1, pages: 1, total: 0 });
            } catch {
                if (!cancelled) { setSaleProductOptions([]); toast.error('Could not load products.'); }
            } finally { if (!cancelled) setSaleProductLoading(false); }
        }, 300);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [activeTab, canManageScheduledSales, saleForm.scope, saleProductPage, saleProductSearch]);

    useEffect(() => {
        if (!canManageScheduledSales || activeTab !== 'sales' || saleForm.scope !== 'selected_collections') return undefined;
        let cancelled = false;
        const timer = setTimeout(async () => {
            setSaleCollectionLoading(true);
            try {
                const { data } = await API.get('/admin/scheduled-sales/collections', {
                    params: { search: saleCollectionSearch || undefined, limit: 50 }
                });
                if (cancelled) return;
                const query = saleCollectionSearch.trim().toLowerCase();
                setSaleCollectionOptions((Array.isArray(data?.data) ? data.data : []).filter(item => {
                    return item.isActive && (!query || String(item.title || '').toLowerCase().includes(query));
                }));
            } catch {
                if (!cancelled) { setSaleCollectionOptions([]); toast.error('Could not load collections.'); }
            } finally { if (!cancelled) setSaleCollectionLoading(false); }
        }, 250);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [activeTab, canManageScheduledSales, saleCollectionSearch, saleForm.scope]);

    const couponCounts = useMemo(() => {
        const counts = { Active: 0, Scheduled: 0, Paused: 0, Expired: 0, 'Limit reached': 0 };
        promotions.forEach(p => { const status = couponStatus(p, now); counts[status] = (counts[status] || 0) + 1; });
        return counts;
    }, [now, promotions]);
    const visibleCoupons = useMemo(() => {
        const q = couponSearch.trim().toLowerCase();
        return promotions.filter(p => {
            if (statusFilter !== 'All' && couponStatus(p, now) !== statusFilter) return false;
            return !q || String(p.name || '').toLowerCase().includes(q) || String(p.code || '').toLowerCase().includes(q);
        });
    }, [promotions, couponSearch, statusFilter, now]);

    const runMutation = async (key, callback) => {
        if (mutationLocks.current.has(key)) return;
        mutationLocks.current.add(key);
        try { await callback(); }
        finally { mutationLocks.current.delete(key); }
    };

    const submitCoupon = async event => {
        event.preventDefault();
        await runMutation('create-coupon', async () => {
            const code = form.code.trim().toUpperCase();
            if (!code || !form.name.trim()) return toast.error('Add a name and coupon code.');
            if (!/^[A-Z0-9_-]{2,40}$/.test(code)) return toast.error('Use 2–40 letters, numbers, hyphens or underscores for the code.');
            const amount = Number(form.value);
            if (!['FREE_SHIPPING', 'BUY_X_GET_Y'].includes(form.type) && (!Number.isFinite(amount) || amount <= 0)) return toast.error('Enter a valid discount greater than zero.');
            if (form.type === 'PERCENTAGE' && amount > 100) return toast.error('A percentage discount cannot exceed 100%.');
            if (!Number.isFinite(Number(form.minSubtotal)) || Number(form.minSubtotal) < 0) return toast.error('Minimum subtotal must be zero or more.');
            if (form.usageLimit !== '' && (!Number.isSafeInteger(Number(form.usageLimit)) || Number(form.usageLimit) < 1)) return toast.error('Usage limit must be a positive whole number.');
            if (form.type === 'BUY_X_GET_Y' && (!Number.isSafeInteger(Number(form.buyXGetY.buyQuantity)) || Number(form.buyXGetY.buyQuantity) < 1 || !Number.isSafeInteger(Number(form.buyXGetY.getQuantity)) || Number(form.buyXGetY.getQuantity) < 1 || Number(form.buyXGetY.getDiscountPercent) < 0 || Number(form.buyXGetY.getDiscountPercent) > 100)) return toast.error('Enter valid Buy X Get Y quantities and a discount from 0 to 100%.');
            const windowError = validateWindow(form.startsAt, form.expiresAt);
            if (windowError) return toast.error(windowError);
            setCouponCreating(true);
            try {
                await API.post('/promotions/admin', {
                    ...form, name: form.name.trim(), code,
                    value: Number(form.value), minSubtotal: Number(form.minSubtotal),
                    buyXGetY: {
                        buyQuantity: Number(form.buyXGetY.buyQuantity),
                        getQuantity: Number(form.buyXGetY.getQuantity),
                        getDiscountPercent: Number(form.buyXGetY.getDiscountPercent)
                    },
                    usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
                    startsAt: localDateTimeToUtcIso(form.startsAt),
                    expiresAt: localDateTimeToUtcIso(form.expiresAt)
                });
                toast.success('Promotion created successfully.');
                setForm(newCoupon());
                await loadPromotions();
            } catch (err) {
                toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to create promotion.');
            } finally { setCouponCreating(false); }
        });
    };

    const toggleCoupon = async promotion => {
        const key = `toggle-${promotion._id}`;
        await runMutation(key, async () => {
            setBusyId(key);
            try {
                await API.patch(`/promotions/admin/${promotion._id}`, { isActive: !promotion.isActive });
                toast.success(promotion.isActive ? 'Promotion paused.' : 'Promotion activated.');
                await loadPromotions();
            } catch { toast.error('Could not change this promotion.'); }
            finally { setBusyId(''); }
        });
    };

    const confirmRemoval = useCallback(() => setConfirmTarget(null), []);
    const removeConfirmed = async () => {
        const target = confirmTarget;
        if (!target) return;
        await runMutation(`remove-${target.id}`, async () => {
            setBusyId(`remove-${target.id}`);
            try {
                if (target.kind === 'sale') {
                    await API.delete(`/admin/scheduled-sales/${target.id}`);
                    toast.success('Scheduled sale cancelled.');
                } else {
                    await API.delete(`/promotions/admin/${target.id}`);
                    toast.success('Promotion deleted.');
                }
                confirmRemoval();
                await loadPromotions();
            } catch (err) {
                toast.error(err.response?.data?.error || `Could not ${target.kind === 'sale' ? 'cancel sale' : 'delete promotion'}.`);
            } finally { setBusyId(''); }
        });
    };

    const toggleSaleProduct = product => {
        setProductLabels(prev => ({ ...prev, [product._id]: product.title }));
        setSaleForm(prev => ({ ...prev, productIds: prev.productIds.includes(product._id)
                ? prev.productIds.filter(id => id !== product._id) : [...prev.productIds, product._id] }));
    };
    const toggleSaleCollection = collection => {
        setCollectionLabels(prev => ({ ...prev, [collection._id]: collection.title }));
        setSaleForm(prev => ({ ...prev, collectionIds: prev.collectionIds.includes(collection._id)
                ? prev.collectionIds.filter(id => id !== collection._id) : [...prev.collectionIds, collection._id] }));
    };

    const submitSale = async event => {
        event.preventDefault();
        if (!canManageScheduledSales) return;
        await runMutation('create-sale', async () => {
            if (!saleForm.name.trim()) return toast.error('Enter a sale name.');
            if (saleForm.scope === 'selected_products' && saleForm.productIds.length === 0) return toast.error('Choose at least one product.');
            if (saleForm.scope === 'selected_collections' && saleForm.collectionIds.length === 0) return toast.error('Choose at least one collection.');
            if (!(Number(saleForm.discountValue) > 0) || (saleForm.discountType === 'percentage' && Number(saleForm.discountValue) > 100)) return toast.error('Enter a valid discount value.');
            if (!Number.isSafeInteger(Number(saleForm.priority)) || Number(saleForm.priority) < 0) return toast.error('Priority must be a non-negative whole number.');
            const windowError = validateWindow(saleForm.startsAt, saleForm.endsAt, true);
            if (windowError) return toast.error(windowError);
            if (saleForm.popup.enabled) {
                const { popup } = saleForm;
                if (!safePopupLink(popup.ctaUrl)) return toast.error('Popup button link must be an internal path, anchor, or HTTPS URL.');
                if (!safeImageUrl(popup.desktopImage) || !safeImageUrl(popup.mobileImage)) return toast.error('Popup images must use HTTPS or a relative image path.');
                if (popup.timing !== 'active' && popup.displayStartsAt) {
                    if (!validDate(popup.displayStartsAt)) return toast.error('Choose a valid popup display start time.');
                    if (new Date(popup.displayStartsAt).getTime() > new Date(saleForm.endsAt).getTime()) return toast.error('Popup display start must be before the sale ends.');
                }
            }
            setSaleCreating(true);
            try {
                await API.post('/admin/scheduled-sales', {
                    ...saleForm, name: saleForm.name.trim(),
                    priority: Number(saleForm.priority), discountValue: Number(saleForm.discountValue),
                    startsAt: localDateTimeToUtcIso(saleForm.startsAt),
                    endsAt: localDateTimeToUtcIso(saleForm.endsAt),
                    popup: {
                        ...saleForm.popup,
                        displayStartsAt: localDateTimeToUtcIso(saleForm.popup.displayStartsAt)
                    }
                });
                toast.success('Scheduled sale created.');
                setSaleForm(newSale());
                setSaleProductSearch(''); setSaleProductPage(1);
                setSaleCollectionSearch(''); setProductLabels({}); setCollectionLabels({});
                setShowPopupSettings(false);
                await loadPromotions();
            } catch (err) {
                toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to schedule sale.');
            } finally { setSaleCreating(false); }
        });
    };

    const copyCode = async code => {
        try {
            if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
            await navigator.clipboard.writeText(String(code));
            toast.success('Coupon code copied.');
        } catch { toast.error('Could not copy. Select and copy the code instead.'); }
    };

    const updatePopup = (key, value) => setSaleForm(prev => ({ ...prev, popup: { ...prev.popup, [key]: value } }));

    return (
        <div className="mx-auto max-w-[1440px] min-w-0 space-y-6 px-3 pb-16 pt-5 sm:px-6 sm:pt-7 lg:px-8">
            {/* Page introduction */}
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-600"><Sparkles size={14} /> Commerce / Marketing</div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Discounts & promotions</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Build thoughtful offers, monitor coupon activity, and plan time-limited sales without leaving your dashboard.</p>
                </div>
                <button type="button" onClick={loadPromotions} disabled={loading} className={`${secondaryButton} self-start`} aria-label="Refresh promotions and scheduled sales">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </header>

            <section aria-label="Promotion overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Metric icon={TicketPercent} title="Total coupon codes" value={promotions.length} note="Created campaigns" />
                <Metric icon={CheckCircle2} title="Active codes" value={couponCounts.Active} note="Available at checkout" tone="green" />
                <Metric icon={Clock3} title="Upcoming codes" value={couponCounts.Scheduled} note="Waiting to begin" tone="amber" />
                <Metric icon={CalendarClock} title={canManageScheduledSales ? 'Scheduled sales' : 'Sales scheduling'} value={canManageScheduledSales ? scheduledSales.length : '—'} note={canManageScheduledSales ? 'Sale campaigns in your account' : 'Subject to plan and staff access'} />
            </section>

            <nav aria-label="Promotion sections" className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                <button type="button" onClick={() => setActiveTab('coupons')} aria-current={activeTab === 'coupons' ? 'page' : undefined}
                        className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition ${activeTab === 'coupons' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <TicketPercent size={17} /> Coupon codes <span className={`rounded-md px-1.5 py-0.5 text-xs ${activeTab === 'coupons' ? 'bg-white/15' : 'bg-slate-100'}`}>{promotions.length}</span>
                </button>
                <button type="button" onClick={() => setActiveTab('sales')} aria-current={activeTab === 'sales' ? 'page' : undefined}
                        className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition ${activeTab === 'sales' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <CalendarClock size={17} /> Scheduled sales {!canManageScheduledSales && <LockKeyhole size={13} aria-label="Access restricted" />}
                </button>
            </nav>

            {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span className="inline-flex items-center gap-2"><AlertCircle size={17} />{loadError}</span><button type="button" onClick={loadPromotions} className="font-bold underline underline-offset-2">Try again</button></div>}

            {activeTab === 'coupons' && (
                <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(340px,0.85fr)_minmax(0,1.55fr)]">
                    {/* Create coupon */}
                    <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-5 py-5 sm:px-6">
                            <SectionHeading icon={Plus} title="Create a coupon" description="Configure the discount and when customers can use it." accessory={
                                <button type="button" onClick={() => setShowCouponForm(v => !v)} aria-expanded={showCouponForm} aria-label={showCouponForm ? 'Collapse coupon form' : 'Expand coupon form'} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><ChevronDown size={19} className={`transition-transform ${showCouponForm ? 'rotate-180' : ''}`} /></button>
                            } />
                        </div>
                        {showCouponForm && <form onSubmit={submitCoupon} className="space-y-5 p-5 sm:p-6">
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                <Field label="Campaign name" required hint="Internal name, e.g. Weekend special">
                                    <input required maxLength={120} className={inputClass} placeholder="Weekend special" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
                                </Field>
                                <Field label="Coupon code" required hint="Letters, numbers, - and _ only">
                                    <div className="relative"><Tag size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" /><input required maxLength={40} className={`${inputClass} pl-10 font-semibold uppercase tracking-wider`} placeholder="SAVE10" value={form.code} onChange={e => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') }))} /></div>
                                </Field>
                            </div>
                            <div className="border-t border-slate-100 pt-5">
                                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Discount rules</p>
                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                    <Field label="Discount type">
                                        <select className={inputClass} value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}>
                                            <option value="PERCENTAGE">Percentage off</option>
                                            <option value="FIXED_AMOUNT">Fixed amount off</option>
                                            <option value="FREE_SHIPPING">Free shipping</option>
                                            <option value="FIRST_ORDER">First order</option>
                                            <option value="BUY_X_GET_Y">Buy X, get Y</option>
                                        </select>
                                    </Field>
                                    {!['FREE_SHIPPING', 'BUY_X_GET_Y'].includes(form.type) && <Field label={form.type === 'PERCENTAGE' ? 'Discount (%)' : 'Discount value'}>
                                        <input required type="number" min="0.01" max={form.type === 'PERCENTAGE' ? 100 : undefined} step="any" className={inputClass} value={form.value} onChange={e => setForm(prev => ({ ...prev, value: e.target.value }))} />
                                    </Field>}
                                </div>
                                {form.type === 'BUY_X_GET_Y' && <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3">
                                    <Field label="Buy qty"><input className={inputClass} type="number" min="1" step="1" value={form.buyXGetY.buyQuantity} onChange={e => setForm(prev => ({ ...prev, buyXGetY: { ...prev.buyXGetY, buyQuantity: e.target.value } }))} /></Field>
                                    <Field label="Get qty"><input className={inputClass} type="number" min="1" step="1" value={form.buyXGetY.getQuantity} onChange={e => setForm(prev => ({ ...prev, buyXGetY: { ...prev.buyXGetY, getQuantity: e.target.value } }))} /></Field>
                                    <Field label="Off (%)"><input className={inputClass} type="number" min="0" max="100" step="any" value={form.buyXGetY.getDiscountPercent} onChange={e => setForm(prev => ({ ...prev, buyXGetY: { ...prev.buyXGetY, getDiscountPercent: e.target.value } }))} /></Field>
                                </div>}
                                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                    <Field label="Minimum cart subtotal" hint="0 means no minimum order amount"><input className={inputClass} type="number" min="0" step="any" value={form.minSubtotal} onChange={e => setForm(prev => ({ ...prev, minSubtotal: e.target.value }))} /></Field>
                                    <Field label="Total usage limit" hint="Leave blank for unlimited uses"><input className={inputClass} type="number" min="1" step="1" placeholder="Unlimited" value={form.usageLimit} onChange={e => setForm(prev => ({ ...prev, usageLimit: e.target.value }))} /></Field>
                                </div>
                            </div>
                            <div className="border-t border-slate-100 pt-5">
                                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Schedule & availability</p>
                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                    <Field label="Starts at" hint="Leave empty to start immediately"><input className={inputClass} type="datetime-local" value={form.startsAt} onChange={e => setForm(prev => ({ ...prev, startsAt: e.target.value }))} /></Field>
                                    <Field label="Ends at" hint="Optional expiration date"><input className={inputClass} type="datetime-local" value={form.expiresAt} onChange={e => setForm(prev => ({ ...prev, expiresAt: e.target.value }))} /></Field>
                                </div>
                                <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500"><Clock3 size={14} className="mt-0.5 shrink-0" />Schedule times use {browserTimeZone}. Checkout applies an offer only during its eligible window.</p>
                                <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <span><span className="block text-sm font-bold text-slate-800">Activate after creation</span><span className="block text-xs text-slate-500">Turn off to keep this coupon paused.</span></span>
                                    <input type="checkbox" checked={form.isActive} onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))} className="h-5 w-5 shrink-0 accent-blue-600" />
                                </label>
                            </div>
                            <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-4">
                                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">Offer preview</p>
                                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                                    <div><p className="font-mono text-lg font-extrabold tracking-wider text-slate-950">{form.code.trim() || 'YOURCODE'}</p><p className="mt-0.5 text-sm text-slate-600">{couponValue(form)}{Number(form.minSubtotal) > 0 ? ` · Min. ${money(form.minSubtotal)}` : ''}</p></div>
                                    <BadgePercent className="text-blue-500" size={26} />
                                </div>
                            </div>
                            <button type="submit" disabled={couponCreating} className={`${primaryButton} w-full`}>{couponCreating ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}{couponCreating ? 'Creating coupon…' : 'Create coupon'}</button>
                        </form>}
                    </section>

                    {/* Coupon management */}
                    <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 p-5 sm:p-6">
                            <SectionHeading icon={TicketPercent} title="Your coupon campaigns" description="Find offers, copy codes, pause campaigns, or remove old coupons." accessory={<span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600">{visibleCoupons.length} shown</span>} />
                            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                                <label className="relative min-w-0 flex-1"><span className="sr-only">Search coupons</span><Search size={17} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" /><input className={`${inputClass} pl-10 pr-10`} placeholder="Search by name or code…" value={couponSearch} onChange={e => setCouponSearch(e.target.value)} />{couponSearch && <button type="button" onClick={() => setCouponSearch('')} aria-label="Clear search" className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={15} /></button>}</label>
                                <label className="sm:w-44"><span className="sr-only">Filter coupon status</span><select className={inputClass} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>All</option><option>Active</option><option>Scheduled</option><option>Paused</option><option>Expired</option><option>Limit reached</option></select></label>
                            </div>
                        </div>
                        {loading && promotions.length === 0 && !loadError ? <div className="p-5"><AdminLoadingState title="Loading coupons" description="Checking your promotion campaigns." /></div>
                            : loadError && promotions.length === 0 ? <p role="status" className="p-6 text-sm text-slate-500">Campaigns are unavailable until a refresh succeeds.</p>
                                : promotions.length === 0 ? <div className="p-5"><AdminEmptyState icon={TicketPercent} title="No coupon codes yet" description="Create an offer using the form to start your first campaign." /></div>
                                    : visibleCoupons.length === 0 ? <div className="px-5 py-14 text-center"><Search size={26} className="mx-auto text-slate-300" /><p className="mt-3 font-bold text-slate-800">No matching coupons</p><p className="mt-1 text-sm text-slate-500">Try another search or status.</p><button type="button" onClick={() => { setCouponSearch(''); setStatusFilter('All'); }} className="mt-4 text-sm font-bold text-blue-600 hover:underline">Clear filters</button></div>
                                        : <div className="divide-y divide-slate-100" aria-live="polite">{visibleCoupons.map(promotion => {
                                            const status = couponStatus(promotion, now);
                                            const usage = Number(promotion.usageCount || 0);
                                            const limit = Number(promotion.usageLimit);
                                            const percent = Number.isFinite(limit) && limit > 0 ? Math.min(100, Math.max(0, usage / limit * 100)) : 0;
                                            const pending = busyId === `toggle-${promotion._id}` || busyId === `remove-${promotion._id}`;
                                            return <article key={promotion._id} className="px-5 py-5 transition hover:bg-slate-50/70 sm:px-6">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-base font-extrabold tracking-wide text-slate-900">{promotion.code}</span><StatusPill label={status} /></div>
                                                        <p className="mt-1 text-sm font-medium text-slate-700">{promotion.name}</p>
                                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Gift size={13} />{couponValue(promotion)}</span><span className="inline-flex items-center gap-1"><Clock3 size={13} />{promotion.expiresAt ? `Ends ${dateLabel(promotion.expiresAt)}` : 'No end date'}</span></div>
                                                        {promotion.startsAt && <p className="mt-1 text-xs text-slate-400">Starts {dateLabel(promotion.startsAt)}</p>}
                                                    </div>
                                                    <button type="button" onClick={() => copyCode(promotion.code)} title="Copy coupon code" aria-label={`Copy code ${promotion.code}`} className={`${secondaryButton} !min-h-9 !px-3`}><Copy size={14} />Copy</button>
                                                </div>
                                                <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                                                    <div className="min-w-0 flex-1"><p className="mb-1.5 text-xs font-semibold text-slate-500">{limit > 0 ? `${usage.toLocaleString()} / ${limit.toLocaleString()} uses` : `${usage.toLocaleString()} uses · Unlimited`}</p>{limit > 0 && <div role="progressbar" aria-valuenow={Math.min(usage, limit)} aria-valuemin={0} aria-valuemax={limit} aria-label={`${promotion.code} usage`} className="h-1.5 max-w-xs overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${percent}%` }} /></div>}</div>
                                                    <div className="flex items-center gap-2 self-end">
                                                        <button type="button" onClick={() => toggleCoupon(promotion)} disabled={pending} className={secondaryButton} aria-label={`${promotion.isActive ? 'Pause' : 'Activate'} ${promotion.code}`}>{pending ? <Loader2 size={15} className="animate-spin" /> : promotion.isActive ? <Pause size={15} /> : <Play size={15} />}{promotion.isActive ? 'Pause' : 'Activate'}</button>
                                                        <button type="button" onClick={() => setConfirmTarget({ kind: 'coupon', id: promotion._id, name: promotion.code })} disabled={pending} title={`Delete ${promotion.code}`} aria-label={`Delete ${promotion.code}`} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-100 text-rose-600 transition hover:bg-rose-50 focus-visible:ring-4 focus-visible:ring-rose-500/20 disabled:opacity-50"><Trash2 size={17} /></button>
                                                    </div>
                                                </div>
                                            </article>;
                                        })}</div>}
                    </section>
                </div>
            )}

            {activeTab === 'sales' && !hasScheduledSalesPlan && (
                <section className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><LockKeyhole size={25} /></div>
                    <h2 className="mt-4 text-xl font-extrabold text-slate-900">Scheduled sales are a plan feature</h2>
                    <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Available on eligible Growth and Pro plans. You can still create and manage standard coupon codes.</p>
                    <Link to="/dashboard/billing" className={`${primaryButton} mt-5`}>Compare plans <ArrowRight size={16} /></Link>
                </section>
            )}

            {activeTab === 'sales' && hasScheduledSalesPlan && !canManageScheduledSales && (
                <section className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><ShieldCheck size={25} /></div>
                    <h2 className="mt-4 text-xl font-extrabold text-slate-900">Staff permission required</h2>
                    <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Your account needs the sales management permission to view and schedule storewide sales. Ask an authorized store administrator.</p>
                </section>
            )}

            {activeTab === 'sales' && canManageScheduledSales && (
                <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(340px,0.95fr)_minmax(0,1.45fr)]">
                    {/* Schedule a sale */}
                    <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white p-5 sm:p-6">
                            <SectionHeading icon={CalendarClock} title="Schedule a store sale" description="Automatically apply sale pricing during a set date range." accessory={
                                <button type="button" onClick={() => setShowSaleForm(v => !v)} aria-expanded={showSaleForm} aria-label={showSaleForm ? 'Collapse sale form' : 'Expand sale form'} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><ChevronDown size={19} className={`transition-transform ${showSaleForm ? 'rotate-180' : ''}`} /></button>
                            } />
                        </div>
                        {showSaleForm && <form onSubmit={submitSale} className="space-y-5 p-5 sm:p-6">
                            <Field label="Sale name" required hint="Only used in your marketing dashboard"><input required maxLength={120} className={inputClass} placeholder="Weekend flash sale" value={saleForm.name} onChange={e => setSaleForm(prev => ({ ...prev, name: e.target.value }))} /></Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Discount type"><select className={inputClass} value={saleForm.discountType} onChange={e => setSaleForm(prev => ({ ...prev, discountType: e.target.value }))}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></Field>
                                <Field label={saleForm.discountType === 'percentage' ? 'Discount (%)' : 'Discount (৳)'} required><input required type="number" min="0.01" max={saleForm.discountType === 'percentage' ? 100 : undefined} step="any" value={saleForm.discountValue} onChange={e => setSaleForm(prev => ({ ...prev, discountValue: e.target.value }))} className={inputClass} /></Field>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                <Field label="Sale applies to"><select className={inputClass} value={saleForm.scope} onChange={e => setSaleForm(prev => ({ ...prev, scope: e.target.value, productIds: e.target.value === 'selected_products' ? prev.productIds : [], collectionIds: e.target.value === 'selected_collections' ? prev.collectionIds : [] }))}>
                                    <option value="all_products">Entire store</option><option value="selected_products">Selected products</option><option value="selected_collections">Selected collections</option>
                                </select></Field>
                                <Field label="Priority" hint="Higher priority can affect overlapping sales"><input type="number" min="0" step="1" className={inputClass} value={saleForm.priority} onChange={e => setSaleForm(prev => ({ ...prev, priority: e.target.value }))} /></Field>
                            </div>

                            {saleForm.scope === 'selected_products' && <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4">
                                <div className="flex items-center justify-between gap-2"><p className="flex items-center gap-2 text-sm font-bold text-slate-900"><Package size={16} className="text-blue-600" /> Choose products</p><span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">{saleForm.productIds.length} selected</span></div>
                                <p className="text-xs text-slate-500">Every variant of a selected product is included.</p>
                                <label className="relative block"><span className="sr-only">Search products for sale</span><Search size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" /><input className={`${inputClass} pl-10`} placeholder="Find products…" value={saleProductSearch} onChange={e => { setSaleProductSearch(e.target.value); setSaleProductPage(1); }} /></label>
                                <div className="max-h-72 space-y-2 overflow-y-auto overscroll-contain pr-1" aria-live="polite">
                                    {saleProductLoading ? <p className="p-3 text-sm text-slate-500">Loading products…</p> : saleProductOptions.length === 0 ? <p className="rounded-xl bg-white p-3 text-sm text-slate-500">No products found.</p> : saleProductOptions.map(product => {
                                        const selected = saleForm.productIds.includes(product._id);
                                        return <button type="button" key={product._id} aria-pressed={selected} onClick={() => toggleSaleProduct(product)} className={`flex w-full min-w-0 items-center gap-3 rounded-xl border p-2.5 text-left transition focus-visible:ring-4 focus-visible:ring-blue-500/20 ${selected ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{selected ? <Check size={18} /> : <ShoppingBag size={17} />}</span>
                                            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{product.title}</span><span className="block text-xs text-slate-500">{product.status || 'Draft'} · {money(product.pricing?.sellingPrice)}{product.variantCount > 1 ? ` · ${product.variantCount} variants` : ''}</span></span>
                                            <span className={`text-xs font-bold ${selected ? 'text-blue-700' : 'text-slate-400'}`}>{selected ? 'Added' : 'Add'}</span>
                                        </button>;
                                    })}
                                </div>
                                {saleProductPagination.pages > 1 && <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs font-semibold text-slate-500"><button type="button" disabled={saleProductPage <= 1 || saleProductLoading} onClick={() => setSaleProductPage(p => Math.max(1, p - 1))} className={secondaryButton}><ChevronLeft size={15} /> Prev</button><span>Page {saleProductPagination.page} of {saleProductPagination.pages}</span><button type="button" disabled={saleProductPage >= saleProductPagination.pages || saleProductLoading} onClick={() => setSaleProductPage(p => p + 1)} className={secondaryButton}>Next <ChevronRight size={15} /></button></div>}
                                {saleForm.productIds.length > 0 && <div className="border-t border-slate-200 pt-3"><div className="mb-2 flex items-center justify-between gap-2"><p className="text-xs font-bold text-slate-600">Selected products</p><button type="button" onClick={() => setSaleForm(prev => ({ ...prev, productIds: [] }))} className="text-xs font-bold text-blue-600 hover:underline">Clear all</button></div><div className="flex flex-wrap gap-2">{saleForm.productIds.map((id, index) => <button type="button" key={id} onClick={() => setSaleForm(prev => ({ ...prev, productIds: prev.productIds.filter(item => item !== id) }))} aria-label={`Remove ${productLabels[id] || `selected product ${index + 1}`}`} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-50"><span className="max-w-40 truncate">{productLabels[id] || `Product ${index + 1}`}</span><X size={13} /></button>)}</div></div>}
                            </div>}

                            {saleForm.scope === 'selected_collections' && <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4">
                                <div className="flex items-center justify-between gap-2"><p className="flex items-center gap-2 text-sm font-bold text-slate-900"><Layers size={16} className="text-blue-600" /> Choose collections</p><span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">{saleForm.collectionIds.length} selected</span></div>
                                <p className="text-xs text-slate-500">The sale applies to all public products in each collection.</p>
                                <label className="relative block"><span className="sr-only">Search collections for sale</span><Search size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" /><input className={`${inputClass} pl-10`} placeholder="Find collections…" value={saleCollectionSearch} onChange={e => setSaleCollectionSearch(e.target.value)} /></label>
                                <div className="max-h-72 space-y-2 overflow-y-auto overscroll-contain pr-1" aria-live="polite">
                                    {saleCollectionLoading ? <p className="p-3 text-sm text-slate-500">Loading collections…</p> : saleCollectionOptions.length === 0 ? <p className="rounded-xl bg-white p-3 text-sm text-slate-500">No active collections found.</p> : saleCollectionOptions.map(collection => {
                                        const selected = saleForm.collectionIds.includes(collection._id);
                                        return <button type="button" key={collection._id} aria-pressed={selected} onClick={() => toggleSaleCollection(collection)} className={`flex w-full min-w-0 items-center gap-3 rounded-xl border p-2.5 text-left transition focus-visible:ring-4 focus-visible:ring-blue-500/20 ${selected ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{selected ? <Check size={18} /> : <Layers size={17} />}</span>
                                            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{collection.title}</span><span className="block text-xs text-slate-500">{collection.productIds?.length || collection.productCount || 0} products</span></span>
                                            <span className={`text-xs font-bold ${selected ? 'text-blue-700' : 'text-slate-400'}`}>{selected ? 'Added' : 'Add'}</span>
                                        </button>;
                                    })}
                                </div>
                                {saleForm.collectionIds.length > 0 && <div className="border-t border-slate-200 pt-3"><div className="mb-2 flex items-center justify-between gap-2"><p className="text-xs font-bold text-slate-600">Selected collections</p><button type="button" onClick={() => setSaleForm(prev => ({ ...prev, collectionIds: [] }))} className="text-xs font-bold text-blue-600 hover:underline">Clear all</button></div><div className="flex flex-wrap gap-2">{saleForm.collectionIds.map((id, index) => <button type="button" key={id} onClick={() => setSaleForm(prev => ({ ...prev, collectionIds: prev.collectionIds.filter(item => item !== id) }))} aria-label={`Remove ${collectionLabels[id] || `selected collection ${index + 1}`}`} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-50"><span className="max-w-40 truncate">{collectionLabels[id] || `Collection ${index + 1}`}</span><X size={13} /></button>)}</div></div>}
                            </div>}

                            <div className="border-t border-slate-100 pt-5"><p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Sale timing</p><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                <Field label="Start date and time" required><input required type="datetime-local" value={saleForm.startsAt} onChange={e => setSaleForm(prev => ({ ...prev, startsAt: e.target.value }))} className={inputClass} /></Field>
                                <Field label="End date and time" required><input required type="datetime-local" value={saleForm.endsAt} onChange={e => setSaleForm(prev => ({ ...prev, endsAt: e.target.value }))} className={inputClass} /></Field>
                            </div><p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Clock3 size={14} />Times use {browserTimeZone}.</p></div>

                            <div className="border-t border-slate-100 pt-5">
                                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                                    <span><span className="block text-sm font-bold text-slate-900">Storefront popup</span><span className="block text-xs leading-5 text-slate-500">Optionally announce this sale to visitors.</span></span>
                                    <input type="checkbox" checked={saleForm.popup.enabled} onChange={e => { updatePopup('enabled', e.target.checked); if (e.target.checked) setShowPopupSettings(true); }} className="h-5 w-5 shrink-0 accent-blue-600" />
                                </label>
                                {saleForm.popup.enabled && <div className="mt-3 space-y-4 rounded-2xl border border-slate-200 p-4">
                                    <button type="button" onClick={() => setShowPopupSettings(v => !v)} aria-expanded={showPopupSettings} className="flex w-full items-center justify-between gap-2 text-left text-sm font-bold text-slate-800">Popup settings <ChevronDown size={17} className={`transition-transform ${showPopupSettings ? 'rotate-180' : ''}`} /></button>
                                    {showPopupSettings && <div className="space-y-3">
                                        <Field label="Popup title"><input className={inputClass} maxLength={140} placeholder="Sale starts now" value={saleForm.popup.title} onChange={e => updatePopup('title', e.target.value)} /></Field>
                                        <Field label="Popup message"><textarea rows={3} maxLength={600} className={inputClass} placeholder="Tell visitors about your offer…" value={saleForm.popup.message} onChange={e => updatePopup('message', e.target.value)} /></Field>
                                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                            <Field label="Display frequency"><select className={inputClass} value={saleForm.popup.frequency} onChange={e => updatePopup('frequency', e.target.value)}><option value="once_per_session">Once per session</option><option value="once_per_day">Once per day</option><option value="every_visit">Every visit</option></select></Field>
                                            <Field label="Show popup"><select className={inputClass} value={saleForm.popup.timing} onChange={e => updatePopup('timing', e.target.value)}><option value="active">During the sale</option><option value="upcoming">Before the sale</option><option value="both">Before and during</option></select></Field>
                                        </div>
                                        {saleForm.popup.timing !== 'active' && <Field label="Popup display starts"><input type="datetime-local" value={saleForm.popup.displayStartsAt} onChange={e => updatePopup('displayStartsAt', e.target.value)} className={inputClass} /></Field>}
                                        <Field label="Desktop image URL (optional)" hint="Use an HTTPS image URL or a relative media path."><input type="text" inputMode="url" className={inputClass} placeholder="https://cdn.example.com/sale.jpg" value={saleForm.popup.desktopImage} onChange={e => updatePopup('desktopImage', e.target.value)} /></Field>
                                        <Field label="Mobile image URL (optional)" hint="Use an HTTPS image URL or a relative media path."><input type="text" className={inputClass} placeholder="/images/sale-mobile.jpg" value={saleForm.popup.mobileImage} onChange={e => updatePopup('mobileImage', e.target.value)} /></Field>
                                    </div>}
                                    <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/70 p-3" aria-label="Popup content preview"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600">Popup text preview</p><p className="mt-2 font-bold text-slate-900">{saleForm.popup.title || 'Your sale announcement'}</p><p className="mt-1 whitespace-pre-line break-words text-xs leading-5 text-slate-600">{saleForm.popup.message || 'Your message will appear here.'}</p></div>
                                </div>}
                            </div>
                            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><div className="flex items-start gap-2"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-blue-600" /><div><p className="text-xs font-bold text-slate-800">Review before scheduling</p><p className="mt-1 text-xs leading-5 text-slate-600">This campaign changes public prices in its selected scope while it is active. Check the dates, product selection and priority carefully.</p></div></div></div>
                            <button disabled={saleCreating} type="submit" className={`${primaryButton} w-full`}>{saleCreating ? <Loader2 size={17} className="animate-spin" /> : <CalendarClock size={17} />}{saleCreating ? 'Scheduling…' : 'Schedule sale'}</button>
                        </form>}
                    </section>

                    {/* Scheduled sales list */}
                    <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 p-5 sm:p-6"><SectionHeading icon={CalendarClock} title="Your scheduled sales" description="Review campaign scope, dates, and storefront announcements." accessory={<span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600">{scheduledSales.length} total</span>} /></div>
                        {salesLoadError && <div role="alert" className="mx-5 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">{salesLoadError} <button onClick={loadPromotions} type="button" className="font-bold underline">Retry</button></div>}
                        {loading && scheduledSales.length === 0 && !salesLoadError ? <div className="p-5"><AdminLoadingState title="Loading scheduled sales" description="Fetching your sale campaigns." /></div>
                            : scheduledSales.length === 0 ? <div className="p-5"><AdminEmptyState icon={CalendarClock} title="No scheduled sales" description="Create a sale for selected products, collections, or your full store." /></div>
                                : <div className="divide-y divide-slate-100">{scheduledSales.map(sale => {
                                    const saleStatus = String(sale.status || 'scheduled');
                                    const ended = saleStatus.toLowerCase() === 'ended' || saleStatus.toLowerCase() === 'cancelled';
                                    const scopeLabel = sale.scope === 'selected_products' ? `${sale.productIds?.length || 0} products` : sale.scope === 'selected_collections' ? `${sale.collectionIds?.length || 0} collections` : 'Entire store';
                                    return <article key={sale._id} className="px-5 py-5 transition hover:bg-slate-50/70 sm:px-6">
                                        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="break-words text-base font-bold text-slate-900">{sale.name}</p><div className="mt-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{sale.discountType === 'percentage' ? `${sale.discountValue}% off` : `${money(sale.discountValue)} off`}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{scopeLabel}</span><StatusPill label={saleStatus.charAt(0).toUpperCase() + saleStatus.slice(1)} /></div></div>
                                            {!ended && <button type="button" onClick={() => setConfirmTarget({ kind: 'sale', id: sale._id, name: sale.name })} disabled={busyId === `remove-${sale._id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-100 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50">Cancel sale</button>}
                                        </div>
                                        <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-2"><div><span className="block font-bold text-slate-500">Starts</span><span className="mt-1 block font-medium text-slate-900">{dateLabel(sale.startsAt)}</span></div><div><span className="block font-bold text-slate-500">Ends</span><span className="mt-1 block font-medium text-slate-900">{dateLabel(sale.endsAt)}</span></div></div>
                                        {sale.scope === 'selected_collections' && sale.selectedCollections?.length > 0 && <p className="mt-3 break-words text-xs text-slate-500">Collections: {sale.selectedCollections.map(item => item.title).join(', ')}</p>}
                                        {sale.popup?.enabled && <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700"><Sparkles size={14} /> Storefront popup enabled</p>}
                                    </article>;
                                })}</div>}
                    </section>
                </div>
            )}

            <ConfirmDialog target={confirmTarget} busy={Boolean(busyId && confirmTarget && busyId === `remove-${confirmTarget.id}`)} onCancel={confirmRemoval} onConfirm={removeConfirmed} />
        </div>
    );
};

export default Promotions;
