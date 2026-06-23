import { History } from 'lucide-react';
import { BuilderButton } from './builderUi.jsx';
import { settingsGroups, structureTree } from './storeBuilderConstants.jsx';

export function StoreBuilderSidebar({
    mobileWorkspace,
    activeElement,
    activeGroup,
    selectEditorTarget,
    selectSettingsGroup,
    hasUnsavedChanges,
    publishedVersionLabel,
    restorePublishedVersion,
    handleSave,
    saving,
    validation
}) {
    return (
        <aside className={`${mobileWorkspace === 'structure' ? 'block' : 'hidden'} space-y-4 xl:sticky xl:top-28 xl:block xl:self-start`}>
            <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">Structure</p>
                <div className="space-y-1">
                    {structureTree.map(item => {
                        const active = activeElement === item.id || item.children?.some(child => child.id === activeElement);
                        return (
                            <div key={item.id} className="rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => selectEditorTarget(item.id)}
                                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                        active ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <span>{item.label}</span>
                                    <span className="text-xs opacity-60">{item.children?.length || 0}</span>
                                </button>
                                {item.children?.length > 0 && (
                                    <div className="ml-3 mt-1 space-y-1 border-l border-slate-200 pl-2">
                                        {item.children.map(child => {
                                            const childActive = activeElement === child.id;
                                            return (
                                                <button
                                                    key={child.id}
                                                    type="button"
                                                    onClick={() => selectEditorTarget(child.id)}
                                                    className={`flex w-full items-center rounded-md px-3 py-2 text-left text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                                        childActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                                    }`}
                                                >
                                                    {child.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                    Click a row here, or click an outlined section directly in the preview, to open the matching settings.
                </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">Customize your store</p>
                <div className="space-y-1">
                    {settingsGroups.map(group => {
                        const Icon = group.icon;
                        const active = activeGroup === group.id;
                        return (
                            <button
                                key={group.id}
                                type="button"
                                onClick={() => selectSettingsGroup(group.id)}
                                className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                    active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                                }`}
                            >
                                <Icon size={18} className={active ? 'mt-0.5 text-indigo-600' : 'mt-0.5 text-slate-400'} />
                                <span>
                                    <span className="block text-sm font-semibold">{group.label}</span>
                                    <span className="mt-0.5 block text-xs leading-4 opacity-75">{group.description}</span>
                                </span>
                            </button>
                        );
                    })}
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
