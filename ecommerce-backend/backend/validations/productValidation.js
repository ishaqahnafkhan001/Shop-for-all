const Joi = require('joi');

/**
 * Reusable key-value pair (features, specifications, comments)
 * Matches the Product model's keyValueSchema { title, value }
 */
const keyValueSchema = Joi.object({
    title: Joi.string().trim().min(1).max(100).required(),
    value: Joi.string().trim().min(1).max(500).required()
});

/**
 * Attribute (e.g. { name: 'color', value: 'red' })
 */
const attributeSchema = Joi.object({
    _id:   Joi.string().hex().length(24).optional(),
    name:  Joi.string().trim().lowercase().required(),
    value: Joi.string().trim().required()
});

/**
 * Variant for CREATE — no _id, all required fields present
 */
const variantSchema = Joi.object({
    sku: Joi.string().trim().uppercase().max(100).optional(),

    attributes: Joi.array()
        .items(attributeSchema)
        .min(1)
        .required(),

    stock: Joi.number().integer().min(0).required(),

    priceOverride: Joi.number().min(0).optional(),

    image: Joi.string().uri().optional(),

    isActive: Joi.boolean().default(true)
});

/**
 * Variant for UPDATE — _id optional (present = update existing, absent = create new)
 */
const updateVariantSchema = Joi.object({
    _id: Joi.string().hex().length(24).optional(),

    sku: Joi.string().trim().uppercase().max(100).optional(),

    attributes: Joi.array()
        .items(attributeSchema)
        .min(1)
        .required(),

    stock: Joi.number().integer().min(0).required(),

    priceOverride: Joi.number().min(0).optional(),

    image: Joi.string().uri().optional(),

    isActive: Joi.boolean().optional()
});

/**
 * Reusable duplicate variant check (same attribute combination = duplicate)
 */
const noDuplicateVariants = (variants, helpers) => {
    const seen = new Set();

    for (const v of variants) {
        const key = JSON.stringify(
            [...v.attributes].sort((a, b) => a.name.localeCompare(b.name))
        );

        if (seen.has(key)) return helpers.error('any.invalid');
        seen.add(key);
    }

    return variants;
};

/**
 * CREATE PRODUCT
 * sellingPrice must be >= buyingPrice (both required, so ref is safe here)
 */
const createProductSchema = Joi.object({
    title: Joi.string().trim().min(3).max(100).required(),

    description: Joi.string().trim().min(10).max(3000).required(),

    category: Joi.string().trim().max(100).optional(),

    images: Joi.array()
        .items(Joi.string().uri())
        .min(1)
        .max(10)
        .required(),

    pricing: Joi.object({
        buyingPrice: Joi.number().min(0).required(),

        // ✅ Ref is safe here — buyingPrice is always present on create
        sellingPrice: Joi.number()
            .min(Joi.ref('buyingPrice'))
            .required()
            .messages({
                'number.min': 'Selling price must be greater than or equal to buying price'
            }),

        discount: Joi.number().min(0).max(100).default(0)
    }).required(),

    variants: Joi.array()
        .items(variantSchema)
        .min(1)
        .max(100)
        .required()
        .custom(noDuplicateVariants)
        .messages({ 'any.invalid': 'Duplicate variant combination detected' }),

    features:       Joi.array().items(keyValueSchema).max(20).optional(),
    specifications: Joi.array().items(keyValueSchema).max(20).optional(),
    comments:       Joi.array().items(keyValueSchema).max(20).optional()
});


/**
 * UPDATE PRODUCT (safe partial patch)
 *
 * Pricing note: sellingPrice ref to buyingPrice is intentionally removed here.
 * On a partial update, buyingPrice may not be sent — making Joi.ref resolve to
 * undefined and producing unpredictable results. Business-logic price validation
 * (selling >= buying) is enforced in the controller after merging with DB values
 * if needed, or can be added as a .custom() check on the full pricing object.
 */
const updateProductSchema = Joi.object({
    title: Joi.string().trim().min(3).max(100).optional(),

    description: Joi.string().trim().min(10).max(3000).optional(),

    category: Joi.string().trim().max(100).optional(),

    images: Joi.array()
        .items(Joi.string().uri())
        .max(10)
        .optional(),

    // ✅ No cross-field ref — both fields independently validated
    pricing: Joi.object({
        buyingPrice:  Joi.number().min(0).optional(),
        sellingPrice: Joi.number().min(0).optional(),
        discount:     Joi.number().min(0).max(100).optional()
    })
        .optional()
        .custom((pricing, helpers) => {
            // ✅ Only enforce selling >= buying when BOTH are present in this update
            if (
                pricing.buyingPrice  !== undefined &&
                pricing.sellingPrice !== undefined &&
                pricing.sellingPrice < pricing.buyingPrice
            ) {
                return helpers.error('any.invalid');
            }
            return pricing;
        })
        .messages({
            'any.invalid': 'Selling price must be greater than or equal to buying price'
        }),

    variants: Joi.array()
        .items(updateVariantSchema)
        .max(100)
        .optional()
        .custom(noDuplicateVariants)
        .messages({ 'any.invalid': 'Duplicate variant combination detected' }),

    features:       Joi.array().items(keyValueSchema).max(20).optional(),
    specifications: Joi.array().items(keyValueSchema).max(20).optional(),
    comments:       Joi.array().items(keyValueSchema).max(20).optional()
})
    .min(1)
    .messages({ 'object.min': 'At least one field must be provided to update' });


module.exports = { createProductSchema, updateProductSchema };