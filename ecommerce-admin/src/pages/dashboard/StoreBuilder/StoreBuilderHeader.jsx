import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Cloud, Ellipsis, ExternalLink, History, LayoutTemplate, Redo2, RefreshCw, RotateCcw, Save, Trash2, Undo2 } from 'lucide-react';
import { BuilderButton } from './builderUi.jsx';

const statusCopy = ({ saving, hasUnsavedChanges, autosaveStatus, conflict, offline }) => {
    if (conflict) return { label: 'Conflict detected', tone: 'bg-red-100 text-red-800' };
    if (offline) return { label: 'Offline', tone: 'bg-red-100 text-red-800' };
    if (saving) return { label: 'Publishing…', tone: 'bg-blue-100 text-blue-800' };
    if (autosaveStatus === 'saving') return { label: 'Saving draft…', tone: 'bg-blue-100 text-blue-800' };
    if (hasUnsavedChanges && autosaveStatus === 'saved') return { label: 'Draft saved', tone: 'bg-amber-100 text-amber-800' };
    if (hasUnsavedChanges) return { label: 'Unpublished changes', tone: 'bg-amber-100 text-amber-800' };
    return { label: 'Published', tone: 'bg-emerald-100 text-emerald-800' };
};

export const StoreBuilderHeader = ({
    hasUnsavedChanges,
    lastPublishedLabel,
    canUndo,
    canRedo,
    saving,
    validationCount,
    onUndo,
    onRedo,
    onResetStyling,
    onRestorePublished,
    onSaveDraft,
    onReload,
    onSave,
    onOpenIssues,
    onOpenHistory,
    onOpenThemes,
    liveStoreUrl,
    autosaveStatus,
    revision,
    conflict,
    mobileWorkspace,
    onWorkspaceChange
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const status = statusCopy({ saving, hasUnsavedChanges, autosaveStatus, conflict, offline });

    useEffect(() => {
        if (!menuOpen) return undefined;
        const close = (event) => {
            if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
        };
        document.addEventListener('pointerdown', close);
        return () => document.removeEventListener('pointerdown', close);
    }, [menuOpen]);

    const runMenuAction = (action) => {
        setMenuOpen(false);
        action?.();
    };

    return (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-lg font-black text-slate-950">Store Builder</h1>
                        <span role="status" aria-live="polite" className={`rounded-full px-2.5 py-1 text-xs font-black ${status.tone}`}>{status.label}</span>
                    </div>
                    <p className="mt-1 hidden text-xs text-slate-500 sm:block">Revision {revision || 0} · Published {lastPublishedLabel || 'not yet'}</p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                    <button type="button" onClick={onOpenThemes} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"><LayoutTemplate size={16} /> Themes</button>
                    <button type="button" aria-label="Undo last change" title="Undo" onClick={onUndo} disabled={!canUndo || saving} className="min-h-10 min-w-10 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40"><Undo2 className="mx-auto" size={17} /></button>
                    <button type="button" aria-label="Redo last change" title="Redo" onClick={onRedo} disabled={!canRedo || saving} className="min-h-10 min-w-10 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40"><Redo2 className="mx-auto" size={17} /></button>
                    <button type="button" onClick={onOpenIssues} className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 ${validationCount ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><AlertCircle size={16} /> Issues {validationCount || 0}</button>
                    <BuilderButton type="button" onClick={onSave} disabled={saving || validationCount > 0}><Save size={16} /> {saving ? 'Publishing…' : 'Publish'}</BuilderButton>

                    <div ref={menuRef} className="relative">
                        <button type="button" aria-label="More Store Builder actions" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)} className="min-h-10 min-w-10 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"><Ellipsis className="mx-auto" size={18} /></button>
                        {menuOpen && (
                            <div role="menu" className="absolute right-0 top-12 z-50 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
                                <button role="menuitem" type="button" disabled={!hasUnsavedChanges || saving} onClick={() => runMenuAction(onSaveDraft)} className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Cloud size={16} /> Save draft now</button>
                                {liveStoreUrl && <a role="menuitem" href={liveStoreUrl} target="_blank" rel="noreferrer" className="flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><ExternalLink size={16} /> Open live store</a>}
                                <button role="menuitem" type="button" disabled={saving} onClick={() => runMenuAction(onReload)} className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><RefreshCw size={16} /> Reload published version</button>
                                <button role="menuitem" type="button" onClick={() => runMenuAction(onOpenHistory)} className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"><History size={16} /> Version history</button>
                                <div className="my-2 border-t border-slate-200" />
                                <button role="menuitem" type="button" disabled={saving} onClick={() => runMenuAction(() => window.confirm('Reset visual styling to defaults while keeping your content? This remains a draft until published.') && onResetStyling())} className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-40"><RotateCcw size={16} /> Reset styling</button>
                                <button role="menuitem" type="button" disabled={!hasUnsavedChanges || saving} onClick={() => runMenuAction(() => window.confirm('Discard all unpublished Store Builder changes?') && onRestorePublished())} className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-40"><Trash2 size={16} /> Discard all draft changes</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {validationCount > 0 && <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-center text-xs font-bold text-red-800">Resolve {validationCount} publish-blocking issue{validationCount === 1 ? '' : 's'} before publishing.</div>}
            <div className="mx-auto grid max-w-[1800px] grid-cols-3 gap-1 border-t border-slate-100 bg-slate-50 p-1 xl:hidden" role="tablist" aria-label="Store Builder workspace">
                {[
                    ['structure', 'Store'],
                    ['preview', 'Preview'],
                    ['edit', 'Settings']
                ].map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={mobileWorkspace === id} onClick={() => onWorkspaceChange(id)} className={`min-h-11 rounded-md px-3 text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 ${mobileWorkspace === id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>{label}</button>)}
            </div>
        </header>
    );
};
