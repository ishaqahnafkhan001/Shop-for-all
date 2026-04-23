const Joi = require('joi');

// Schema for when a Vendor wants to add a new Staff Member or Customer
const createUserSchema = Joi.object({
    fullName: Joi.string()
        .trim()
        .min(3)
        .max(50)
        .required()
        .messages({
            'string.empty': 'Name cannot be empty',
            'string.min': 'Name must be at least 3 characters',
            'any.required': 'Name is required'
        }),

    email: Joi.string()
        .email() // Joi has built-in email format checking!
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),

    password: Joi.string()
        .min(6)
        .required()
        .messages({
            'string.min': 'Password must be at least 6 characters long',
            'any.required': 'Password is required'
        }),

    role: Joi.string()
        // Ensure they can only assign specific roles (prevents a vendor from making themselves a SuperAdmin)
        .valid('VendorStaff', 'Customer')
        .required(),

    // shop_id is required here because a vendor can only create users for their own shop
    shop_id: Joi.string()
        .hex()
        .length(24) // Ensures it looks like a valid MongoDB ObjectId
        .required()
        .messages({
            'string.length': 'Invalid Shop ID format'
        })
});

// Schema for a simple Login Request (only needs email and password)
const loginUserSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'string.empty': 'Email is required'
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Password is required'
    })
});

module.exports = {
    createUserSchema,
    loginUserSchema
};
