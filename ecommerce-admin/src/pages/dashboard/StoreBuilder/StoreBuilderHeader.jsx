import { Redo2, RotateCcw, Save, Undo2 } from 'lucide-react';
import { BuilderButton, DeviceSwitcher } from './builderUi.jsx';

export const StoreBuilderHeader = ({
    hasUnsavedChanges,
    statusLabel,
    lastSavedLabel,
    lastPublishedLabel,
    device,
    onDeviceChange,
    canUndo,
    canRedo,
    saving,
    validationCount,
    onUndo,
    onRedo,
    onResetStyling,
    onRestorePublished,
    onSave,
    mobileWorkspace,
    onWorkspaceChange
}) => (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-slate-950">Store Builder</h1>
                    <span role="status" aria-live="polite" className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        hasUnsavedChanges ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                        {statusLabel || (hasUnsavedChanges ? 'Unsaved changes' : 'Published')}
                    </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                    Customize your storefront without code. Preview draft changes, then publish when ready.
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                    <span>Last saved: <strong className="text-slate-700">{lastSavedLabel || 'Current session only'}</strong></span>
                    <span>Last published: <strong className="text-slate-700">{lastPublishedLabel || 'Not available'}</strong></span>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <DeviceSwitcher value={device} onChange={onDeviceChange} />
                <BuilderButton type="button" variant="secondary" onClick={onUndo} disabled={!canUndo || saving} title="Undo last editor change">
                    <Undo2 size={16} />
                    Undo
                </BuilderButton>
                <BuilderButton type="button" variant="secondary" onClick={onRedo} disabled={!canRedo || saving} title="Redo last editor change">
                    <Redo2 size={16} />
                    Redo
                </BuilderButton>
                <BuilderButton type="button" variant="secondary" onClick={onResetStyling} disabled={saving}>
                    <RotateCcw size={16} />
                    Reset styling
                </BuilderButton>
                <BuilderButton type="button" variant="secondary" disabled title="Backend draft persistence is not available yet. Publishing still uses the current save endpoint.">
                    Save draft
                </BuilderButton>
                <BuilderButton type="button" variant="secondary" onClick={onRestorePublished} disabled={!hasUnsavedChanges || saving}>
                    Reset changes
                </BuilderButton>
                <BuilderButton type="button" onClick={onSave} disabled={saving || validationCount > 0}>
                    <Save size={16} />
                    {saving ? 'Publishing...' : 'Publish changes'}
                </BuilderButton>
            </div>
        </div>
        <div className="mx-auto flex max-w-[1600px] gap-2 px-4 pb-3 xl:hidden">
            {[
                ['structure', 'Structure'],
                ['edit', 'Edit'],
                ['preview', 'Preview']
            ].map(([id, label]) => (
                <button
                    key={id}
                    type="button"
                    onClick={() => onWorkspaceChange(id)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        mobileWorkspace === id
                            ? 'border-slate-950 bg-slate-950 text-white'
                            : 'border-slate-200 bg-white text-slate-600'
                    }`}
                >
                    {label}
                </button>
            ))}
        </div>
    </div>
);
