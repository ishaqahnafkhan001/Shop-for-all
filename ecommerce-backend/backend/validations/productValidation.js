'use strict';
const Joi = require('joi');

const keyValueSchema = Joi.object({
    title: Joi.string().trim().min(1).max(100).required(),
    value: Joi.string().trim().min(1).max(500).required()
});

const attributeSchema = Joi.object({
    _id:   Joi.string().hex().length(24).optional(),
    name:  Joi.string().trim().lowercase().required(),
    value: Joi.string().trim().required()
});

// ─── Duplicate variant guards ─────────────────────────────────────────────────
const noDuplicateVariants = (variants, helpers) => {
    const seen = new Set();
    for (const v of variants) {
        const key = JSON.stringify(
            [...(v.attributes || [])].sort((a, b) => a.name.localeCompare(b.name))
        );
        if (seen.has(key)) return helpers.error('any.invalid');
        seen.add(key);
    }
    return variants;
};

const noDuplicateOptions = (options, helpers) => {
    const seen = new Set(options.map(o => o.toLowerCase()));
    if (seen.size !== options.length) return helpers.error('any.invalid');
    return options;
};

// ─── Flat variant schemas ─────────────────────────────────────────────────────
const variantSchema = Joi.object({
    sku:           Joi.string().trim().uppercase().max(100).optional(),
    attributes:    Joi.array().items(attributeSchema).min(1).required(),
    stock:         Joi.number().integer().min(0).required(),
    priceOverride: Joi.number().min(0).optional(),
    image:         Joi.string().uri().optional(),
    isActive:      Joi.boolean().default(true)
});

const updateVariantSchema = Joi.object({
    _id:           Joi.string().hex().length(24).optional(),
    sku:           Joi.string().trim().uppercase().max(100).optional(),
    attributes:    Joi.array().items(attributeSchema).min(1).required(),
    stock:         Joi.number().integer().min(0).required(),
    priceOverride: Joi.number().min(0).optional(),
    image:         Joi.string().uri().optional(),
    isActive:      Joi.boolean().optional()
});

// ─── Matrix schemas ───────────────────────────────────────────────────────────
const overrideEntrySchema = Joi.object({
    stock:         Joi.number().integer().min(0).optional(),
    priceOverride: Joi.number().min(0).optional(),
    image:         Joi.string().uri().optional(),
    sku:           Joi.string().trim().uppercase().max(100).optional(),
    isActive:      Joi.boolean().optional()
});

const attributeDefSchema = Joi.object({
    name: Joi.string().trim().lowercase().min(1).max(50).required(),
    options: Joi.array()
        .items(Joi.string().trim().lowercase().min(1).max(50))
        .min(1).max(20).required()
        .custom(noDuplicateOptions)
        .messages({ 'any.invalid': 'Duplicate option values are not allowed within the same attribute' })
});

const variantMatrixSchema = Joi.object({
    attributes: Joi.array()
        .items(attributeDefSchema)
        .min(1).max(5).required()
        .custom((attrs, helpers) => {
            const names = attrs.map(a => a.name);
            if (new Set(names).size !== names.length) return helpers.error('any.invalid');

            const totalCombos = attrs.reduce((product, a) => product * a.options.length, 1);
            if (totalCombos > 200) {
                return helpers.message(`Variant matrix would generate ${totalCombos} combinations. Maximum allowed is 200.`);
            }
            return attrs;
        })
        .messages({ 'any.invalid': 'Duplicate attribute names in matrix are not allowed' }),
    defaultStock: Joi.number().integer().min(0).default(0),
    defaultPrice: Joi.number().min(0).optional(),
    overrides: Joi.object().pattern(Joi.string().min(1), overrideEntrySchema).optional()
});

// ─── Pricing schemas ──────────────────────────────────────────────────────────
const pricingCreateSchema = Joi.object({
    buyingPrice:  Joi.number().min(0).required(),
    sellingPrice: Joi.number().min(Joi.ref('buyingPrice')).required()
        .messages({ 'number.min': 'Selling price must be ≥ buying price' }),
    discount: Joi.number().min(0).max(100).default(0)
}).required();

const pricingUpdateSchema = Joi.object({
    buyingPrice:  Joi.number().min(0).optional(),
    sellingPrice: Joi.number().min(0).optional(),
    discount:     Joi.number().min(0).max(100).optional()
}).optional().custom((pricing, helpers) => {
    if (pricing.buyingPrice !== undefined && pricing.sellingPrice !== undefined && pricing.sellingPrice < pricing.buyingPrice) {
        return helpers.error('any.invalid');
    }
    return pricing;
}).messages({ 'any.invalid': 'Selling price must be ≥ buying price' });

const contentFields = {
    features:       Joi.array().items(keyValueSchema).max(20).optional(),
    specifications: Joi.array().items(keyValueSchema).max(20).optional(),
    comments:       Joi.array().items(keyValueSchema).max(20).optional()
};

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE PRODUCT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const createProductSchema = Joi.object({
    title:       Joi.string().trim().min(3).max(100).required(),
    description: Joi.string().trim().min(10).max(3000).required(),
    category:    Joi.string().trim().max(100).optional(),
    images:      Joi.array().items(Joi.string().uri()).min(1).max(10).required(),
    videos:      Joi.array().items(Joi.string().uri()).max(2).optional(),
    pricing:     pricingCreateSchema,

    variants: Joi.array().items(variantSchema).min(1).max(200)
        .custom(noDuplicateVariants).messages({ 'any.invalid': 'Duplicate variant combination detected' })
        .optional(),

    variantMatrix: variantMatrixSchema.optional(),
    ...contentFields
}).xor('variants', 'variantMatrix').messages({
    'object.xor': 'Provide either "variants" (flat list) or "variantMatrix" (auto-expand), not both'
});

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE PRODUCT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const updateProductSchema = Joi.object({
    title:       Joi.string().trim().min(3).max(100).optional(),
    description: Joi.string().trim().min(10).max(3000).optional(),
    category:    Joi.string().trim().max(100).optional(),
    images:      Joi.array().items(Joi.string().uri()).max(10).optional(),
    videos:      Joi.array().items(Joi.string().uri()).max(2).optional(),
    pricing:     pricingUpdateSchema,

    variants: Joi.array().items(updateVariantSchema).max(200)
        .custom(noDuplicateVariants).messages({ 'any.invalid': 'Duplicate variant combination detected' })
        .optional(),

    variantMatrix: variantMatrixSchema.optional(),

    addAttributeOption: Joi.object({
        name:         Joi.string().trim().lowercase().min(1).max(50).required(),
        option:       Joi.string().trim().lowercase().min(1).max(50).required(),
        defaultStock: Joi.number().integer().min(0).default(0),
        defaultPrice: Joi.number().min(0).optional()
    }).optional(),

    removeVariants: Joi.array().items(Joi.string().hex().length(24)).min(1).optional(),
    ...contentFields
}).min(1).messages({ 'object.min': 'At least one field must be provided to update' });


// ═══════════════════════════════════════════════════════════════════════════════
// 🌟 CUSTOMER REVIEW SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const addReviewSchema = Joi.object({
    rating: Joi.number().integer().min(1).max(5).required()
        .messages({
            'number.min': 'Rating must be at least 1',
            'number.max': 'Rating cannot be more than 5',
            'any.required': 'Rating is required'
        }),
    comment: Joi.string().trim().min(3).max(1000).required()
        .messages({
            'string.empty': 'Comment cannot be empty',
            'any.required': 'Comment is required'
        })
});

// Update your module.exports at the very bottom:
module.exports = {
    createProductSchema,
    updateProductSchema,
    addReviewSchema
};