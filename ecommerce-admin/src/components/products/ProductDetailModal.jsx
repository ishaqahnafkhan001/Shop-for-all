import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
    AlertCircle,
    ArrowRight,
    BadgeCheck,
    Check,
    ChevronLeft,
    ChevronRight,
    Clipboard,
    ImageOff,
    Layers3,
    ListChecks,
    Package,
    Pencil,
    ShieldCheck,
    Tag,
    Warehouse,
    X
} from 'lucide-react';

// Read-only presentation helpers. Never render product-supplied HTML.
const numberFormatter = new Intl.NumberFormat('en-BD', { maximumFractionDigits: 2 });

function formatMoney(value) {
    if (value === null || value === undefined || value === '') return '—';
    const amount = Number(value);
    return Number.isFinite(amount) ? `৳${numberFormatter.format(amount)}` : '—';
}

function formatNumber(value) {
    if (value === null || value === undefined || value === '') return '—';
    const number = Number(value);
    return Number.isFinite(number) ? numberFormatter.format(number) : '—';
}

function displayText(value, fallback = 'Not specified') {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value.trim() || fallback;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
        const result = value.map((entry) => displayText(entry, '')).filter(Boolean).join(', ');
        return result || fallback;
    }
    return fallback;
}

function getStockStatus(stock) {
    const count = Number(stock);
    if (stock === null || stock === undefined || stock === '' || !Number.isFinite(count)) {
        return { label: 'Stock unavailable', tone: 'neutral' };
    }
    if (count <= 0) return { label: 'Out of stock', tone: 'danger' };
    return { label: 'In stock', tone: 'success' };
}

function getPublicationStatus(product) {
    if (product?.isArchived || String(product?.status || '').toLowerCase() === 'archived') {
        return { label: 'Archived', tone: 'warning' };
    }
    return product?.isActive
        ? { label: 'Published', tone: 'success' }
        : { label: 'Draft', tone: 'neutral' };
}

const badgeStyles = {
    neutral: 'border-slate-200 bg-slate-100 text-slate-600',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    danger: 'border-rose-200 bg-rose-50 text-rose-700'
};

function StatusBadge({ status }) {
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${badgeStyles[status.tone]}`}>
            <span aria-hidden="true" className={`size-1.5 rounded-full ${
                status.tone === 'success' ? 'bg-emerald-500' :
                    status.tone === 'danger' ? 'bg-rose-500' :
                        status.tone === 'warning' ? 'bg-amber-500' : 'bg-slate-400'
            }`} />
            {status.label}
        </span>
    );
}

// Products can store media URLs or opaque media IDs. Only display recognized,
// safe-to-load paths/HTTPS URLs; never use a media ID as a URL by itself.
function safeImageUrl(value) {
    const raw = typeof value === 'string'
        ? value
        : value && typeof value === 'object'
            ? value.secure_url ?? value.secureUrl ?? value.url ?? value.src
            : null;
    if (typeof raw !== 'string') return null;
    const candidate = raw.trim();
    if (!candidate || candidate.includes('\\') || [...candidate].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return null;
    if (candidate.startsWith('/') && !candidate.startsWith('//')) return candidate;
    if (candidate.startsWith('./') && !candidate.startsWith('//')) return candidate;
    try {
        const url = new URL(candidate);
        if (url.protocol === 'https:' && !url.username && !url.password) return candidate;
    } catch {
        // Plain image IDs, unsupported schemes, and malformed URLs are ignored.
    }
    return null;
}

function getProductImages(product) {
    const candidates = [product?.coverMediaId, ...(Array.isArray(product?.images) ? product.images : [])];
    const urls = candidates.map(safeImageUrl).filter(Boolean);
    return [...new Set(urls)].slice(0, 24);
}

function getAttributes(variant) {
    const attributes = variant?.attributes;
    if (Array.isArray(attributes)) {
        return attributes.map((item, index) => {
            if (!item || typeof item !== 'object') {
                return { name: `Option ${index + 1}`, value: displayText(item) };
            }
            return {
                name: displayText(item.name ?? item.title ?? item.key, `Option ${index + 1}`),
                value: displayText(item.value)
            };
        });
    }
    if (attributes && typeof attributes === 'object') {
        return Object.entries(attributes).map(([name, value]) => ({ name, value: displayText(value) }));
    }
    return [];
}

function normalizeDetail(item) {
    if (item === null || item === undefined || item === '') return null;
    if (typeof item !== 'object' || Array.isArray(item)) {
        return { label: '', value: displayText(item) };
    }
    const label = displayText(item.title ?? item.name ?? item.label ?? item.key, '');
    const rawValue = item.value ?? item.description ?? item.text ?? item.content;
    if (rawValue === undefined) return label ? { label: '', value: label } : null;
    return { label, value: displayText(rawValue) };
}

function SectionHeading({ icon: Icon, title, count, subtitle }) {
    return (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon className="size-[18px]" strokeWidth={1.9} aria-hidden="true" />
                </span>
                <div>
                    <h3 className="text-[15px] font-bold tracking-tight text-slate-900">{title}</h3>
                    {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
                </div>
            </div>
            {count !== undefined && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                    {formatNumber(count)}
                </span>
            )}
        </div>
    );
}

function DetailSection({ icon, title, data }) {
    const items = Array.isArray(data) ? data.map(normalizeDetail).filter(Boolean) : [];
    if (!items.length) return null;

    return (
        <section className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 sm:p-5">
            <SectionHeading icon={icon} title={title} count={items.length} />
            <dl className="grid gap-2.5 sm:grid-cols-2">
                {items.map((item, index) => (
                    <div key={`${item.label}-${index}`} className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3">
                        {item.label && (
                            <dt className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-400">
                                {item.label}
                            </dt>
                        )}
                        <dd className="break-words text-[13px] font-medium leading-5 text-slate-700">
                            {item.value}
                        </dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

function ProductGallery({ images, title, selectedImage, onSelect }) {
    const [failedUrl, setFailedUrl] = useState('');
    const selectedUrl = images[selectedImage] || null;
    const imageFailed = selectedUrl === failedUrl;

    return (
        <section aria-label="Product images" className="min-w-0">
            <div className="group relative flex aspect-[5/4] items-center justify-center overflow-hidden rounded-[22px] border border-slate-200 bg-gradient-to-br from-slate-50 via-slate-100/70 to-blue-50/60 sm:aspect-[4/3]">
                {selectedUrl && !imageFailed ? (
                    <img
                        src={selectedUrl}
                        alt={`${title} — image ${selectedImage + 1}`}
                        loading="eager"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain p-5 sm:p-7"
                        onError={() => setFailedUrl(selectedUrl)}
                    />
                ) : (
                    <div className="flex flex-col items-center gap-3 px-5 text-center text-slate-400">
                        <div className="flex size-20 items-center justify-center rounded-3xl border border-white bg-white/75 shadow-sm">
                            {imageFailed ? <ImageOff className="size-9" strokeWidth={1.3} /> : <Package className="size-9" strokeWidth={1.3} />}
                        </div>
                        <span className="text-xs font-semibold">{imageFailed ? 'Image could not be loaded' : 'No product image yet'}</span>
                    </div>
                )}

                {images.length > 1 && (
                    <>
                        <button type="button" onClick={() => onSelect((selectedImage - 1 + images.length) % images.length)}
                                aria-label="Previous product image"
                                className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20">
                            <ChevronLeft className="size-5" />
                        </button>
                        <button type="button" onClick={() => onSelect((selectedImage + 1) % images.length)}
                                aria-label="Next product image"
                                className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20">
                            <ChevronRight className="size-5" />
                        </button>
                        <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/75 px-3 py-1 text-[11px] font-semibold tabular-nums text-white">
                            {selectedImage + 1} / {images.length}
                        </span>
                    </>
                )}
            </div>

            {images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Select product image">
                    {images.map((url, index) => (
                        <button key={url} type="button" onClick={() => onSelect(index)}
                                aria-label={`Show product image ${index + 1}`}
                                aria-pressed={index === selectedImage}
                                className={`size-[62px] shrink-0 overflow-hidden rounded-xl border-2 bg-slate-50 p-1 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 ${
                                    index === selectedImage ? 'border-blue-600' : 'border-slate-200 hover:border-slate-300'
                                }`}>
                            <img src={url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full rounded-lg object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </section>
    );
}

function Metric({ label, value, note, emphasis }) {
    return (
        <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 sm:p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-400">{label}</p>
            <p className={`mt-1.5 break-words text-[19px] font-extrabold tracking-tight tabular-nums ${emphasis ? 'text-blue-700' : 'text-slate-900'}`}>
                {value}
            </p>
            {note && <p className="mt-1 text-[11px] text-slate-500">{note}</p>}
        </div>
    );
}

const ProductDetailModal = ({ product, isOpen, onClose }) => {
    const dialogRef = useRef(null);
    const closeButtonRef = useRef(null);
    const originalFocusRef = useRef(null);
    const onCloseRef = useRef(onClose);
    const feedbackTimerRef = useRef(null);
    const titleId = useId();
    const descriptionId = useId();
    const hasProduct = Boolean(product);
    const [selectedImage, setSelectedImage] = useState(0);
    const [copyFeedback, setCopyFeedback] = useState('');

    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    const images = useMemo(() => getProductImages(product), [product]);
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    const variantCount = product?.variantCount ?? variants.length;
    const currentImage = Math.min(selectedImage, Math.max(0, images.length - 1));
    const publication = getPublicationStatus(product);
    const stock = getStockStatus(product?.totalStock);
    const discount = Number(product?.pricing?.discount);
    const hasDiscount = Number.isFinite(discount) && discount > 0;
    const hasOriginalPrice = product?.pricing?.sellingPrice !== null && product?.pricing?.sellingPrice !== undefined;
    const canEdit = typeof product?._id === 'string' || typeof product?._id === 'number';
    const name = displayText(product?.title, 'Untitled product');

    useEffect(() => {
        if (!isOpen || !hasProduct) return undefined;
        const previousOverflow = document.body.style.overflow;
        originalFocusRef.current = document.activeElement;
        document.body.style.overflow = 'hidden';
        const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

        const handleKeys = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                onCloseRef.current?.();
                return;
            }
            if (event.key !== 'Tab') return;
            const dialog = dialogRef.current;
            if (!dialog) return;
            const controls = Array.from(dialog.querySelectorAll(
                'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )).filter((node) => node.getClientRects().length > 0);
            if (!controls.length) {
                event.preventDefault();
                dialog.focus();
                return;
            }
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (!dialog.contains(document.activeElement)) {
                event.preventDefault();
                first.focus();
            } else if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeys, true);
        return () => {
            window.cancelAnimationFrame(frame);
            document.removeEventListener('keydown', handleKeys, true);
            document.body.style.overflow = previousOverflow;
            const oldFocus = originalFocusRef.current;
            window.requestAnimationFrame(() => {
                if (oldFocus?.isConnected && typeof oldFocus.focus === 'function') oldFocus.focus();
            });
        };
    }, [isOpen, hasProduct]);

    useEffect(() => () => {
        if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    }, []);

    const copySku = async (sku) => {
        if (typeof sku !== 'string' || !sku.trim()) return;
        if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
        try {
            if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) throw new Error('Clipboard not available');
            await navigator.clipboard.writeText(sku);
            setCopyFeedback(`Copied SKU: ${sku}`);
        } catch {
            setCopyFeedback('Clipboard access is unavailable. Select the SKU to copy it.');
        }
        feedbackTimerRef.current = window.setTimeout(() => setCopyFeedback(''), 3000);
    };

    if (!isOpen || !product || typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-0 backdrop-blur-[3px] sm:p-5"
             onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                tabIndex={-1}
                className="flex h-[100dvh] w-full max-w-[1030px] flex-col overflow-hidden bg-white shadow-[0_28px_100px_-24px_rgba(2,6,23,.50)] sm:h-auto sm:max-h-[94dvh] sm:rounded-[28px] sm:border sm:border-white/70"
            >
                {/* Header stays visible when the detail content scrolls. */}
                <header className="relative z-10 flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-7 sm:py-5">
                    <div className="min-w-0">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">
                            <Package className="size-3.5" aria-hidden="true" /> Catalog <ChevronRight className="size-3 text-slate-300" /> Product details
                        </div>
                        <h2 id={titleId} className="line-clamp-2 break-words text-xl font-extrabold tracking-[-0.035em] text-slate-950 sm:text-[24px]">
                            {name}
                        </h2>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="max-w-full truncate rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                {displayText(product.category, 'General')}
                            </span>
                            <StatusBadge status={publication} />
                        </div>
                    </div>
                    <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close product details"
                            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20">
                        <X className="size-[19px]" />
                    </button>
                </header>

                <div id={descriptionId} className="sr-only">Review this product's images, pricing, stock, variants and additional information.</div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#F8FAFC] px-4 py-5 sm:px-7 sm:py-7 lg:px-8">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.04fr)] lg:gap-7">
                        <ProductGallery images={images} title={name} selectedImage={currentImage} onSelect={setSelectedImage} />

                        <section aria-label="Product summary" className="min-w-0">
                            <div className="relative overflow-hidden rounded-[22px] border border-blue-100 bg-white p-5 shadow-[0_5px_18px_-14px_rgba(15,23,42,.22)] sm:p-6">
                                <div className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-blue-50 blur-2xl" aria-hidden="true" />
                                <div className="relative">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Selling price</p>
                                    <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
                                        <p className="text-[34px] font-extrabold leading-none tracking-[-0.055em] tabular-nums text-slate-950 sm:text-[40px]">
                                            {formatMoney(product.finalPrice)}
                                        </p>
                                        {hasDiscount && (
                                            <span className="rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700">
                                                {formatNumber(discount)}% off
                                            </span>
                                        )}
                                    </div>
                                    {hasDiscount && hasOriginalPrice && (
                                        <p className="mt-2 text-sm text-slate-500">
                                            Original price: <span className="font-medium line-through">{formatMoney(product.pricing.sellingPrice)}</span>
                                        </p>
                                    )}
                                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                                        <StatusBadge status={stock} />
                                        {product.totalStock !== null && product.totalStock !== undefined && product.totalStock !== '' && (
                                            <span className="text-xs font-semibold text-slate-500">{formatNumber(product.totalStock)} units available</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <Metric label="Total stock" value={formatNumber(product.totalStock)} />
                                <Metric label="Variants" value={formatNumber(variantCount)} />
                                <Metric label="Buying price" value={formatMoney(product.pricing?.buyingPrice)} />
                                <Metric label="Discount" value={hasDiscount ? `${formatNumber(discount)}%` : 'None'} />
                            </div>
                        </section>
                    </div>

                    <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.04fr)] lg:gap-6">
                        <section className="rounded-[22px] border border-slate-200/80 bg-white p-4 sm:p-5">
                            <SectionHeading icon={ListChecks} title="Description" />
                            {product.description ? (
                                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                                    {displayText(product.description)}
                                </p>
                            ) : (
                                <p className="rounded-xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-500">
                                    No description has been added to this product yet.
                                </p>
                            )}
                        </section>
                        <section className="rounded-[22px] border border-slate-200/80 bg-white p-4 sm:p-5">
                            <SectionHeading icon={Warehouse} title="Inventory overview" subtitle="Current availability and listing details" />
                            <dl className="divide-y divide-slate-100">
                                <div className="flex items-center justify-between gap-4 py-3 text-sm">
                                    <dt className="text-slate-500">Availability</dt>
                                    <dd><StatusBadge status={stock} /></dd>
                                </div>
                                <div className="flex items-center justify-between gap-4 py-3 text-sm">
                                    <dt className="text-slate-500">Store visibility</dt>
                                    <dd><StatusBadge status={publication} /></dd>
                                </div>
                                <div className="flex items-center justify-between gap-4 py-3 text-sm">
                                    <dt className="text-slate-500">Total variants</dt>
                                    <dd className="font-bold tabular-nums text-slate-900">{formatNumber(variantCount)}</dd>
                                </div>
                            </dl>
                        </section>
                    </div>

                    <section className="mt-5 min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 sm:p-5">
                        <SectionHeading icon={Layers3} title="Variants & stock" count={variantCount}
                                        subtitle="SKU codes, selected options and quantities" />
                        {variants.length ? (
                            <>
                                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                    <table className="w-full min-w-[560px] text-left text-sm">
                                        <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.07em] text-slate-500">
                                        <tr>
                                            <th scope="col" className="px-4 py-3.5">Variant options</th>
                                            <th scope="col" className="px-4 py-3.5">SKU</th>
                                            <th scope="col" className="px-4 py-3.5 text-right">Stock</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                        {variants.slice(0, 50).map((variant, index) => {
                                            const attributes = getAttributes(variant);
                                            const sku = typeof variant?.sku === 'string' ? variant.sku : '';
                                            const variantStock = getStockStatus(variant?.stock);
                                            return (
                                                <tr key={`${variant?._id ?? sku ?? 'variant'}-${index}`} className="transition-colors hover:bg-slate-50/70">
                                                    <td className="px-4 py-4">
                                                        {attributes.length ? (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {attributes.map((attribute, attributeIndex) => (
                                                                    <span key={`${attribute.name}-${attributeIndex}`} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700">
                                                                            <span className="text-slate-400">{attribute.name}: </span>
                                                                            <span className="font-semibold">{attribute.value}</span>
                                                                        </span>
                                                                ))}
                                                            </div>
                                                        ) : <span className="text-xs text-slate-400">Default variant</span>}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        {sku ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="max-w-[190px] select-text break-all font-mono text-xs font-semibold text-slate-700">{sku}</span>
                                                                <button type="button" onClick={() => copySku(sku)} title="Copy SKU"
                                                                        aria-label={`Copy SKU ${sku}`}
                                                                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                                                    {copyFeedback === `Copied SKU: ${sku}` ? <Check className="size-4" /> : <Clipboard className="size-4" />}
                                                                </button>
                                                            </div>
                                                        ) : <span className="text-xs text-slate-400">Not set</span>}
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="font-bold tabular-nums text-slate-900">{formatNumber(variant?.stock)}</span>
                                                            <span className={`text-[11px] font-semibold ${variantStock.tone === 'danger' ? 'text-rose-600' : 'text-slate-400'}`}>{variantStock.label}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>
                                {variants.length > 50 && (
                                    <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                                        <AlertCircle className="size-3.5" aria-hidden="true" /> Showing 50 of {formatNumber(variants.length)} variants. Open the product editor for the full list.
                                    </p>
                                )}
                            </>
                        ) : (
                            <div className="flex items-start gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
                                <Layers3 className="mt-0.5 size-5 shrink-0 text-slate-400" aria-hidden="true" />
                                <p className="text-sm leading-6 text-slate-500">
                                    {Number(variantCount) > 0
                                        ? 'Variant information is not available in this preview.'
                                        : 'No variants have been added. This product may use a single default option.'}
                                </p>
                            </div>
                        )}
                        <p className="sr-only" role="status" aria-live="polite">{copyFeedback}</p>
                    </section>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        <DetailSection title="Features" icon={BadgeCheck} data={product.features} />
                        <DetailSection title="Specifications" icon={ShieldCheck} data={product.specifications} />
                        <DetailSection title="Extra notes" icon={Tag} data={product.comments} />
                    </div>
                </div>

                <footer className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-4">
                    <p className="hidden items-center gap-2 text-xs font-medium text-slate-400 sm:flex">
                        <Package className="size-4" aria-hidden="true" /> Product information is shown in read-only mode
                    </p>
                    <div className="flex w-full gap-2 sm:w-auto">
                        <button type="button" onClick={onClose}
                                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 sm:flex-none">
                            Close
                        </button>
                        {canEdit && (
                            <Link to={`/dashboard/products/edit/${encodeURIComponent(String(product._id))}`}
                                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-[0_8px_16px_-10px_rgba(37,99,235,.7)] transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 sm:flex-none">
                                <Pencil className="size-4" aria-hidden="true" /> Edit product <ArrowRight className="size-4" aria-hidden="true" />
                            </Link>
                        )}
                    </div>
                </footer>
            </div>
        </div>,
        document.body
    );
};

export default ProductDetailModal;
