const Joi = require('joi');

const createProductSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(3)
        .max(100)
        .required()
        .messages({
            'string.empty': 'Product title is required',
            'string.min': 'Title must be at least 3 characters long',
            'string.max': 'Title cannot exceed 100 characters'
        }),

    description: Joi.string()
        .trim()
        .min(10)
        .max(3000)
        .required()
        .messages({
            'string.empty': 'Description is required',
            'string.min': 'Description is too short. Provide more details.'
        }),

    // Remove 'price' and add these:
    buyingPrice: Joi.number().min(0).required().messages({
        'number.base': 'Buying price must be a number',
        'any.required': 'Buying price is required'
    }),
    sellingPrice: Joi.number().min(0).required().messages({
        'number.base': 'Selling price must be a number',
        'any.required': 'Selling price is required'
    }),

    originalPrice: Joi.number()
        .min(0)
        .optional(), // Only used if the item is on sale

    category: Joi.string()
        .trim()
        .max(50)
        .optional(),

    // We enforce that the uploaded image path is a valid URL (from Cloudinary)
    imageUrl: Joi.string()
        .uri()
        .required()
        .messages({
            'string.uri': 'Image must be a valid URL',
            'any.required': 'Product image is required'
        }),

    stock: Joi.number()
        .integer() // You can't have 1.5 t-shirts in stock!
        .min(0)
        .default(1)
});

module.exports = { createProductSchema };