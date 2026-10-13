const Joi = require('joi');

const updatesSchema = Joi.object({
    category: Joi.string().trim().max(100),
    status: Joi.string().valid('Draft', 'Published', 'Archived'),
    isActive: Joi.boolean().strict(),
    tags: Joi.array().items(Joi.string().trim().lowercase().min(1).max(60)).max(30),
    tagsMode: Joi.string().valid('add', 'remove', 'replace', 'clear'),
    lowStockThreshold: Joi.number().integer().min(0),
    seo: Joi.object({
        title: Joi.string().trim().max(70).allow(''),
        description: Joi.string().trim().max(170).allow('')
    }).min(1),
    pricing: Joi.object({
        buyingPrice: Joi.number().min(0),
        sellingPrice: Joi.number().min(0),
        discount: Joi.number().min(0).max(100)
    }).min(1),
    sellingPricePercent: Joi.number().min(-90).max(500),
    buyingPricePercent: Joi.number().min(-90).max(500)
}).min(1).unknown(false);

const validateBulkUpdates = (updates) => {
    const { error, value } = updatesSchema.validate(updates, { abortEarly: true });
    if (error) throw new Error(error.details[0].message);
    if (value.tagsMode && value.tags === undefined) throw new Error('Choose tags before selecting a tag action.');
    if (value.tags !== undefined && value.tagsMode !== 'clear' && value.tags.length === 0) {
        throw new Error('Enter at least one tag or select Clear all tags.');
    }
    if (value.sellingPricePercent !== undefined && value.pricing?.sellingPrice !== undefined) {
        throw new Error('Choose either a fixed selling price or a selling price adjustment.');
    }
    if (value.buyingPricePercent !== undefined && value.pricing?.buyingPrice !== undefined) {
        throw new Error('Choose either a fixed buying price or a buying price adjustment.');
    }
    return value;
};

const adjustPrice = (price, percent) => Math.round(Number(price) * (1 + percent / 100) * 100) / 100;

const applyBulkProductUpdates = (product, updates) => {
    if (updates.category !== undefined) product.category = updates.category;
    if (updates.status !== undefined) product.status = updates.status;
    if (updates.isActive !== undefined) product.isActive = updates.isActive;

    if (updates.tags !== undefined) {
        const current = (product.tags || []).map(tag => String(tag).toLowerCase());
        const incoming = [...new Set(updates.tags.map(tag => String(tag).toLowerCase()))];
        if (updates.tagsMode === 'clear') product.tags = [];
        else if (updates.tagsMode === 'remove') product.tags = current.filter(tag => !incoming.includes(tag));
        else if (updates.tagsMode === 'add') product.tags = [...new Set([...current, ...incoming])];
        else product.tags = incoming;
    }

    if (updates.lowStockThreshold !== undefined) {
        product.lowStockThreshold = updates.lowStockThreshold;
        for (const variant of product.variants || []) {
            if (!variant.inventory) variant.inventory = {};
            variant.inventory.lowStockThreshold = updates.lowStockThreshold;
        }
    }

    if (updates.seo) {
        product.seo = { ...(product.seo?.toObject?.() || product.seo || {}), ...updates.seo };
    }

    if (updates.pricing) {
        product.pricing = { ...(product.pricing?.toObject?.() || product.pricing || {}), ...updates.pricing };
    }

    if (updates.sellingPricePercent !== undefined) {
        product.pricing.sellingPrice = adjustPrice(product.pricing.sellingPrice, updates.sellingPricePercent);
        for (const variant of product.variants || []) {
            if (variant.priceOverride != null) {
                variant.priceOverride = adjustPrice(variant.priceOverride, updates.sellingPricePercent);
            }
            if (variant.pricing?.price != null) {
                variant.pricing.price = adjustPrice(variant.pricing.price, updates.sellingPricePercent);
            }
            if (variant.pricing?.compareAtPrice != null) {
                variant.pricing.compareAtPrice = adjustPrice(variant.pricing.compareAtPrice, updates.sellingPricePercent);
            }
        }
    }

    if (updates.buyingPricePercent !== undefined) {
        product.pricing.buyingPrice = adjustPrice(product.pricing.buyingPrice, updates.buyingPricePercent);
        for (const variant of product.variants || []) {
            if (variant.pricing?.costPrice != null) {
                variant.pricing.costPrice = adjustPrice(variant.pricing.costPrice, updates.buyingPricePercent);
            }
        }
    }
};

module.exports = { validateBulkUpdates, applyBulkProductUpdates };
