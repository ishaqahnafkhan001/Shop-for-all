const allowed = new Set(['id', 'title', 'slug', 'status', 'category', 'tags', 'buyingPrice', 'sellingPrice', 'discount', 'totalStock', 'stock', 'lowStockThreshold', 'seoTitle', 'seoDescription', 'description', 'image', 'sku']);
const prepareImportRow = (row, mode) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Expected a product row');
    for (const key of Object.keys(row)) if (!allowed.has(key)) throw new Error(`Unknown column: ${key}`);
    const values = {};
    for (const [key, value] of Object.entries(row)) values[key] = String(value ?? '').trim();
    if (mode === 'update' && !/^[a-f\d]{24}$/i.test(values.id || '')) throw new Error('A valid product id is required for updates');
    if (mode === 'create' && values.id) throw new Error('Remove the id column to create new products, or choose Update existing');
    if (mode === 'create' && !values.title) throw new Error('Title is required');
    for (const key of ['buyingPrice', 'sellingPrice', 'discount', 'totalStock', 'stock', 'lowStockThreshold']) {
        if (values[key] === undefined || values[key] === '') { delete values[key]; continue; }
        const number = Number(values[key]);
        if (!Number.isFinite(number) || number < 0 || (key === 'discount' && number > 100) || (['stock', 'totalStock', 'lowStockThreshold'].includes(key) && !Number.isInteger(number))) throw new Error(`Invalid ${key}`);
        values[key] = number;
    }
    if (values.status && !['Draft', 'Published', 'Archived'].includes(values.status)) throw new Error('Status must be Draft, Published or Archived');
    return values;
};
const applyImportRow = (product, row, mode) => {
    for (const key of ['title', 'category', 'status']) if (row[key] !== undefined && row[key] !== '') product[key] = row[key];
    if (row.tags !== undefined) {
        const tags = [...new Set(row.tags.split('|').map(tag => tag.trim().toLowerCase()).filter(Boolean))];
        if (tags.length > 30 || tags.some(tag => tag.length > 60)) throw new Error('Use up to 30 tags of at most 60 characters');
        product.tags = tags;
    }
    for (const key of ['buyingPrice', 'sellingPrice', 'discount']) if (typeof row[key] === 'number') product.pricing[key] = row[key];
    if (product.pricing.sellingPrice < product.pricing.buyingPrice) throw new Error('Selling price is below buying cost; correct the row before importing');
    if (typeof row.lowStockThreshold === 'number') product.lowStockThreshold = row.lowStockThreshold;
    if (row.seoTitle !== undefined) product.seo.title = row.seoTitle;
    if (row.seoDescription !== undefined) product.seo.description = row.seoDescription;
    if (mode === 'update' && row.slug && row.slug !== product.slug) throw new Error('URLs cannot be changed through summary import; edit the product instead');
};
module.exports = { prepareImportRow, applyImportRow };
