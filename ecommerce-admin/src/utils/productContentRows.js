export const MAX_SELLING_POINTS = 6;

const cleanText = (value = '', max = 500) => String(value || '')
    .replace(/\0/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

export const normalizeSellingPointItem = (item = {}) => {
    if (typeof item === 'string') {
        const reason = cleanText(item, 220);
        return reason
            ? { point: 'Product benefit', reason, title: 'Product benefit', value: reason }
            : null;
    }

    const point = cleanText(item.point || item.title || item.label || item.name, 50);
    const reason = cleanText(item.reason || item.value || item.description || item.text, 220);
    if (!point && !reason) return null;

    return {
        point,
        reason,
        title: point,
        value: reason
    };
};

export const normalizeSellingPointRows = (items = [], { keepEmpty = false } = {}) => {
    const source = Array.isArray(items) ? items : [];
    const seen = new Set();
    const rows = source
        .map(normalizeSellingPointItem)
        .filter(row => {
            if (!row) return false;
            if (keepEmpty && (!row.point || !row.reason)) return true;
            if (!row.point || !row.reason) return false;

            const key = `${row.point.toLowerCase()}|${row.reason.toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, MAX_SELLING_POINTS);

    return rows;
};

export const normalizeKeyValueRows = (items = []) => (
    Array.isArray(items)
        ? items
            .map(item => ({
                title: cleanText(item?.title || item?.label || item?.name || item?.point, 100),
                value: cleanText(item?.value || item?.description || item?.text || item?.reason, 500)
            }))
            .filter(item => item.title && item.value)
        : []
);

export const hasIncompleteSellingPoint = (items = []) => (
    Array.isArray(items) && items.some(item => {
        const row = normalizeSellingPointItem(item);
        if (!row) return false;
        return Boolean(row.point) !== Boolean(row.reason);
    })
);

export const hasIncompleteKeyValueRow = (items = []) => (
    Array.isArray(items) && items.some(item => {
        const title = cleanText(item?.title || item?.label || item?.name, 100);
        const value = cleanText(item?.value || item?.description || item?.text, 500);
        return Boolean(title) !== Boolean(value);
    })
);
