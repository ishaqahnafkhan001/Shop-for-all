import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    AlertCircle,
    ArrowUpRight,
    Boxes,
    Check,
    ChevronRight,
    CircleHelp,
    Edit3,
    Eye,
    FilterX,
    Grid2X2,
    Layers3,
    LayoutList,
    Loader2,
    Package,
    Plus,
    Search,
    SlidersHorizontal,
    Trash2,
    X
} from 'lucide-react';

import Table from '../../../components/ui/Table';
import API from '../../../api/api';
import { AdminLoadingState } from '../../../components/ui/AdminState.jsx';
import PaginationBar from '../../../components/ui/PaginationBar.jsx';
import PageRefreshButton from '../../../components/ui/PageRefreshButton.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useProducts } from '../../../hooks/useProducts';
import { useProductSubmissions } from '../../../context/ProductSubmissionContext.jsx';
import { getProductActivityBreakdown, getProductActivityCounts } from '../../../utils/productActivity.js';

const ProductDetailModal = lazy(() => import('../../../components/products/ProductDetailModal.jsx'));

const FILTER_KEYS = ['search', 'category', 'status', 'sort'];
const STATUS_OPTIONS = ['', 'Published', 'Draft', 'Archived'];
const SORT_OPTIONS = [
    ['', 'Newest first'],
    ['oldest', 'Oldest first'],
    ['nameAsc', 'Name: A to Z'],
    ['nameDesc', 'Name: Z to A'],
    ['priceAsc', 'Price: low to high'],
    ['priceDesc', 'Price: high to low']
];
const FILTER_NAMES = {
    search: 'Search',
    category: 'Category',
    status: 'Status',
    sort: 'Sort'
};

const fieldClass =
    'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';
const iconButtonClass =
    'inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-slate-500 transition-colors hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20';

const formatCount = (value) => new Intl.NumberFormat('en-BD').format(Number(value) || 0);
const formatMoney = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '—';
    return `৳${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 2 }).format(amount)}`;
};

const getImageUrl = (product) => {
    // Avoid loading arbitrary schemes (data:, javascript:, file:) or protocol-relative URLs.
    // A coverMediaId can be an opaque identifier, so fall back to a usable image URL.
    for (const candidate of [product?.coverMediaId, product?.images?.[0]]) {
        if (typeof candidate !== 'string') continue;
        const url = candidate.trim();
        if (!url.startsWith('//') && !url.includes('\\') &&
            !/^[a-z][a-z0-9+.-]*:/i.test(url)) return url; // Same-origin relative path.
        try {
            if (new URL(url).protocol === 'https:') return url;
        } catch {
            // An opaque media ID or relative non-root URL cannot be loaded here.
        }
    }
    return null;
};

const getStatus = (product) => {
    if (product?.isArchived || String(product?.status || '').toLowerCase() === 'archived') {
        return 'Archived';
    }
    return product?.isActive ? 'Published' : 'Draft';
};

const getStock = (product) => {
    const stock = Number(product?.totalStock);
    return Number.isFinite(stock) ? Math.max(0, stock) : null;
};

const readUrlFilters = (params) => {
    const search = (params.get('search') || '').slice(0, 120);
    const status = params.get('status') || '';
    const sort = params.get('sort') || '';
    return {
        search,
        category: (params.get('category') || '').slice(0, 120),
        status: STATUS_OPTIONS.includes(status) ? status : '',
        sort: SORT_OPTIONS.some(([value]) => value === sort) ? sort : ''
    };
};

function ProductImage({ product, size = 'small' }) {
    const imageUrl = getImageUrl(product);
    const [failedUrl, setFailedUrl] = useState('');
    const failed = imageUrl === failedUrl;

    return (
        <div className={`relative shrink-0 overflow-hidden border border-slate-200/70 bg-slate-100 ${
            size === 'large' ? 'aspect-[4/3] w-full rounded-2xl' : 'size-14 rounded-xl'
        }`}>
            {imageUrl && !failed ? (
                <img
                    src={imageUrl}
                    alt={product?.title ? `${product.title} thumbnail` : 'Product thumbnail'}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={() => setFailedUrl(imageUrl)}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:transition-none"
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <Package className={size === 'large' ? 'size-11' : 'size-6'} strokeWidth={1.4} />
                </div>
            )}
        </div>
    );
}

function StatusPill({ product }) {
    const status = getStatus(product);
    const classes = {
        Published: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        Draft: 'border-slate-200 bg-slate-100 text-slate-600',
        Archived: 'border-amber-200 bg-amber-50 text-amber-700'
    };
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${classes[status]}`}>
            <span className={`size-1.5 rounded-full ${status === 'Published' ? 'bg-emerald-500' : status === 'Archived' ? 'bg-amber-500' : 'bg-slate-400'}`} />
            {status}
        </span>
    );
}

function StockPill({ product, showLowStock }) {
    const stock = getStock(product);
    if (stock === null) return <span className="text-xs text-slate-400">Stock unavailable</span>;
    if (stock === 0) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                <AlertCircle className="size-3.5" /> Out of stock
            </span>
        );
    }
    if (showLowStock && stock < 5) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                <AlertCircle className="size-3.5" /> Low stock · {formatCount(stock)} left
            </span>
        );
    }
    return <span className="text-sm font-medium text-slate-600">{formatCount(stock)} in stock</span>;
}

function ProductPrice({ product }) {
    const discount = Number(product?.pricing?.discount) || 0;
    const original = product?.pricing?.sellingPrice;
    return (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-bold tracking-tight text-slate-900">{formatMoney(product?.finalPrice)}</span>
            {discount > 0 && (
                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">
                    -{discount}%
                </span>
            )}
            {discount > 0 && original != null && (
                <span className="text-xs text-slate-400 line-through">{formatMoney(original)}</span>
            )}
        </div>
    );
}

function ActionButtons({ product, onPreview, onEdit, onDelete, canDelete, disabled = false, compact = false }) {
    return (
        <div className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
            {!compact && (
                <button type="button" onClick={() => onPreview(product)} className={iconButtonClass}
                        title="View product details" aria-label={`View ${product.title}`}>
                    <Eye className="size-[18px]" strokeWidth={1.8} />
                </button>
            )}
            <button type="button" onClick={() => onEdit(product)} className={`${iconButtonClass} hover:!border-blue-100 hover:!bg-blue-50 hover:!text-blue-700`}
                    title="Edit product" aria-label={`Edit ${product.title}`}>
                <Edit3 className="size-[17px]" strokeWidth={1.8} />
            </button>
            {canDelete && <button type="button" onClick={() => onDelete(product)} disabled={disabled}
                    className={`${iconButtonClass} hover:!border-rose-100 hover:!bg-rose-50 hover:!text-rose-700 disabled:cursor-not-allowed disabled:opacity-40`}
                    title="Delete product" aria-label={`Delete ${product.title}`}>
                <Trash2 className="size-[17px]" strokeWidth={1.8} />
            </button>}
        </div>
    );
}

function ProductCard({ product, showLowStock, onPreview, onEdit, onDelete, canDelete, disabled }) {
    const variants = product.variantCount ?? product.variants?.length ?? 0;
    return (
        <article className="group flex min-w-0 flex-col rounded-[22px] border border-slate-200/80 bg-white p-3 shadow-[0_3px_16px_-10px_rgba(15,23,42,.20)] transition-shadow hover:shadow-[0_12px_30px_-18px_rgba(15,23,42,.35)] sm:p-4">
            <button type="button" onClick={() => onPreview(product)}
                    className="w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
                    aria-label={`View details for ${product.title}`}>
                <ProductImage product={product} size="large" />
            </button>
            <div className="flex min-h-0 flex-1 flex-col px-1 pb-1 pt-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="max-w-[60%] truncate rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {product.category || 'General'}
                    </span>
                    <StatusPill product={product} />
                </div>
                <button type="button" onClick={() => onPreview(product)}
                        className="mb-2 line-clamp-2 text-left text-base font-bold leading-snug text-slate-900 transition-colors hover:text-blue-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                    {product.title || 'Untitled product'}
                </button>
                <ProductPrice product={product} />
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
                    <StockPill product={product} showLowStock={showLowStock} />
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Layers3 className="size-3.5" /> {formatCount(variants)} variants
                    </span>
                </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                <button type="button" onClick={() => onPreview(product)}
                        className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                    Details <ChevronRight className="size-3.5" />
                </button>
                <ActionButtons product={product} onPreview={onPreview} onEdit={onEdit}
                               onDelete={onDelete} canDelete={canDelete} disabled={disabled} compact />
            </div>
        </article>
    );
}

function DeleteConfirmation({ product, busy, error, onCancel, onConfirm }) {
    const dialogRef = useRef(null);
    const cancelRef = useRef(null);

    useEffect(() => {
        cancelRef.current?.focus();
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previousOverflow; };
    }, []);

    const onDialogKeyDown = (event) => {
        if (event.key === 'Escape' && !busy) {
            event.preventDefault();
            onCancel();
        }
        if (event.key !== 'Tab') return;
        const elements = Array.from(dialogRef.current?.querySelectorAll('button:not(:disabled)') || []);
        if (!elements.length) return;
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[3px]"
             onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
            <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="delete-product-title"
                 aria-describedby="delete-product-description" onKeyDown={onDialogKeyDown}
                 className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-6 shadow-2xl sm:p-7">
                <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                    <Trash2 className="size-6" />
                </div>
                <h2 id="delete-product-title" className="text-xl font-bold tracking-tight text-slate-900">Delete this product?</h2>
                <p id="delete-product-description" className="mt-2 break-words text-sm leading-6 text-slate-600">
                    You are about to delete <strong className="text-slate-900">{product.title || 'this product'}</strong>.
                    This may remove it from your catalog. This action cannot be undone here.
                </p>
                {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
                <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button ref={cancelRef} type="button" onClick={onCancel} disabled={busy}
                            className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 disabled:opacity-50">
                        Cancel
                    </button>
                    <button type="button" onClick={onConfirm} disabled={busy}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/20 disabled:opacity-60">
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        {busy ? 'Deleting…' : 'Delete product'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const ProductList = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { records: productActivity, openActivity } = useProductSubmissions();
    const activityCounts = getProductActivityCounts(productActivity);
    const canDeleteProducts = user?.role === 'VendorAdmin';
    const [searchParams, setSearchParams] = useSearchParams();
    const {
        products = [],
        categories = [],
        loading,
        pagination = {},
        queryParams = {},
        goToPage,
        updateFilters,
        deleteProduct,
        refetchProducts
    } = useProducts();

    const urlFilters = useMemo(() => readUrlFilters(searchParams), [searchParams]);
    const [searchDraft, setSearchDraft] = useState(() => ({
        url: readUrlFilters(searchParams).search,
        value: readUrlFilters(searchParams).search
    }));
    const searchInput = searchDraft.url === urlFilters.search ? searchDraft.value : urlFilters.search;
    const setSearchInput = value => setSearchDraft({ url: urlFilters.search, value });
    const [viewMode, setViewMode] = useState('table');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [upgradePending, setUpgradePending] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const detailRequestRef = useRef(null);
    const deletionTriggerRef = useRef(null);
    const deletionInProgressRef = useRef(false);
    const resultsHeadingRef = useRef(null);

    // Keep filters in the URL so browser back/forward and shared URLs behave consistently.
    useEffect(() => {
        if (FILTER_KEYS.some((key) => String(queryParams?.[key] ?? '') !== urlFilters[key])) {
            updateFilters(urlFilters);
        }
    }, [urlFilters, queryParams, updateFilters]);

    const writeFilter = (key, value, replace = false) => {
        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            if (value) next.set(key, value);
            else next.delete(key);
            next.delete('page');
            return next;
        }, { replace });
    };

    // Debounce network-driven search, rather than fetching for every keystroke.
    useEffect(() => {
        const nextSearch = searchInput.trim().slice(0, 120);
        if (nextSearch === urlFilters.search) return;
        const timer = window.setTimeout(() => writeFilter('search', nextSearch, true), 350);
        return () => window.clearTimeout(timer);
        // writeFilter only uses the current router setter; filtering is driven by URL values.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput, urlFilters.search, setSearchParams]);

    useEffect(() => () => detailRequestRef.current?.abort(), []);

    const productUsage = user?.planAccess?.usageDetails?.products;
    const isBeginner = user?.planAccess?.planKey === 'beginner';
    const rawLimit = Number(productUsage?.limit);
    const productLimit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 25;
    const rawUsed = Number(productUsage?.used ?? pagination.total ?? 0);
    const productsUsed = Number.isFinite(rawUsed) ? Math.max(0, rawUsed) : 0;
    const isAtProductLimit = isBeginner && productsUsed >= productLimit;
    const usagePercentage = Math.min(100, (productsUsed / productLimit) * 100);
    const nearLimit = isBeginner && productsUsed / productLimit >= 0.8;
    const hasFilters = FILTER_KEYS.some((key) => Boolean(urlFilters[key]));
    const hasNarrowingFilters = ['search', 'category', 'status'].some((key) => Boolean(urlFilters[key]));
    const selectedFilterChips = FILTER_KEYS.filter((key) => Boolean(urlFilters[key]));

    const pageMetrics = useMemo(() => ({
        published: products.filter((item) => getStatus(item) === 'Published').length,
        outOfStock: products.filter((item) => getStock(item) === 0).length
    }), [products]);

    const handleOpenDetails = async (product) => {
        detailRequestRef.current?.abort();
        const controller = new AbortController();
        detailRequestRef.current = controller;
        setSelectedProduct(product);
        setIsModalOpen(true);

        try {
            const response = await API.get(`/admin/products/${encodeURIComponent(product._id)}`, {
                signal: controller.signal
            });
            if (!controller.signal.aborted) setSelectedProduct(response.data?.data || product);
        } catch {
            // Keep the already-available product details visible if the request fails.
        }
    };

    const handleCloseDetails = () => {
        detailRequestRef.current?.abort();
        setIsModalOpen(false);
        setSelectedProduct(null);
    };

    const handleEdit = (product) => navigate(`/dashboard/products/edit/${encodeURIComponent(product._id)}`);

    const requestDelete = (product) => {
        if (!canDeleteProducts) return;
        deletionTriggerRef.current = document.activeElement;
        setDeleteError('');
        setProductToDelete(product);
    };

    const closeDelete = () => {
        if (deletionInProgressRef.current) return;
        setProductToDelete(null);
        setDeleteError('');
        window.requestAnimationFrame(() => {
            if (deletionTriggerRef.current?.isConnected) deletionTriggerRef.current.focus();
        });
    };

    const confirmDelete = async () => {
        if (!productToDelete || deletionInProgressRef.current) return;
        deletionInProgressRef.current = true;
        setDeleting(true);
        setDeleteError('');
        try {
            await deleteProduct(productToDelete._id);
            setProductToDelete(null);
            window.requestAnimationFrame(() => resultsHeadingRef.current?.focus());
        } catch {
            setDeleteError('Could not delete this product. Please try again.');
        } finally {
            deletionInProgressRef.current = false;
            setDeleting(false);
        }
    };

    const openProductUpgrade = async (returnTo = '/dashboard/products') => {
        if (upgradePending) return;
        setUpgradePending(true);
        try {
            const response = await API.post('/admin/billing/upgrade-intents', {
                limitKey: 'productCount',
                returnTo
            });
            const token = response.data?.data?.token;
            navigate(token
                ? `/dashboard/billing?intent=${encodeURIComponent(token)}`
                : '/dashboard/billing');
        } catch {
            navigate('/dashboard/billing');
        } finally {
            setUpgradePending(false);
        }
    };

    const resetFilters = () => {
        setSearchInput('');
        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            FILTER_KEYS.forEach((key) => next.delete(key));
            next.delete('page');
            return next;
        });
    };

    const columns = [
        {
            label: 'PRODUCT',
            render: (product) => (
                <div className="flex min-w-0 items-center gap-3.5 py-1">
                    <button type="button" onClick={() => handleOpenDetails(product)}
                            className="group shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
                            aria-label={`View ${product.title}`}>
                        <ProductImage product={product} />
                    </button>
                    <div className="min-w-0">
                        <button type="button" onClick={() => handleOpenDetails(product)}
                                className="block max-w-[260px] truncate text-left text-sm font-bold text-slate-900 transition-colors hover:text-blue-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                title={product.title || 'Untitled product'}>
                            {product.title || 'Untitled product'}
                        </button>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                            <span className="max-w-36 truncate">{product.category || 'General'}</span>
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            <span>{formatCount(product.variantCount ?? product.variants?.length ?? 0)} variants</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            label: 'INVENTORY',
            render: (product) => <StockPill product={product} showLowStock={!isBeginner} />
        },
        {
            label: 'PRICE',
            render: (product) => <ProductPrice product={product} />
        },
        {
            label: 'STATUS',
            render: (product) => <StatusPill product={product} />
        }
    ];

    const renderActions = (product) => (
        <ActionButtons product={product} onPreview={handleOpenDetails} onEdit={handleEdit}
                       onDelete={requestDelete} canDelete={canDeleteProducts} disabled={deleting} />
    );

    const renderProductCards = () => (
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 xl:p-5">
            {products.map((product) => (
                <ProductCard key={product._id} product={product} showLowStock={!isBeginner}
                             onPreview={handleOpenDetails} onEdit={handleEdit} onDelete={requestDelete} canDelete={canDeleteProducts} disabled={deleting} />
            ))}
        </div>
    );

    return (
        <main className="mx-auto max-w-[1480px] space-y-6 pb-12 text-slate-900">
            {/* Catalog header */}
            <header className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_7px_30px_-24px_rgba(15,23,42,.25)] sm:p-7 lg:p-8">
                <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-blue-50 blur-3xl" aria-hidden="true" />
                <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                    <div className="max-w-2xl">
                        <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">
                            <span className="flex size-7 items-center justify-center rounded-lg bg-blue-50"><Boxes className="size-4" /></span>
                            Store management <ChevronRight className="size-3.5 text-slate-300" /> Catalog
                        </div>
                        <h1 className="text-[27px] font-extrabold tracking-[-0.045em] text-slate-950 sm:text-[34px]">Your products, organized.</h1>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-[15px]">
                            Manage your listings, keep inventory accurate, and find what needs your attention.
                        </p>
                    </div>
                    <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
                        <PageRefreshButton onRefresh={refetchProducts} loading={Boolean(loading && products.length > 0)} label="Refresh catalog" />
                        {isAtProductLimit ? (
                            <button type="button" disabled={upgradePending}
                                    onClick={() => openProductUpgrade('/dashboard/products/add')}
                                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 disabled:opacity-60 sm:flex-none">
                                {upgradePending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpRight className="size-4" />}
                                View plans
                            </button>
                        ) : (
                            <Link to="/dashboard/products/add"
                                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-[0_8px_16px_-9px_rgba(37,99,235,.65)] transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 sm:flex-none">
                                <Plus className="size-4.5" strokeWidth={2.5} /> Add product
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <button
                type="button"
                aria-label={`Unfinished products: ${activityCounts.unfinished}`}
                aria-haspopup="dialog"
                aria-controls="product-activity-center"
                onClick={() => openActivity('unfinished')}
                className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 ${activityCounts.unfinished ? 'border border-indigo-100 bg-indigo-50/60 text-indigo-950 hover:bg-indigo-50' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
                {activityCounts.saving ? <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Layers3 className="size-4 shrink-0" aria-hidden="true" />}
                <span className="min-w-0 flex-1">
                    <span className="font-semibold">Unfinished products <span className="ml-1 rounded-full bg-white px-2 py-0.5 text-xs ring-1 ring-slate-200/80">{activityCounts.unfinished}</span></span>
                    {activityCounts.unfinished > 0 && <span className="mt-0.5 block text-xs font-normal text-slate-500">{getProductActivityBreakdown(activityCounts)}</span>}
                </span>
                {!activityCounts.unfinished && <span className="hidden text-xs text-slate-400 sm:inline">All caught up</span>}
                <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
            </button>

            {/* These metrics explicitly describe the fetched page, not store-wide inventory. */}
            <section aria-label="Product overview" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                    { name: 'Matching products', value: formatCount(pagination.total ?? products.length), hint: 'Across current filters', icon: Package, tone: 'bg-blue-50 text-blue-700' },
                    { name: 'Published on this page', value: formatCount(pageMetrics.published), hint: `Of ${formatCount(products.length)} shown`, icon: Check, tone: 'bg-emerald-50 text-emerald-700' },
                    { name: 'Out of stock on this page', value: formatCount(pageMetrics.outOfStock), hint: 'Products needing attention', icon: AlertCircle, tone: 'bg-rose-50 text-rose-700' }
                ].map(({ name, value, hint, icon: Icon, tone }) => (
                    <div key={name} className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_18px_-16px_rgba(15,23,42,.3)] sm:p-5">
                        <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}><Icon className="size-5" strokeWidth={1.9} /></div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-500">{name}</p>
                            <p className="mt-1 text-2xl font-extrabold leading-none tracking-tight text-slate-900">{value}</p>
                            <p className="mt-1.5 text-[11px] text-slate-400">{hint}</p>
                        </div>
                    </div>
                ))}
            </section>

            {isBeginner && (
                <section aria-label="Product plan usage" className={`rounded-2xl border px-5 py-4 ${nearLimit ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-white'}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <div className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${nearLimit ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>
                                <Layers3 className="size-4.5" />
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-sm font-bold text-slate-900">Beginner plan usage</h2>
                                    <span className="text-xs font-semibold text-slate-500">{formatCount(productsUsed)} / {formatCount(productLimit)} products</span>
                                </div>
                                <p className="mt-1 text-xs leading-5 text-slate-600">
                                    {isAtProductLimit
                                        ? 'Your product limit is reached. Existing listings remain manageable.'
                                        : nearLimit
                                            ? `${formatCount(Math.max(productLimit - productsUsed, 0))} product slots remaining.`
                                            : 'You have room to keep growing your catalog.'}
                                </p>
                            </div>
                        </div>
                        {nearLimit && (
                            <button type="button" disabled={upgradePending} onClick={() => openProductUpgrade()}
                                    className="inline-flex min-h-10 items-center gap-1 self-start rounded-lg px-2 text-xs font-bold text-blue-700 transition-colors hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50">
                                Compare plans <ArrowUpRight className="size-3.5" />
                            </button>
                        )}
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar"
                         aria-label="Product limit usage" aria-valuemin={0} aria-valuemax={productLimit}
                         aria-valuenow={Math.min(productsUsed, productLimit)}>
                        <div className={`h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${nearLimit ? 'bg-amber-500' : 'bg-blue-600'}`}
                             style={{ width: `${usagePercentage}%` }} />
                    </div>
                </section>
            )}

            {/* Search and filtering */}
            <section aria-label="Filter products" className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_6px_24px_-20px_rgba(15,23,42,.3)]">
                <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><SlidersHorizontal className="size-4" /></div>
                        <h2 className="text-sm font-bold text-slate-900">Find a product</h2>
                    </div>
                    <p className="pl-[42px] text-xs text-slate-400 sm:pl-0">Search or narrow down your catalog</p>
                </div>
                <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[minmax(220px,1.7fr)_minmax(155px,1fr)_minmax(145px,.85fr)_minmax(165px,1fr)] lg:px-6">
                    <div className="sm:col-span-2 lg:col-span-1">
                        <label htmlFor="product-catalog-search" className="mb-1.5 block text-xs font-semibold text-slate-500">Search products</label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
                            <input id="product-catalog-search" type="search" autoComplete="off"
                                   maxLength={120} value={searchInput} onChange={(event) => setSearchInput(event.target.value)}
                                   placeholder="Search by product name…"
                                   className={`${fieldClass} pl-10 pr-10 placeholder:font-normal placeholder:text-slate-400`} />
                            {searchInput && (
                                <button type="button" onClick={() => { setSearchInput(''); writeFilter('search', '', true); }}
                                        aria-label="Clear search" className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                    <X className="size-4" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="product-catalog-category" className="mb-1.5 block text-xs font-semibold text-slate-500">Category</label>
                        <select id="product-catalog-category" value={urlFilters.category}
                                onChange={(event) => writeFilter('category', event.target.value)} className={fieldClass}>
                            <option value="">All categories</option>
                            {categories.filter((category) => typeof category === 'string' && category).map((category) => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="product-catalog-status" className="mb-1.5 block text-xs font-semibold text-slate-500">Visibility</label>
                        <select id="product-catalog-status" value={urlFilters.status}
                                onChange={(event) => writeFilter('status', event.target.value)} className={fieldClass}>
                            <option value="">All statuses</option>
                            <option value="Published">Published</option>
                            <option value="Draft">Draft</option>
                            <option value="Archived">Archived</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="product-catalog-sort" className="mb-1.5 block text-xs font-semibold text-slate-500">Sort by</label>
                        <select id="product-catalog-sort" value={urlFilters.sort}
                                onChange={(event) => writeFilter('sort', event.target.value)} className={fieldClass}>
                            {SORT_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                        </select>
                    </div>
                </div>
                {hasFilters && (
                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3 sm:px-6">
                        <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Active filters</span>
                        {selectedFilterChips.map((key) => (
                            <button type="button" key={key} onClick={() => {
                                if (key === 'search') setSearchInput('');
                                writeFilter(key, '');
                            }}
                                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                    aria-label={`Remove ${FILTER_NAMES[key]} filter`}>
                                <span className="max-w-[160px] truncate">{FILTER_NAMES[key]}: {key === 'sort' ? SORT_OPTIONS.find(([value]) => value === urlFilters.sort)?.[1] : urlFilters[key]}</span><X className="size-3.5 shrink-0" />
                            </button>
                        ))}
                        <button type="button" onClick={resetFilters}
                                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                            <FilterX className="size-3.5" /> Clear all
                        </button>
                    </div>
                )}
            </section>

            {/* Results */}
            <section aria-label="Product results" aria-busy={Boolean(loading)} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_6px_24px_-20px_rgba(15,23,42,.3)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
                    <div>
                        <h2 ref={resultsHeadingRef} tabIndex={-1} className="text-base font-extrabold tracking-tight text-slate-900 focus:outline-none">Product listings</h2>
                        <p role="status" className="mt-0.5 text-xs text-slate-500" aria-live="polite">
                            {loading ? 'Updating listings…' : `${formatCount(pagination.total ?? products.length)} matching products`}
                        </p>
                    </div>
                    <div className="hidden items-center rounded-xl border border-slate-200 bg-slate-50 p-1 lg:flex" role="group" aria-label="Product layout">
                        <button type="button" onClick={() => setViewMode('table')} aria-pressed={viewMode === 'table'}
                                className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${viewMode === 'table' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                            <LayoutList className="size-4" /> List
                        </button>
                        <button type="button" onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'}
                                className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${viewMode === 'grid' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                            <Grid2X2 className="size-4" /> Grid
                        </button>
                    </div>
                </div>

                {loading && products.length === 0 ? (
                    <div className="p-5"><AdminLoadingState title="Loading your products" description="Gathering your listings and inventory details." /></div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center px-6 py-16 text-center sm:py-20">
                        <div className="mb-5 flex size-16 items-center justify-center rounded-[22px] bg-blue-50 text-blue-600">
                            {hasNarrowingFilters ? <Search className="size-7" strokeWidth={1.7} /> : <Package className="size-7" strokeWidth={1.7} />}
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-900">{hasNarrowingFilters ? 'No products match your filters' : 'Your catalog starts here'}</h3>
                        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                            {hasNarrowingFilters
                                ? 'Try another search, choose a different category, or clear the filters to see more products.'
                                : 'Add your first product with a clear title, pricing, stock, and an image.'}
                        </p>
                        {hasNarrowingFilters ? (
                            <button type="button" onClick={resetFilters}
                                    className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20">
                                <FilterX className="size-4" /> Clear filters
                            </button>
                        ) : isAtProductLimit ? (
                            <button type="button" disabled={upgradePending} onClick={() => openProductUpgrade('/dashboard/products/add')}
                                    className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-60">
                                <ArrowUpRight className="size-4" /> View plans
                            </button>
                        ) : (
                            <Link to="/dashboard/products/add" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20">
                                <Plus className="size-4" /> Add first product
                            </Link>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="lg:hidden">{renderProductCards()}</div>
                        <div className="hidden lg:block">
                            {viewMode === 'table' ? (
                                <div className="overflow-x-auto">
                                    <Table columns={columns} data={products} actions={renderActions} className="w-full" />
                                </div>
                            ) : renderProductCards()}
                        </div>
                    </>
                )}
            </section>

            {!loading && Number(pagination.total) > Number(pagination.limit || queryParams.limit || products.length) && (
                <PaginationBar pagination={pagination} label="products"
                               onPrevious={() => goToPage(pagination.page - 1)}
                               onNext={() => goToPage(pagination.page + 1)}
                               className="rounded-2xl border-slate-200" />
            )}

            <p className="flex items-start gap-2 px-1 text-xs leading-5 text-slate-400">
                <CircleHelp className="mt-0.5 size-3.5 shrink-0" />
                Products marked as Draft are not published. Use the details view to inspect a listing before editing it.
            </p>

            {isModalOpen && (
                <Suspense fallback={<div role="status" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/30"><Loader2 className="size-7 animate-spin text-white" /><span className="sr-only">Loading product details</span></div>}>
                    <ProductDetailModal key={selectedProduct?._id} isOpen={isModalOpen} product={selectedProduct} onClose={handleCloseDetails} />
                </Suspense>
            )}

            {productToDelete && (
                <DeleteConfirmation product={productToDelete} busy={deleting} error={deleteError}
                                    onCancel={closeDelete} onConfirm={confirmDelete} />
            )}
        </main>
    );
};

export default ProductList;
