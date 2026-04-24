const Joi = require('joi');

// Schema for User Creation (Staff, Customers, or Vendor registration)
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
        .email()
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
        .valid('VendorAdmin', 'VendorStaff', 'Customer')
        .optional() // Made optional because the controller often sets this automatically
        .default('Customer'),

    // shop_id is optional in Joi because we often inject it from the JWT or Subdomain logic
    shop_id: Joi.string()
        .hex()
        .length(24)
        .optional()
        .messages({
            'string.length': 'Invalid Shop ID format'
        })
}).required();

// Schema for a simple Login Request
const loginUserSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'string.empty': 'Email is required'
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Password is required'
    })
}).required();

module.exports = {
    createUserSchema,
    loginUserSchema
};