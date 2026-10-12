const mongoose = require('mongoose');
const Product = require('../../models/Product');
const invalidEntity = () => Object.assign(new Error('Product not found in this store.'), { code: 'AI_ENTITY_NOT_FOUND', statusCode: 404 });
const ownedProduct = async (shopId, entityId) => {
    if (!mongoose.isValidObjectId(entityId)) throw invalidEntity();
    const product = await Product.findOne({ _id: entityId, shop_id: shopId, isDeleted: false })
        .select('title description seo imageAltText pricing.sellingPrice updatedAt').lean();
    if (!product) throw invalidEntity();
    return product;
};
const productText = product => ({ description: product.description || '', seoTitle: product.seo?.title || '', seoDescription: product.seo?.description || '', imageAlt: product.imageAltText || '' });
module.exports = { ownedProduct, productText };
