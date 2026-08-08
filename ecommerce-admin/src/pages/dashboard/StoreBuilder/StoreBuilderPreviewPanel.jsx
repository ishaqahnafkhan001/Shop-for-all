import { useState } from 'react';
import { StorefrontPreview } from './StorefrontPreview.jsx';
import { DeviceSwitcher } from './builderUi.jsx';

export function StoreBuilderPreviewPanel({
    mobileWorkspace,
    setMobileWorkspace,
    previewPages,
    previewPage,
    setPreviewPage,
    device,
    setDevice,
    theme,
    storewideDiscount,
    shopName,
    availableProducts,
    productCategories,
    productCategoryDetails,
    availableReviews,
    activeElement,
    selectEditorTarget,
    toggleHomepageSectionVisibility
}) {
    const [previewZoom, setPreviewZoom] = useState('fit');

    return (
        <section className={`${mobileWorkspace === 'preview' ? 'block' : 'hidden'} min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:block`}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-base font-bold text-slate-950">Live preview</h2>
                    <p className="mt-1 text-sm text-slate-500">Select an element in the preview to edit it.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <DeviceSwitcher value={device} onChange={setDevice} />
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
                    <label className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-500">
                        <span className="sr-only">Preview zoom</span>
                        <select
                            value={previewZoom}
                            onChange={event => setPreviewZoom(event.target.value)}
                            className="bg-transparent text-xs font-black text-slate-700 outline-none"
                            aria-label="Preview zoom"
                        >
                            <option value="fit">Fit</option>
                            <option value="0.75">75%</option>
                            <option value="1">100%</option>
                        </select>
                    </label>
                    <button
                        type="button"
                        onClick={() => setMobileWorkspace('edit')}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 xl:hidden"
                    >
                        Edit selected
                    </button>
                </div>
            </div>
            <StorefrontPreview
                theme={theme}
                storewideDiscount={Number(storewideDiscount) || 0}
                shopName={shopName}
                device={device}
                previewPage={previewPage}
                previewZoom={previewZoom}
                availableProducts={availableProducts}
                availableCategories={productCategoryDetails?.length ? productCategoryDetails : productCategories}
                availableReviews={availableReviews}
                activeElement={activeElement}
                onSelectElement={selectEditorTarget}
                onToggleSectionVisibility={toggleHomepageSectionVisibility}
            />
        </section>
    );
}
