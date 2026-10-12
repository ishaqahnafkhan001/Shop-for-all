import { useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../api/api';
import { productContentIssues, scoreProductSeo } from '../../utils/seoHealth.js';
import AiProductHistory from '../ai/AiProductHistory.jsx';
import ProductSuggestionEditor from './ProductSuggestionEditor.jsx';
import { applyProductContentSuggestion } from '../../utils/applyProductContentSuggestion.js';
import { normalizeSellingPointRows } from '../../utils/productContentRows.js';
import { useAiOperation } from '../../hooks/useAiOperation.js';
import { useAiUndo } from '../../hooks/useAiUndo.js';
import AiOperationStatus, { AiFieldComparison } from '../ai/AiOperationStatus.jsx';
import { aiSourceLabel } from '../../utils/aiSourceLabel.js';

const SECTION_LABELS = {
    all: 'All content',
    seo: 'SEO',
    description: 'Description',
    sellingPoints: 'Why customers should buy this',
    specifications: 'Specifications',
    extraNotes: 'Extra notes',
    imageAlt: 'Image alt'
};

const SECTIONS = ['seo', 'description', 'sellingPoints', 'specifications', 'extraNotes', 'imageAlt'];

const isFileLike = (value) => {
    if (!value) return false;
    if (typeof File !== 'undefined' && value instanceof File) return true;
    return typeof Blob !== 'undefined' && value instanceof Blob;
};

const getSectionHasContent = (formData, section) => {
    if (section === 'seo') return Boolean(formData.seo?.title || formData.seo?.description);
    if (section === 'description') return Boolean(formData.description?.trim());
    if (section === 'sellingPoints') return Boolean(formData.features?.length);
    if (section === 'specifications') return Boolean(formData.specifications?.length);
    if (section === 'extraNotes') return Boolean(formData.comments?.length);
    if (section === 'imageAlt') return Boolean(formData.imageAltText?.trim());
    return false;
};

const formatPreviewList = (items = []) => (
    items.length ? (
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {items.map((item, index) => (
                <li key={`${item}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2">
                    {item}
                </li>
            ))}
        </ul>
    ) : (
        <p className="mt-2 text-sm text-slate-400">No suggestion for this section.</p>
    )
);

const formatPreviewSellingPoints = (items = []) => {
    const rows = items
        .map((item) => {
            const normalized = normalizeSellingPointRows([item])?.[0];
            if (!normalized) return null;
            return {
                ...normalized,
                visualEvidence: typeof item === 'object' ? String(item.visualEvidence || '').trim() : '',
                confidence: typeof item === 'object' ? String(item.confidence || '').trim() : ''
            };
        })
        .filter(Boolean);

    return rows.length ? (
        <div className="mt-2 grid gap-2">
            {rows.map((item, index) => (
                <div key={`${item.point}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-black text-slate-900">{item.point}</p>
                    <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-400">Why customers care</p>
                    <p className="mt-1 leading-6 text-slate-600">{item.reason}</p>
                    {item.visualEvidence && (
                        <>
                            <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-400">Visual evidence</p>
                            <p className="mt-1 leading-6 text-slate-600">{item.visualEvidence}</p>
                        </>
                    )}
                    {item.confidence && (
                        <p className="mt-2 text-xs font-black uppercase tracking-wide text-indigo-600">
                            Confidence: {item.confidence}
                        </p>
                    )}
                </div>
            ))}
        </div>
    ) : (
        <p className="mt-2 text-sm text-slate-400">No suggestion for this section.</p>
    );
};

const formatPreviewRows = (items = []) => (
    items.length ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {items.map((item, index) => (
                <div key={`${item.label}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-bold text-slate-800">{item.label}</p>
                    <p className="mt-1 text-slate-600">{item.value}</p>
                </div>
            ))}
        </div>
    ) : (
        <p className="mt-2 text-sm text-slate-400">No suggestion for this section.</p>
    )
);

const ProductAiSuggestionModal = ({ suggestion, usedImage, imageSource, onClose, onApply, formData, meta, stale, sections, onEdit }) => {
    if (!suggestion) return null;
    const imageAnalysis = suggestion.imageAnalysis || {};
    const imageStatusText = usedImage
        ? imageSource === 'existing_product_image'
            ? 'Image analyzed from the current product cover image.'
            : 'Image analyzed from the selected product image.'
        : 'Generated from product text only.';

    const applyButton = (section, label = SECTION_LABELS[section], mode = 'replace') => {
        const hasContent = getSectionHasContent(formData, section);
        return (
            <button
                type="button"
                disabled={stale || !(sections.includes(section) || section === 'seo' && sections.some(key => ['seoTitle', 'seoDescription'].includes(key)))}
                onClick={() => onApply([section], mode)}
                className="rounded-lg border border-indigo-100 bg-white px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-50"
            >
                {mode === 'append' ? `Append ${label}` : hasContent ? `Replace ${label}` : `Apply ${label}`}
            </button>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="flex max-h-screen w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-wide text-indigo-600">AI suggestions</p>
                        <h2 className="mt-1 text-lg font-black text-slate-950">Review before applying</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {imageStatusText}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close AI suggestions" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
                    <p className="text-sm text-slate-600">{aiSourceLabel(meta?.source)}. {stale ? 'Inputs changed. Close this preview and generate again.' : 'Apply updates the form. Save remains your final step.'}</p>
                    <ProductSuggestionEditor value={suggestion} sections={sections} onChange={onEdit} />
                    <AiFieldComparison current={{ description: formData.description, seo: formData.seo, sellingPoints: formData.features, specifications: formData.specifications, extraNotes: formData.comments, imageAlt: formData.imageAltText }} proposed={suggestion} />
                    <section className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                        <h3 className="font-black text-emerald-950">Image analysis</h3>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-black uppercase tracking-wide">
                            <span className="rounded-full bg-white/80 px-3 py-1 text-emerald-800">
                                Image used: {usedImage ? 'Yes' : 'No'}
                            </span>
                            <span className="rounded-full bg-white/80 px-3 py-1 text-emerald-800">
                                Source: {imageSource === 'local_file' ? 'Selected cover image' : imageSource === 'existing_product_image' ? 'Current product cover' : 'Text only'}
                            </span>
                            {imageAnalysis.confidence && (
                                <span className="rounded-full bg-white/80 px-3 py-1 text-emerald-800">
                                    Confidence: {imageAnalysis.confidence}
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-emerald-900">
                            {imageAnalysis.summary || (usedImage ? 'AI analyzed the image, but did not return a detailed visual summary.' : 'No image was used for this generation.')}
                        </p>
                        {(imageAnalysis.visibleAttributes?.length > 0 || imageAnalysis.uncertainAttributes?.length > 0) && (
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                {imageAnalysis.visibleAttributes?.length > 0 && (
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Observed</p>
                                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-emerald-900">
                                            {imageAnalysis.visibleAttributes.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {imageAnalysis.uncertainAttributes?.length > 0 && (
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wide text-amber-700">Uncertain</p>
                                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-900">
                                            {imageAnalysis.uncertainAttributes.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    <section className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="font-black text-slate-900">SEO</h3>
                                <p className="mt-1 text-sm text-slate-500">{suggestion.seoTitle || 'No SEO title suggested.'}</p>
                                <p className="mt-1 text-sm text-slate-600">{suggestion.seoDescription || 'No SEO description suggested.'}</p>
                            </div>
                            {applyButton('seo')}
                        </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h3 className="font-black text-slate-900">Description</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{suggestion.description || 'No description suggested.'}</p>
                            </div>
                            {applyButton('description')}
                        </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="font-black text-slate-900">Why customers should buy this</h3>
                            <div className="flex flex-wrap gap-2">
                                {applyButton('sellingPoints')}
                                {getSectionHasContent(formData, 'sellingPoints') && applyButton('sellingPoints', SECTION_LABELS.sellingPoints, 'append')}
                            </div>
                        </div>
                        {formatPreviewSellingPoints(suggestion.sellingPoints)}
                    </section>

                    <section className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="font-black text-slate-900">Specifications</h3>
                            {applyButton('specifications')}
                        </div>
                        {formatPreviewRows(suggestion.specifications)}
                    </section>

                    <section className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="font-black text-slate-900">Extra notes</h3>
                            {applyButton('extraNotes')}
                        </div>
                        {formatPreviewList(suggestion.extraNotes)}
                    </section>

                    <section className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="font-black text-slate-900">Image alt text</h3>
                                <p className="mt-1 text-sm text-slate-600">{suggestion.imageAlt || 'No alt text suggested.'}</p>
                            </div>
                            {applyButton('imageAlt')}
                        </div>
                    </section>

                    {suggestion.confidenceNotes?.length > 0 && (
                        <section className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                            <h3 className="font-black text-amber-950">Notes from AI</h3>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                                {suggestion.confidenceNotes.map((note, index) => <li key={`${note}-${index}`}>{note}</li>)}
                            </ul>
                        </section>
                    )}
                </div>

                <div className="flex flex-col gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                        Keep editing
                    </button>
                    <button type="button" disabled={stale} onClick={() => onApply(sections)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700">
                        Apply all suggestions
                    </button>
                </div>
            </div>
        </div>
    );
};

const ProductAiAssistant = ({
    formData,
    setFormData,
    getFirstImage,
    getVariants,
    compact = false,
    entityId = 'new-product', health, readiness = []
}) => {
    const [requestedSections, setRequestedSections] = useState([]);
    const [selectedIssues, setSelectedIssues] = useState([]);
    const [edited, setEdited] = useState(false);
    const [historyReview, setHistoryReview] = useState(null);
    const [activeSection, setActiveSection] = useState(null);
    const [suggestion, setSuggestion] = useState(null);
    const [usedImage, setUsedImage] = useState(false);
    const [imageSource, setImageSource] = useState('text_only');

    const firstImageForStatus = getFirstImage?.();
    const operationInput = { formData, variants: getVariants?.() || [], image: firstImageForStatus };
    const operation = useAiOperation({ feature: 'product.content', entity: entityId, input: operationInput });
    const undo = useAiUndo(entityId, formData, setFormData);
    const hasImage = Boolean(firstImageForStatus);
    const issues = productContentIssues({ health: health || scoreProductSeo({ product: formData, hasImage }), readiness, product: formData });
    const selectedSections = [...new Set(issues.filter(issue => selectedIssues.includes(issue.id) && issue.aiSection).map(issue => issue.aiSection))];
    const isGenerating = operation.loading;
    const imageStatusLabel = hasImage
        ? isFileLike(firstImageForStatus)
            ? 'Image ready for AI analysis'
            : 'Using the current product cover image'
        : 'No product image available — AI will use text only';

    const buildRequestData = (sections) => {
        const data = new FormData();
        const firstImage = getFirstImage?.();

        data.append('title', formData.title || '');
        data.append('category', formData.category || '');
        data.append('tags', JSON.stringify(Array.isArray(formData.tags) ? formData.tags : String(formData.tags || '').split(',').map(tag => tag.trim()).filter(Boolean)));
        data.append('sellingPrice', String(formData.pricing?.sellingPrice || ''));
        data.append('variants', JSON.stringify(getVariants?.() || []));
        data.append('existingDescription', formData.description || '');
        data.append('existingSeoTitle', formData.seo?.title || '');
        data.append('existingSeoDescription', formData.seo?.description || '');
        data.append('features', JSON.stringify(formData.features || []));
        data.append('specifications', JSON.stringify(formData.specifications || []));
        data.append('comments', JSON.stringify(formData.comments || []));
        data.append('notesVisibility', 'public');
        data.append('entityId', entityId);
        data.append('entityRevision', formData.updatedAt || '');
        data.append('languageHint', 'auto');
        data.append('requestedSections', JSON.stringify(sections));

        if (isFileLike(firstImage)) {
            data.append('image', firstImage);
        } else if (typeof firstImage === 'string' && firstImage.trim()) {
            data.append('imageUrl', firstImage.trim());
        }

        return data;
    };

    const receiveSuggestion = (response) => {
        if (!response) return;
        setHistoryReview(null);
        setSuggestion(response.data.data);
        setUsedImage(Boolean(response.data.usedImage));
        setImageSource(response.data.imageSource || 'text_only');
        toast.success(response.data.fallback ? 'Basic suggestions are ready to review.' : 'AI suggestions are ready to review.');
    };
    const generate = async (sections = SECTIONS) => {
        if (!formData.title?.trim()) { toast.error('Add a product title first.'); return; }
        if (!operation.access.allowed) return;
        setRequestedSections(sections);
        setEdited(false);
        setActiveSection(sections.length === SECTIONS.length ? 'all' : sections[0]);
        setSuggestion(null);
        const body = buildRequestData(sections);
        try {
            receiveSuggestion(await operation.run(options => API.post('/admin/products/ai/content-suggest', body, {
                ...options, headers: { ...options.headers, 'Content-Type': 'multipart/form-data' }
            })));
        } finally { setActiveSection(null); }
    };

    const applySections = async (sections, mode = 'replace') => {
        if (!suggestion || !operation.canApply()) { toast.error('Inputs changed. Generate again before applying.'); return; }
        sections = sections.flatMap(section => section === 'seo' && !requestedSections.includes('seo')
            ? requestedSections.filter(key => ['seoTitle', 'seoDescription'].includes(key)) : [section])
            .filter(section => requestedSections.includes(section));
        if (!sections.length) return;

        if (historyReview) {
            const keys = sections.flatMap(section => section === 'seo' ? ['seoTitle', 'seoDescription'] : [section]).filter(key => historyReview.entry.content[key]);
            try { await API.post(`/admin/ai/history/${historyReview.entry._id}/apply`, { currentVersion: historyReview.currentVersion, fields: keys, edited }); }
            catch (error) { toast.error(error.response?.data?.error || 'Review the current product before applying.'); return; }
            if (!operation.canApply(operationInput)) return;
        }
        const next = applyProductContentSuggestion(formData, suggestion, sections, mode);
        undo.record(formData, next);
        operation.rebase({ ...operationInput, formData: next });
        setFormData(next);

        toast.success('AI suggestions applied. Review before saving.');
        setSuggestion(null);
    };

    const buttonClass = 'inline-flex max-w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-100 bg-white px-3 py-2 text-center text-xs font-black text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60';

    return (
        <div className={compact ? 'min-w-0 space-y-3' : 'min-w-0 overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 sm:p-4'}>
            <AiProductHistory key={entityId} entityId={entityId} operationId={operation.meta?.operationId} onReview={review => {
                setHistoryReview(review); setEdited(false); setUsedImage(false); setImageSource('text_only');
                setSuggestion(review.entry.content);
                setRequestedSections(Object.keys(review.entry.content));
                operation.rebase(operationInput);
            }} />
            {historyReview && <p className="text-xs text-amber-800">{historyReview.stale ? 'The saved product changed since generation. Compare every field before Apply.' : 'Comparing against the current saved product.'} Current saved version: {historyReview.currentVersion}</p>}
            <AiOperationStatus operation={operation} onRetry={async () => receiveSuggestion(await operation.retry())} onUndo={undo.undo} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <p className="text-sm font-black text-slate-950">AI content helper</p>
                    <p className="mt-1 break-words text-xs leading-5 text-slate-600">
                        {imageStatusLabel}
                    </p>

                </div>
                <button
                    type="button"
                    onClick={() => generate(selectedSections)}
                    disabled={isGenerating || !operation.access.allowed || !selectedSections.length || !formData.title?.trim()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                    {isGenerating && activeSection === 'all' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {isGenerating && activeSection === 'all' ? 'Generating...' : 'Generate selected improvements'}
                </button>
            </div>

            <div className="space-y-2 text-sm">
                <h3 className="font-bold">Product health actions</h3>
                {issues.map(issue => <label key={issue.id} className="flex items-start gap-2">
                    {issue.aiSection ? <input type="checkbox" checked={selectedIssues.includes(issue.id)} onChange={e => setSelectedIssues(current => e.target.checked ? [...current, issue.id] : current.filter(id => id !== issue.id))} /> : <span aria-hidden="true">•</span>}
                    <span>{issue.label}{!issue.aiSection && ' — update in the product form'}</span>
                </label>)}
                {!issues.length && <p>Content basics are complete.</p>}
            </div>
            <details><summary className="cursor-pointer text-sm font-semibold">Generate another content section</summary>
            <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                {SECTIONS.map(section => (
                    <button
                        key={section}
                        type="button"
                        onClick={() => generate([section])}
                        disabled={isGenerating || !operation.access.allowed || !formData.title?.trim()}
                        className={buttonClass}
                    >
                        {isGenerating && activeSection === section ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        {section === 'seo'
                            ? 'Generate SEO'
                            : section === 'description'
                                ? 'Auto-write description'
                                : section === 'imageAlt'
                                    ? 'Generate alt text'
                                    : section === 'sellingPoints'
                                        ? 'Suggest buyer benefits'
                                        : `Auto-fill ${SECTION_LABELS[section].toLowerCase()}`}
                    </button>
                ))}
            </div>

            </details>
            <ProductAiSuggestionModal
                suggestion={suggestion}
                usedImage={usedImage}
                imageSource={imageSource}
                onClose={() => setSuggestion(null)}
                onApply={applySections}
                formData={formData}
                meta={edited ? { ...operation.meta, source: 'manual' } : historyReview?.entry.provenance || operation.meta}
                sections={requestedSections}
                onEdit={value => { setSuggestion(value); setEdited(true); }}
                stale={!operation.canApply()}
            />
        </div>
    );
};

export default ProductAiAssistant;
