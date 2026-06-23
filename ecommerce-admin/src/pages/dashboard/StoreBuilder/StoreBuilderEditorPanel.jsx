export function StoreBuilderEditorPanel({
    mobileWorkspace,
    selectedLabel,
    selectedIsLockedLayout,
    setMobileWorkspace,
    children
}) {
    return (
        <div className={`${mobileWorkspace === 'edit' ? 'block' : 'hidden'} order-2 space-y-4 xl:block 2xl:order-1`}>
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
                </div>
                <p className="mt-1 text-sm leading-5 text-indigo-700">
                    {selectedIsLockedLayout
                        ? 'Locked layout, editable content/settings. The section stays in its required position, but you can still tune its allowed settings below.'
                        : 'Edit the selected storefront element below. Existing settings and saved theme fields are preserved.'}
                </p>
            </div>
            {children}
        </div>
    );
}
