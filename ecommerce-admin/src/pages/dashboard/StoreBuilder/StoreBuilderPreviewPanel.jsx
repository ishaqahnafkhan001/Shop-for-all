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
    planAccess,
    branding,
    trustedBadge,
    shopVerification,
    storewideDiscount,
    shopName,
    availableProducts,
    previewCatalog,
    productCategories,
    productCategoryDetails,
    availableReviews,
    activeElement,
    selectEditorTarget,
    toggleHomepageSectionVisibility
}) {
    const [previewZoom, setPreviewZoom] = useState('fit');

    return (
        <section id="builder-workspace-preview" tabIndex={-1} aria-label="Storefront preview workspace" className={`${mobileWorkspace === 'preview' ? 'block' : 'hidden'} min-w-0 rounded-lg border border-slate-200 bg-white p-2 shadow-sm sm:p-4 xl:block`}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-base font-bold text-slate-950">Live preview</h2>
                    <p className="mt-1 text-sm text-slate-500">Select an element in the preview to edit it.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <DeviceSwitcher value={device} onChange={setDevice} />
                    <label className="flex min-h-11 items-center gap-2 text-sm font-semibold xl:hidden">Page
                        <select aria-label="Preview page" value={previewPage} onChange={event => setPreviewPage(event.target.value)} className="min-h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-2">
                            {previewPages.map(page => <option key={page.id} value={page.id}>{page.label}</option>)}
                        </select>
                    </label>
                    <div className="hidden flex-wrap rounded-lg border border-slate-200 bg-slate-50 p-1 xl:inline-flex">
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
                previewCatalog={previewCatalog}
                trustedBadge={trustedBadge}
                shopVerification={shopVerification}
                theme={theme}
                planAccess={planAccess}
                branding={branding}
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
