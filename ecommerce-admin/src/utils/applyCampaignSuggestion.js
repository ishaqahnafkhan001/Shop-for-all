export const CAMPAIGN_FIELDS = ['primaryText', 'headline', 'description', 'callToAction'];

export function currentCampaignProduct(product, savedSnapshot) {
    const current = product ? { title: product.title, sellingPrice: product.pricing?.sellingPrice, version: product.updatedAt } : null;
    return savedSnapshot && (!current || Date.parse(savedSnapshot.version) > (Date.parse(current.version) || 0)) ? savedSnapshot : current;
}

export function applyCampaignSuggestion(draft, suggestion, selected, now = Date.now()) {
    const fields = CAMPAIGN_FIELDS.filter(key => selected.includes(key) && typeof suggestion[key] === 'string'
        && (!suggestion.meta?.requestedFields || suggestion.meta.requestedFields.includes(key)));
    const content = { ...draft.content }, origins = { ...draft.provenance?.fieldOrigins };
    for (const key of fields) {
        content[key] = suggestion[key];
        origins[key] = { source: suggestion.meta?.fieldOrigins?.[key] || suggestion.meta?.source || 'unknown_legacy', operationId: suggestion.meta?.operationId };
    }
    const interval = suggestion.meta?.evidenceWindow;
    return { fields, draft: { ...draft, content, provenance: { fieldOrigins: origins },
        evidence: { ...draft.evidence, interval, product: suggestion.meta?.productSnapshot,
            language: suggestion.meta?.language, generatedAt: suggestion.meta?.generatedAt,
            advisoryAudience: suggestion.targetedCustomer || '', interests: suggestion.suggestedInterests || [],
            locations: suggestion.suggestedLocationFocus || [], activitySufficiency: suggestion.confidence || 'limited',
            limitations: suggestion.meta?.limitations || [] },
        productChanged: false, evidenceStale: !interval?.to || now - new Date(interval.to).getTime() > 86400000 } };
}
