const Joi = require('joi');

/**
 * 🔹 ObjectId validator
 */
const objectId = Joi.string().hex().length(24);

/**
 * 🔹 Order Item Schema (NO PRICE FROM FRONTEND)
 */
const orderItemSchema = Joi.object({
    productId: objectId.required().messages({
        'any.required': 'Product ID is required'
    }),

    variantId: objectId.required().messages({
        'any.required': 'Variant ID is required'
    }),

    quantity: Joi.number()
        .integer()
        .min(1)
        .required()
        .messages({
            'number.min': 'Quantity must be at least 1'
        })
});

/**
 * 🔹 Shipping Schema (STRUCTURED)
 */
const shippingSchema = Joi.object({
    zone: Joi.string()
        .valid('Inside Dhaka', 'Outside Dhaka')
        .required(),

    address: Joi.object({
        fullName: Joi.string().trim().min(2).required(),
        phone: Joi.string().trim().min(11).required(),
        addressLine: Joi.string().trim().min(10).required(),
        city: Joi.string().trim().required()
    }).required()
});

/**
 * 🔹 Payment Schema
 */
const paymentSchema = Joi.object({
    method: Joi.string()
        .valid('COD', 'BKASH', 'NAGAD', 'CARD')
        .required()
});

/**
 * 🔹 CREATE ORDER (CHECKOUT)
 */
const createOrderSchema = Joi.object({
    items: Joi.array()
        .items(orderItemSchema)
        .min(1)
        .required()
        .messages({
            'array.min': 'Order must contain at least one item'
        }),

    shipping: shippingSchema.required(),

    payment: paymentSchema.required()
});