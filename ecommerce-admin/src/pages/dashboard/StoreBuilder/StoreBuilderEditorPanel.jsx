import { LockKeyhole, PanelRightClose } from 'lucide-react';

export function StoreBuilderEditorPanel({
    mobileWorkspace,
    inspectorOpen,
    selectedLabel,
    selectedIsLockedLayout,
    planRestriction,
    setMobileWorkspace,
    onCloseInspector,
    children
}) {
    return (
        <aside
            data-store-builder-editor
            aria-label="Storefront settings inspector"
            className={`${mobileWorkspace === 'edit' ? 'block' : 'hidden'} min-w-0 space-y-4 xl:fixed xl:inset-y-0 xl:right-0 xl:z-40 xl:w-[380px] xl:overflow-y-auto xl:border-l xl:border-slate-200 xl:bg-slate-50 xl:p-4 xl:shadow-2xl ${inspectorOpen ? 'xl:block' : 'xl:hidden'} 2xl:static 2xl:z-auto 2xl:block 2xl:w-auto 2xl:overflow-visible 2xl:border-0 2xl:bg-transparent 2xl:p-0 2xl:shadow-none`}
        >
            <div className="sticky top-0 z-20 rounded-lg border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Editing</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-base font-black text-slate-950">{selectedLabel}</h2>
                            {selectedIsLockedLayout && !planRestriction && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800">
                                    <LockKeyhole size={10} /> Fixed
                                </span>
                            )}
                            {planRestriction && (
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700">Plan locked</span>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setMobileWorkspace('preview')}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 xl:hidden"
                    >
                        Preview
                    </button>
                    <button
                        type="button"
                        onClick={onCloseInspector}
                        aria-label="Close settings panel"
                        title="Close settings"
                        className="hidden min-h-10 min-w-10 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 xl:block 2xl:hidden"
                    >
                        <PanelRightClose className="mx-auto" size={17} />
                    </button>
                </div>
                {planRestriction && <p className="mt-2 text-xs leading-5 text-blue-700">{planRestriction}</p>}
            </div>
            {children}
        </aside>
    );
}
