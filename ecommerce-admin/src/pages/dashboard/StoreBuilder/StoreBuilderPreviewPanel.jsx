import { StorefrontPreview } from './StorefrontPreview.jsx';

export function StoreBuilderPreviewPanel({
    mobileWorkspace,
    setMobileWorkspace,
    previewPages,
    previewPage,
    setPreviewPage,
    device,
    theme,
    storewideDiscount,
    shopName,
    availableProducts,
    productCategories,
    availableReviews,
    activeElement,
    selectEditorTarget,
    moveHomepageSection,
    duplicateHomepageSection,
    toggleHomepageSectionVisibility,
    removeHomepageSection
}) {
    return (
        <section className={`${mobileWorkspace === 'preview' ? 'block' : 'hidden'} order-1 rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:block 2xl:order-2`}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-base font-bold text-slate-950">Live preview</h2>
                    <p className="mt-1 text-sm text-slate-500">The preview updates live from the settings panel.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                        {previewPages.map(page => (
                            <button
                                key={page.id}
                                type="button"
                                aria-pressed={previewPage === page.id}
                                onClick={() => setPreviewPage(page.id)}
                                className={`rounded-md px-3 py-1.5 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                    previewPage === page.id
                                        ? 'bg-slate-950 text-white'
                                        : 'text-slate-600 hover:bg-white hover:text-slate-950'
                                }`}
                            >
                                {page.label}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setMobileWorkspace('edit')}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 xl:hidden"
                    >
                        Edit selected
                    </button>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-600">
                        {device}
                    </div>
                </div>
            </div>
            <StorefrontPreview
                theme={theme}
                storewideDiscount={Number(storewideDiscount) || 0}
                shopName={shopName}
                device={device}
                previewPage={previewPage}
                availableProducts={availableProducts}
                availableCategories={productCategories}
                availableReviews={availableReviews}
                activeElement={activeElement}
                onSelectElement={selectEditorTarget}
                onMoveSection={moveHomepageSection}
                onDuplicateSection={duplicateHomepageSection}
                onToggleSectionVisibility={toggleHomepageSectionVisibility}
                onRemoveSection={removeHomepageSection}
            />
        </section>
    );
}
