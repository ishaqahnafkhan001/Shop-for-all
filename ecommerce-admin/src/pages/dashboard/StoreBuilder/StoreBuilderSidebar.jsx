import { History } from 'lucide-react';
import { BuilderButton } from './builderUi.jsx';
import { storeLayoutItems } from './storeBuilderConstants.jsx';

export function StoreBuilderSidebar({
    mobileWorkspace,
    activeElement,
    activeGroup,
    selectEditorTarget,
    hasUnsavedChanges,
    publishedVersionLabel,
    restorePublishedVersion,
    handleSave,
    saving,
    validation,
    planAccess
}) {
    return (
        <aside className={`${mobileWorkspace === 'structure' ? 'block' : 'hidden'} space-y-4 xl:sticky xl:top-28 xl:block xl:self-start`}>
            <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">Store Layout</p>
                <div className="space-y-1">
                    {storeLayoutItems.map(item => {
                        const Icon = item.icon;
                        const relatedTargets = item.relatedTargets || [item.target];
                        const active = activeElement === item.target || relatedTargets.includes(activeElement) || activeGroup === item.group;
                        const lockedByPlan = planAccess?.storeBuilderAccess !== 'full' && (
                            item.id === 'sections' ||
                            (item.id === 'domain' && planAccess?.features?.customDomain === false)
                        );
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => selectEditorTarget(item.target)}
                                className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                    active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                                }`}
                            >
                                <Icon size={18} className={active ? 'mt-0.5 text-indigo-600' : 'mt-0.5 text-slate-400'} />
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2 text-sm font-semibold">
                                        {item.label}
                                        {(item.locked || lockedByPlan) && (
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                                                {lockedByPlan ? 'Growth' : 'Locked'}
                                            </span>
                                        )}
                                    </span>
                                    <span className="mt-0.5 block text-xs leading-4 opacity-75">{item.description}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                    Click a row here, or click an outlined section directly in the preview, to open the matching settings. Locked layout sections still allow content and style edits.
                </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                    <span className="rounded-lg bg-slate-100 p-2 text-slate-600">
                        <History size={17} />
                    </span>
                    <div>
                        <p className="text-sm font-black text-slate-950">Draft and version</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            Changes stay in this editor until you publish them.
                        </p>
                    </div>
                </div>
                <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <span className="font-semibold text-slate-500">Current draft</span>
                        <span className={`font-black ${hasUnsavedChanges ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {hasUnsavedChanges ? 'Unpublished' : 'Published'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <span className="font-semibold text-slate-500">Last published</span>
                        <span className="font-black text-slate-800">{publishedVersionLabel}</span>
                    </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <BuilderButton type="button" variant="secondary" onClick={restorePublishedVersion} disabled={!hasUnsavedChanges || saving} className="w-full text-xs">
                        Restore
                    </BuilderButton>
                    <BuilderButton type="button" variant="secondary" onClick={handleSave} disabled={saving || validation.length > 0} className="w-full text-xs">
                        Publish
                    </BuilderButton>
                </div>
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Version history</p>
                            <p className="mt-1 text-sm font-bold text-slate-800">{publishedVersionLabel}</p>
                            <p className="mt-1 text-[11px] leading-5 text-slate-500">
                                Full saved version history needs backend persistence. This panel is ready for future restore and preview actions.
                            </p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-800">
                            Current
                        </span>
                    </div>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-slate-500">
                    Shortcuts: Cmd/Ctrl+S publish, Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z or Ctrl+Y redo.
                </p>
            </div>

            {validation.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <p className="font-bold">Fix before saving</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                        {validation.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}
                    </ul>
                </div>
            )}
        </aside>
    );
}
