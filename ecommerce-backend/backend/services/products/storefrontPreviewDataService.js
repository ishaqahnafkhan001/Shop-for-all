const Product = require('../../models/Product');
const { buildPublicProductQuery } = require('./publicProductQueryService');
const { PUBLIC_PRODUCT_CARD_PROJECT, sanitizePublicProducts } = require('../publicProductSerializer');
const { applyScheduledSalesToProducts } = require('../sales/scheduledSaleService');

// Reuse the public card projection, sale rules and media restrictions for Builder
// bootstrap and subsequent picker pages. Never use the private Admin projection.
async function getStorefrontPreviewCards({ shopId, productIds = [] }) {
    if (!productIds.length) return [];
    const products = await Product.aggregate([
        { $match: { ...buildPublicProductQuery(shopId), _id: { $in: productIds } } },
        { $project: PUBLIC_PRODUCT_CARD_PROJECT },
    ]);
    return sanitizePublicProducts(await applyScheduledSalesToProducts({ shopId, products }));
}

module.exports = { getStorefrontPreviewCards };
