const Joi = require('joi');

// Schema for the Admin updating an order status
const updateOrderStatusSchema = Joi.object({
    status: Joi.string()
        .valid('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled')
        .required()
        .messages({
            'any.only': 'Invalid status. Must be Pending, Processing, Shipped, Delivered, or Cancelled.',
            'any.required': 'Order status is required to perform an update.'
        })
});

// We will also prepare the Schema for when Customers create orders on the storefront
const createOrderSchema = Joi.object({
    items: Joi.array().items(
        Joi.object({
            product: Joi.string().hex().length(24).required(), // Must be a valid MongoDB ID
            quantity: Joi.number().integer().min(1).required(),
            price: Joi.number().min(0).required()
        })
    ).min(1).required().messages({
        'array.min': 'Order must contain at least one item.'
    }),
    shippingZone: Joi.string().valid('Inside Dhaka', 'Outside Dhaka').required(),
    shippingAddress: Joi.string().trim().min(10).required().messages({
        'string.min': 'Please provide a full, detailed shipping address.'
    })
});

module.exports = {
    updateOrderStatusSchema,
    createOrderSchema
};