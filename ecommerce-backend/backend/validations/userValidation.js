const Joi = require('joi');

// Base properties shared by all users to keep the validation logic clean
const baseUserObj = {
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
        .default('Customer'),

    orders: Joi.array().items(
        Joi.string().hex().length(24).messages({
            'string.length': 'Invalid Order ID format',
            'string.hex': 'Order ID must be a valid hex string'
        })
    ).optional()

};

// 🔥 Schema for public customer registration (Requires subdomain)
const registerCustomerSchema = Joi.object({
    ...baseUserObj,
    subdomain: Joi.string().required().messages({
        'any.required': 'Subdomain context is missing for customer registration'
    }),
    otp: Joi.string().length(6).required()
}).required();

// 🔥 Schema for an Admin creating a Staff member (Does NOT require subdomain, accepts shop_id)
const createStaffSchema = Joi.object({
    ...baseUserObj,
    shop_id: Joi.string().hex().length(24).optional().messages({
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
    registerCustomerSchema,
    createStaffSchema,
    loginUserSchema
};