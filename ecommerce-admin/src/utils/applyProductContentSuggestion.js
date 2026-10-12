import { normalizeKeyValueRows, normalizeSellingPointRows } from './productContentRows.js';
const firstWords = (value = '', fallback = 'Detail') => {
    const words = String(value || '')
        .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, ' ')
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

const normalizeSpecs = (specifications = []) => specifications
    .filter(item => item?.label && item?.value)
    .slice(0, 10)
    .map(item => ({
        title: String(item.label).trim(),
        value: String(item.value).trim()
    }));

export const applyProductContentSuggestion = (formData, suggestion, sections, mode = 'replace') => {
    const next = { ...formData };
    if (sections.some(section => ['seo', 'seoTitle', 'seoDescription'].includes(section))) {
        next.seo = {
            ...next.seo,
            ...(suggestion.seoTitle && (sections.includes('seo') || sections.includes('seoTitle')) && { title: suggestion.seoTitle }),
            ...(suggestion.seoDescription && (sections.includes('seo') || sections.includes('seoDescription')) && { description: suggestion.seoDescription })
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
};
