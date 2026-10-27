const ACTIVE_STATES = new Set(['preparing', 'uploading', 'saving']);

export const isVerifiedProductId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);

export function getProductActivityStatus(record) {
    if (record?.state === 'saved' && isVerifiedProductId(record.productId)) return { key: 'saved', label: 'Saved' };
    if (ACTIVE_STATES.has(record?.state)) return { key: 'saving', label: 'Saving' };
    if (record?.state === 'failed' && record.editable === true) return { key: 'attention', label: 'Needs attention' };
    return { key: 'check', label: 'Check status' };
}

export function getProductActivityCounts(records = []) {
    const counts = { saving: 0, saved: 0, attention: 0, check: 0, unfinished: 0 };
    for (const record of records) counts[getProductActivityStatus(record).key]++;
    counts.unfinished = counts.saving + counts.attention + counts.check;
    return counts;
}

export function getProductActivityTitle(record) {
    const title = typeof record?.title === 'string' ? record.title.trim() : '';
    return title || 'Untitled product';
}

export function getProductActivityDescription(record) {
    const status = getProductActivityStatus(record).key;
    if (status === 'saved') return 'The server confirmed this product was created.';
    if (status === 'attention') return 'Review the problem, correct the product, and save again.';
    if (status === 'check') return record?.receiptState === 'processing'
        ? 'The server is still processing this save. Check again shortly.'
        : 'We have not confirmed the outcome. Check before making changes.';
    if (record.state === 'preparing') return 'Preparing your saved form and attachments.';
    if (record.state === 'saving') return 'Waiting for the server to confirm your product.';
    return 'Transferring your images and videos to the server.';
}

export function getProductActivityBreakdown(counts) {
    const parts = [];
    if (counts.attention) parts.push(`${counts.attention} need attention`);
    if (counts.check) parts.push(`${counts.check} to check`);
    if (counts.saving) parts.push(`${counts.saving} saving`);
    return parts.join(' · ') || 'All caught up';
}

export function getProductActivityProgress(record) {
    return record?.state === 'uploading' && typeof record.progress === 'number' && Number.isFinite(record.progress) && record.progress >= 0 && record.progress <= 100
        ? Math.round(record.progress)
        : null;
}
