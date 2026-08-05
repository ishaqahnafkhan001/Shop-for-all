import { useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../api/api';
import { useAuth } from '../../context/AuthContext.jsx';
import { normalizeKeyValueRows, normalizeSellingPointRows } from '../../utils/productContentRows.js';

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

const firstWords = (value = '', fallback = 'Detail') => {
    const words = String(value || '')
        .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 4)
        .join(' ');

    return words || fallback;
};

const pointsToRows = (points = []) => normalizeSellingPointRows(
    points.map((point, index) => {
        if (typeof point === 'string') {
            return {
                point: firstWords(point, `Benefit ${index + 1}`).slice(0, 50),
                reason: String(point).trim()
            };
        }

        return point;
    })
);

const notesToRows = (notes = []) => notes
    .filter(Boolean)
    .slice(0, 10)
    .map((note, index) => ({
        title: firstWords(note, `Note ${index + 1}`).slice(0, 100),
        value: String(note).trim()
    }));

const getSectionHasContent = (formData, section) => {
    if (section === 'seo') return Boolean(formData.seo?.title || formData.seo?.description);
    if (section === 'description') return Boolean(formData.description?.trim());
    if (section === 'sellingPoints') return Boolean(formData.features?.length);
    if (section === 'specifications') return Boolean(formData.specifications?.length);
    if (section === 'extraNotes') return Boolean(formData.comments?.length);
    if (section === 'imageAlt') return Boolean(formData.imageAltText?.trim());
    return false;
};

const normalizeSpecs = (specifications = []) => specifications
    .filter(item => item?.label && item?.value)
    .slice(0, 10)
    .map(item => ({
        title: String(item.label).trim(),
        value: String(item.value).trim()
    }));

const showAiFailureToast = (payload = {}) => {
    if (payload.configured === false) {
        toast.error(payload.message || 'AI product suggestions are not configured yet.');
        return;
    }

    if (payload.errorCode === 'AI_PROVIDER_FAILED') {
        toast.error(payload.message || 'AI product suggestions could not be generated right now. Please try again later.');
        return;
    }

    if (payload.errorCode === 'AI_RESPONSE_PARSE_FAILED') {
        toast.error(payload.message || 'AI product suggestions could not be generated right now. Please try again.');
        return;
    }

    if (payload.errorCode === 'INSUFFICIENT_PRODUCT_CONTEXT') {
        toast.error(payload.message || 'Add a clearer product image or more product information to generate useful customer benefits.');
        return;
    }

    toast.error(payload.message || payload.error || 'AI suggestions could not be generated.');
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

const ProductAiSuggestionModal = ({ suggestion, usedImage, imageSource, onClose, onApply, formData }) => {
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
                    <button type="button" onClick={() => onApply(SECTIONS)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700">
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
    compact = false
}) => {
    const { user, setUser } = useAuth();
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeSection, setActiveSection] = useState(null);
    const [suggestion, setSuggestion] = useState(null);
    const [usedImage, setUsedImage] = useState(false);
    const [imageSource, setImageSource] = useState('text_only');
    const usage = user?.planAccess?.usage?.ai || null;

    const updateUsage = (nextUsage) => {
        if (!nextUsage) return;
        setUser(current => current ? ({
            ...current,
            planAccess: {
                ...(current.planAccess || {}),
                usage: {
                    ...(current.planAccess?.usage || {}),
                    ai: nextUsage
                }
            }
        }) : current);
    };

    const firstImageForStatus = getFirstImage?.();
    const hasImage = Boolean(firstImageForStatus);
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
        data.append('languageHint', 'auto');
        data.append('requestedSections', JSON.stringify(sections));

        if (isFileLike(firstImage)) {
            data.append('image', firstImage);
        } else if (typeof firstImage === 'string' && firstImage.trim()) {
            data.append('imageUrl', firstImage.trim());
        }

        return data;
    };

    const generate = async (sections = SECTIONS) => {
        if (!formData.title?.trim()) {
            toast.error('Add a product title first.');
            return;
        }

        setIsGenerating(true);
        setActiveSection(sections.length === SECTIONS.length ? 'all' : sections[0]);
        try {
            const response = await API.post('/admin/products/ai/content-suggest', buildRequestData(sections), {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (!response.data?.success) {
                showAiFailureToast(response.data);
                return;
            }

            updateUsage(response.data.usage);
            setSuggestion(response.data.data);
            setUsedImage(Boolean(response.data.usedImage));
            setImageSource(response.data.imageSource || 'text_only');
            if (response.data.fallback) {
                toast.success('Basic suggestions are ready to review.');
            } else {
                toast.success('AI suggestions are ready to review.');
            }
        } catch (error) {
            showAiFailureToast(error.response?.data);
        } finally {
            setIsGenerating(false);
            setActiveSection(null);
        }
    };

    const applySections = (sections, mode = 'replace') => {
        if (!suggestion) return;

        setFormData(prev => {
            const next = { ...prev };
            if (sections.includes('seo')) {
                next.seo = {
                    ...next.seo,
                    ...(suggestion.seoTitle && { title: suggestion.seoTitle }),
                    ...(suggestion.seoDescription && { description: suggestion.seoDescription })
                };
            }
            if (sections.includes('description') && suggestion.description) {
                next.description = suggestion.description;
            }
            if (sections.includes('sellingPoints') && suggestion.sellingPoints?.length) {
                const generatedRows = pointsToRows(suggestion.sellingPoints);
                next.features = mode === 'append'
                    ? normalizeSellingPointRows([...(next.features || []), ...generatedRows])
                    : generatedRows;
            }
            if (sections.includes('specifications') && suggestion.specifications?.length) {
                next.specifications = normalizeKeyValueRows(normalizeSpecs(suggestion.specifications));
            }
            if (sections.includes('extraNotes') && suggestion.extraNotes?.length) {
                next.comments = notesToRows(suggestion.extraNotes);
            }
            if (sections.includes('imageAlt') && suggestion.imageAlt) {
                next.imageAltText = suggestion.imageAlt;
            }
            return next;
        });

        toast.success('AI suggestions applied. Review before saving.');
        setSuggestion(null);
    };

    const buttonClass = 'inline-flex max-w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-100 bg-white px-3 py-2 text-center text-xs font-black text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60';

    return (
        <div className={compact ? 'min-w-0 space-y-3' : 'min-w-0 overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 sm:p-4'}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <p className="text-sm font-black text-slate-950">AI content helper</p>
                    <p className="mt-1 break-words text-xs leading-5 text-slate-600">
                        {imageStatusLabel}
                    </p>
                    {usage && (
                        <p className="mt-1 break-words text-xs font-bold text-indigo-700">
                            {usage.unlimited
                                ? `${usage.used} AI generations used this week - Unlimited plan`
                                : `${usage.used} of ${usage.limit} AI generations used this week (${usage.remaining} remaining)`}
                            {usage.resetsAt ? ` - resets ${new Date(usage.resetsAt).toLocaleString()}` : ''}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => generate(SECTIONS)}
                    disabled={isGenerating || !formData.title?.trim()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                    {isGenerating && activeSection === 'all' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {isGenerating && activeSection === 'all' ? 'Generating...' : 'Generate better content with AI'}
                </button>
            </div>

            <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                {SECTIONS.map(section => (
                    <button
                        key={section}
                        type="button"
                        onClick={() => generate([section])}
                        disabled={isGenerating || !formData.title?.trim()}
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

            <ProductAiSuggestionModal
                suggestion={suggestion}
                usedImage={usedImage}
                imageSource={imageSource}
                onClose={() => setSuggestion(null)}
                onApply={applySections}
                formData={formData}
            />
        </div>
    );
};

export default ProductAiAssistant;
