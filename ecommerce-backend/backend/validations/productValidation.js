const Joi = require('joi');

/**
 * 🔹 Reusable key-value schema
 */
const keyValueSchema = Joi.object({
    title: Joi.string().trim().min(1).max(100).required(),
    value: Joi.string().trim().min(1).max(500).required()
});

/**
 * 🔹 Attribute Schema (normalized)
 */
const attributeSchema = Joi.object({
    _id: Joi.string().hex().length(24).optional(), // ✅ allow Mongo ID
    name: Joi.string().trim().lowercase().required(),
    value: Joi.string().trim().required()
});

/**
 * 🔹 Variant Schema (IMPROVED)
 */
const variantSchema = Joi.object({
    sku: Joi.string()
        .trim()
        .uppercase() // ✅ normalize SKU
        .max(100)
        .optional(),

    attributes: Joi.array()
        .items(attributeSchema)
        .min(1)
        .required(),

    stock: Joi.number()
        .integer()
        .min(0)
        .required(),

    priceOverride: Joi.number()
        .min(0)
        .optional(),

    image: Joi.string().uri().optional(),

    isActive: Joi.boolean().default(true)
});

/**
 * 🔹 Main Product Validation (ENHANCED)
 */
const createProductSchema = Joi.object({
    title: Joi.string().trim().min(3).max(100).required(),

    description: Joi.string().trim().min(10).max(3000).required(),

    category: Joi.string().trim().max(100).optional(),

    images: Joi.array()
        .items(Joi.string().uri())
        .min(1)
        .max(10) // ✅ limit size
        .required(),

    /**
     * 💰 Pricing (STRICT RULE)
     */
    pricing: Joi.object({
        buyingPrice: Joi.number().min(0).required(),

        sellingPrice: Joi.number()
            .min(Joi.ref('buyingPrice')) // ✅ must be >= buying
            .required(),

        discount: Joi.number().min(0).max(100).default(0)
    }).required(),

    /**
     * ✅ VARIANTS (WITH DUPLICATE CHECK)
     */
    variants: Joi.array()
        .items(variantSchema)
        .min(1)
        .max(100) // ✅ prevent abuse
        .required()
        .custom((variants, helpers) => {
            const seen = new Set();

            for (const v of variants) {
                const key = JSON.stringify(
                    v.attributes
                        .sort((a, b) => a.name.localeCompare(b.name))
                );

                if (seen.has(key)) {
                    return helpers.error('any.invalid');
                }
                seen.add(key);
            }

            return variants;
        })
        .messages({
            'any.invalid': 'Duplicate variant combination detected'
        }),

    /**
     * OPTIONAL ARRAYS (LIMITED)
     */
    features: Joi.array()
        .items(keyValueSchema)
        .max(20)
        .optional(),

    specifications: Joi.array()
        .items(keyValueSchema)
        .max(20)
        .optional(),

    comments: Joi.array()
        .items(keyValueSchema)
        .max(20)
        .optional()
});


const updateVariantSchema = Joi.object({
    _id: Joi.string().hex().length(24).optional(), // existing variant

    sku: Joi.string()
        .trim()
        .uppercase()
        .max(100)
        .optional(),

    attributes: Joi.array()
        .items(attributeSchema)
        .min(1)
        .required(),

    stock: Joi.number()
        .integer()
        .min(0)
        .required(),

    priceOverride: Joi.number()
        .min(0)
        .optional(),

    image: Joi.string().uri().optional(),

    isActive: Joi.boolean().optional()
});


/**
 * 🔹 UPDATE PRODUCT SCHEMA (PATCH SAFE)
 */
const updateProductSchema = Joi.object({

    title: Joi.string()
        .trim()
        .min(3)
        .max(100)
        .optional(),

    description: Joi.string()
        .trim()
        .min(10)
        .max(3000)
        .optional(),

    category: Joi.string()
        .trim()
        .max(100)
        .optional(),

    images: Joi.array()
        .items(Joi.string().uri())
        .max(10)
        .optional(),

    /**
     * 💰 Pricing (partial update)
     */
    pricing: Joi.object({
        buyingPrice: Joi.number().min(0).optional(),

        sellingPrice: Joi.number()
            .min(Joi.ref('buyingPrice'))
            .optional(),

        discount: Joi.number()
            .min(0)
            .max(100)
            .optional()
    }).optional(),

    /**
     * 🔥 Variants (optional)
     */
    variants: Joi.array()
        .items(updateVariantSchema)
        .max(100)
        .optional()
        .custom((variants, helpers) => {
            const seen = new Set();

            for (const v of variants) {
                const key = JSON.stringify(
                    v.attributes
                        .sort((a, b) => a.name.localeCompare(b.name))
                );

                if (seen.has(key)) {
                    return helpers.error('any.invalid');
                }

                seen.add(key);
            }

            return variants;
        })
        .messages({
            'any.invalid': 'Duplicate variant combination detected'
        }),

    /**
     * OPTIONAL ARRAYS
     */
    features: Joi.array()
        .items(keyValueSchema)
        .max(20)
        .optional(),

    specifications: Joi.array()
        .items(keyValueSchema)
        .max(20)
        .optional(),

    comments: Joi.array()
        .items(keyValueSchema)
        .max(20)
        .optional()

})
.min(1) // 🔥 MUST send at least one field
.messages({
    'object.min': 'At least one field must be updated'
});


/**
 * 🔹 EXPORT BOTH
 */
module.exports = {
    createProductSchema,
    updateProductSchema}



