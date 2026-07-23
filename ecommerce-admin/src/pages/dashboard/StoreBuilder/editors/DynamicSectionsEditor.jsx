import { ChevronDown, ChevronUp, Copy, LayoutTemplate, Lock, Plus, Search, Trash2, Unlock, Upload, X } from 'lucide-react';
import {
    BuilderButton,
    BuilderCard,
    BuilderInput,
    BuilderSelect,
    BuilderTextarea,
    BuilderToggle,
    inputClass
} from '../builderUi.jsx';
import {
    editorSectionOptions,
    getSectionSelectionId,
    inlineSectionPresets,
    isHomepageSectionLocked
} from '../storeBuilderConstants.jsx';

export function DynamicSectionsEditor({
    theme,
    activeElement,
    availableProducts,
    productOptions,
    availableReviews,
    productCategories,
    productPicker,
    setProductPicker,
    reviewPicker,
    setReviewPicker,
    uploadingThemeImage,
    addHomepageSection,
    selectEditorTarget,
    moveHomepageSection,
    duplicateHomepageSection,
    toggleHomepageSectionLock,
    removeHomepageSection,
    updateHomepageSection,
    getBannerImages,
    handleBannerImagesUpload,
    removeBannerImage,
    moveBannerImage,
    addBannerImageUrl,
    updateHomepageSectionSetting,
    updateHomepageSectionDesktopSetting,
    updateHomepageSectionMobileSetting,
    loadProductOptions,
    updateFeaturedProductsSelection,
    loadReviewOptions,
    updateReviewSelection
}) {
    return (
                    <BuilderCard
                        title="Homepage sections"
                        description="Navbar, Hero, All Products, and Footer are fixed. Add flexible sections between Hero and All Products."
                        icon={LayoutTemplate}
                        actions={<BuilderButton type="button" variant="secondary" onClick={() => addHomepageSection()}><Plus size={16} /> Add section</BuilderButton>}
                    >
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Homepage order</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-700">
                                        Fixed sections stay in place. Flexible sections render between Hero and All Products.
                                    </p>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-800">
                                    <Lock size={12} /> Locked frame
                                </span>
                            </div>
                            <div className="mt-3 grid gap-2 text-xs font-bold text-slate-600">
                                {[
                                    { label: 'Navbar', note: 'Fixed header', locked: true },
                                    { label: 'Hero Banner', note: 'Fixed opening section', locked: true },
                                    { label: 'Flexible content area', note: 'Add, duplicate, hide, reorder, and edit sections here', locked: false },
                                    { label: 'All Products', note: 'Fixed catalog section', locked: true },
                                    { label: 'Footer', note: 'Fixed closing section', locked: true }
                                ].map(item => (
                                    <div
                                        key={item.label}
                                        className={`flex flex-col gap-1 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between ${
                                            item.locked
                                                ? 'border-slate-200 bg-white'
                                                : 'border-indigo-200 bg-indigo-50 text-indigo-800'
                                        }`}
                                    >
                                        <span className="inline-flex items-center gap-2">
                                            {item.locked ? <Lock size={13} className="text-amber-600" /> : <LayoutTemplate size={13} />}
                                            {item.label}
                                        </span>
                                        <span className="text-[11px] font-semibold opacity-75">{item.note}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="mb-3">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Add flexible section</p>
                                <p className="mt-1 text-sm text-slate-500">Choose a starter layout. You can edit, hide, duplicate, or reorder it after adding.</p>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {inlineSectionPresets.map(preset => (
                                    <button
                                        key={preset.templateId}
                                        type="button"
                                        onClick={() => addHomepageSection(preset)}
                                        className="group grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
                                    >
                                        <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                                            <span className="grid h-full w-full grid-cols-2 gap-1">
                                                {[0, 1, 2, 3].map(item => (
                                                    <span
                                                        key={item}
                                                        className={`rounded-md ${
                                                            preset.thumbnail === 'image'
                                                                ? 'bg-teal-100'
                                                                : preset.thumbnail === 'strip'
                                                                    ? 'col-span-2 bg-indigo-100'
                                                                    : preset.thumbnail === 'quotes'
                                                                        ? 'bg-amber-100'
                                                                        : 'bg-slate-100'
                                                        }`}
                                                    />
                                                ))}
                                            </span>
                                        </span>
                                        <span className="min-w-0">
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-black text-slate-900 group-hover:text-indigo-800">{preset.label}</span>
                                                <Plus size={15} className="shrink-0 text-slate-400 group-hover:text-indigo-600" />
                                            </span>
                                            <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{preset.description}</span>
                                            <span className="mt-2 block text-[11px] font-bold uppercase tracking-wide text-slate-400">{preset.useCase}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        {(theme.homepageSections || []).length === 0 && (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                                No flexible homepage sections yet. Add a banner, featured products, reviews, or promotional content block.
                            </div>
                        )}
                        {(theme.homepageSections || []).map((section, index) => {
                            const locked = isHomepageSectionLocked(section);
                            const previousLocked = isHomepageSectionLocked((theme.homepageSections || [])[index - 1]);
                            const nextLocked = isHomepageSectionLocked((theme.homepageSections || [])[index + 1]);
                            const selectedProductIds = section.settings?.productIds || section.settings?.source?.productIds || [];
                            const selectedProducts = selectedProductIds
                                .map(productId => availableProducts.find(product => String(product._id) === String(productId)))
                                .filter(Boolean);
                            const selectedReviewIds = section.settings?.reviewIds || [];
                            const selectedReviews = selectedReviewIds
                                .map(reviewId => availableReviews.find(review => String(review._id) === String(reviewId)))
                                .filter(Boolean);
                            const availableCategoryOptions = productCategories.length
                                ? productCategories
                                : [...new Set(availableProducts.map(product => product.category).filter(Boolean))];
                            const sectionSelectionId = getSectionSelectionId(section, index);
                            const isSelectedSection = activeElement === sectionSelectionId;

                            return (
                            <div
                                key={section.id || section._id || index}
                                className={`rounded-lg border p-3 transition ${
                                    isSelectedSection
                                        ? 'border-indigo-300 bg-indigo-50/60 ring-2 ring-indigo-100'
                                        : locked
                                            ? 'border-amber-200 bg-amber-50/40'
                                            : 'border-slate-200 bg-white'
                                }`}
                            >
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-slate-900">{section.title || section.type}</p>
                                            {isSelectedSection && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800">
                                                    Editing
                                                </span>
                                            )}
                                            {locked && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                                                    <Lock size={12} /> Locked
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            {locked ? 'Fixed section settings are protected.' : `${section.type} inside the flexible content area.`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button type="button" onClick={() => selectEditorTarget(sectionSelectionId)} className="rounded-md px-2 py-2 text-xs font-black text-indigo-600 hover:bg-indigo-100" title="Edit section">
                                            Edit
                                        </button>
                                        <button type="button" onClick={() => moveHomepageSection(index, -1)} disabled={locked || previousLocked || index === 0} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30" title="Move section up">
                                            <ChevronUp size={16} />
                                        </button>
                                        <button type="button" onClick={() => moveHomepageSection(index, 1)} disabled={locked || nextLocked || index === (theme.homepageSections || []).length - 1} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30" title="Move section down">
                                            <ChevronDown size={16} />
                                        </button>
                                        <button type="button" onClick={() => duplicateHomepageSection(index)} disabled={locked} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30" title="Duplicate section">
                                            <Copy size={16} />
                                        </button>
                                        <button type="button" onClick={() => toggleHomepageSectionLock(index)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" title={locked ? 'Unlock section' : 'Lock section'}>
                                            {locked ? <Unlock size={16} /> : <Lock size={16} />}
                                        </button>
                                        <button type="button" onClick={() => removeHomepageSection(index)} disabled={locked} className="rounded-md p-2 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30" title="Remove section">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <BuilderSelect label="Section type" value={section.type || 'FeaturedProducts'} onChange={e => updateHomepageSection(index, 'type', e.target.value)} disabled={locked}>
                                        {editorSectionOptions.map(option => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </BuilderSelect>
                                    <BuilderInput label="Section title" value={section.title || ''} onChange={e => updateHomepageSection(index, 'title', e.target.value)} disabled={locked} />
                                </div>
                                {section.type === 'Banner' && (
                                    <div className="mt-3 grid grid-cols-1 gap-3">
                                        {[
                                            { key: 'desktopImages', label: 'Desktop images', help: 'Wide campaign images for laptop and desktop shoppers.' },
                                            { key: 'mobileImages', label: 'Mobile images', help: 'Vertical or square campaign images for phones.' }
                                        ].map(({ key, label, help }) => {
                                            const images = getBannerImages(section, key);
                                            return (
                                                <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900">{label}</p>
                                                            <p className="text-xs text-slate-500">{help} Maximum 5 images.</p>
                                                        </div>
                                                        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100">
                                                            <Upload size={14} />
                                                            {uploadingThemeImage ? 'Uploading...' : 'Upload'}
                                                            <input
                                                                type="file"
                                                                multiple
                                                                accept="image/png,image/jpeg,image/webp"
                                                                className="hidden"
                                                                disabled={locked || uploadingThemeImage || images.length >= 5}
                                                                onChange={event => handleBannerImagesUpload(event, index, key)}
                                                            />
                                                        </label>
                                                    </div>
                                                    {images.length === 0 ? (
                                                        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500">No images added yet.</p>
                                                    ) : (
                                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                                            {images.map((image, imageIndex) => (
                                                                <div key={image} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                                                    <img src={image} alt="" className="h-24 w-full object-cover" />
                                                                    <div className="flex items-center justify-between gap-1 p-2">
                                                                        <button type="button" onClick={() => moveBannerImage(index, key, imageIndex, -1)} disabled={locked || imageIndex === 0} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                                                                            <ChevronUp size={14} />
                                                                        </button>
                                                                        <button type="button" onClick={() => moveBannerImage(index, key, imageIndex, 1)} disabled={locked || imageIndex === images.length - 1} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                                                                            <ChevronDown size={14} />
                                                                        </button>
                                                                        <button type="button" onClick={() => removeBannerImage(index, key, imageIndex)} disabled={locked} className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-30">
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <BuilderInput
                                                        label="Paste image URL"
                                                        defaultValue=""
                                                        onBlur={e => {
                                                            addBannerImageUrl(index, key, e.currentTarget.value);
                                                            e.currentTarget.value = '';
                                                        }}
                                                        disabled={locked || images.length >= 5}
                                                        placeholder="https://..."
                                                        help="Optional. Upload is recommended for reliable image delivery."
                                                    />
                                                </div>
                                            );
                                        })}
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <BuilderInput label="Banner headline" value={section.settings?.title || ''} onChange={e => updateHomepageSectionSetting(index, 'title', e.target.value)} disabled={locked} />
                                            <BuilderInput label="Subtitle" value={section.settings?.subtitle || ''} onChange={e => updateHomepageSectionSetting(index, 'subtitle', e.target.value)} disabled={locked} />
                                            <BuilderInput label="Button text" value={section.settings?.buttonText || ''} onChange={e => updateHomepageSectionSetting(index, 'buttonText', e.target.value)} disabled={locked} />
                                            <BuilderInput label="Button link" value={section.settings?.buttonLink || ''} onChange={e => updateHomepageSectionSetting(index, 'buttonLink', e.target.value)} disabled={locked} />
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            {[
                                                ['settings', 'Desktop image focus', section.settings?.focalPoint || { x: 50, y: 50 }],
                                                ['mobileSettings', 'Mobile image focus', section.mobileSettings?.focalPoint || { x: 50, y: 50 }]
                                            ].map(([scope, label, point]) => (
                                                <div key={scope} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                                    <p className="text-xs font-bold text-slate-700">{label}</p>
                                                    <label className="mt-2 block text-[11px] font-semibold text-slate-500">Horizontal: {point.x}%</label>
                                                    <input type="range" min="0" max="100" value={point.x} disabled={locked} onChange={event => {
                                                        const next = { ...point, x: Number(event.target.value) };
                                                        if (scope === 'settings') updateHomepageSectionSetting(index, 'focalPoint', next);
                                                        else updateHomepageSectionMobileSetting(index, 'focalPoint', next);
                                                    }} className="w-full accent-indigo-600" />
                                                    <label className="mt-2 block text-[11px] font-semibold text-slate-500">Vertical: {point.y}%</label>
                                                    <input type="range" min="0" max="100" value={point.y} disabled={locked} onChange={event => {
                                                        const next = { ...point, y: Number(event.target.value) };
                                                        if (scope === 'settings') updateHomepageSectionSetting(index, 'focalPoint', next);
                                                        else updateHomepageSectionMobileSetting(index, 'focalPoint', next);
                                                    }} className="w-full accent-indigo-600" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {section.type === 'FeaturedProducts' && (
                                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">Manual product selection</p>
                                                <p className="mt-1 text-xs text-slate-500">Collection and automatic rule sources can use this same source structure later.</p>
                                            </div>
                                            <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-500">
                                                {selectedProductIds.length} selected
                                            </span>
                                        </div>
                                        {selectedProducts.length > 0 && (
                                            <div className="mb-3 flex flex-wrap gap-2">
                                                {selectedProducts.map(product => (
                                                    <span key={product._id} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                                                        {product.title}
                                                        <button type="button" onClick={() => updateFeaturedProductsSelection(index, product._id, false)} disabled={locked} className="text-red-500 disabled:opacity-40">
                                                            <X size={12} />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_160px_auto]">
                                            <label className="relative">
                                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    value={productPicker.search}
                                                    onChange={e => setProductPicker(prev => ({ ...prev, search: e.target.value }))}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            loadProductOptions({ page: 1, search: productPicker.search, category: productPicker.category });
                                                        }
                                                    }}
                                                    className={`${inputClass} pl-9`}
                                                    placeholder="Search products"
                                                    disabled={locked}
                                                />
                                            </label>
                                            <select
                                                value={productPicker.category}
                                                onChange={e => {
                                                    const category = e.target.value;
                                                    setProductPicker(prev => ({ ...prev, category }));
                                                    loadProductOptions({ page: 1, search: productPicker.search, category });
                                                }}
                                                className={inputClass}
                                                disabled={locked}
                                            >
                                                <option value="All">All categories</option>
                                                {availableCategoryOptions.map(category => (
                                                    <option key={category} value={category}>{category}</option>
                                                ))}
                                            </select>
                                            <BuilderButton type="button" variant="secondary" onClick={() => loadProductOptions({ page: 1, search: productPicker.search, category: productPicker.category })} disabled={locked || productPicker.loading}>
                                                {productPicker.loading ? 'Searching...' : 'Search'}
                                            </BuilderButton>
                                        </div>
                                        <div className="max-h-56 space-y-2 overflow-y-auto">
                                            {productOptions.length === 0 ? (
                                                <p className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500">No published products available yet.</p>
                                            ) : productOptions.map(product => {
                                                const productId = product._id;
                                                const selected = selectedProductIds.map(String).includes(String(productId));
                                                return (
                                                    <label key={productId} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm">
                                                        <span className="min-w-0">
                                                            <span className="block truncate font-semibold text-slate-800">{product.title}</span>
                                                            <span className="text-xs text-slate-500">{product.category || 'No category'} · ৳ {product.pricing?.sellingPrice || 0}</span>
                                                        </span>
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            disabled={locked}
                                                            onChange={e => updateFeaturedProductsSelection(index, productId, e.target.checked)}
                                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        {productPicker.page < productPicker.pages && (
                                            <BuilderButton
                                                type="button"
                                                variant="secondary"
                                                className="mt-3 w-full"
                                                onClick={() => loadProductOptions({ page: productPicker.page + 1, append: true, search: productPicker.search, category: productPicker.category })}
                                                disabled={locked || productPicker.loading}
                                            >
                                                {productPicker.loading ? 'Loading...' : 'Load more products'}
                                            </BuilderButton>
                                        )}
                                    </div>
                                )}
                                {section.type === 'Reviews' && (
                                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">Real 5-star testimonials</p>
                                                <p className="mt-1 text-xs text-slate-500">Select real customer reviews by Review ID. Only 10 reviews load at a time.</p>
                                            </div>
                                            <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-500">
                                                {selectedReviewIds.length} selected
                                            </span>
                                        </div>
                                        <BuilderSelect
                                            label="Review source"
                                            value={section.settings?.mode || (selectedReviewIds.length ? 'selectedReviews' : 'text')}
                                            onChange={e => updateHomepageSectionSetting(index, 'mode', e.target.value)}
                                            disabled={locked}
                                            help="Use real reviews when available, or a manual testimonial as fallback."
                                        >
                                            <option value="selectedReviews">Selected 5-star reviews</option>
                                            <option value="text">Manual testimonial text</option>
                                        </BuilderSelect>
                                        {selectedReviews.length > 0 && (
                                            <div className="my-3 space-y-2">
                                                {selectedReviews.map(review => (
                                                    <div key={review._id} className="rounded-lg bg-white p-3 text-sm shadow-sm">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="font-black text-slate-900">{review.name}</p>
                                                                <p className="text-xs font-bold text-amber-500">★★★★★ <span className="text-slate-400">Review ID {String(review._id).slice(-8)}</span></p>
                                                                <p className="mt-1 truncate text-xs text-slate-500">{review.product?.title || 'Product review'}</p>
                                                            </div>
                                                            <button type="button" onClick={() => updateReviewSelection(index, review._id, false)} disabled={locked} className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-40">
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{review.comment}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                                            <label className="relative">
                                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    value={reviewPicker.search}
                                                    onChange={e => setReviewPicker(prev => ({ ...prev, search: e.target.value }))}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            loadReviewOptions({ page: 1, search: reviewPicker.search });
                                                        }
                                                    }}
                                                    className={`${inputClass} pl-9`}
                                                    placeholder="Search reviewer, product, or comment"
                                                    disabled={locked}
                                                />
                                            </label>
                                            <BuilderButton type="button" variant="secondary" onClick={() => loadReviewOptions({ page: 1, search: reviewPicker.search })} disabled={locked || reviewPicker.loading}>
                                                {reviewPicker.loading ? 'Searching...' : 'Search'}
                                            </BuilderButton>
                                        </div>
                                        <div className="max-h-64 space-y-2 overflow-y-auto">
                                            {availableReviews.length === 0 ? (
                                                <p className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500">No 5-star reviews found yet.</p>
                                            ) : availableReviews.map(review => {
                                                const selected = selectedReviewIds.map(String).includes(String(review._id));
                                                return (
                                                    <label key={review._id} className="flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm">
                                                        <span className="min-w-0">
                                                            <span className="block truncate font-semibold text-slate-800">{review.name}</span>
                                                            <span className="block text-xs font-bold text-amber-500">★★★★★ <span className="text-slate-400">Review ID {String(review._id).slice(-8)}</span></span>
                                                            <span className="block truncate text-xs text-slate-500">{review.product?.title || 'Product review'}</span>
                                                            <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-600">{review.comment}</span>
                                                        </span>
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            disabled={locked}
                                                            onChange={e => updateReviewSelection(index, review._id, e.target.checked)}
                                                            className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        {reviewPicker.page < reviewPicker.pages && (
                                            <BuilderButton
                                                type="button"
                                                variant="secondary"
                                                className="mt-3 w-full"
                                                onClick={() => loadReviewOptions({ page: reviewPicker.page + 1, append: true, search: reviewPicker.search })}
                                                disabled={locked || reviewPicker.loading}
                                            >
                                                {reviewPicker.loading ? 'Loading...' : 'Load more 10 reviews'}
                                            </BuilderButton>
                                        )}
                                        <div className="mt-3">
                                            <BuilderTextarea
                                                label="Manual fallback text"
                                                value={section.settings?.text || ''}
                                                onChange={e => updateHomepageSectionSetting(index, 'text', e.target.value)}
                                                disabled={locked}
                                                help="Used when no real review is selected, or when you choose manual testimonial text."
                                            />
                                        </div>
                                    </div>
                                )}
                                {section.type === 'CategoryList' && (
                                    <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
                                        <BuilderInput
                                            label="Max categories"
                                            type="number"
                                            min="1"
                                            max="24"
                                            value={section.settings?.maxCategories || 10}
                                            onChange={e => updateHomepageSectionSetting(index, 'maxCategories', Math.min(Math.max(Number(e.target.value) || 1, 1), 24))}
                                            disabled={locked}
                                            help="Limits how many category links appear."
                                        />
                                        <BuilderSelect
                                            label="Desktop columns"
                                            value={section.settings?.columns || 4}
                                            onChange={e => updateHomepageSectionSetting(index, 'columns', Number(e.target.value))}
                                            disabled={locked}
                                        >
                                            <option value={1}>1 column</option>
                                            <option value={2}>2 columns</option>
                                            <option value={3}>3 columns</option>
                                            <option value={4}>4 columns</option>
                                        </BuilderSelect>
                                        <BuilderSelect
                                            label="Mobile columns"
                                            value={section.mobileSettings?.columns || 2}
                                            onChange={e => updateHomepageSectionMobileSetting(index, 'columns', Number(e.target.value))}
                                            disabled={locked}
                                        >
                                            <option value={1}>1 column</option>
                                            <option value={2}>2 columns</option>
                                        </BuilderSelect>
                                    </div>
                                )}
                                {['TextBlock', 'Newsletter', 'FAQ', 'TrustBadges', 'BrandStory', 'PromoBlock'].includes(section.type) && (
                                    <div className="mt-3">
                                        <BuilderTextarea
                                            label="Section text"
                                            value={section.settings?.text || ''}
                                            onChange={e => updateHomepageSectionSetting(index, 'text', e.target.value)}
                                            disabled={locked}
                                            help="Shown below the section title on the storefront."
                                        />
                                    </div>
                                )}
                                <div className="mt-3">
                                    <BuilderToggle label="Visible on storefront" checked={section.isEnabled !== false} onChange={() => updateHomepageSection(index, 'isEnabled', section.isEnabled === false)} disabled={locked} />
                                </div>
                                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <BuilderToggle label="Visible on desktop" checked={section.desktopSettings?.isVisible !== false} onChange={() => updateHomepageSectionDesktopSetting(index, 'isVisible', section.desktopSettings?.isVisible === false)} disabled={locked} />
                                    <BuilderToggle label="Visible on mobile" checked={section.mobileSettings?.isVisible !== false} onChange={() => updateHomepageSectionMobileSetting(index, 'isVisible', section.mobileSettings?.isVisible === false)} disabled={locked} />
                                    {['FeaturedProducts', 'CategoryList'].includes(section.type) && (
                                        <BuilderSelect label="Mobile columns" value={section.mobileSettings?.columns || 2} onChange={e => updateHomepageSectionMobileSetting(index, 'columns', Number(e.target.value))} disabled={locked}>
                                            <option value={1}>1 column</option>
                                            <option value={2}>2 columns</option>
                                        </BuilderSelect>
                                    )}
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                    {locked
                                        ? 'This section is protected from accidental edits. Unlock it before changing content, visibility, order, or deletion.'
                                        : `Sort order: ${index + 1}. Move controls update the saved sort order used by the storefront.`}
                                </p>
                            </div>
                            );
                        })}
                    </BuilderCard>
    );
}
