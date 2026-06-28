const Joi = require('joi');

/**
 * Reusable MongoDB ObjectId validator
 */
const objectId = Joi.string().hex().length(24);

/**
 * Single order item
 */
const orderItemSchema = Joi.object({
    productId: objectId.required().messages({
        'any.required': 'Product ID is required',
        'string.length': 'Product ID must be a valid ObjectId'
    }),
    variantId: objectId.required().messages({
        'any.required': 'Variant ID is required',
        'string.length': 'Variant ID must be a valid ObjectId'
    }),
    quantity: Joi.number().integer().min(1).required().messages({
        'any.required': 'Quantity is required',
        'number.min': 'Quantity must be at least 1',
        'number.integer': 'Quantity must be a whole number'
    })
});

/**
 * Shipping info
 */
const shippingSchema = Joi.object({
    zone: Joi.string()
        .valid('Inside Dhaka', 'Outside Dhaka')
        .required()
        .messages({
            'any.only': 'Shipping zone must be "Inside Dhaka" or "Outside Dhaka"'
        }),
    address: Joi.object({
        fullName:    Joi.string().trim().min(2).required(),
        phone:       Joi.string().trim().min(11).required(),
        addressLine: Joi.string().trim().min(10).required(),
        city:        Joi.string().trim().required()
    }).required()
});

/**
 * Payment info
 */
const paymentSchema = Joi.object({
    method: Joi.string()
        .valid('COD', 'BKASH', 'NAGAD', 'CARD')
        .required()
        .messages({
            'any.only': 'Payment method must be one of: COD, BKASH, NAGAD, CARD'
        })
});

const consentSchema = Joi.object({
    checkoutPolicyAccepted: Joi.boolean().valid(true).required(),
    version: Joi.string().trim().max(80).allow('').optional()
}).required().messages({
    'any.required': 'Policy consent is required before checkout'
});

/**
 * Full create order schema (used in POST /api/orders)
 */
const createOrderSchema = Joi.object({
    items: Joi.array()
        .items(orderItemSchema)
        .min(1)
        .required()
        .messages({
            'array.min': 'Order must contain at least one item',
            'any.required': 'Items are required'
    }),
    shipping: shippingSchema.required(),
    payment:  paymentSchema.required(),
    consent: consentSchema,
    checkoutSessionId: Joi.string().trim().min(12).max(120).required().messages({
        'any.required': 'Checkout phone verification is required'
    }),
    phoneVerificationToken: Joi.string().trim().min(20).max(200).required().messages({
        'any.required': 'Please verify your phone number before placing the order'
    }),
    promotionCode: Joi.string().trim().max(40).allow('').optional(),
    source: Joi.string().trim().max(80).allow('').optional()
});

/**
 * Update order status schema (used in PATCH /api/admin/orders/:id/status)
 */
const updateOrderStatusSchema = Joi.object({
    status: Joi.string()
        .valid('Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned')
        .required()
        .messages({
            'any.required': 'Status is required',
            'any.only': 'Invalid status value'
        })
});

module.exports = { createOrderSchema, updateOrderStatusSchema };
