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
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-wide text-indigo-500">Selected</p>
                        <h2 className="mt-1 text-lg font-black text-indigo-950">{selectedLabel}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={() => setMobileWorkspace('preview')}
                        className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-100 xl:hidden"
                    >
                        Preview selected
                    </button>
                    <button
                        type="button"
                        onClick={onCloseInspector}
                        className="hidden rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-100 xl:block 2xl:hidden"
                    >
                        Close settings
                    </button>
                </div>
                <p className="mt-1 text-sm leading-5 text-indigo-700">
                    {planRestriction
                        ? planRestriction
                        : selectedIsLockedLayout
                        ? 'Locked layout, editable content/settings. The section stays in its required position, but you can still tune its allowed settings below.'
                        : 'Edit the selected storefront element below. Existing settings and saved theme fields are preserved.'}
                </p>
            </div>
            {children}
        </aside>
    );
}
