import { Eye, RotateCcw } from 'lucide-react';
import { BuilderDrawer } from './BuilderDrawer.jsx';

export function HistoryDrawer({ open, revisions = [], onClose, onPreview, onRestore, busy }) {
    return (
        <BuilderDrawer open={open} title="Version history" description="Preview an earlier publication or restore it as a new revision." onClose={onClose}>
            {revisions.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No published revisions are available yet.</div>
            ) : (
                <ol className="space-y-3">
                    {revisions.map(revision => (
                        <li key={revision._id || revision.revision} className="rounded-lg border border-slate-200 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-black text-slate-950">Revision {revision.revision}</p>
                                    <p className="mt-1 text-xs text-slate-500">{revision.publishedByName || 'Store owner'} · {revision.createdAt ? new Date(revision.createdAt).toLocaleString() : 'Date unavailable'}</p>
                                </div>
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">{revision.changeScope === 'homepage-seo' ? 'SEO' : 'Storefront'}</span>
                            </div>
                            {revision.changeSummary?.length > 0 && <p className="mt-2 text-xs leading-5 text-slate-600">{revision.changeSummary.slice(0, 2).map(item => item.message || item.area).filter(Boolean).join(' · ')}</p>}
                            <div className="mt-3 flex gap-2">
                                <button type="button" disabled={busy} onClick={() => onPreview(revision._id)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Eye size={14} /> Preview</button>
                                <button type="button" disabled={busy} onClick={() => onRestore(revision._id)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50"><RotateCcw size={14} /> Restore</button>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </BuilderDrawer>
    );
}
