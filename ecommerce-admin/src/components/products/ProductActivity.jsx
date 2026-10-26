import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, ImageOff, Loader2, Package, RefreshCw, Trash2, X } from 'lucide-react';
import { useProductSubmissions } from '../../context/ProductSubmissionContext.jsx';
import { useProductImagePreviews } from '../../hooks/useProductImagePreviews.js';
import { inspectRecovery } from '../../services/productSubmissionRecovery.js';
import { getProductActivityBreakdown, getProductActivityCounts, getProductActivityDescription, getProductActivityProgress, getProductActivityStatus, getProductActivityTitle } from '../../utils/productActivity.js';

const focusClass = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20';
const actionClass = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${focusClass}`;
const tones = { saving: 'border-indigo-100 bg-indigo-50 text-indigo-700', saved: 'border-emerald-100 bg-emerald-50 text-emerald-700', attention: 'border-rose-100 bg-rose-50 text-rose-700', check: 'border-amber-100 bg-amber-50 text-amber-800' };
const statusIcons = { saving: Loader2, saved: CheckCircle2, attention: AlertCircle, check: Clock3 };
let modalCount = 0;
let previousBodyOverflow = '';

function useNativeDialog(open, dialogRef, initialFocusRef) {
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!open || !dialog) return undefined;
        const previousFocus = document.activeElement;
        if (modalCount === 0) previousBodyOverflow = document.body.style.overflow;
        modalCount++;
        document.body.style.overflow = 'hidden';
        if (!dialog.open) dialog.showModal();
        initialFocusRef.current?.focus();
        const trapFocus = event => {
            if (event.key !== 'Tab' || event.target.closest('dialog') !== dialog) return;
            const focusable = [...dialog.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]')].filter(element => element.tabIndex >= 0 && element.getClientRects().length && !element.closest('[hidden], [inert]'));
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (!first) { event.preventDefault(); dialog.focus(); }
            else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        dialog.addEventListener('keydown', trapFocus);
        return () => {
            dialog.removeEventListener('keydown', trapFocus);
            if (dialog.open) dialog.close();
            modalCount = Math.max(0, modalCount - 1);
            if (!modalCount) document.body.style.overflow = previousBodyOverflow;
            if (previousFocus?.isConnected && !previousFocus.closest('[inert]')) previousFocus.focus?.();
        };
    }, [open, dialogRef, initialFocusRef]);
}

function ProductThumbnail({ file, title }) {
    const [failedUrl, setFailedUrl] = useState('');
    const files = useMemo(() => file ? [file] : [], [file]);
    const previews = useProductImagePreviews(files);
    const url = previews[0]?.url;
    return <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
        {url && failedUrl !== url ? <img src={url} alt={`${title} thumbnail`} loading="lazy" decoding="async" className="h-full w-full object-cover" onError={() => setFailedUrl(url)} /> : file ? <ImageOff className="size-5" aria-label="Preview unavailable" /> : <Package className="size-5" aria-hidden="true" />}
    </div>;
}

function SubmissionDate({ value }) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return <span>Date unavailable</span>;
    return <time dateTime={date.toISOString()}>{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)}</time>;
}

function ActivityCard({ record, manager, onReview, onDiscard }) {
    const [checking, setChecking] = useState(false);
    const [actionError, setActionError] = useState('');
    const [showProgress, setShowProgress] = useState(false);
    const [clock, setClock] = useState(() => Date.now());
    const checkLock = useRef(false);
    const progressRef = useRef(null);
    const progressId = useId();
    const status = getProductActivityStatus(record);
    const title = getProductActivityTitle(record);
    const Icon = statusIcons[status.key];
    const recovery = inspectRecovery(record);
    const images = recovery.snapshot?.imageFiles || [];
    const candidate = images[recovery.snapshot?.coverImageIndex ?? 0] || images[0];
    const thumbnail = candidate instanceof Blob && ['image/jpeg', 'image/png', 'image/webp'].includes(candidate.type) ? candidate : null;
    const progress = getProductActivityProgress(record);
    const busy = checking || manager.checking?.has(record.id);
    const lockUntil = Number(record.browserLock?.until) || 0;
    const otherTabSaving = lockUntil > clock;
    const error = typeof record.error === 'string' ? record.error : '';
    useEffect(() => { if (showProgress) progressRef.current?.focus(); }, [showProgress]);
    useEffect(() => {
        if (!lockUntil) return undefined;
        const timer = window.setTimeout(() => setClock(Date.now()), Math.max(0, lockUntil - Date.now()) + 1);
        return () => window.clearTimeout(timer);
    }, [lockUntil]);
    const checkStatus = async () => {
        if (checkLock.current || busy) return;
        checkLock.current = true;
        setChecking(true);
        setActionError('');
        try { await manager.checkStatus(record.id); }
        catch (requestError) { setActionError(requestError.message || 'Unable to check this save. Try again when you are connected.'); }
        finally { checkLock.current = false; setChecking(false); }
    };
    return <article aria-label={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
            <ProductThumbnail file={thumbnail} title={title} />
            <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 break-words text-sm font-bold leading-5 text-slate-900 [overflow-wrap:anywhere]">{title}</h3>
                <p className="mt-1 text-[11px] leading-4 text-slate-500"><SubmissionDate value={record.createdAt} /></p>
                <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold ${tones[status.key]}`}><Icon className={`size-3.5 ${status.key === 'saving' ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />{status.label}</span>
            </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-600">{getProductActivityDescription(record)}</p>
        {progress !== null && <div className="mt-2 space-y-1.5"><div role="progressbar" aria-label={`Uploading ${title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500 transition-[width] motion-reduce:transition-none" style={{ width: `${progress}%` }} /></div><p className="text-[11px] text-slate-500">Transfer to server: {progress}%</p></div>}
        {error && status.key !== 'saved' && <div className={`mt-3 rounded-lg px-3 py-2 text-xs leading-5 [overflow-wrap:anywhere] ${status.key === 'attention' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-900'}`}><strong className="font-semibold">Last update: </strong>{error}</div>}
        {status.key !== 'saved' && recovery.missingMedia.length > 0 && <p className="mt-2 text-xs leading-5 text-amber-800">Reselect missing media: {recovery.missingMedia.join(', ')}.</p>}
        {status.key !== 'saved' && recovery.issues.length > 0 && <p className="mt-2 text-xs leading-5 text-amber-800">{recovery.issues.join(' ')}</p>}
        {recovery.expired && status.key !== 'saved' && <p className="mt-2 text-xs leading-5 text-slate-500">Saved locally over 30 days ago. Review these older details before retrying.</p>}
        {actionError && <p role="alert" className="mt-2 text-xs leading-5 text-rose-700">{actionError}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
            {status.key === 'saved' && <Link to={`/dashboard/products/edit/${record.productId}`} onClick={onReview} className={`${actionClass} bg-indigo-50 text-indigo-700 hover:bg-indigo-100`}>View Product<ArrowRight className="size-3.5" aria-hidden="true" /></Link>}
            {status.key === 'attention' && <Link to={`/dashboard/products/add?recover=${encodeURIComponent(record.id)}`} onClick={onReview} className={`${actionClass} bg-indigo-600 text-white hover:bg-indigo-700`}>Review &amp; Retry<ArrowRight className="size-3.5" aria-hidden="true" /></Link>}
            {status.key === 'saving' && <button type="button" aria-expanded={showProgress} aria-controls={progressId} onClick={() => { setShowProgress(true); progressRef.current?.focus(); }} className={`${actionClass} bg-indigo-50 text-indigo-700 hover:bg-indigo-100`}>View progress</button>}
            {status.key === 'check' && <button type="button" onClick={checkStatus} disabled={busy} className={`${actionClass} bg-indigo-50 text-indigo-700 hover:bg-indigo-100`}><RefreshCw className={`size-3.5 ${busy ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />{busy ? 'Checking…' : 'Check Status'}</button>}
            {status.key === 'check' && record.canRetryOriginal && recovery.validPayload && !otherTabSaving && !manager.running.has(record.id) && <Link to={`/dashboard/products/add?recover=${encodeURIComponent(record.id)}`} onClick={onReview} className={`${actionClass} text-indigo-700 hover:bg-indigo-50`}>Review original</Link>}
            {status.key === 'attention' && !manager.running.has(record.id) && !otherTabSaving && <button type="button" onClick={() => onDiscard(record)} disabled={busy} className={`${actionClass} text-slate-500 hover:bg-slate-100 hover:text-slate-800`}><Trash2 className="size-3.5" aria-hidden="true" />Discard recovery</button>}
        </div>
        {status.key === 'saving' && <div id={progressId} ref={progressRef} tabIndex={-1} hidden={!showProgress} className={`mt-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-xs leading-5 text-indigo-900 ${focusClass}`}>
            <p className="font-semibold">{getProductActivityDescription(record)}</p>
            <p className="mt-1">{images.length} image{images.length === 1 ? '' : 's'} · {(recovery.snapshot?.videoFiles || []).length} video{recovery.snapshot?.videoFiles?.length === 1 ? '' : 's'} preserved in this browser.</p>
            <p className="mt-1">Keep the dashboard open while saving. The result appears after the server confirms it.</p>
        </div>}
    </article>;
}

function DiscardRecoveryDialog({ record, manager, onClose }) {
    const dialogRef = useRef(null);
    const cancelRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const lock = useRef(false);
    useNativeDialog(Boolean(record), dialogRef, cancelRef);
    return createPortal(<dialog ref={dialogRef} aria-labelledby="discard-recovery-title" aria-describedby="discard-recovery-description" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border-0 p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50">
        <div className="p-5 sm:p-6"><span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><Trash2 className="size-5" aria-hidden="true" /></span><h2 id="discard-recovery-title" className="text-lg font-bold">Discard recovery</h2><p className="mt-2 break-words text-sm font-semibold [overflow-wrap:anywhere]">{getProductActivityTitle(record)}</p><p id="discard-recovery-description" className="mt-2 text-sm leading-6 text-slate-600">This removes the form and attachments saved in this browser. It does not delete a product from your shop. We will confirm the save was rejected before removing its recovery data.</p>
            {error && <p role="alert" className="mt-3 text-sm leading-5 text-rose-700">{error}</p>}
            <div className="mt-5 flex flex-wrap justify-end gap-2"><button ref={cancelRef} type="button" onClick={onClose} disabled={busy} className={`${actionClass} border border-slate-200 text-slate-700 hover:bg-slate-50`}>Cancel</button><button type="button" disabled={busy} onClick={async () => {
                if (lock.current) return;
                lock.current = true;
                setBusy(true);
                setError('');
                try { await manager.discard(record.id); onClose(); }
                catch (requestError) { setError(requestError.message || 'Unable to discard this recovery safely. Check its status and try again.'); }
                finally { lock.current = false; setBusy(false); }
            }} className={`${actionClass} bg-rose-600 text-white hover:bg-rose-700`}>{busy ? <><Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Checking…</> : 'Discard recovery'}</button></div>
        </div>
    </dialog>, document.body);
}

export default function ProductActivity() {
    const { records, storageError, manager, activityOpen, activityTab, openActivity, closeActivity, selectActivityTab } = useProductSubmissions();
    const dialogRef = useRef(null);
    const closeRef = useRef(null);
    const tabsRef = useRef([]);
    const [discardRecord, setDiscardRecord] = useState(null);
    const counts = getProductActivityCounts(records);
    const savedTab = activityTab === 'saved';
    const visible = records.filter(record => (getProductActivityStatus(record).key === 'saved') === savedTab);
    useNativeDialog(Boolean(activityOpen), dialogRef, closeRef);
    if (!manager.scope) return null;
    const close = () => { setDiscardRecord(null); closeActivity(); };
    const handleTabKey = event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : savedTab ? 0 : 1;
        selectActivityTab(next ? 'saved' : 'unfinished');
        tabsRef.current[next]?.focus();
    };
    return <>
        {(records.length > 0 || storageError) && (
            <div className="mx-4 mt-3 sm:mx-6 lg:mx-8">
                <button
                    type="button"
                    aria-label="Product Activity"
                    aria-haspopup="dialog"
                    aria-expanded={Boolean(activityOpen)}
                    aria-controls="product-activity-center"
                    onClick={() => openActivity('unfinished')}
                    className={`flex min-h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-left text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/30 ${focusClass}`}
                >
                    {counts.saving
                        ? <Loader2 className="size-4 shrink-0 animate-spin text-indigo-600 motion-reduce:animate-none" aria-hidden="true" />
                        : <Package className="size-4 shrink-0 text-indigo-600" aria-hidden="true" />}
                    Product Activity
                    <span className="ml-auto text-xs font-normal text-slate-500">{counts.unfinished ? `${counts.unfinished} unfinished` : 'All caught up'}</span>
                    <ArrowRight className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                </button>
            </div>
        )}
        <p role="status" aria-live="polite" className="sr-only">
            Product Activity: {getProductActivityBreakdown(counts)}. {counts.saved} recently saved.
        </p>
        {createPortal(
            <dialog
                ref={dialogRef}
                id="product-activity-center"
                aria-labelledby="product-activity-title"
                aria-describedby="product-activity-description"
                onCancel={event => { event.preventDefault(); close(); }}
                onClick={event => {
                    if (event.target !== event.currentTarget) return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
                }}
                className="m-0 ml-auto h-dvh max-h-none w-full max-w-none border-0 bg-slate-50 p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/45 sm:max-w-[520px]"
            >
                {activityOpen && (
                    <div className="flex h-full min-h-0 flex-col">
                        <header className="shrink-0 border-b border-slate-200 bg-white px-5 pb-0 pt-5 sm:px-6">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">Publishing center</p>
                                    <h2 id="product-activity-title" className="text-xl font-bold tracking-tight">Product Activity</h2>
                                </div>
                                <button
                                    ref={closeRef}
                                    type="button"
                                    aria-label="Close product activity"
                                    onClick={close}
                                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 ${focusClass}`}
                                ><X className="size-5" aria-hidden="true" /></button>
                            </div>
                            <p id="product-activity-description" className="mt-2 text-xs leading-5 text-slate-500">Find unfinished products and check what happened to each save.</p>
                            <div role="tablist" aria-label="Product activity views" className="mt-4 flex gap-5">
                                {[['unfinished', 'Unfinished', counts.unfinished], ['saved', 'Recently Saved', counts.saved]].map(([tab, label, count], index) => (
                                    <button
                                        key={tab}
                                        ref={element => { tabsRef.current[index] = element; }}
                                        id={`product-activity-tab-${tab}`}
                                        type="button"
                                        role="tab"
                                        aria-selected={activityTab === tab}
                                        aria-controls="product-activity-panel"
                                        tabIndex={activityTab === tab ? 0 : -1}
                                        onKeyDown={handleTabKey}
                                        onClick={() => selectActivityTab(tab)}
                                        className={`flex min-h-11 items-center gap-2 border-b-2 px-1 py-3 text-sm font-semibold ${focusClass} ${activityTab === tab ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                                    >
                                        {label}
                                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activityTab === tab ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                                    </button>
                                ))}
                            </div>
                        </header>
                        <div
                            id="product-activity-panel"
                            role="tabpanel"
                            aria-labelledby={`product-activity-tab-${savedTab ? 'saved' : 'unfinished'}`}
                            tabIndex={0}
                            className={`min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 sm:p-6 ${focusClass}`}
                        >
                            {storageError && (
                                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800">
                                    Recovery storage needs attention: {storageError}. Keep any unsaved form open and check browser storage.
                                </p>
                            )}
                            {visible.map(record => <ActivityCard key={record.id} record={record} manager={manager} onReview={close} onDiscard={setDiscardRecord} />)}
                            {!visible.length && (
                                <div className="px-6 py-14 text-center">
                                    <span className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-indigo-500"><CheckCircle2 className="size-6" aria-hidden="true" /></span>
                                    <h3 className="mt-4 text-sm font-bold text-slate-900">{savedTab ? 'No recently saved products' : 'No unfinished products'}</h3>
                                    <p className="mt-2 text-xs leading-5 text-slate-500">{savedTab ? 'Products confirmed in this browser will appear here.' : 'Your recoverable saves will appear here if they need attention.'}</p>
                                </div>
                            )}
                        </div>
                        <footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 text-[11px] leading-5 text-slate-500 sm:px-6">
                            Recovery is saved in this browser. Clearing browser data, changing devices, or ending a private session can remove it. Uploads may stop when the dashboard closes.
                        </footer>
                    </div>
                )}
            </dialog>,
            document.body
        )}
        {discardRecord && activityOpen && (
            <DiscardRecoveryDialog
                key={discardRecord.id}
                record={discardRecord}
                manager={manager}
                onClose={() => { setDiscardRecord(null); queueMicrotask(() => closeRef.current?.focus()); }}
            />
        )}
    </>;
}
